"""Subscription operations (rows 115-121, 178-183) + Worldline webhook handler."""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

from django.db import transaction

from apps.accounts.models import User
from apps.billing.models import (
    BillingInterval,
    Subscription,
    SubscriptionPlan,
    SubscriptionProvider,
    SubscriptionStatus,
)
from apps.billing.services import providers as providers_module
from common.exceptions import ApiError

logger = logging.getLogger(__name__)


def _profile_or_400(user: User):
    try:
        from apps.profiles.models import Profile
    except ImportError as exc:
        raise ApiError("Profiles app required", code="dependency", status_code=500) from exc
    profile = Profile.objects.filter(user_id=user.id).first()
    if profile is None:
        raise ApiError("Profile missing", code="profile_missing", status_code=400)
    return profile


def _ensure_subscription(profile) -> Subscription:
    sub, _ = Subscription.objects.get_or_create(
        profile=profile,
        defaults={
            "provider": providers_module.get_provider(),
            "plan": SubscriptionPlan.FREE,
            "status": SubscriptionStatus.INCOMPLETE,
        },
    )
    return sub


def create_checkout(*, user: User, billing_interval: str, coupon_code: str | None) -> dict[str, str]:
    from apps.billing.services.pricing import find_coupon

    profile = _profile_or_400(user)

    # Validate coupon server-side (create-checkout-session.ts:38-47).
    if coupon_code:
        coupon = find_coupon(coupon_code)
        if not coupon:
            raise ApiError("Μη έγκυρο κουπόνι", code="invalid_coupon", status_code=400)
        if billing_interval not in coupon.get("applicableIntervals", []):
            raise ApiError(
                "Το κουπόνι ισχύει μόνο για ετήσια συνδρομή",
                code="coupon_interval", status_code=400,
            )

    sub = _ensure_subscription(profile)

    # Already-active guard — block re-subscribe / double-charge (create-checkout-session.ts:59-65).
    if sub.status == SubscriptionStatus.ACTIVE:
        raise ApiError("Έχετε ήδη ενεργή συνδρομή", code="already_active", status_code=409)

    # Copy billing snapshot from profile
    sub.billing = profile.billing or {}
    sub.billing_interval = billing_interval
    sub.save(update_fields=["billing", "billing_interval", "updated_at"])

    # Phone formatting: strip non-digits, prepend Greek country code, keep '+'
    # (create-checkout-session.ts:82-91).
    phone: str | None = None
    raw_phone = (profile.phone or "").strip()
    if raw_phone:
        digits = re.sub(r"\D", "", raw_phone)
        phone = f"+{digits}" if digits.startswith("30") else f"+30{digits}"

    # Address prefill from the billing snapshot (create-checkout-session.ts:107-109).
    billing_data = profile.billing if isinstance(profile.billing, dict) else {}
    address = None
    if billing_data.get("address"):
        address = {"line1": billing_data["address"], "country": "GR"}

    return providers_module.create_checkout(
        subscription=sub,
        billing_interval=billing_interval,
        coupon_code=coupon_code,
        customer={
            "email": user.email,
            "name": billing_data.get("name") or user.display_name or user.name,
            "phone": phone,
            "address": address,
        },
    )


def cancel(*, user: User, at_period_end: bool = True) -> dict[str, Any]:
    profile = _profile_or_400(user)
    sub = Subscription.objects.filter(profile=profile).first()
    if sub is None:
        raise ApiError("No subscription found", code="no_subscription", status_code=404)
    providers_module.cancel_subscription(sub, at_period_end=at_period_end)
    return {"canceledAt": sub.canceled_at.isoformat() if sub.canceled_at else None}


def restore(*, user: User) -> dict[str, Any]:
    profile = _profile_or_400(user)
    sub = Subscription.objects.filter(profile=profile).first()
    if sub is None:
        raise ApiError("No subscription found", code="no_subscription", status_code=404)
    providers_module.restore_subscription(sub)
    return {"restored": True}


def get_for_user(user: User) -> dict[str, Any] | None:
    profile = _profile_or_400(user)
    sub = Subscription.objects.filter(profile=profile).first()
    if sub is None:
        return None
    return _row(sub)


