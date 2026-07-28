"""Django Channels consumers (WS1, WS2).

- `ChatConsumer`     ws://.../ws/chat/{chat_id}/   — receives chat events
- `PresenceConsumer` ws://.../ws/presence/         — connect/disconnect drives
                                                     online/offline broadcast

Authentication uses Channels' `AuthMiddlewareStack` (session-based) plus a
manual JWT inspection of the `?token=` query param when the user is anonymous
(supports the Next.js client passing a JWT for cross-origin connects).
"""
from __future__ import annotations

import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


@database_sync_to_async
def _user_from_id(user_id: str):
    from apps.accounts.models import User
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None


# ---------------------------------------------------------------------------
# Per-user WebSocket connection refcount.
#
# The FE holds 2-3 sockets at once (chat socket + presence socket, sometimes a
# second chat tab). Flipping presence on EVERY connect/disconnect made the
# online dot flap offline whenever ANY one socket closed. Track a per-user
# connection count in the (Redis) cache and only broadcast the online
# transition on 0→1 and the offline transition when the count reaches 0.
# TTL is a safety net so a crashed worker can't leave a user "online" forever.
# ---------------------------------------------------------------------------

_PRESENCE_CONN_TTL = 2 * 60 * 60  # 2h safety expiry


def _presence_conn_key(user_id: str) -> str:
    return f"presence:conn:{user_id}"


@database_sync_to_async
def _presence_connect(user) -> None:
    """Increment the user's socket refcount; set/broadcast online on 0→1."""
    from django.core.cache import cache

    from apps.messaging.services.chat_ops import set_presence

    key = _presence_conn_key(user.id)
    try:
        cache.add(key, 0, timeout=_PRESENCE_CONN_TTL)
        count = cache.incr(key)
        try:
            cache.touch(key, _PRESENCE_CONN_TTL)
        except Exception:  # noqa: BLE001 — touch unsupported on some backends
            pass
    except Exception:  # noqa: BLE001 — cache down: fall back to always-online
        logger.warning("presence.refcount_incr_failed", extra={"user_id": user.id})
        count = 1
    if count == 1:
        set_presence(user, True)


@database_sync_to_async
def _presence_disconnect(user) -> None:
    """Decrement the refcount; set/broadcast offline only when it reaches 0."""
    from django.core.cache import cache

    from apps.messaging.services.chat_ops import set_presence

    key = _presence_conn_key(user.id)
    try:
        try:
            count = cache.decr(key)
        except ValueError:
            # Key expired/missing — treat as last connection gone.
            count = 0
        if count < 0:
            # Guard against negative drift (e.g. connect incr failed).
            cache.set(key, 0, timeout=_PRESENCE_CONN_TTL)
            count = 0
    except Exception:  # noqa: BLE001 — cache down: fall back to old behaviour
        logger.warning("presence.refcount_decr_failed", extra={"user_id": user.id})
        count = 0
    if count == 0:
        set_presence(user, False)


async def _resolve_user_from_scope(scope):
    """Resolve the connecting user from either the Channels auth middleware
    (session cookie) or a `?token=<JWT>` query param. Returns the User or
    None on failure."""
    user = scope.get("user")
    if user and not user.is_anonymous:
        return user
    from urllib.parse import parse_qs
    qs = parse_qs(scope.get("query_string", b"").decode("utf-8"))
    token = qs.get("token", [None])[0]
    if not token:
        return None
    try:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        payload = JWTAuthentication().get_validated_token(token)
        return await _user_from_id(payload["user_id"])
    except Exception as exc:  # noqa: BLE001
        logger.warning("ws_jwt_resolve_failed", extra={"error": str(exc)})
        return None


class _SafeSendMixin:
    """send_json that swallows 'Attempt to send on a closed protocol'.

    Group broadcasts race socket closes (page nav, reconnect churn); daphne
    raises when a handler sends to a closed transport. The client reconnects
    and resubscribes, so dropping the frame is correct — crashing the consumer
    (and spamming tracebacks) is not.
    """

    async def send_json(self, content, close=False):  # type: ignore[override]
        try:
            await super().send_json(content, close)  # type: ignore[misc]
        except Exception:  # noqa: BLE001
            pass


