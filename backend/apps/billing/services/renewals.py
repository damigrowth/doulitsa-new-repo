"""Worldline recurring-billing renewal state machine.

Full port of app_before_migrations/src/app/api/cron/worldline-renewals/route.ts.

Runs daily. Handles:
  1. Active subscriptions due for renewal (currentPeriodEnd <= tomorrow).
  2. Past-due subscriptions eligible for retry (MAX 3 attempts every 3 days, then cancel).

Each renewal triggers a signed XML SaleRequest v2.1 with the stored token, advances the
billing period by the Athens-calendar cycle (30/365), and records a PaymentAttempt on
both success and failure (source cron_renewal / cron_retry). Token-expiry pushes the sub
to past_due. After MAX_RETRY_ATTEMPTS * RETRY_INTERVAL_DAYS days past due, the sub is
canceled (status canceled, plan free, un-featured).
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from apps.billing.models import (
    BillingInterval,
    Subscription,
    SubscriptionPlan,
    SubscriptionProvider,
    SubscriptionStatus,
)
from apps.billing.services import providers as providers_module
from apps.billing.services import worldline as wl
from apps.billing.services.pricing import get_plan_amount
from apps.billing.services.record_attempt import record_payment_attempt

logger = logging.getLogger(__name__)

# After all retries exhausted, the subscription is canceled. Retries every 3 days
# (cron runs daily, checks retryAfter) — route.ts:16-17.
MAX_RETRY_ATTEMPTS = 3
RETRY_INTERVAL_DAYS = 3


def _is_token_expired(token_exp: str | None) -> bool:
    """Token expiration format YYYYMMDD — route.ts:23-30."""
    if not token_exp or len(token_exp) != 8:
        return False
    try:
        year, month, day = int(token_exp[:4]), int(token_exp[4:6]), int(token_exp[6:8])
        exp_date = datetime(year, month, day, tzinfo=timezone.utc)
    except ValueError:
        return False
    return exp_date < datetime.now(timezone.utc)


def _to_base36(n: int) -> str:
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0:
        return "0"
    digits: list[str] = []
    while n:
        n, rem = divmod(n, 36)
        digits.append(alphabet[rem])
    return "".join(reversed(digits))


def _amount_eur_str(billing_interval: str | None) -> str:
    interval = "year" if billing_interval == BillingInterval.YEAR else "month"
    return f"{get_plan_amount(interval) / 100:.2f}"


def run_worldline_renewals() -> dict[str, Any]:
    """Process all due renewals + past_due retries. Returns the OLD results dict."""
    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(days=1)

    # 1. Active subscriptions due for renewal — route.ts:55-67.
    due_subs = list(Subscription.objects.filter(
        provider=SubscriptionProvider.WORLDLINE,
        status=SubscriptionStatus.ACTIVE,
        plan=SubscriptionPlan.PROMOTED,
        cancel_at_period_end=False,
        worldline_token__isnull=False,
        current_period_end__lte=tomorrow,
    ).exclude(worldline_token=""))

    # 2. Past_due subscriptions eligible for retry — route.ts:70-86.
    retry_date = now - timedelta(days=RETRY_INTERVAL_DAYS)
    retry_subs = list(Subscription.objects.filter(
        provider=SubscriptionProvider.WORLDLINE,
        status=SubscriptionStatus.PAST_DUE,
        plan=SubscriptionPlan.PROMOTED,
        worldline_token__isnull=False,
        last_payment_at__lte=retry_date,
    ).exclude(worldline_token=""))

    results: dict[str, Any] = {
        "total": len(due_subs) + len(retry_subs),
        "renewed": 0,
        "retried": 0,
        "failed": 0,
        "expired_tokens": 0,
        "canceled_after_retries": 0,
        "errors": [],
    }

    for sub in due_subs:
        _process_renewal(sub, now, results, is_retry=False)

    for sub in retry_subs:
        days_past_due = (
            (now - sub.current_period_end).days if sub.current_period_end else 0
        )
        max_retry_days = MAX_RETRY_ATTEMPTS * RETRY_INTERVAL_DAYS
        if days_past_due > max_retry_days:
            _cancel_expired_subscription(sub, now)
            results["canceled_after_retries"] += 1
            continue
        _process_renewal(sub, now, results, is_retry=True)

    return results


def _process_renewal(sub: Subscription, now: datetime, results: dict[str, Any], *, is_retry: bool) -> None:
    """Charge one subscription, advance period or set past_due, record attempt. route.ts:129-286."""
    if not sub.worldline_token:
        return

    # Token-expiry check — route.ts:139-149.
    if _is_token_expired(sub.worldline_token_exp):
        logger.warning(
            "[Worldline Renewals] Token expired for %s, exp: %s", sub.profile_id, sub.worldline_token_exp,
        )
        sub.status = SubscriptionStatus.PAST_DUE
        sub.save(update_fields=["status", "updated_at"])
        results["expired_tokens"] += 1
        results["errors"].append(f"{sub.profile_id}: token expired ({sub.worldline_token_exp})")
        return

    source = "cron_retry" if is_retry else "cron_renewal"
    amount_eur = _amount_eur_str(sub.billing_interval)
    amount_cents = round(float(amount_eur) * 100)

    try:
        safe_pid = re.sub(r"[^a-zA-Z0-9]", "", sub.profile_id or "")
        renewal_order_id = f"RNW{safe_pid}{_to_base36(int(now.timestamp() * 1000))}"[:50]
        frequency_days = "365" if sub.billing_interval == BillingInterval.YEAR else "30"
        recurring_end_date = (now + timedelta(days=365)).strftime("%Y%m%d")

        # Look up the user email for the charge (route.ts:161-164).
        email = ""
        try:
            from apps.profiles.models import Profile
            prof = Profile.objects.select_related("user").filter(id=sub.profile_id).first()
            if prof and getattr(prof, "user", None):
                email = prof.user.email or ""
        except ImportError:
            pass

        result = providers_module.worldline_charge_recurring(
            sub,
            order_id=renewal_order_id,
            amount_eur=amount_eur,
            recurring_frequency=frequency_days,
            recurring_end_date=recurring_end_date,
            email=email,
        )

        status_value = (result.get("status") or "").upper()
        if status_value in ("CAPTURED", "AUTHORIZED"):
            new_period_start = sub.current_period_end or now
            cycle_days = 365 if sub.billing_interval == BillingInterval.YEAR else 30
            new_period_end = new_period_start + timedelta(days=cycle_days)

            sub.status = SubscriptionStatus.ACTIVE
            sub.current_period_start = new_period_start
            sub.current_period_end = new_period_end
            sub.last_payment_at = now
            sub.payment_count = (sub.payment_count or 0) + 1
            sub.total_paid_lifetime = (sub.total_paid_lifetime or 0) + amount_cents
            sub.amount = amount_cents
            sub.save()

            if is_retry:
                _set_featured(sub.profile_id, True)

            record_payment_attempt(
                subscription_id=sub.id,
                status=status_value,
                source=source,
                amount=amount_cents,
                currency=(sub.currency or "EUR").lower(),
                tx_id=result.get("txId") or None,
                payment_ref=result.get("paymentRef") or None,
                order_id=renewal_order_id,
                message=result.get("message") or None,
            )
            # Admin notification for the successful renewal charge (fa99986a).
            from apps.billing.services.subscription_ops import _notify_subscription_payment
            _notify_subscription_payment(
                sub,
                is_renewal=True,
                amount_cents=amount_cents,
                currency=(sub.currency or "EUR").lower(),
                order_id=renewal_order_id,
                payment_ref=result.get("paymentRef"),
            )
            results["retried" if is_retry else "renewed"] += 1
        else:
            # Charge failed — past_due + (first failure) un-feature, record. route.ts:228-268.
            sub.status = SubscriptionStatus.PAST_DUE
            sub.save(update_fields=["status", "updated_at"])
            if not is_retry:
                _set_featured(sub.profile_id, False)

            record_payment_attempt(
                subscription_id=sub.id,
                status=status_value or "ERROR",
                source=source,
                amount=amount_cents,
                currency=(sub.currency or "EUR").lower(),
                tx_id=result.get("txId") or None,
                payment_ref=result.get("paymentRef") or None,
                order_id=renewal_order_id,
                message=result.get("message") or None,
                # Failed rows must always explain themselves in the history.
                error_message=(
                    result.get("message")
                    or f"Gateway returned {status_value or 'ERROR'} with no message"
                ),
            )
            results["failed"] += 1
            results["errors"].append(f"{sub.profile_id}: {status_value} - {result.get('message')}")
    except Exception as error:  # noqa: BLE001 — network/XML errors recorded as ERROR. route.ts:269-285.
        err_msg = str(error)
        record_payment_attempt(
            subscription_id=sub.id,
            status="ERROR",
            source=source,
            amount=amount_cents,
            currency=(sub.currency or "EUR").lower(),
            error_message=err_msg,
        )
        results["failed"] += 1
        results["errors"].append(f"{sub.profile_id}: {err_msg}")


def _cancel_expired_subscription(sub: Subscription, now: datetime) -> None:
    """Cancel after exhausted retries: status canceled, plan free, un-feature. route.ts:288-319."""
    sub.status = SubscriptionStatus.CANCELED
    sub.canceled_at = now
    sub.plan = SubscriptionPlan.FREE
    sub.save(update_fields=["status", "canceled_at", "plan", "updated_at"])
    _set_featured(sub.profile_id, False)
    logger.info(
        "[Worldline Renewals] Canceled subscription for %s after %s failed retries",
        sub.profile_id, MAX_RETRY_ATTEMPTS,
    )


def _set_featured(profile_id: str | None, featured: bool) -> None:
    if not profile_id:
        return
    try:
        from apps.profiles.models import Profile
        Profile.objects.filter(id=profile_id).update(featured=featured)
    except ImportError:
        pass
