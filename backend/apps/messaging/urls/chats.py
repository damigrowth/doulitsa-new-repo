"""Chat URL routes (rows 93-104, 111). Mounted at /api/chats/."""
from __future__ import annotations

from django.urls import path

from apps.messaging.views.public.chats import (
    ChatBatchUnreadView,
    ChatDetailView,
    ChatListView,
    ChatMessagesView,
    ChatRecentUnreadView,
    ChatsPresenceSummaryView,
    ChatUnreadCountView,
    ChatUnreadTotalView,
    ChatWithUserView,
)

app_name = "messaging_chats"

urlpatterns = [
    path("", ChatListView.as_view(), name="list"),                                                  # 93
    path("unread/counts", ChatBatchUnreadView.as_view(), name="unread-batch"),                       # 102
    path("unread/total", ChatUnreadTotalView.as_view(), name="unread-total"),                        # 103
    path("me/recent-unread", ChatRecentUnreadView.as_view(), name="recent-unread"),                  # 104
    path("me/presence-summary", ChatsPresenceSummaryView.as_view(), name="presence-summary"),        # 111
    path("with/<str:other_user_id>", ChatWithUserView.as_view(), name="with-user"),                  # 95
    path("<str:chat_id>", ChatDetailView.as_view(), name="detail"),                                  # 94
    path("<str:chat_id>/messages", ChatMessagesView.as_view(), name="messages"),                     # 96 + 97
    path("<str:chat_id>/unread/count", ChatUnreadCountView.as_view(), name="unread"),                # 101
]
