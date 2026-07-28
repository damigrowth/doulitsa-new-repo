"""Best-effort payment-attempt audit log.

Ported from `lib/payment/record-attempt.ts`.

Writes one row to `subscription_payment_attempts`. Wrapped in try/except so a
history-logging failure NEVER bubbles up into the calling webhook / cron — the
production payment flow must not break because the audit log couldn't be written.

Always call OUTSIDE the surrounding `transaction.atomic()` block so a failed write
here cannot roll back the actual payment update.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def record_payment_attempt(
    *,
    subscription_id: str,
    status: str,
    source: str,
    amount: int,
    currency: str | None = None,
    sequence: int | None = None,
    tx_id: str | None = None,
    payment_ref: str | None = None,
    order_id: str | None = None,
    message: str | None = None,
    error_message: str | None = None,
) -> None:
    try:
        from apps.billing.models import SubscriptionPaymentAttempt

        SubscriptionPaymentAttempt.objects.create(
            subscription_id=subscription_id,
            status=status,
            source=source,
            amount=amount,
            currency=(currency or "eur"),
            sequence=sequence,
            tx_id=tx_id or None,
            payment_ref=payment_ref or None,
            order_id=order_id or None,
            message=message or None,
            error_message=error_message or None,
        )
    except Exception as error:  # noqa: BLE001 — swallow intentionally
        logger.error(
            "[PaymentAttempt] Failed to record attempt for subscription %s source=%s status=%s: %s",
            subscription_id, source, status, error,
        )