HISTORY_PAGE_SIZE = 10


def _attempt_row(a) -> dict[str, Any]:
    """One payment-attempt row (matches OLD PaymentAttemptRow — payment-attempts-list.tsx)."""
    return {
        "id": a.id,
        "status": a.status,
        "source": a.source,
        "amount": a.amount,
        "currency": a.currency,
        "sequence": a.sequence,
        "txId": a.tx_id,
        "orderId": a.order_id,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
    }


def list_payment_attempts(*, subscription_id: str, page: int = 1, page_size: int = HISTORY_PAGE_SIZE) -> dict[str, Any]:
    """Paginated payment-attempt history for one subscription (OLD promote/page.tsx:38-55).

    Newest first. Returns {attempts, total, page, totalPages, pageSize}.
    """
    from apps.billing.models import SubscriptionPaymentAttempt

    page = max(1, int(page or 1))
    page_size = max(1, min(int(page_size or HISTORY_PAGE_SIZE), 100))
    qs = SubscriptionPaymentAttempt.objects.filter(subscription_id=subscription_id).order_by("-created_at")
    total = qs.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    page = min(page, total_pages)
    offset = (page - 1) * page_size
    rows = [_attempt_row(a) for a in qs[offset:offset + page_size]]
    return {"attempts": rows, "total": total, "page": page, "totalPages": total_pages, "pageSize": page_size}


def list_payment_attempts_for_user(*, user: User, page: int = 1) -> dict[str, Any]:
    """The caller's own subscription payment history (empty when no subscription)."""
    profile = _profile_or_400(user)
    sub = Subscription.objects.filter(profile=profile).first()
    if sub is None:
        return {"attempts": [], "total": 0, "page": 1, "totalPages": 1, "pageSize": HISTORY_PAGE_SIZE}
    return list_payment_attempts(subscription_id=sub.id, page=page)


def sync_billing_from_profile(*, user: User) -> dict[str, Any]:
    """Fallback billing sync (sync-billing.ts:11-66).

    OLD only syncs when subscription.billing is null AND profile.billing is not null,
    then verifies the write actually persisted before reporting success.
    """
    profile = _profile_or_400(user)
    sub = Subscription.objects.filter(profile=profile).first()
    if sub is None:
        raise ApiError("Subscription not found", code="not_found", status_code=404)

    if sub.billing is None and profile.billing is not None:
        sub.billing = profile.billing
        sub.save(update_fields=["billing", "updated_at"])

        # Verify the update actually persisted (sync-billing.ts:43-56).
        verify = Subscription.objects.filter(profile=profile).only("id", "billing").first()
        import json as _json
        if _json.dumps(profile.billing, sort_keys=True) != _json.dumps(
            verify.billing if verify else None, sort_keys=True
        ):
            logger.error("[SyncBilling] UPDATE FAILED - billing was not saved correctly!")
            raise ApiError("Failed to persist billing data", code="persist_failed", status_code=500)
        return {"synced": True}

    return {"synced": False}


def toggle_featured_service(*, user: User, service_id: int) -> dict[str, Any]:
    """Feature-gate by promoted subscription (max featured services per plan)."""
    try:
        from apps.services.models import Service
        # Single source of truth for plan limits — promoted.maxFeaturedServices=3
        # (mirrors SUBSCRIPTION_PLANS in frontend/src/lib/payment/pricing.ts).
        from apps.services.selectors.service_reads import _PLAN_LIMITS
    except ImportError:
        raise ApiError("Services app required", code="dependency", status_code=500)

    profile = _profile_or_400(user)
    if not _has_active_promoted(profile):
        raise ApiError(
            "Active promoted subscription required",
            code="subscription_required", status_code=403,
        )

    service = Service.objects.filter(id=service_id, profile=profile).first()
    if service is None:
        raise ApiError("Service not found", code="service_not_found", status_code=404)

    # Only published services can be featured (OLD toggle-featured-service.ts:46-48).
    if not service.featured and service.status != "published":
        raise ApiError(
            "Μόνο δημοσιευμένες υπηρεσίες μπορούν να προβληθούν",
            code="service_not_published", status_code=400,
        )

    max_featured = _PLAN_LIMITS["promoted"]["maxFeaturedServices"]
    current_featured = Service.objects.filter(profile=profile, featured=True).count()
    if not service.featured and current_featured >= max_featured:
        raise ApiError(
            f"Max {max_featured} featured services per profile",
            code="featured_limit",
            status_code=409,
            details={"max": max_featured},
        )

    service.featured = not service.featured
    service.save(update_fields=["featured", "updated_at"])
    return {"featured": service.featured}


