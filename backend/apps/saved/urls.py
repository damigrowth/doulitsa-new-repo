"""Saved URL routes. Mounted at /api/saved/ from config/urls.py."""
from __future__ import annotations

from django.urls import path

from apps.saved.views.public.saved import SavedListView, SavedStateView, SavedToggleView

app_name = "saved"

urlpatterns = [
    path("toggle", SavedToggleView.as_view(), name="toggle"),  # row 90
    path("state", SavedStateView.as_view(), name="state"),     # row 92
    path("", SavedListView.as_view(), name="list"),            # row 91
]
