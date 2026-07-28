"""Presence URL routes (row 109). Mounted at /api/presence/."""
from __future__ import annotations

from django.urls import path

from apps.messaging.views.public.chats import PresenceUpdateView

app_name = "messaging_presence"

urlpatterns = [
    path("", PresenceUpdateView.as_view(), name="update"),  # 109
]