def _has_active_promoted(profile) -> bool:
    sub = Subscription.objects.filter(profile=profile).first()
    return bool(sub and sub.status == SubscriptionStatus.ACTIVE and sub.plan == SubscriptionPlan.PROMOTED)


# ----- Webhook handler (row 7) -------------------------------------------
#
# Full port of app_before_migrations/src/app/api/webhooks/worldline/route.ts.
# Handles three POST types from Cardlink:
#   1. Initial payment result (browser redirect)        -> handle_payment_success / failure log
#   2. Scheduled recurring child (Sequence >= 2, S2S)   -> handle_recurring_child
#   3. Background confirmation (Modirum S2S)             -> same as (1) but JSON acks
#
# The view verifies the digest (insertion order) BEFORE calling here. This function
# returns a small directive dict the view turns into a redirect (browser) or JSON (S2S):
#   {"kind": "redirect", "query": "status=success"}   -> /payment/callback?status=success
#   {"kind": "json", "status": "ok", ...}             -> JSON body for S2S


def _amount_to_cents(amount_str: str | None) -> int:
    if not amount_str:
        return 0
    try:
        return round(float(amount_str) * 100)
    except (TypeError, ValueError):
        return 0


def _add_billing_cycle_days(start: datetime, cycle_days: int):
    from datetime import timedelta
    return start + timedelta(days=cycle_days)


def _revalidate_featured(profile_id: str, featured: bool) -> None:
    if not profile_id:
        return
    try:
        from apps.profiles.models import Profile
        Profile.objects.filter(id=profile_id).update(featured=featured)
    except ImportError:
        pass


def _notify_subscription_payment(
    sub: Subscription, *, is_renewal: bool, amount_cents: int,
    currency: str | None, order_id: str | None = None, payment_ref: str | None = None,
) -> None:
    """Admin email for every subscription charge (initial + each renewal).

    Ports the OLD `sendSubscriptionPaymentEmail` call sites (fa99986a + SCRUM-63).
    Fire-and-forget: prefers the Celery task, falls back to a synchronous send
    if the broker is unreachable, and never raises into the payment flow.
    """
    try:
        profile_name = username = user_email = None
        try:
            from apps.profiles.models import Profile
            prof = Profile.objects.select_related("user").filter(id=sub.profile_id).first()
            if prof:
                profile_name = prof.display_name
                username = prof.username
                user_email = prof.email or (
                    prof.user.email if getattr(prof, "user", None) else None
                )
        except ImportError:
            pass

        payload = dict(
            profile_id=sub.profile_id,
            profile_name=profile_name,
            username=username,
            user_email=user_email,
            subscription_id=sub.id,
            plan=sub.plan,
            billing_interval=sub.billing_interval or "month",
            amount_cents=amount_cents,
            currency=currency or sub.currency or "eur",
            is_renewal=is_renewal,
            payment_count=sub.payment_count,
            discount_code=sub.discount_code,
            order_id=order_id,
            payment_ref=payment_ref,
            paid_at=datetime.now(timezone.utc).isoformat(),
        )
        from apps.messaging import tasks as messaging_tasks
        try:
            messaging_tasks.send_subscription_payment_email.delay(**payload)
        except Exception:  # noqa: BLE001 — broker down: send inline instead
            from apps.messaging import emails as messaging_emails
            messaging_emails.send_subscription_payment_email(**payload)
    except Exception as error:  # noqa: BLE001 — never break the payment flow
        logger.error("[Billing] subscription-payment email failed for %s: %s", sub.id, error)


