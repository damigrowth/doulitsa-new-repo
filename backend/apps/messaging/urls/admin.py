"""Admin messaging URLs (rows 139-143). Mounted at /api/admin/chats/."""
from __future__ import annotations

from django.urls import path

from apps.messaging.views.admin.chats import (
    AdminChatDetailView,
    AdminChatListView,
    AdminChatMessagesView,
    AdminChatStatsForChatView,
    AdminChatStatsView,
)

app_name = "messaging_admin"

urlpatterns = [
    path("", AdminChatListView.as_view(), name="list"),                                # 140
    path("stats", AdminChatStatsView.as_view(), name="stats"),                          # 139
    path("<str:chat_id>", AdminChatDetailView.as_view(), name="detail"),                # 141
    path("<str:chat_id>/stats", AdminChatStatsForChatView.as_view(), name="chat-stats"), # 142
    path("<str:chat_id>/messages", AdminChatMessagesView.as_view(), name="messages"),    # 143
]