class ChatConsumer(_SafeSendMixin, AsyncJsonWebsocketConsumer):
    """Subscribe to the chat.<id> group; receive every server-side broadcast."""

    async def connect(self) -> None:
        user = await _resolve_user_from_scope(self.scope)
        if user is None or user.is_anonymous:
            await self.close(code=4401)
            return
        chat_id = self.scope["url_route"]["kwargs"]["chat_id"]
        is_member = await self._is_member(chat_id, user.id)
        if not is_member:
            await self.close(code=4403)
            return
        self.user_id = user.id
        self.chat_id = chat_id
        await self.channel_layer.group_add(f"chat.{chat_id}", self.channel_name)
        await self.accept()
        # Refcounted: only the 0→1 transition broadcasts online, so the peer's
        # dot updates live without flapping when one of several sockets churns.
        await _presence_connect(user)

    async def disconnect(self, code: int) -> None:
        chat_id = getattr(self, "chat_id", None)
        if chat_id:
            await self.channel_layer.group_discard(f"chat.{chat_id}", self.channel_name)
        user_id = getattr(self, "user_id", None)
        if user_id:
            user = await _user_from_id(user_id)
            if user is not None:
                # Refcounted: offline only when the LAST socket closes.
                await _presence_disconnect(user)

    async def receive_json(self, content, **kwargs) -> None:
        """Client-initiated messages on the socket. Most flows go via REST +
        broadcast — this is reserved for typing indicators and read receipts
        that don't warrant a separate HTTP round-trip."""
        if not isinstance(content, dict):
            return
        kind = content.get("type")
        if kind == "typing":
            await self.channel_layer.group_send(
                f"chat.{self.chat_id}",
                {"type": "chat.typing", "payload": {"userId": self.user_id}},
            )

    # ----- group-event handlers (called by server-side broadcasts) -----

    async def chat_message(self, event):
        await self.send_json({"type": "message", "payload": event["payload"]})

    async def chat_message_edited(self, event):
        await self.send_json({"type": "message_edited", "payload": event["payload"]})

    async def chat_message_deleted(self, event):
        await self.send_json({"type": "message_deleted", "payload": event["payload"]})

    async def chat_reaction(self, event):
        await self.send_json({"type": "reaction", "payload": event["payload"]})

    async def chat_presence(self, event):
        await self.send_json({"type": "presence", "payload": event["payload"]})

    async def chat_read(self, event):
        # Live read receipt: mirrors OLD `subscribeToReadReceipts`
        # (realtime.ts:108-117). The FE flips `isRead` for the sender's bubbles.
        await self.send_json({"type": "read", "payload": event["payload"]})

    async def chat_typing(self, event):
        await self.send_json({"type": "typing", "payload": event["payload"]})

    # ----- helpers -----

    async def _resolve_user(self):
        user = self.scope.get("user")
        if user and not user.is_anonymous:
            return user
        # Fall back to JWT token in query string
        from urllib.parse import parse_qs
        qs = parse_qs(self.scope.get("query_string", b"").decode("utf-8"))
        token = qs.get("token", [None])[0]
        if not token:
            return None
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            from rest_framework_simplejwt.tokens import UntypedToken
            UntypedToken(token)
            payload = JWTAuthentication().get_validated_token(token)
            return await self._get_user(payload["user_id"])
        except Exception:
            return None

    @database_sync_to_async
    def _get_user(self, user_id: str):
        from apps.accounts.models import User
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def _is_member(self, chat_id: str, user_id: str) -> bool:
        from apps.messaging.models import ChatMember
        return ChatMember.objects.filter(chat_id=chat_id, user_id=user_id).exists()

    @database_sync_to_async
    def _set_online(self, user_id: str, online: bool) -> None:
        from apps.messaging.models import ChatMember
        ChatMember.objects.filter(user_id=user_id).update(online=online)


class PresenceConsumer(_SafeSendMixin, AsyncJsonWebsocketConsumer):
    """Per-user presence channel. Connecting marks the user online; disconnecting
    marks them offline. No per-chat scoping — broadcasts go to every chat the
    user is in via the ChatConsumer's group."""

    async def connect(self) -> None:
        user = await _resolve_user_from_scope(self.scope)
        if user is None or user.is_anonymous:
            await self.close(code=4401)
            return
        self.user_id = user.id
        await self.channel_layer.group_add(f"presence.{user.id}", self.channel_name)
        await self.accept()
        # Refcounted online transition (0→1 broadcasts, see helpers above).
        await _presence_connect(user)

    async def disconnect(self, code: int) -> None:
        user_id = getattr(self, "user_id", None)
        if user_id:
            await self.channel_layer.group_discard(f"presence.{user_id}", self.channel_name)
            user = await _user_from_id(user_id)
            if user is not None:
                # Refcounted: offline broadcast only when the LAST socket closes.
                await _presence_disconnect(user)

    # ----- group-event handlers --------------------------------------------
    #
    # `chat_ops._broadcast` fans every chat event out to each member's
    # `presence.<uid>` group as well as the `chat.<id>` group. The FE wires this
    # one socket for BOTH `use-presence` (online dots) and
    # `use-chat-list-subscription` (sidebar unread / new-chat refetch), so this
    # consumer must re-emit the same envelopes the chat socket does. Event type
    # names (`chat.message`, …) map to these `chat_*` handler methods.

    async def chat_message(self, event):
        await self.send_json({"type": "message", "payload": event["payload"]})

    async def chat_message_edited(self, event):
        await self.send_json({"type": "message_edited", "payload": event["payload"]})

    async def chat_message_deleted(self, event):
        await self.send_json({"type": "message_deleted", "payload": event["payload"]})

    async def chat_reaction(self, event):
        await self.send_json({"type": "reaction", "payload": event["payload"]})

    async def chat_read(self, event):
        await self.send_json({"type": "read", "payload": event["payload"]})

    async def chat_presence(self, event):
        await self.send_json({"type": "presence", "payload": event["payload"]})

    async def presence_update(self, event):
        await self.send_json({"type": "presence", "payload": event["payload"]})