def handle_worldline_webhook(
    params: dict[str, Any], *, is_server_to_server: bool = False,
) -> dict[str, Any]:
    """Process a digest-verified Cardlink/Worldline callback. Mirrors route.ts:136-236."""
    from apps.billing.services.record_attempt import record_payment_attempt

    order_id = params.get("orderid") or ""
    status_value = (params.get("status") or "").upper()

    # Recurring child notification (Sequence >= 2 = auto-charge by Cardlink) — route.ts:136-140.
    sequence = int(params["Sequence"]) if str(params.get("Sequence") or "").isdigit() else 0
    if sequence >= 2:
        return _handle_recurring_child(params, sequence)

    # --- Initial (parent) payment handling — route.ts:142-236 ---
    # Cardlink does NOT echo var1-var9; recover context from the pending subscription
    # stored at checkout (provider_subscription_id == orderid).
    profile_id = params.get("var1") or ""
    plan = params.get("var2") or "promoted"
    billing_interval = params.get("var3") or "month"
    coupon_code = params.get("var4") or ""

    pending = (
        Subscription.objects.filter(provider_subscription_id=order_id).first()
        if order_id else None
    )
    pending_subscription_id = pending.id if pending else None
    if pending and not profile_id:
        profile_id = pending.profile_id
        billing_interval = pending.billing_interval or "month"
        if not coupon_code and pending.discount_code:
            coupon_code = pending.discount_code

    # Idempotency: if this orderid is already active, short-circuit (route.ts:176-190).
    if status_value in ("CAPTURED", "AUTHORIZED"):
        existing = Subscription.objects.filter(
            provider_subscription_id=order_id, status=SubscriptionStatus.ACTIVE,
        ).first()
        if existing:
            if is_server_to_server:
                return {"kind": "json", "status": "ok", "message": "already processed"}
            return {"kind": "redirect", "query": "status=success"}

    # Success path
    if status_value in ("CAPTURED", "AUTHORIZED"):
        _handle_payment_success(params, profile_id, plan, billing_interval, coupon_code)
        if is_server_to_server:
            return {"kind": "json", "status": "ok"}
        return {"kind": "redirect", "query": "status=success"}

    # Failed initial attempt — record audit log if we found the pending subscription
    # (route.ts:201-220). Helper is best-effort; cannot throw.
    if pending_subscription_id and status_value in ("CANCELED", "REFUSED", "REFUSEDRISK", "ERROR"):
        record_payment_attempt(
            subscription_id=pending_subscription_id,
            status=status_value,
            source="initial",
            sequence=1,
            amount=_amount_to_cents(params.get("orderAmount")),
            currency=(params.get("currency") or "EUR").lower(),
            tx_id=params.get("txId") or None,
            payment_ref=params.get("paymentRef") or None,
            order_id=order_id,
            message=params.get("message") or None,
        )

    if status_value == "CANCELED":
        logger.info("[Worldline Webhook] Payment canceled by user: %s", order_id)
        if is_server_to_server:
            return {"kind": "json", "status": "canceled"}
        return {"kind": "redirect", "query": "canceled=true"}

    # REFUSED / REFUSEDRISK / ERROR
    logger.error(
        "[Worldline Webhook] Payment %s: %s Order: %s",
        status_value, params.get("message"), order_id,
    )
    if is_server_to_server:
        return {"kind": "json", "status": "error", "message": params.get("message") or ""}
    return {"kind": "redirect", "query": "error=payment"}


