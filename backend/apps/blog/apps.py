"""blog Django app config."""
from __future__ import annotations

from django.apps import AppConfig


class BlogConfig(AppConfig):
    name = "apps.blog"
    label = "blog"
    default_auto_field = "django.db.models.BigAutoField"
