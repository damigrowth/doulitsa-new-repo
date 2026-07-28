"""Chat + message operations.

Mirrors `actions/messages/{chats,messages,blocking,presence,reactions}.ts`.
Every write that affects a chat room also publishes a `group_send` to the
Channels layer so connected WebSocket clients receive the update in real-time.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import Count, Q

from apps.accounts.models import User
from apps.messaging.models import BlockedUser, Chat, ChatMember, Message
from common.exceptions import ApiError, FieldErrors

logger = logging.getLogger(__name__)


def _broadcast(chat_id: str, event_type: str, payload: dict[str, Any]) -> None:
    """Send to the `chat.<id>` Channels group AND fan out to every member's
    `presence.<uid>` group.

    OLD's Supabase Realtime had two relevant subscriptions per user: the chat
    socket (`subscribeToMessages`/`subscribeToReadReceipts`) and the chat-list /
    presence socket (`subscribeToUserChats` on `chats`+`chat_members`,
    `subscribeToChatMemberPresence` on `chat_members`). In NEW the FE wires both
    `use-chat-subscription` (→ `/ws/chat/<id>/`) and `use-presence` /
    `use-chat-list-subscription` (→ `/ws/presence/`). Every chat event therefore
    has to reach BOTH sockets, so we publish to the chat group and, separately,
    to each member's per-user presence group. No-op when Channels isn't running.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(
            f"chat.{chat_id}",
            {"type": event_type, "payload": payload},
        )
        member_uids = ChatMember.objects.filter(chat_id=chat_id).values_list(
            "user_id", flat=True
        )
        for uid in member_uids:
            async_to_sync(channel_layer.group_send)(
                f"presence.{uid}",
                {"type": event_type, "payload": payload},
            )
    except Exception:
        logger.warning("channels.broadcast_failed", extra={"chat_id": chat_id, "event": event_type})


# ----- Chat CRUD ---------------------------------------------------------


