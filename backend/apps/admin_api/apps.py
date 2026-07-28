"""admin_api Django app config."""
from __future__ import annotations

from django.apps import AppConfig


class AdminApiConfig(AppConfig):
    name = "apps.admin_api"
    label = "admin_api"
    verbose_name = "Admin API (cross-cutting)"
    default_auto_field = "django.db.models.BigAutoField"
