"""User-scoped URL routes for blocking + presence (rows 105-108, 110).
Mounted at /api/users/."""
from __future__ import annotations

from django.urls import path

from apps.messaging.views.public.chats import (
    UserBlockedListView,
    UserBlockedStatusView,
    UserBlockView,
    UserPresenceView,
)

app_name = "messaging_users"

urlpatterns = [
    path("me/blocked", UserBlockedListView.as_view(), name="me-blocked"),                 # 107
    path("<str:user_id>/block", UserBlockView.as_view(), name="block"),                    # 105 + 106
    path("<str:user_id>/blocked-status", UserBlockedStatusView.as_view(), name="blocked-status"),  # 108
    path("<str:user_id>/presence", UserPresenceView.as_view(), name="presence"),           # 110
]
