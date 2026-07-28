"""Message URL routes (rows 98-100, 112-114). Mounted at /api/messages/."""
from __future__ import annotations

from django.urls import path

from apps.messaging.views.public.chats import (
    MarkReadView,
    MessageDetailView,
    ReactionAddView,
    ReactionRemoveView,
    ReactionToggleView,
)

app_name = "messaging_messages"

urlpatterns = [
    path("mark-read", MarkReadView.as_view(), name="mark-read"),                                 # 100
    path("<str:message_id>", MessageDetailView.as_view(), name="detail"),                        # 98 + 99
    path("<str:message_id>/reactions/toggle", ReactionToggleView.as_view(), name="rx-toggle"),    # 112
    path("<str:message_id>/reactions", ReactionAddView.as_view(), name="rx-add"),                 # 113
    path("<str:message_id>/reactions/<str:emoji>", ReactionRemoveView.as_view(), name="rx-rm"),  # 114
]
