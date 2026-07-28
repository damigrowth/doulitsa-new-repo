"""Celery tasks for the services app. Scheduled via CELERY_BEAT_SCHEDULE.

Tasks here:
- `auto_refresh_promoted`  daily — bump refreshedAt + sortDate for promoted
                                    subscribers' published services. Mirrors
                                    the `/api/cron/auto-refresh` Vercel cron.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)


@shared_task(name="apps.services.tasks.auto_refresh_promoted")
def auto_refresh_promoted() -> dict[str, int]:
    """Daily — bump refreshedAt + sortDate for published services owned by
    a profile with an active promoted subscription.
    """
    from apps.services.models import Service, ServiceStatus

    try:
        from apps.billing.models.subscription import Subscription, SubscriptionPlan, SubscriptionStatus
    except ImportError:
        logger.warning("auto_refresh.billing_unavailable")
        return {"refreshed": 0}

    now = datetime.now(timezone.utc)
    active_pids = list(
        Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            plan=SubscriptionPlan.PROMOTED,
        ).values_list("profile_id", flat=True)
    )
    if not active_pids:
        return {"refreshed": 0}

    with transaction.atomic():
        updated = Service.objects.filter(
            profile_id__in=active_pids,
            status=ServiceStatus.PUBLISHED,
        ).update(refreshed_at=now, sort_date=now, updated_at=now)
    logger.info("auto_refresh.done", extra={"refreshed": updated})
    return {"refreshed": int(updated)}
