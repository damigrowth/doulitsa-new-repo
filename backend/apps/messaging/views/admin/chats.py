"""Admin chat endpoints (rows 139-143)."""
from __future__ import annotations

from django.db.models import Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.admin import AdminResource, HasResourcePermission
from apps.messaging.models import Chat, ChatMember, Message
from common.exceptions import NotFound

_PERM = HasResourcePermission(AdminResource.CHATS, "view")


class AdminChatStatsView(APIView):
    """GET /api/admin/chats/stats (row 139)."""

    permission_classes = [IsAuthenticated, _PERM]

    def get(self, request):
        from datetime import datetime, timezone
        from datetime import timedelta
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        # OLD getAdminChatStats (actions/admin/chats.ts:49-66) counts only
        # non-deleted messages; chats + chatMembers are counted unfiltered.
        return Response({
            "totalChats": Chat.objects.count(),
            "totalMessages": Message.objects.filter(deleted=False).count(),
            "messagesToday": Message.objects.filter(deleted=False, created_at__gte=today_start).count(),
            "totalChatMembers": ChatMember.objects.count(),
        })


class AdminChatListView(APIView):
    """GET /api/admin/chats (row 140)."""

    permission_classes = [IsAuthenticated, _PERM]

    def get(self, request):
        q = request.query_params.get("search")
        qs = Chat.objects.all()
        if q:
            # OLD admin/chats.ts:106-129 searched the PARTICIPANTS' names too —
            # chats rarely have a `name`, so member matching is the useful path.
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(cid__icontains=q)
                | Q(members__user__display_name__icontains=q)
                | Q(members__user__first_name__icontains=q)
                | Q(members__user__last_name__icontains=q)
                | Q(members__user__username__icontains=q)
            ).distinct()
        page = max(1, int(request.query_params.get("page", 1)))
        limit = max(1, min(100, int(request.query_params.get("limit", 50))))
        # OLD admin/chats.ts:149-167 `sort` values the table still sends.
        sort = request.query_params.get("sort")
        if sort in ("newest", "oldest", "active"):
            col = {"newest": "-created_at", "oldest": "created_at", "active": "-last_activity"}[sort]
        else:
            order = request.query_params.get("sortOrder", "desc")
            sort_by = request.query_params.get("sortBy", "lastActivity")
            col = {"lastActivity": "last_activity", "createdAt": "created_at"}.get(sort_by, "last_activity")
            if order == "desc":
                col = f"-{col}"
        qs = qs.order_by(col)
        total = qs.count()
        offset = (page - 1) * limit
        rows = list(qs[offset:offset + limit])
        ids = [c.id for c in rows]
        # OLD getAdminChats (actions/admin/chats.ts:181-185) counts only
        # non-deleted messages in the per-chat messageCount.
        msg_counts = dict(
            Message.objects.filter(chat_id__in=ids, deleted=False)
            .values_list("chat_id")
            .annotate(n=Count("id"))
            .values_list("chat_id", "n")
        )
        members_by_chat: dict[str, list[dict]] = {cid: [] for cid in ids}
        for row in (
            ChatMember.objects.filter(chat_id__in=ids)
            .values(
                "chat_id", "user_id",
                "user__username", "user__display_name", "user__image",
            )
        ):
            members_by_chat.setdefault(row["chat_id"], []).append({
                "id": row["user_id"],
                "username": row.get("user__username"),
                "displayName": row.get("user__display_name"),
                "image": row.get("user__image"),
            })
        return Response({
            "chats": [{
                **_chat_row(c),
                "creatorUid": c.creator_id,
                "messageCount": msg_counts.get(c.id, 0),
                "members": members_by_chat.get(c.id, []),
            } for c in rows],
            "total": total,
        })


class AdminChatDetailView(APIView):
    """GET /api/admin/chats/{id} (row 141)."""

    permission_classes = [IsAuthenticated, _PERM]

    def get(self, request, chat_id):
        chat = Chat.objects.filter(Q(id=chat_id) | Q(cid=chat_id)).first()
        if chat is None:
            raise NotFound("Chat not found")
        members = list(
            ChatMember.objects.filter(chat_id=chat.id).values(
                "user_id", "user__email", "user__display_name", "online", "joined_at",
            )
        )
        last = Message.objects.filter(id=chat.last_message_id).first() if chat.last_message_id else None
        # OLD getAdminChatById (actions/admin/chats.ts:267-273) counts only
        # non-deleted messages.
        return Response({
            **_chat_row(chat),
            "messageCount": Message.objects.filter(chat=chat, deleted=False).count(),
            "members": [{
                "userId": m["user_id"],
                "email": m["user__email"],
                "displayName": m["user__display_name"],
                "online": m["online"],
                "joinedAt": m["joined_at"].isoformat() if m["joined_at"] else None,
            } for m in members],
            "lastMessage": _msg(last) if last else None,
        })


