"""profiles Django app config."""
from __future__ import annotations

from django.apps import AppConfig


class ProfilesConfig(AppConfig):
    name = "apps.profiles"
    label = "profiles"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        from apps.profiles import signals  # noqa: F401  (cache-invalidation signals)
