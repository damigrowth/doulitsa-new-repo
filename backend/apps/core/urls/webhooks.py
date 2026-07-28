"""Core webhook URL routes (row 8). Mounted at /api/webhooks/ from config/urls.py."""
from __future__ import annotations

from django.urls import path

from apps.core.views.admin.cache import RevalidateWebhookView

app_name = "core_webhooks"

urlpatterns = [
    path("revalidate-cache", RevalidateWebhookView.as_view(), name="revalidate-webhook"),  # row 8
]
