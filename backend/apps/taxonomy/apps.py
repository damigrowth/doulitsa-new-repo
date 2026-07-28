"""taxonomy Django app config."""
from __future__ import annotations

from django.apps import AppConfig


class TaxonomyConfig(AppConfig):
    name = "apps.taxonomy"
    label = "taxonomy"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        from apps.taxonomy import signals  # noqa: F401  (cache-invalidation signals)