def _handle_payment_success(
    params: dict[str, Any], profile_id: str, plan: str,
    billing_interval: str, coupon_code: str | None,
) -> None:
    """Activate the subscription, persist period/method/discount, record attempt.

    Ports handlePaymentSuccess (route.ts:238-362).
    """
    from apps.billing.services.pricing import find_coupon
    from apps.billing.services.record_attempt import record_payment_attempt

    if not profile_id:
        logger.error("[Worldline Webhook] No profileId in payment response")
        return

    from apps.billing.services.advice import recurring_override_days

    now = datetime.now(timezone.utc)
    override = recurring_override_days()
    cycle_days = override if override > 0 else (365 if billing_interval == "year" else 30)
    period_end = _add_billing_cycle_days(now, cycle_days)
    amount_cents = _amount_to_cents(params.get("orderAmount"))
    coupon = find_coupon(coupon_code) if coupon_code else None
    currency = (params.get("currency") or "EUR").lower()

    # Billing snapshot from the profile (route.ts:263-266).
    profile_billing = None
    try:
        from apps.profiles.models import Profile
        prof = Profile.objects.filter(id=profile_id).only("id", "billing").first()
        profile_billing = prof.billing if prof else None
    except ImportError:
        prof = None

    sub = Subscription.objects.filter(profile_id=profile_id).first()
    subscription_record_id: str | None = None

    with transaction.atomic():
        is_create = sub is None
        if sub is None:
            sub = Subscription(profile_id=profile_id)
            sub.payment_count = 0
            sub.total_paid_lifetime = 0

        sub.provider = SubscriptionProvider.WORLDLINE
        sub.provider_customer_id = params.get("mid") or sub.provider_customer_id
        sub.provider_subscription_id = params.get("orderid")
        sub.worldline_token = params.get("extToken") or None
        sub.worldline_token_exp = params.get("extTokenExp") or None
        sub.worldline_master_order_id = params.get("orderid")
        # OLD: create -> plan==promoted ? promoted : free; update -> always promoted (route.ts:280,305).
        if is_create:
            sub.plan = SubscriptionPlan.PROMOTED if plan == "promoted" else SubscriptionPlan.FREE
        else:
            sub.plan = SubscriptionPlan.PROMOTED
        sub.status = SubscriptionStatus.ACTIVE
        sub.billing_interval = BillingInterval.YEAR if billing_interval == "year" else BillingInterval.MONTH
        sub.current_period_start = now
        sub.current_period_end = period_end
        sub.cancel_at_period_end = False
        sub.canceled_at = None
        sub.billing = profile_billing
        sub.amount = amount_cents
        sub.currency = currency
        sub.payment_method_type = "card"
        sub.payment_method_last4 = params.get("extTokenPanEnd") or None
        sub.payment_method_brand = params.get("payMethod") or None
        sub.discount_code = coupon["code"] if coupon else None
        sub.discount_percent_off = coupon["percentOff"] if coupon else None
        sub.last_payment_at = now
        # OLD sets firstPaymentAt only on the create branch (route.ts:294). The checkout
        # always pre-creates an `incomplete` row, so to actually capture the first
        # successful charge we set it whenever it's still null (no regression vs OLD,
        # which would have set it to `now` on a fresh row anyway).
        if sub.first_payment_at is None:
            sub.first_payment_at = now
        if is_create:
            sub.payment_count = 1
            sub.total_paid_lifetime = amount_cents
        else:
            sub.payment_count = (sub.payment_count or 0) + 1
            sub.total_paid_lifetime = (sub.total_paid_lifetime or 0) + amount_cents
        sub.save()
        subscription_record_id = sub.id

        _revalidate_featured(profile_id, True)

    # Best-effort audit log of this initial-payment attempt (route.ts:334-349).
    if subscription_record_id:
        record_payment_attempt(
            subscription_id=subscription_record_id,
            status=(params.get("status") or "").upper(),
            source="initial",
            sequence=1,
            amount=amount_cents,
            currency=currency,
            tx_id=params.get("txId") or None,
            payment_ref=params.get("paymentRef") or None,
            order_id=params.get("orderid"),
            message=params.get("message") or None,
        )

        # Admin notification for the initial (Master) payment (fa99986a).
        _notify_subscription_payment(
            sub,
            is_renewal=False,
            amount_cents=amount_cents,
            currency=currency,
            order_id=params.get("orderid"),
            payment_ref=params.get("paymentRef"),
        )


