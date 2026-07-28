"""Celery application — beat schedule lives in `settings.base.CELERY_BEAT_SCHEDULE`."""
from __future__ import annotations

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("django_backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self) -> None:
    """Sanity-check task. Run via `celery -A config call config.celery.debug_task`."""
    print(f"Request: {self.request!r}")  # noqa: T201
