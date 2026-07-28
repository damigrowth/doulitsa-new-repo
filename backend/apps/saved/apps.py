"""saved Django app config."""
from __future__ import annotations

from django.apps import AppConfig


class SavedConfig(AppConfig):
    name = "apps.saved"
    label = "saved"
    default_auto_field = "django.db.models.BigAutoField"
