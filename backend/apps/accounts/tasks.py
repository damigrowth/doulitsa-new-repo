"""Celery tasks for the accounts app.

`cleanup_expired_pending_registrations` is scheduled hourly by
`CELERY_BEAT_SCHEDULE["accounts-cleanup-pending-registrations"]`
(config/settings/base.py). Before this module existed, the worker logged
"Received unregistered task" every hour and the rows were never pruned
(P5-BR-2).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="apps.accounts.tasks.cleanup_expired_pending_registrations")
def cleanup_expired_pending_registrations() -> int:
    """Delete `pending_registrations` rows whose `expiresAt` has passed.

    These are short-lived OAuth registration intents (24h expiry); once
    expired nothing reads them. Returns the number of rows deleted.
    """
    from apps.accounts.models import PendingRegistration

    deleted, _ = PendingRegistration.objects.filter(
        expires_at__lt=datetime.now(timezone.utc)
    ).delete()
    if deleted:
        logger.info("pending_registrations.cleanup", extra={"deleted": deleted})
    return int(deleted)