def list_chats(user: User) -> list[dict[str, Any]]:
    # `chat_members` is an unmanaged composite-key table — fetching ChatMember
    # objects errors because Django expects an `id` column that the prod
    # schema doesn't have. Pull just the chat_id column via `.values_list`
    # and load the chat rows separately.
    chat_ids = list(
        ChatMember.objects.filter(user_id=user.id).values_list("chat_id", flat=True)
    )
    chats = list(
        Chat.objects.filter(id__in=chat_ids).order_by("-last_activity")
    )

    # Resolve the OTHER member (for DMs) so the sidebar can show their name +
    # avatar. One query pulls every member row across all the user's chats,
    # joined with that user's display fields, then we pick the non-self one.
    other_by_chat: dict[str, dict[str, Any]] = {}
    member_rows = ChatMember.objects.filter(chat_id__in=chat_ids).values(
        "chat_id", "user_id", "online",
        "user__name", "user__display_name", "user__image",
        "user__first_name", "user__last_name",
    )
    profile_image_by_uid: dict[str, str | None] = {}
    try:
        from apps.profiles.models import Profile  # type: ignore
        other_uids = {r["user_id"] for r in member_rows if r["user_id"] != user.id}
        if other_uids:
            for row in Profile.objects.filter(user_id__in=other_uids).values(
                "user_id", "image", "display_name", "username"
            ):
                profile_image_by_uid[row["user_id"]] = row["image"]
                # Promote the pro profile fields when the User-side ones are blank
                other_by_chat.setdefault(row["user_id"], {}).update({
                    "username": row.get("username"),
                    "profileDisplayName": row.get("display_name"),
                })
    except ImportError:
        pass

    for row in member_rows:
        if row["user_id"] == user.id:
            continue
        prev = other_by_chat.get(row["chat_id"]) or {}
        # OLD `transformChatForList` (utils/messages.ts:33-46) falls back
        # displayName → firstName+lastName → 'Χρήστης'. Keep the NEW-only
        # user.name promotion just before the final Greek fallback.
        full_name = " ".join(
            p for p in [row["user__first_name"], row["user__last_name"]] if p
        )
        prev.update({
            "userId": row["user_id"],
            "online": row["online"],
            "displayName": prev.get("profileDisplayName")
                or row["user__display_name"]
                or full_name
                or row["user__name"]
                or "Χρήστης",
            "image": profile_image_by_uid.get(row["user_id"]) or row["user__image"],
            "username": prev.get("username"),
        })
        other_by_chat[row["chat_id"]] = prev

    # Batch-load every chat's last message and card them in one _msg_cards
    # pass (author + replyTo resolved without per-chat queries).
    last_ids = [c.last_message_id for c in chats if c.last_message_id]
    last_msgs = list(Message.objects.filter(id__in=last_ids)) if last_ids else []
    last_card_by_id = {m.id: card for m, card in zip(last_msgs, _msg_cards(last_msgs))}

    out: list[dict[str, Any]] = []
    for chat in chats:
        # OLD `getChats` (chats.ts:34) drops chats with zero non-deleted
        # messages: `chats.filter(c => c.messages.length > 0 || c._count.messages > 0)`.
        # Mirror that so freshly-created-but-empty DMs don't show in the sidebar.
        has_messages = Message.objects.filter(chat=chat, deleted=False).exists()
        if not has_messages:
            continue
        unread = (
            Message.objects.filter(chat=chat, read=False, deleted=False)
            .exclude(author=user)
            .count()
        )
        other = other_by_chat.get(chat.id) or {}
        out.append({
            "id": chat.id,
            "cid": chat.cid,
            # OLD `transformChatForList` (utils/messages.ts:51) names the chat
            # after the OTHER member's displayName (not chat.name).
            "name": other.get("displayName") or chat.name,
            "displayName": other.get("displayName"),
            # Ship both `image` (NEW FE key) and `avatar` (OLD key,
            # utils/messages.ts:52) so the sidebar avatar renders either way.
            "image": other.get("image"),
            "avatar": other.get("image"),
            "username": other.get("username"),
            # Ship both ids: OLD `otherMemberId` (utils/messages.ts:57) and the
            # NEW `otherUserId`.
            "otherUserId": other.get("userId"),
            "otherMemberId": other.get("userId"),
            "online": other.get("online", False),
            "lastActivity": chat.last_activity.isoformat() if chat.last_activity else None,
            # OLD exposed the unread count as `unread` (utils/messages.ts:55,
            # chats.ts:47). The sidebar badge (`chat-list-item.tsx:73`) reads
            # `chat.unread`; keep `unreadCount` too for any newer caller.
            "unread": unread,
            "unreadCount": unread,
            "lastMessage": last_card_by_id.get(chat.last_message_id),
        })
    return out


def get_chat(user: User, chat_id: str) -> dict[str, Any] | None:
    # Accept either the chat's primary key OR its `cid` (the deterministic
    # "<userA>::<userB>" string used as the DM permalink) — the frontend
    # routes to /dashboard/messages/<cid> when starting a chat from a pro
    # profile, so the lookup must handle both.
    chat = Chat.objects.filter(Q(id=chat_id) | Q(cid=chat_id)).first()
    if chat is None:
        return None
    if not ChatMember.objects.filter(chat_id=chat.id, user_id=user.id).exists():
        return None
    members = list(
        ChatMember.objects.filter(chat_id=chat.id)
        .order_by("joined_at")
        .values(
            "user_id", "joined_at", "online", "muted",
            "user__name", "user__display_name", "user__image",
            "user__first_name", "user__last_name",
        )
    )

    # Promote the pro Profile display fields when the User row is blank.
    profile_by_uid: dict[str, dict[str, Any]] = {}
    try:
        from apps.profiles.models import Profile  # type: ignore
        uids = [m["user_id"] for m in members]
        for row in Profile.objects.filter(user_id__in=uids).values(
            "user_id", "display_name", "image", "username"
        ):
            profile_by_uid[row["user_id"]] = row
    except ImportError:
        pass

    return {
        "id": chat.id,
        "cid": chat.cid,
        "name": chat.name,
        "createdAt": chat.created_at.isoformat() if chat.created_at else None,
        "lastActivity": chat.last_activity.isoformat() if chat.last_activity else None,
        "members": [{
            "userId": m["user_id"],
            "joinedAt": m["joined_at"].isoformat() if m["joined_at"] else None,
            "online": m["online"],
            "muted": m["muted"],
            # OLD fallback chain (utils/messages.ts:33-46): displayName →
            # firstName+lastName → 'Χρήστης'.
            "displayName": (profile_by_uid.get(m["user_id"]) or {}).get("display_name")
                or m["user__display_name"]
                or " ".join(p for p in [m["user__first_name"], m["user__last_name"]] if p)
                or m["user__name"]
                or "Χρήστης",
            "image": (profile_by_uid.get(m["user_id"]) or {}).get("image") or m["user__image"],
            "username": (profile_by_uid.get(m["user_id"]) or {}).get("username"),
        } for m in members],
    }