def _handle_recurring_child(params: dict[str, Any], sequence: int) -> dict[str, Any]:
    """Handle a scheduled recurring child notification (Sequence >= 2). route.ts:368-499."""
    from apps.billing.services.record_attempt import record_payment_attempt

    status_value = (params.get("status") or "").upper()
    order_id = params.get("orderid") or ""

    # Cardlink appends "/N" to orderid for children — strip it to find the master.
    master_order_id = order_id.split("/")[0] if "/" in order_id else order_id

    sub = Subscription.objects.filter(
        provider=SubscriptionProvider.WORLDLINE,
        worldline_master_order_id=master_order_id,
    ).first()
    if sub is None:
        logger.error("[Worldline Recurring] No subscription for order: %s", master_order_id)
        return {"kind": "json", "status": "error", "message": "Subscription not found", "status_code": 404}

    if status_value in ("CAPTURED", "AUTHORIZED"):
        from apps.billing.services.advice import recurring_override_days

        now = datetime.now(timezone.utc)
        new_period_start = sub.current_period_end or now
        override = recurring_override_days()
        cycle_days = override if override > 0 else (
            365 if sub.billing_interval == BillingInterval.YEAR else 30
        )
        new_period_end = _add_billing_cycle_days(new_period_start, cycle_days)
        amount_cents = _amount_to_cents(params.get("orderAmount"))

        with transaction.atomic():
            sub.status = SubscriptionStatus.ACTIVE
            sub.current_period_start = new_period_start
            sub.current_period_end = new_period_end
            sub.last_payment_at = now
            sub.payment_count = (sub.payment_count or 0) + 1
            sub.total_paid_lifetime = (sub.total_paid_lifetime or 0) + amount_cents
            sub.amount = amount_cents
            sub.cancel_at_period_end = False
            sub.canceled_at = None
            sub.save()
            _revalidate_featured(sub.profile_id, True)

        record_payment_attempt(
            subscription_id=sub.id,
            status=status_value,
            source="recurring_child",
            sequence=sequence,
            amount=amount_cents,
            currency=(params.get("currency") or sub.currency or "EUR").lower(),
            tx_id=params.get("txId") or None,
            payment_ref=params.get("paymentRef") or None,
            order_id=order_id,
            message=params.get("message") or None,
        )
        # Admin notification for the renewal charge (fa99986a).
        _notify_subscription_payment(
            sub,
            is_renewal=True,
            amount_cents=amount_cents,
            currency=(params.get("currency") or sub.currency or "EUR").lower(),
            order_id=order_id,
            payment_ref=params.get("paymentRef"),
        )
        logger.info("[Worldline Recurring] Child #%s succeeded for %s", sequence, sub.profile_id)
        return {"kind": "json", "status": "ok", "sequence": sequence}

    # Failed recurring child (REFUSED/ERROR) — past_due + un-feature + record. route.ts:456-498.
    logger.error(
        "[Worldline Recurring] Child #%s failed: %s - %s",
        sequence, status_value, params.get("message"),
    )
    sub.status = SubscriptionStatus.PAST_DUE
    sub.save(update_fields=["status", "updated_at"])
    _revalidate_featured(sub.profile_id, False)

    failed_amount = _amount_to_cents(params.get("orderAmount")) or (sub.amount or 0)
    record_payment_attempt(
        subscription_id=sub.id,
        status=status_value,
        source="recurring_child",
        sequence=sequence,
        amount=failed_amount,
        currency=(params.get("currency") or sub.currency or "EUR").lower(),
        tx_id=params.get("txId") or None,
        payment_ref=params.get("paymentRef") or None,
        order_id=order_id,
        message=params.get("message") or None,
    )
    return {"kind": "json", "status": "failed", "sequence": sequence}


# ----- Admin operations (rows 178-183) ------------------------------------


# camelCase sortBy -> db column (OLD adminListSubscriptionsSchema sortBy enum).
_ADMIN_SORT_COLUMNS = {
    "createdAt": "created_at",
    "updatedAt": "updated_at",
    "currentPeriodEnd": "current_period_end",
    "status": "status",
    "plan": "plan",
    "lastPaymentAt": "last_payment_at",
    "amount": "amount",
    "totalPaidLifetime": "total_paid_lifetime",
}


