"""Core admin URL routes (row 243). Mounted at /api/admin/ from config/urls.py."""
from __future__ import annotations

from django.urls import path

from apps.core.views.admin.cache import RevalidateAllCachesView

app_name = "core_admin"

urlpatterns = [
    path("cache/revalidate-all", RevalidateAllCachesView.as_view(), name="revalidate-all"),  # row 243
]
