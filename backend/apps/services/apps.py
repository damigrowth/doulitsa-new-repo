"""services Django app config."""
from __future__ import annotations

from django.apps import AppConfig


class ServicesConfig(AppConfig):
    name = "apps.services"
    label = "services"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        from apps.services import signals  # noqa: F401  (cache-invalidation signals)