class AdminChatStatsForChatView(APIView):
    """GET /api/admin/chats/{id}/stats (row 142)."""

    permission_classes = [IsAuthenticated, _PERM]

    def get(self, request, chat_id):
        chat = Chat.objects.filter(Q(id=chat_id) | Q(cid=chat_id)).first()
        if chat is None:
            raise NotFound("Chat not found")
        from datetime import datetime, timezone
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        members = list(
            ChatMember.objects.filter(chat_id=chat.id).values(
                "user_id", "user__email", "user__display_name",
                "user__username", "user__image",
            )
        )
        creator = next((m for m in members if m["user_id"] == chat.creator_id), None)
        other = next((m for m in members if m["user_id"] != chat.creator_id), None)
        # OLD getAdminChatDetailStats (actions/admin/chats.ts:344-363) counts
        # only non-deleted messages.
        return Response({
            "totalMessages": Message.objects.filter(chat=chat, deleted=False).count(),
            "messagesToday": Message.objects.filter(chat=chat, deleted=False, created_at__gte=today_start).count(),
            "creator": _member(creator),
            "member": _member(other),
        })


class AdminChatMessagesView(APIView):
    """GET /api/admin/chats/{id}/messages (row 143)."""

    permission_classes = [IsAuthenticated, _PERM]

    def get(self, request, chat_id):
        # OLD getAdminChatMessages (actions/admin/chats.ts:431-447) resolves the
        # path param as cid OR id before loading messages — otherwise a cid-keyed
        # navigation returns an empty list. The previous NEW code filtered
        # Message.chat_id == chat_id directly, so a cid yielded nothing.
        chat = Chat.objects.filter(Q(id=chat_id) | Q(cid=chat_id)).only("id", "creator_id").first()
        if chat is None:
            raise NotFound("Chat not found")
        # NOTE: OLD intentionally INCLUDES deleted messages in the admin message
        # list + total (chats.ts:469 "including deleted for admin view"), unlike
        # the stats endpoints — keep that quirk.
        qs = Message.objects.filter(chat_id=chat.id).select_related("author").order_by("-created_at")
        q = request.query_params.get("search")
        if q:
            qs = qs.filter(content__icontains=q)
        page = max(1, int(request.query_params.get("page", 1)))
        limit = max(1, min(100, int(request.query_params.get("limit", 50))))
        total = qs.count()
        offset = (page - 1) * limit
        rows = qs[offset:offset + limit]
        return Response({
            "messages": [_msg(m, creator_id=chat.creator_id) for m in rows],
            "total": total,
        })


def _chat_row(c: Chat) -> dict:
    return {
        "id": c.id,
        "cid": c.cid,
        "name": c.name,
        "creatorId": c.creator_id,
        "lastActivity": c.last_activity.isoformat() if c.last_activity else None,
        "createdAt": c.created_at.isoformat() if c.created_at else None,
    }


def _msg(m, creator_id: str | None = None) -> dict:
    # OLD admin/chats.ts:494-501 shipped an author object + isCreator so the
    # admin table renders names/avatars instead of raw cuids.
    author = getattr(m, "author", None)
    return {
        "id": m.id,
        "content": m.content if not m.deleted else None,
        "authorId": m.author_id,
        "author": {
            "displayName": getattr(author, "display_name", None),
            "username": getattr(author, "username", None),
            "image": getattr(author, "image", None),
        } if author else None,
        "isCreator": (m.author_id == creator_id) if creator_id is not None else None,
        "createdAt": m.created_at.isoformat() if m.created_at else None,
        "deleted": m.deleted,
        "edited": m.edited,
    }


def _member(m) -> dict | None:
    """Accept either a ChatMember instance or a `.values()` dict so callers
    can avoid materializing rows from the composite-key `chat_members` table."""
    if m is None:
        return None
    if isinstance(m, dict):
        return {
            "userId": m.get("user_id"),
            "email": m.get("user__email"),
            "displayName": m.get("user__display_name"),
            # OLD admin/chats.ts:355-379 shipped username + avatar too.
            "username": m.get("user__username"),
            "image": m.get("user__image"),
        }
    return {
        "userId": m.user_id,
        "email": m.user.email if m.user else None,
        "displayName": m.user.display_name if m.user else None,
        "username": m.user.username if m.user else None,
        "image": m.user.image if m.user else None,
    }