def get_or_create_dm(user: User, other_user_id: str) -> dict[str, Any]:
    """Get (or create) a 1-on-1 chat between two users."""
    if user.id == other_user_id:
        raise FieldErrors(details={"otherUserId": ["Cannot DM yourself"]})

    # The other user must exist — otherwise the chat_members FK insert would crash
    # with a 500 instead of returning a clean 404.
    if not User.objects.filter(id=other_user_id).exists():
        raise ApiError("User not found", code="user_not_found", status_code=404)

    if BlockedUser.objects.filter(
        Q(blocker_id=user.id, blocked_id=other_user_id)
        | Q(blocker_id=other_user_id, blocked_id=user.id)
    ).exists():
        raise ApiError(
            "Conversation blocked",
            code="blocked",
            status_code=403,
        )

    cid = "::".join(sorted([user.id, other_user_id]))
    existing = Chat.objects.filter(cid=cid).first()
    if existing:
        return {"chatId": existing.id, "isNew": False}

    # Legacy fallback: most production chats predate the deterministic
    # "<userA>::<userB>" cid and carry a random nanoid cid instead. OLD
    # `getOrCreateChat` (chats.ts:128-157) resolved an existing DM by the
    # 2-member SET (both users are members AND nobody else is), so mirror that
    # before creating — otherwise every legacy DM gets duplicated.
    pair_chat_ids = list(
        ChatMember.objects.filter(user_id__in=[user.id, other_user_id])
        .values("chat_id")
        .annotate(n=Count("user_id", distinct=True))
        .filter(n=2)
        .values_list("chat_id", flat=True)
    )
    if pair_chat_ids:
        existing_id = (
            ChatMember.objects.filter(chat_id__in=pair_chat_ids)
            .values("chat_id")
            .annotate(total=Count("user_id"))
            .filter(total=2)  # exactly these two members — 1-on-1 only
            .values_list("chat_id", flat=True)
            .first()
        )
        if existing_id:
            return {"chatId": existing_id, "isNew": False}

    with transaction.atomic():
        chat = Chat.objects.create(creator=user, cid=cid)
        # `chat_members` has composite PK (chatId, uid) and no synthetic id —
        # Django's ORM INSERT…RETURNING `id` fails, so use raw SQL.
        from django.db import connection
        with connection.cursor() as cur:
            cur.execute(
                'INSERT INTO chat_members ("chatId", uid) VALUES (%s, %s), (%s, %s) '
                'ON CONFLICT DO NOTHING',
                [chat.id, user.id, chat.id, other_user_id],
            )
    return {"chatId": chat.id, "isNew": True}


# ----- Messages -----------------------------------------------------------


