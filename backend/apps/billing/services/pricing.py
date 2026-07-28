"""Subscription pricing + coupon validation.

Ported verbatim from the OLD app:
  - `lib/payment/pricing.ts`  (PLAN_PRICING, getPlanAmount)
  - `lib/payment/coupons.ts`  (WELCOME50, calculateDiscountedPricing, VAT-aware)

Real prices (gross, incl. 24% VAT):  promoted month €24.80, year €223.20.
Net prices (excl. VAT):              promoted month €20,   year €180.
Only coupon: WELCOME50 — 50% off, ANNUAL ONLY, promoted plan.

`apply_coupon()` keeps the NEW {amount(cents), currency, interval, label} shape that
the checkout/provider layer expects (amount is gross cents), and the coupon-validate
endpoint additionally exposes the full VAT breakdown via `discounted_pricing()`.
"""
from __future__ import annotations

from typing import Any

VAT_RATE = 0.24

# Plan pricing (GROSS, including 24% VAT) — mirrors PLAN_PRICING in pricing.ts:49-54.
# Stored as cents to match the Subscription.amount column convention.
PLAN_PRICING_CENTS: dict[str, dict[str, int]] = {
    "promoted": {
        "month": 2480,   # €24.80
        "year": 22320,   # €223.20
    },
}

# Net prices (WITHOUT VAT) per interval — mirrors NET_PRICES in coupons.ts:39-44.
NET_PRICES: dict[str, dict[str, float]] = {
    "promoted": {
        "month": 20.0,
        "year": 180.0,
    },
}

_INTERVAL_LABEL = {"month": "Μηνιαία", "year": "Ετήσια"}

# Active coupon registry — mirrors COUPONS in coupons.ts:50-58.
COUPONS: dict[str, dict[str, Any]] = {
    "WELCOME50": {
        "code": "WELCOME50",
        "percentOff": 50,
        "applicablePlans": ["promoted"],
        "applicableIntervals": ["year"],
        "active": True,
    },
}


def get_plan_amount(billing_interval: str, plan: str = "promoted") -> int:
    """Gross amount in cents for a plan + interval. Mirrors getPlanAmount (pricing.ts:60-70)."""
    plan_pricing = PLAN_PRICING_CENTS.get(plan)
    if not plan_pricing:
        raise ValueError(f"Unknown plan: {plan}")
    amount = plan_pricing.get(billing_interval)
    if amount is None:
        raise ValueError(f"Unknown billing interval: {billing_interval} for plan: {plan}")
    return amount


def find_coupon(code: str | None) -> dict[str, Any] | None:
    """Find an active coupon by code. Mirrors findCoupon (coupons.ts:63-68)."""
    if not code:
        return None
    coupon = COUPONS.get(code.strip().upper())
    if not coupon or not coupon.get("active"):
        return None
    return coupon


def calculate_discounted_pricing(
    coupon: dict[str, Any], plan: str, billing_interval: str,
) -> dict[str, Any] | None:
    """VAT-aware discounted pricing. Mirrors calculateDiscountedPricing (coupons.ts:74-101).

    Returns None if the coupon does not apply to this plan/interval.
    Keys: originalNet, discountAmount, netAmount, vatAmount, grossAmount, percentOff (euros).
    """
    if plan not in coupon.get("applicablePlans", []):
        return None
    if billing_interval not in coupon.get("applicableIntervals", []):
        return None

    net_prices = NET_PRICES.get(plan)
    if not net_prices:
        return None
    original_net = net_prices.get(billing_interval)
    if original_net is None:
        return None

    percent_off = coupon["percentOff"]
    discount_amount = round(original_net * percent_off / 100 * 100) / 100
    net_amount = round((original_net - discount_amount) * 100) / 100
    vat_amount = round(net_amount * VAT_RATE * 100) / 100
    gross_amount = round((net_amount + vat_amount) * 100) / 100

    return {
        "originalNet": original_net,
        "discountAmount": discount_amount,
        "netAmount": net_amount,
        "vatAmount": vat_amount,
        "grossAmount": gross_amount,
        "percentOff": percent_off,
    }


def apply_coupon(billing_interval: str, code: str | None, plan: str = "promoted") -> dict[str, Any]:
    """Resolve the gross checkout amount (cents) after any valid coupon.

    Returns {amount, currency, interval, label, originalAmount?, discount?} — amount in cents.
    Mirrors the adapter's coupon application (adapter.ts:60-69): a coupon only changes the
    amount when calculateDiscountedPricing returns a result (i.e. annual + promoted).
    """
    gross_cents = get_plan_amount(billing_interval, plan)
    out: dict[str, Any] = {
        "amount": gross_cents,
        "currency": "eur",
        "interval": billing_interval,
        "label": _INTERVAL_LABEL.get(billing_interval, billing_interval),
    }
    coupon = find_coupon(code)
    if not coupon:
        return out
    discounted = calculate_discounted_pricing(coupon, plan, billing_interval)
    if not discounted:
        return out
    out["originalAmount"] = gross_cents
    out["amount"] = round(discounted["grossAmount"] * 100)
    out["discount"] = {"code": coupon["code"], "percentOff": coupon["percentOff"]}
    return out
