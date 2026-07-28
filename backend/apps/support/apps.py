"""support Django app config."""
from __future__ import annotations

from django.apps import AppConfig


class SupportConfig(AppConfig):
    name = "apps.support"
    label = "support"
    default_auto_field = "django.db.models.BigAutoField"