def list_messages(
    *,
    user: User,
    chat_id: str,
    limit: int = 20,
    before: str | None = None,
) -> list[dict[str, Any]]:
    # OLD default page size is 20 (messages.ts:17), not 50.
    if not ChatMember.objects.filter(chat_id=chat_id, user_id=user.id).exists():
        raise ApiError("Not a member of this chat", code="not_member", status_code=403)

    # OLD treats `before` as a raw createdAt timestamp (`createdAt: { lt: new
    # Date(options.before) }`, messages.ts:38-42), not a message id. The FE
    # passes the oldest message's ISO createdAt (messages-container.tsx:128-136).
    qs = Message.objects.filter(chat_id=chat_id, deleted=False).order_by("-created_at")
    if before:
        cutoff = _parse_before(before)
        if cutoff is not None:
            qs = qs.filter(created_at__lt=cutoff)
        else:
            anchor = Message.objects.filter(id=before).first()
            if anchor:
                qs = qs.filter(created_at__lt=anchor.created_at)
    # Fetch newest-first (so the page is the most-recent N), then reverse to
    # oldest→newest exactly like OLD (messages.ts:78 `.reverse()`).
    rows = list(qs[:limit])
    rows.reverse()
    # Batch-resolve authors + reply targets (no per-message N+1).
    return _msg_cards(rows)


def _parse_before(before: str) -> datetime | None:
    """Parse an ISO-8601 timestamp; returns None if `before` isn't a date."""
    from django.utils.dateparse import parse_datetime
    try:
        dt = parse_datetime(before)
    except (ValueError, TypeError):
        return None
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def send_message(*, author: User, chat_id: str, content: str, reply_to_id: str | None = None) -> dict[str, Any]:
    if not content or not content.strip():
        raise FieldErrors(details={"content": ["Required"]})
    if not ChatMember.objects.filter(chat_id=chat_id, user=author).exists():
        raise ApiError("Not a member", code="not_member", status_code=403)

    # OLD verifies a reply target exists AND belongs to the same chat
    # (messages.ts:110-118: `!parentMessage || parentMessage.chatId !== chatId`
    # → "Invalid reply target"). Replicate so cross-chat/dangling reply ids are
    # rejected.
    if reply_to_id:
        parent = Message.objects.filter(id=reply_to_id).values("chat_id").first()
        if parent is None or parent["chat_id"] != chat_id:
            raise ApiError("Invalid reply target", code="invalid_reply_target", status_code=400)

    with transaction.atomic():
        msg = Message.objects.create(
            author=author,
            chat_id=chat_id,
            content=content.strip(),
            reply_to_id=reply_to_id,
        )
        Chat.objects.filter(id=chat_id).update(
            last_message_id=msg.id,
            last_activity=datetime.now(timezone.utc),
        )

    card = _msg_cards([msg])[0]
    _broadcast(chat_id, "chat.message", card)
    return card


def edit_message(*, user: User, message_id: str, content: str) -> dict[str, Any]:
    msg = Message.objects.filter(id=message_id).first()
    if msg is None:
        raise ApiError("Message not found", code="message_not_found", status_code=404)
    if msg.author_id != user.id:
        raise ApiError("Not author", code="not_author", status_code=403)
    # OLD blocked editing a deleted message (messages.ts:176-178
    # "Cannot edit a deleted message").
    if msg.deleted:
        raise ApiError(
            "Cannot edit a deleted message",
            code="message_deleted",
            status_code=400,
        )
    msg.content = content.strip()
    msg.edited = True
    msg.edited_at = datetime.now(timezone.utc)
    msg.save(update_fields=["content", "edited", "edited_at", "updated_at"])
    card = _msg_cards([msg])[0]
    _broadcast(msg.chat_id, "chat.message_edited", card)
    return card


def delete_message(*, user: User, message_id: str) -> None:
    msg = Message.objects.filter(id=message_id).first()
    if msg is None:
        raise ApiError("Message not found", code="message_not_found", status_code=404)
    if msg.author_id != user.id:
        raise ApiError("Not author", code="not_author", status_code=403)
    msg.deleted = True
    msg.deleted_at = datetime.now(timezone.utc)
    msg.deleted_by = user.id
    msg.save(update_fields=["deleted", "deleted_at", "deleted_by", "updated_at"])
    _broadcast(msg.chat_id, "chat.message_deleted", {"id": msg.id})


