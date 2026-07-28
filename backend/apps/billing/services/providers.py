"""Payment provider abstraction.

Mirrors `lib/payment/{factory.ts,service.ts}` + `providers/worldline/adapter.ts`.
Each provider implements:
    - create_checkout(subscription, *, billing_interval, coupon_code, customer) -> {url, orderId}
    - cancel_subscription(subscription, *, at_period_end)
    - restore_subscription(subscription)

Worldline is the primary (Greece, Cardlink/eurocommerce). Stripe is legacy.
PayPal is configured. Manual is admin-created (no external call). For ports
without live creds, each call raises ApiError("provider_unconfigured") cleanly.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from django.conf import settings

from apps.billing.models import (
    Subscription,
    SubscriptionPlan,
    SubscriptionProvider,
    SubscriptionStatus,
)
from apps.billing.services import worldline as wl
from apps.billing.services.pricing import apply_coupon, find_coupon
from common.exceptions import ApiError

logger = logging.getLogger(__name__)


# ----- Worldline / Cardlink ----------------------------------------------


def worldline_create_checkout(*, subscription: Subscription, billing_interval: str,
                              coupon_code: str | None, customer: dict[str, Any]) -> dict[str, str]:
    """Build the Cardlink hosted-form redirect URL and persist the order id.

    Ports adapter.ts:createCheckoutSession + service.ts:createCheckout. The signed
    form fields are base64url-encoded into the redirect URL so the redirect view can
    render the auto-submit form (matching OLD's /api/payment/worldline/redirect flow).
    The order id is stored on the subscription as provider_subscription_id /
    worldline_master_order_id so the webhook can recover context (Cardlink does NOT
    echo var1-var9).
    """
    cfg = wl.get_worldline_config()
    if not cfg["mid"] or not cfg["shared_secret"]:
        raise ApiError("Worldline not configured", code="provider_unconfigured", status_code=500)

    # Apply coupon (gross cents) then format as a euro string for Cardlink.
    pricing = apply_coupon(billing_interval, coupon_code)
    amount_eur = f"{pricing['amount'] / 100:.2f}"

    base_url = settings.FRONTEND_BASE_URL
    confirm_url = cfg["redirect_url"] and (settings.WORLDLINE.get("RETURN_URL") or f"{base_url}/api/webhooks/worldline")
    cancel_url = settings.WORLDLINE.get("CANCEL_URL") or f"{base_url}/api/webhooks/worldline"

    form_fields, order_id = wl.build_checkout_form_fields(
        profile_id=subscription.profile_id,
        plan=SubscriptionPlan.PROMOTED,
        billing_interval=billing_interval,
        amount=amount_eur,
        billing={
            "email": customer.get("email", ""),
            "phone": customer.get("phone", ""),
            "address": customer.get("address"),
        },
        coupon_code=coupon_code,
        confirm_url=confirm_url or f"{base_url}/api/webhooks/worldline",
        cancel_url=cancel_url,
    )

    # Persist checkout metadata so the webhook can recover profileId/plan/interval/coupon.
    # Cardlink does NOT return var1-var9, so look up by provider_subscription_id later.
    coupon = find_coupon(coupon_code)
    subscription.provider = SubscriptionProvider.WORLDLINE
    subscription.provider_subscription_id = order_id
    subscription.billing_interval = billing_interval
    subscription.discount_code = coupon["code"] if coupon else None
    subscription.discount_percent_off = coupon["percentOff"] if coupon else None
    subscription.save(update_fields=[
        "provider", "provider_subscription_id", "billing_interval",
        "discount_code", "discount_percent_off", "updated_at",
    ])

    # Encode the signed fields for the auto-submit redirect page.
    import base64 as _b64
    import json as _json
    encoded = _b64.urlsafe_b64encode(_json.dumps(form_fields).encode("utf-8")).decode("ascii").rstrip("=")
    return {
        "url": f"{base_url}/api/payment/worldline/redirect?session={encoded}",
        "orderId": order_id,
    }


def worldline_charge_recurring(subscription: Subscription, *, order_id: str,
                               amount_eur: str, recurring_frequency: str,
                               recurring_end_date: str, email: str) -> dict[str, Any]:
    """Charge the stored token via signed XML SaleRequest v2.1. Used by the renewals cron.

    Ports executeRecurringCharge usage in cron/worldline-renewals/route.ts.
    Returns {status, message?, txId?, paymentRef?, orderAmount?}.
    """
    if not subscription.worldline_token:
        raise ApiError("No Worldline token on subscription", code="no_token", status_code=400)
    return wl.execute_recurring_charge(
        order_id=order_id,
        amount=amount_eur,
        currency=(subscription.currency or "EUR").upper(),
        email=email or "",
        token=subscription.worldline_token,
        recurring_frequency=recurring_frequency,
        recurring_end_date=recurring_end_date,
    )


def worldline_verify_webhook(items: list[tuple[str, str]]) -> bool:
    """Verify a Cardlink response digest using POST-body insertion order.

    Ports validateResponseDigestFromFormData (digest.ts:40-58) usage in
    webhooks/worldline/route.ts:117. `items` MUST be the (key, value) pairs in the
    exact order Cardlink POSTed them. The shared secret is selected by test/live mode
    (getWorldlineSharedSecret).
    """
    cfg = wl.get_worldline_config()
    secret = cfg["shared_secret"]
    if not secret:
        logger.error("[Worldline Webhook] Shared secret not configured")
        return False
    return wl.validate_response_digest_from_items(items, secret)


def worldline_cancel(subscription: Subscription) -> None:
    """Stop Cardlink recurring billing via XML RecurringOperationRequest/Cancel.

    Ports adapter.ts:cancelSubscription. Raises on non-CANCELED gateway response so the
    DB is NOT marked canceled while the card keeps getting charged.
    """
    order_id = subscription.provider_subscription_id or subscription.worldline_master_order_id
    if not order_id:
        raise ApiError("No active subscription found", code="no_subscription", status_code=400)
    result = wl.cancel_recurring(order_id=order_id)
    if result.get("status") != "CANCELED":
        raise ApiError(
            f"Worldline cancel failed: {result.get('status')} - {result.get('message') or 'unknown error'}",
            code="provider_error", status_code=502,
        )


def worldline_restore(_subscription: Subscription) -> None:
    """Worldline does NOT support restoring canceled subscriptions (adapter.ts:138-144)."""
    raise ApiError(
        "Worldline does not support restoring canceled subscriptions. User must re-subscribe.",
        code="provider_error", status_code=400,
    )


# ----- Stripe (legacy) ---------------------------------------------------


def stripe_create_checkout(*, subscription: Subscription, billing_interval: str,
                           coupon_code: str | None, customer: dict[str, Any]) -> dict[str, str]:
    cfg = settings.STRIPE
    if not cfg.get("SECRET_KEY"):
        raise ApiError("Stripe not configured", code="provider_unconfigured", status_code=500)
    try:
        import stripe
    except ImportError as exc:
        raise ApiError("stripe SDK missing", code="dependency", status_code=500) from exc

    stripe.api_key = cfg["SECRET_KEY"]
    price_id = cfg["PRICE_MONTH"] if billing_interval == "month" else cfg["PRICE_YEAR"]
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        customer_email=customer.get("email"),
        client_reference_id=subscription.id,
        success_url=settings.FRONTEND_BASE_URL + "/dashboard/billing?status=success",
        cancel_url=settings.FRONTEND_BASE_URL + "/dashboard/billing?status=cancel",
        discounts=[{"coupon": coupon_code}] if coupon_code else None,
    )
    return {"url": session.url}


def stripe_cancel_subscription(subscription: Subscription, *, at_period_end: bool) -> None:
    if not subscription.stripe_subscription_id:
        return
    cfg = settings.STRIPE
    if not cfg.get("SECRET_KEY"):
        return
    try:
        import stripe
        stripe.api_key = cfg["SECRET_KEY"]
        if at_period_end:
            stripe.Subscription.modify(subscription.stripe_subscription_id, cancel_at_period_end=True)
        else:
            stripe.Subscription.delete(subscription.stripe_subscription_id)
    except Exception as exc:
        logger.warning("stripe.cancel_failed", extra={"sub_id": subscription.id, "error": str(exc)})


def stripe_restore_subscription(subscription: Subscription) -> None:
    if not subscription.stripe_subscription_id:
        return
    cfg = settings.STRIPE
    if not cfg.get("SECRET_KEY"):
        return
    try:
        import stripe
        stripe.api_key = cfg["SECRET_KEY"]
        stripe.Subscription.modify(subscription.stripe_subscription_id, cancel_at_period_end=False)
    except Exception as exc:
        logger.warning("stripe.restore_failed", extra={"sub_id": subscription.id, "error": str(exc)})


# ----- PayPal (kept light — full SDK integration is large) ---------------


def paypal_create_checkout(*, subscription: Subscription, billing_interval: str,
                           coupon_code: str | None, customer: dict[str, Any]) -> dict[str, str]:
    cfg = settings.PAYPAL
    if not cfg.get("CLIENT_ID"):
        raise ApiError("PayPal not configured", code="provider_unconfigured", status_code=500)
    raise ApiError(
        "PayPal flow not yet implemented in Django port",
        code="paypal_not_implemented",
        status_code=501,
    )


# ----- Provider dispatcher ----------------------------------------------


def get_provider() -> str:
    """Default provider. Worldline for Greece; could be env-configurable."""
    cfg = wl.get_worldline_config()
    if cfg["mid"]:
        return SubscriptionProvider.WORLDLINE
    if settings.STRIPE.get("SECRET_KEY"):
        return SubscriptionProvider.STRIPE
    if settings.PAYPAL.get("CLIENT_ID"):
        return SubscriptionProvider.PAYPAL
    return SubscriptionProvider.MANUAL


def create_checkout(*, subscription: Subscription, billing_interval: str,
                    coupon_code: str | None, customer: dict[str, Any]) -> dict[str, str]:
    provider = subscription.provider or get_provider()
    if provider == SubscriptionProvider.WORLDLINE:
        return worldline_create_checkout(
            subscription=subscription, billing_interval=billing_interval,
            coupon_code=coupon_code, customer=customer,
        )
    if provider == SubscriptionProvider.STRIPE:
        return stripe_create_checkout(
            subscription=subscription, billing_interval=billing_interval,
            coupon_code=coupon_code, customer=customer,
        )
    if provider == SubscriptionProvider.PAYPAL:
        return paypal_create_checkout(
            subscription=subscription, billing_interval=billing_interval,
            coupon_code=coupon_code, customer=customer,
        )
    raise ApiError("No payment provider configured", code="no_provider", status_code=500)


def cancel_subscription(subscription: Subscription, *, at_period_end: bool) -> None:
    """Cancel with the gateway, THEN update local DB (service.ts:cancelSubscription).

    For Worldline this calls Cardlink to stop the recurring charge; if that fails we
    raise and do NOT touch the DB, so we never mark a still-billing sub canceled.
    OLD sets canceledAt when cancelAtPeriodEnd is true (service.ts:114).
    """
    if subscription.provider == SubscriptionProvider.STRIPE:
        stripe_cancel_subscription(subscription, at_period_end=at_period_end)
    elif subscription.provider == SubscriptionProvider.WORLDLINE:
        worldline_cancel(subscription)
    # manual: nothing to call externally

    # OLD service.ts:110-116 only updates cancelAtPeriodEnd + canceledAt; it never
    # touches status here (the sub stays active until the period actually ends, or
    # until the webhook/cron flips it). canceledAt = now when cancelAtPeriodEnd, else null.
    subscription.cancel_at_period_end = bool(at_period_end)
    subscription.canceled_at = datetime.now(timezone.utc) if at_period_end else None
    subscription.save(update_fields=["cancel_at_period_end", "canceled_at", "updated_at"])


def restore_subscription(subscription: Subscription) -> None:
    """Restore — requires cancelAtPeriodEnd precondition (service.ts:122-157).

    Worldline restore is UNSUPPORTED (raises). Stripe restore clears cancel_at_period_end.
    """
    subscription_id = subscription.provider_subscription_id
    if not subscription_id:
        raise ApiError("No subscription found", code="no_subscription", status_code=404)
    if not subscription.cancel_at_period_end:
        raise ApiError(
            "Subscription is not scheduled for cancellation",
            code="not_scheduled_for_cancel", status_code=400,
        )

    if subscription.provider == SubscriptionProvider.WORLDLINE:
        worldline_restore(subscription)  # raises — unsupported
    elif subscription.provider == SubscriptionProvider.STRIPE:
        stripe_restore_subscription(subscription)

    subscription.cancel_at_period_end = False
    subscription.canceled_at = None
    subscription.save(update_fields=["cancel_at_period_end", "canceled_at", "updated_at"])