def admin_list(filters: dict[str, Any]) -> dict[str, Any]:
    from django.db.models import Q
    qs = Subscription.objects.select_related("profile", "profile__user").all()
    # OLD subscriptions.ts:50-57: search matches profile displayName OR user email.
    if q := filters.get("searchQuery"):
        qs = qs.filter(
            Q(profile__display_name__icontains=q) | Q(profile__user__email__icontains=q)
        )
    for col in ("status", "plan", "billingInterval"):
        v = filters.get(col)
        if v and v != "all":
            db_col = "billing_interval" if col == "billingInterval" else col
            qs = qs.filter(**{db_col: v})

    # OLD default: lastPaymentAt desc (adminListSubscriptionsSchema:747-760).
    sort = filters.get("sortBy") or "lastPaymentAt"
    direction = filters.get("sortDirection", "desc")
    sort_col = _ADMIN_SORT_COLUMNS.get(sort, "last_payment_at")
    if direction == "desc":
        sort_col = f"-{sort_col}"
    qs = qs.order_by(sort_col)

    # OLD default limit 12.
    limit = max(1, min(100, int(filters.get("limit", 12))))
    offset = max(0, int(filters.get("offset", 0)))
    total = qs.count()
    rows = list(qs[offset:offset + limit])
    return {
        "subscriptions": [_row(s) for s in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def admin_get(sub_id: str) -> dict[str, Any] | None:
    sub = Subscription.objects.select_related("profile", "profile__user").filter(id=sub_id).first()
    return _row(sub) if sub else None


def admin_update_status(*, sub_id: str, status: str) -> Subscription:
    if status not in dict(SubscriptionStatus.choices):
        from common.exceptions import FieldErrors
        raise FieldErrors(details={"status": ["Invalid"]})
    sub = Subscription.objects.filter(id=sub_id).first()
    if sub is None:
        raise ApiError("Subscription not found", code="not_found", status_code=404)
    sub.status = status
    if status == SubscriptionStatus.CANCELED:
        sub.canceled_at = datetime.now(timezone.utc)
    sub.save(update_fields=["status", "canceled_at", "updated_at"])
    # OLD admin/subscriptions.ts:204-221: flip profile.featured ONLY for
    # promoted plans, and only on transitions to active (=> True) or canceled
    # (=> False). Any other status leaves featured untouched.
    if sub.profile_id and sub.plan == SubscriptionPlan.PROMOTED:
        featured: bool | None = None
        if status == SubscriptionStatus.ACTIVE:
            featured = True
        elif status == SubscriptionStatus.CANCELED:
            featured = False
        if featured is not None:
            try:
                from apps.profiles.models import Profile
                Profile.objects.filter(id=sub.profile_id).update(featured=featured)
            except ImportError:
                pass
    return sub


def admin_delete(sub_id: str) -> None:
    sub = Subscription.objects.filter(id=sub_id).first()
    if sub is None:
        raise ApiError("Subscription not found", code="not_found", status_code=404)
    profile_id = sub.profile_id
    plan = sub.plan
    sub.delete()
    # OLD admin/subscriptions.ts:268-275: clear featured only for promoted plans.
    if profile_id and plan == SubscriptionPlan.PROMOTED:
        try:
            from apps.profiles.models import Profile
            Profile.objects.filter(id=profile_id).update(featured=False)
        except ImportError:
            pass


def admin_stats() -> dict[str, int]:
    qs = Subscription.objects.all()
    return {
        "total": qs.count(),
        "active": qs.filter(status=SubscriptionStatus.ACTIVE).count(),
        "canceled": qs.filter(status=SubscriptionStatus.CANCELED).count(),
        "pastDue": qs.filter(status=SubscriptionStatus.PAST_DUE).count(),
    }


def admin_create_manual(*, profile_id: str, end_date) -> Subscription:
    """Mirrors OLD createManualSubscription (actions/admin/subscriptions.ts:386-462).

    Restores the business rules the previous NEW code dropped:
      (a) only PRO-type profiles can hold a subscription (400);
      (b) reject if the profile already has an ACTIVE subscription (409);
      (c) set current_period_start = now on (re)activation;
      (d) clear cancel_at_period_end / canceled_at when re-activating.
    """
    try:
        from apps.profiles.models import Profile
    except ImportError as exc:
        raise ApiError("Profiles app required", code="dependency", status_code=500) from exc
    profile = Profile.objects.select_related("user").filter(id=profile_id).first()
    if profile is None:
        # OLD returns the Greek "profile not found" message.
        raise ApiError("Το προφίλ δεν βρέθηκε", code="profile_not_found", status_code=404)

    # (a) pro-type guard — OLD checks profile.user.type === UserType.pro.
    user = getattr(profile, "user", None)
    if user is None or not user.is_professional():
        raise ApiError(
            "Μόνο επαγγελματικά προφίλ μπορούν να έχουν συνδρομή",
            code="not_professional",
            status_code=400,
        )

    # (b) reject if there is already an ACTIVE subscription.
    existing = Subscription.objects.filter(profile=profile).first()
    if existing is not None and existing.status == SubscriptionStatus.ACTIVE:
        raise ApiError(
            "Το προφίλ έχει ήδη ενεργή συνδρομή",
            code="already_active",
            status_code=409,
        )

    now = datetime.now(timezone.utc)
    sub, _ = Subscription.objects.update_or_create(
        profile=profile,
        defaults={
            "provider": SubscriptionProvider.MANUAL,
            "plan": SubscriptionPlan.PROMOTED,
            "status": SubscriptionStatus.ACTIVE,
            "current_period_start": now,   # (c)
            "current_period_end": end_date,
            "cancel_at_period_end": False,  # (d)
            "canceled_at": None,            # (d)
        },
    )
    # Set profile as featured (same pattern as updateSubscriptionStatus).
    profile.featured = True
    profile.save(update_fields=["featured", "updated_at"])
    return sub


def _iso(dt) -> str | None:
    return dt.isoformat() if dt else None


def _row(s: Subscription) -> dict[str, Any]:
    """Serialize a Subscription to the OLD full-Prisma shape the FE reads.

    OLD get-subscription.ts returned the entire Prisma Subscription object, so the FE
    reads worldline*, currentPeriodStart, billing snapshot, paymentMethod*, discount*,
    firstPaymentAt, stripe*, createdAt/updatedAt etc. (see parity Response-shape #1).
    """
    profile = getattr(s, "profile", None)
    user = getattr(profile, "user", None) if profile else None
    return {
        "id": s.id,
        "pid": s.profile_id,
        "profileId": s.profile_id,
        "provider": s.provider,
        "providerCustomerId": s.provider_customer_id,
        "providerSubscriptionId": s.provider_subscription_id,
        # Legacy Stripe fields (kept in Prisma schema).
        "stripeCustomerId": s.stripe_customer_id,
        "stripeSubscriptionId": s.stripe_subscription_id,
        "stripePriceId": s.stripe_price_id,
        # Worldline / Cardlink.
        "worldlineToken": s.worldline_token,
        "worldlineTokenExp": s.worldline_token_exp,
        "worldlineMasterOrderId": s.worldline_master_order_id,
        "plan": s.plan,
        "status": s.status,
        "billingInterval": s.billing_interval,
        "billing": s.billing,
        "currentPeriodStart": _iso(s.current_period_start),
        "currentPeriodEnd": _iso(s.current_period_end),
        "cancelAtPeriodEnd": s.cancel_at_period_end,
        "canceledAt": _iso(s.canceled_at),
        "createdAt": _iso(s.created_at),
        "updatedAt": _iso(s.updated_at),
        "amount": s.amount,
        "currency": s.currency,
        "paymentMethodType": s.payment_method_type,
        "paymentMethodLast4": s.payment_method_last4,
        "paymentMethodBrand": s.payment_method_brand,
        "totalPaidLifetime": s.total_paid_lifetime,
        "paymentCount": s.payment_count,
        "firstPaymentAt": _iso(s.first_payment_at),
        "lastPaymentAt": _iso(s.last_payment_at),
        "discountCode": s.discount_code,
        "discountPercentOff": s.discount_percent_off,
        "discountAmountOff": s.discount_amount_off,
        "profile": {
            "id": profile.id, "username": profile.username,
            "displayName": profile.display_name,
            "image": profile.image,
            "email": profile.email or (user.email if user else None),
            "user": {
                "id": user.id, "email": user.email,
                "name": user.name, "role": user.role,
            } if user else None,
        } if profile else None,
    }