def mark_messages_read(*, user: User, message_ids: list[str]) -> int:
    qs = Message.objects.filter(id__in=message_ids).exclude(author=user)
    # Capture which (chat, message) rows are about to be flipped so we can push
    # a live read receipt — OLD relied on a Supabase `message_reads` INSERT that
    # `subscribeToReadReceipts` (realtime.ts:108-117) turned into a live "seen"
    # update for the sender. NEW collapses reads onto `Message.read`, so we
    # broadcast the affected ids per chat after updating.
    affected = list(qs.values_list("id", "chat_id"))
    marked = qs.update(read=True)
    by_chat: dict[str, list[str]] = {}
    for msg_id, chat_id in affected:
        by_chat.setdefault(chat_id, []).append(msg_id)
    for chat_id, msg_ids in by_chat.items():
        _broadcast(chat_id, "chat.read", {"messageIds": msg_ids, "userId": user.id})
    return marked


def unread_count(*, user: User, chat_id: str) -> int:
    return Message.objects.filter(
        chat_id=chat_id, read=False, deleted=False
    ).exclude(author=user).count()


def batch_unread_counts(*, user: User, chat_ids: list[str]) -> dict[str, int]:
    rows = (
        Message.objects
        .filter(chat_id__in=chat_ids, read=False, deleted=False)
        .exclude(author=user)
        .values("chat_id")
        .annotate(count=Count("id"))
    )
    # OLD seeds the result with 0 for EVERY requested chatId
    # (messages.ts:283 `chatIds.forEach(id => countMap.set(id, 0))`) so callers
    # can read a count for chats with no unread without defaulting.
    result: dict[str, int] = {cid: 0 for cid in chat_ids}
    for r in rows:
        result[r["chat_id"]] = r["count"]
    return result


def total_unread(user: User) -> int:
    chat_ids = list(ChatMember.objects.filter(user=user).values_list("chat_id", flat=True))
    return Message.objects.filter(
        chat_id__in=chat_ids, read=False, deleted=False
    ).exclude(author=user).count()


def recent_unread_messages(*, user: User, minutes: int = 15) -> list[dict[str, Any]]:
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    chat_ids = list(ChatMember.objects.filter(user=user).values_list("chat_id", flat=True))
    qs = (
        Message.objects.select_related("author")
        .filter(
            chat_id__in=chat_ids,
            read=False,
            deleted=False,
            created_at__gte=since,
        ).exclude(author=user).order_by("-created_at")[:50]
    )
    return _msg_cards(list(qs))


# Author fields shipped per message — mirrors OLD MESSAGE_WITH_AUTHOR_INCLUDE
# (lib/database/selects/chat.ts:67-88: id, displayName, firstName, lastName,
# image). The FE reads author.displayName || firstName || lastName
# (chat-messages.tsx:46-48, 244-252).
_AUTHOR_VALUES = ("id", "display_name", "first_name", "last_name", "image")


