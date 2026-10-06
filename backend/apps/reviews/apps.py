"""reviews Django app config."""
from __future__ import annotations

from django.apps import AppConfig


class ReviewsConfig(AppConfig):
    name = "apps.reviews"
    label = "reviews"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        from apps.reviews import signals  # noqa: F401  (cache-invalidation signals)
