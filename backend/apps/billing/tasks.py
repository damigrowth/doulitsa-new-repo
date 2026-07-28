"""Celery tasks for billing.

`process_worldline_renewals` (row 11) — full port of
app_before_migrations/src/app/api/cron/worldline-renewals/route.ts:

  1. Active subscriptions due for renewal (currentPeriodEnd <= tomorrow).
  2. Past-due subscriptions eligible for retry (up to 3 attempts every 3 days,
     then canceled).

Each charge goes through the signed XML SaleRequest v2.1 using the stored token
(providers.worldline_charge_recurring -> worldline.execute_recurring_charge), the
period is advanced by the Athens-calendar cycle, and a PaymentAttempt is recorded on
both success and failure. The real logic lives in services/renewals.py so the
Django cron view (Bearer CRON_SECRET) and this Celery task share one implementation.
"""
from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="apps.billing.tasks.process_worldline_renewals")
def process_worldline_renewals() -> dict[str, int]:
    """Charge each due/retry-eligible Worldline subscription via the stored token."""
    from apps.billing.services.renewals import run_worldline_renewals

    results = run_worldline_renewals()
    logger.info("[Worldline Renewals] %s", results)
    return results