def _author_card(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None
    return {
        "id": row.get("id"),
        "displayName": row.get("display_name"),
        "firstName": row.get("first_name"),
        "lastName": row.get("last_name"),
        "image": row.get("image"),
    }


def _fetch_author_rows(uids: set[str]) -> dict[str, dict[str, Any]]:
    if not uids:
        return {}
    return {
        r["id"]: r
        for r in User.objects.filter(id__in=uids).values(*_AUTHOR_VALUES)
    }


def _msg_cards(messages: list[Message]) -> list[dict[str, Any]]:
    """Build message cards with `author` + `replyTo` resolved in 3 batched
    queries total (reply targets, then all authors) — no per-message N+1."""
    reply_ids = {m.reply_to_id for m in messages if m.reply_to_id}
    reply_by_id: dict[str, Message] = (
        {r.id: r for r in Message.objects.filter(id__in=reply_ids)}
        if reply_ids else {}
    )
    author_ids = {m.author_id for m in messages if m.author_id}
    author_ids |= {r.author_id for r in reply_by_id.values() if r.author_id}
    author_rows = _fetch_author_rows(author_ids)
    out = []
    for m in messages:
        reply = reply_by_id.get(m.reply_to_id) if m.reply_to_id else None
        out.append(_msg_card(
            m,
            author_row=author_rows.get(m.author_id),
            reply_to=reply,
            reply_author_row=author_rows.get(reply.author_id) if reply else None,
        ))
    return out


def _msg_card(
    m: Message,
    *,
    author_row: dict[str, Any] | None = None,
    reply_to: Message | None = None,
    reply_author_row: dict[str, Any] | None = None,
) -> dict[str, Any]:
    # OLD `transformMessageForChat` (utils/messages.ts:81-92) ships a nested
    # minimal card for the replied-to message: id + content + authorName
    # (displayName || 'Unknown') + author {displayName, firstName, lastName}.
    reply_card = None
    if reply_to is not None:
        reply_author = _author_card(reply_author_row)
        reply_card = {
            "id": reply_to.id,
            "content": reply_to.content,
            "authorName": (reply_author or {}).get("displayName") or "Unknown",
            "author": {
                "displayName": (reply_author or {}).get("displayName"),
                "firstName": (reply_author or {}).get("firstName"),
                "lastName": (reply_author or {}).get("lastName"),
            } if reply_author else None,
        }
    return {
        "id": m.id,
        "chatId": m.chat_id,
        # Ship both keys: OLD's realtime payload + transform used `authorUid`
        # (utils/messages.ts:114, realtime INSERT row), NEW uses `authorId`.
        "authorId": m.author_id,
        "authorUid": m.author_id,
        # OLD MESSAGE_WITH_AUTHOR_INCLUDE — {id, displayName, firstName,
        # lastName, image} sourced from the author's User row.
        "author": _author_card(author_row),
        "content": m.content if not m.deleted else None,
        "deleted": m.deleted,
        "edited": m.edited,
        "editedAt": m.edited_at.isoformat() if m.edited_at else None,
        "replyToId": m.reply_to_id,
        "replyTo": reply_card,
        "reactions": m.reactions or {},
        "read": m.read,
        "createdAt": m.created_at.isoformat() if m.created_at else None,
    }


# ----- Blocking ----------------------------------------------------------


def block_user(*, blocker: User, blocked_id: str, reason: str | None = None) -> None:
    if blocker.id == blocked_id:
        raise FieldErrors(details={"blockedId": ["Cannot block yourself"]})
    BlockedUser.objects.update_or_create(
        blocker_id=blocker.id, blocked_id=blocked_id,
        defaults={"reason": reason},
    )


def unblock_user(*, blocker: User, blocked_id: str) -> None:
    BlockedUser.objects.filter(blocker_id=blocker.id, blocked_id=blocked_id).delete()


def list_blocked(user: User) -> list[dict[str, Any]]:
    qs = BlockedUser.objects.select_related("blocked").filter(blocker=user).order_by("-created_at")
    return [{
        "id": b.id,
        "blockedId": b.blocked_id,
        "blocked": {
            "id": b.blocked.id, "email": b.blocked.email,
            "displayName": b.blocked.display_name, "image": b.blocked.image,
        } if b.blocked else None,
        "createdAt": b.created_at.isoformat() if b.created_at else None,
    } for b in qs]


def is_blocked_either_way(user_id: str, other_id: str) -> bool:
    return BlockedUser.objects.filter(
        Q(blocker_id=user_id, blocked_id=other_id)
        | Q(blocker_id=other_id, blocked_id=user_id)
    ).exists()


# ----- Presence ----------------------------------------------------------


def set_presence(user: User, online: bool) -> None:
    now = datetime.now(timezone.utc)
    ChatMember.objects.filter(user=user).update(
        online=online,
        last_seen=now,
    )
    # Broadcast to each chat the user is in. OLD's `subscribeToChatMemberPresence`
    # delivered `(userId, online, lastSeen)` (realtime.ts:159-163) and the FE
    # `use-presence.ts:39-41` reads `payload.userId/online/lastSeen`, so include
    # lastSeen here. `_broadcast` fans out to both the chat group and each
    # member's `presence.<uid>` group (where the FE actually listens).
    payload = {"userId": user.id, "online": online, "lastSeen": now.isoformat()}
    for chat_id in ChatMember.objects.filter(user=user).values_list("chat_id", flat=True):
        _broadcast(chat_id, "chat.presence", payload)


def get_presence(user_id: str) -> dict[str, Any]:
    m = (
        ChatMember.objects.filter(user_id=user_id)
        .order_by("-last_seen")
        .values("online", "last_seen")
        .first()
    )
    return {
        "online": m["online"] if m else False,
        "lastSeen": m["last_seen"].isoformat() if m and m["last_seen"] else None,
    }


def my_chats_with_presence(user: User) -> list[dict[str, Any]]:
    # OLD `getUserChatsWithPresence` (presence.ts:79) returns the CURRENT user's
    # own membership rows `{chatId, online}` — i.e. self's online flag per chat,
    # not the other member's. Match that.
    rows = ChatMember.objects.filter(user=user).values("chat_id", "online")
    return [{"chatId": r["chat_id"], "online": r["online"]} for r in rows]


# ----- Reactions ---------------------------------------------------------


def toggle_reaction(*, user: User, message_id: str, emoji: str) -> dict[str, Any]:
    msg = Message.objects.filter(id=message_id).first()
    if msg is None:
        raise ApiError("Message not found", code="message_not_found", status_code=404)
    reactions = dict(msg.reactions or {})
    current_users = list(reactions.get(emoji, []))
    # OLD `toggleReaction` (reactions.ts:34-57) enforces ONE reaction per user
    # across all emojis: if the user already reacted with THIS emoji, toggle it
    # off; otherwise strip the user from EVERY other emoji first, then add them
    # to this one.
    if user.id in current_users:
        current_users = [u for u in current_users if u != user.id]
        if current_users:
            reactions[emoji] = current_users
        else:
            reactions.pop(emoji, None)
    else:
        for other_emoji in list(reactions.keys()):
            remaining = [u for u in reactions[other_emoji] if u != user.id]
            if remaining:
                reactions[other_emoji] = remaining
            else:
                reactions.pop(other_emoji, None)
        reactions[emoji] = [*reactions.get(emoji, []), user.id]
    msg.reactions = reactions
    msg.save(update_fields=["reactions", "updated_at"])
    _broadcast(msg.chat_id, "chat.reaction", {"messageId": msg.id, "reactions": reactions})
    return reactions


def add_reaction(*, user: User, message_id: str, emoji: str) -> None:
    msg = Message.objects.filter(id=message_id).first()
    if msg is None:
        raise ApiError("Message not found", code="message_not_found", status_code=404)
    reactions = dict(msg.reactions or {})
    users_for_emoji = list(reactions.get(emoji, []))
    if user.id not in users_for_emoji:
        users_for_emoji.append(user.id)
        reactions[emoji] = users_for_emoji
        msg.reactions = reactions
        msg.save(update_fields=["reactions", "updated_at"])
        _broadcast(msg.chat_id, "chat.reaction", {"messageId": msg.id, "reactions": reactions})


def remove_reaction(*, user: User, message_id: str, emoji: str) -> None:
    msg = Message.objects.filter(id=message_id).first()
    if msg is None:
        raise ApiError("Message not found", code="message_not_found", status_code=404)
    reactions = dict(msg.reactions or {})
    users_for_emoji = list(reactions.get(emoji, []))
    if user.id in users_for_emoji:
        users_for_emoji.remove(user.id)
        if users_for_emoji:
            reactions[emoji] = users_for_emoji
        else:
            reactions.pop(emoji, None)
        msg.reactions = reactions
        msg.save(update_fields=["reactions", "updated_at"])
        _broadcast(msg.chat_id, "chat.reaction", {"messageId": msg.id, "reactions": reactions})
