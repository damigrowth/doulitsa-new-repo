"""Public chat / message / presence / blocking / reactions views.

Rows 93-114.
"""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.messaging.services import chat_ops
from common.exceptions import NotFound


# ----- serializers --------------------------------------------------------


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1, max_length=20000)
    replyToId = serializers.CharField(required=False, allow_null=True, max_length=64)


class EditMessageSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1, max_length=20000)


class MarkReadSerializer(serializers.Serializer):
    messageIds = serializers.ListField(child=serializers.CharField(max_length=64), max_length=200)


class BatchUnreadSerializer(serializers.Serializer):
    chatIds = serializers.ListField(child=serializers.CharField(max_length=64), max_length=200)


class PresenceSerializer(serializers.Serializer):
    online = serializers.BooleanField()


class ReactionSerializer(serializers.Serializer):
    emoji = serializers.CharField(min_length=1, max_length=64)


class BlockReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=2000)


# ----- chat list / detail ------------------------------------------------


class ChatListView(APIView):
    """GET /api/chats (row 93)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(chat_ops.list_chats(request.user))


class ChatDetailView(APIView):
    """GET /api/chats/{chatId} (row 94)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, chat_id):
        payload = chat_ops.get_chat(request.user, chat_id)
        if payload is None:
            raise NotFound("Chat not found")
        return Response(payload)


class ChatWithUserView(APIView):
    """POST /api/chats/with/{otherUserId} (row 95)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, other_user_id):
        return Response(chat_ops.get_or_create_dm(request.user, other_user_id))


# ----- messages list / send / edit / delete ------------------------------


class ChatMessagesView(APIView):
    """GET /api/chats/{chatId}/messages (row 96) + POST send (row 97)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, chat_id):
        # OLD default page size is 20 (messages.ts:17), not 50.
        return Response(chat_ops.list_messages(
            user=request.user, chat_id=chat_id,
            limit=int(request.query_params.get("limit", 20)),
            before=request.query_params.get("before"),
        ))

    @extend_schema(request=SendMessageSerializer)
    def post(self, request, chat_id):
        s = SendMessageSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(chat_ops.send_message(
            author=request.user, chat_id=chat_id,
            content=s.validated_data["content"],
            reply_to_id=s.validated_data.get("replyToId"),
        ), status=status.HTTP_201_CREATED)


class MessageDetailView(APIView):
    """PATCH /api/messages/{id} (row 98) + DELETE (row 99)."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=EditMessageSerializer)
    def patch(self, request, message_id):
        s = EditMessageSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(chat_ops.edit_message(
            user=request.user, message_id=message_id, content=s.validated_data["content"]
        ))

    def delete(self, request, message_id):
        chat_ops.delete_message(user=request.user, message_id=message_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MarkReadView(APIView):
    """POST /api/messages/mark-read (row 100)."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=MarkReadSerializer)
    def post(self, request):
        s = MarkReadSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        marked = chat_ops.mark_messages_read(user=request.user, message_ids=s.validated_data["messageIds"])
        return Response({"marked": marked})


# ----- unread counts -----------------------------------------------------


class ChatUnreadCountView(APIView):
    """GET /api/chats/{chatId}/unread/count (row 101)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, chat_id):
        return Response(chat_ops.unread_count(user=request.user, chat_id=chat_id))


class ChatBatchUnreadView(APIView):
    """POST /api/chats/unread/counts (row 102)."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=BatchUnreadSerializer)
    def post(self, request):
        s = BatchUnreadSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(chat_ops.batch_unread_counts(user=request.user, chat_ids=s.validated_data["chatIds"]))


class ChatUnreadTotalView(APIView):
    """GET /api/chats/unread/total (row 103)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(chat_ops.total_unread(request.user))


class ChatRecentUnreadView(APIView):
    """GET /api/chats/me/recent-unread (row 104)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"messages": chat_ops.recent_unread_messages(
            user=request.user,
            minutes=int(request.query_params.get("minutes", 15)),
        )})


# ----- blocking ----------------------------------------------------------


class UserBlockView(APIView):
    """POST /api/users/{id}/block (105) + DELETE unblock (106)."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=BlockReasonSerializer)
    def post(self, request, user_id):
        s = BlockReasonSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        chat_ops.block_user(
            blocker=request.user, blocked_id=user_id,
            reason=s.validated_data.get("reason"),
        )
        return Response({"blocked": user_id})

    def delete(self, request, user_id):
        chat_ops.unblock_user(blocker=request.user, blocked_id=user_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserBlockedListView(APIView):
    """GET /api/users/me/blocked (row 107)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(chat_ops.list_blocked(request.user))


class UserBlockedStatusView(APIView):
    """GET /api/users/{id}/blocked-status (row 108)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        return Response(chat_ops.is_blocked_either_way(request.user.id, user_id))


# ----- presence ----------------------------------------------------------


class PresenceUpdateView(APIView):
    """POST /api/presence (row 109)."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=PresenceSerializer)
    def post(self, request):
        s = PresenceSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        chat_ops.set_presence(request.user, s.validated_data["online"])
        return Response({"online": s.validated_data["online"]})


class UserPresenceView(APIView):
    """GET /api/users/{id}/presence (row 110)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        return Response(chat_ops.get_presence(user_id))


class ChatsPresenceSummaryView(APIView):
    """GET /api/chats/me/presence-summary (row 111)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(chat_ops.my_chats_with_presence(request.user))


# ----- reactions ---------------------------------------------------------


class ReactionToggleView(APIView):
    """POST /api/messages/{id}/reactions/toggle (row 112)."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=ReactionSerializer)
    def post(self, request, message_id):
        s = ReactionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response({"reactions": chat_ops.toggle_reaction(
            user=request.user, message_id=message_id, emoji=s.validated_data["emoji"]
        )})


class ReactionAddView(APIView):
    """POST /api/messages/{id}/reactions (row 113)."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=ReactionSerializer)
    def post(self, request, message_id):
        s = ReactionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        chat_ops.add_reaction(user=request.user, message_id=message_id, emoji=s.validated_data["emoji"])
        return Response({"added": s.validated_data["emoji"]})


class ReactionRemoveView(APIView):
    """DELETE /api/messages/{id}/reactions/{emoji} (row 114)."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, message_id, emoji):
        chat_ops.remove_reaction(user=request.user, message_id=message_id, emoji=emoji)
        return Response(status=status.HTTP_204_NO_CONTENT)
