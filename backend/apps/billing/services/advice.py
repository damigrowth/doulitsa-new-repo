"""Cardlink/Worldline XML Webhooks — "Advice Messages" handler.

Ported from OLD `src/app/api/webhooks/worldline/advice/route.ts` (SCRUM-63,
commit 40fc2439). Cardlink's scheduled recurring charges (children) are NOT
reported to the classic confirmUrl webhook — that one only receives initial
(Master) transactions via browser redirect / background confirmation. Recurring
children are delivered exclusively through the optional "XML Webhooks (Advice
Messages)" service (VPOS XML API 2.1), activated by Cardlink support per MID
with the advice URL declared as "Recurring advice URL".

Message format:
    <VPOS xmlns="http://www.modirum.com/schemas/vposxmlapi41">
      <Message version="2.1" messageId="..." timeStamp="...">
        <Advice type="Recurring">
          <Authentication><Mid>...</Mid></Authentication>
          <OrderId>DOL.../</OrderId>          — MASTER order id
          <OrderAmount>24.8</OrderAmount>
          <Currency>EUR</Currency>
          <OrderTxId>...</OrderTxId>          — master TxId
          <TxId>...</TxId>                    — child TxId
          <TxStatus>CAPTURED</TxStatus>
          <TxTotal>24.8</TxTotal>
          <TxCurrency>EUR</TxCurrency>
          <TxSequence>4</TxSequence>
          <TxPaymentRef>...</TxPaymentRef>
        </Advice>
      </Message>
      <Digest>base64</Digest>
    </VPOS>

Digest (2.1) = base64(sha256(utf8(c14n(<Message>…</Message>)) + sharedSecret)).
Modirum sends the Message element already in canonical form, so we hash the raw
<Message>…</Message> substring exactly as received. On mismatch we log both
digests plus a body snippet for diagnosis and return 400 (Cardlink retries up
to 2 times if enabled). HTTP 200 acknowledges delivery — anything else triggers
their retry, and after the retries the advice is lost.

Handlers return {"status_code": int, "body": dict} for the view layer.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

from django.db import transaction

from apps.billing.models import (
    BillingInterval,
    Subscription,
    SubscriptionProvider,
    SubscriptionStatus,
)
from apps.billing.services import worldline as wl
from apps.billing.services.record_attempt import record_payment_attempt

logger = logging.getLogger(__name__)

# route.ts:58-65 — PaymentAttemptStatus values we map 1:1; anything else → ERROR.
RECOGNIZED_STATUSES = {"CAPTURED", "AUTHORIZED", "REFUSED", "REFUSEDRISK", "CANCELED", "ERROR"}


def _xml_value(xml: str, tag: str) -> str | None:
    """Inner text of a tag, tolerant of namespace prefixes and attributes (route.ts:68-75)."""
    m = re.search(
        rf"<(?:\w+:)?{tag}(?:\s[^>]*)?>(.*?)</(?:\w+:)?{tag}>",
        xml, re.IGNORECASE | re.DOTALL,
    )
    return m.group(1).strip() if m else None


def _parse_amount_cents(value: str | None) -> int | None:
    if not value:
        return None
    try:
        return round(float(value) * 100)
    except ValueError:
        return None


def handle_worldline_advice(body: str) -> dict:
    """Validate and route one advice message. Ports POST (route.ts:84-150)."""
    message_match = re.search(r"<(?:\w+:)?Message.*?</(?:\w+:)?Message>", body, re.DOTALL)
    digest_received = _xml_value(body, "Digest")

    if not message_match or not digest_received:
        logger.error(
            "[Worldline Advice] Not a VPOS advice message (Message/Digest missing). Body snippet: %s",
            body[:500],
        )
        return {"status_code": 400, "body": {"status": "error", "message": "malformed advice"}}

    cfg = wl.get_worldline_config()
    shared_secret = cfg.get("shared_secret") or ""
    if not shared_secret:
        logger.error("[Worldline Advice] Shared secret not configured")
        return {"status_code": 500, "body": {"status": "error", "message": "config"}}

    digest_calculated = wl._calculate_xml_digest(message_match.group(0), shared_secret)
    if digest_calculated != digest_received:
        logger.error(
            "[Worldline Advice] Digest validation failed. received: %s calculated: %s body snippet: %s",
            digest_received, digest_calculated, body[:1000],
        )
        return {
            "status_code": 400,
            "body": {"status": "error", "message": "digest validation failed"},
        }

    advice_type_match = re.search(r'<(?:\w+:)?Advice\s[^>]*type="([^"]+)"', body, re.IGNORECASE)
    advice_type = advice_type_match.group(1) if advice_type_match else "Unknown"

    mid = _xml_value(body, "Mid")
    expected_mid = cfg.get("mid") or ""
    if mid and expected_mid and mid != expected_mid:
        # Warn but do not reject: the digest already proves it was signed with our secret.
        logger.warning("[Worldline Advice] Mid mismatch: got %s, expected %s", mid, expected_mid)

    if advice_type != "Recurring":
        # Payment / Capture / Cancel / Refund advices: acknowledge and log only.
        logger.info(
            "[Worldline Advice] %s advice acknowledged (no handler): orderId: %s txId: %s status: %s",
            advice_type, _xml_value(body, "OrderId"), _xml_value(body, "TxId"),
            _xml_value(body, "TxStatus"),
        )
        return {"status_code": 200, "body": {"status": "ok", "advice": advice_type}}

    return _handle_recurring_advice(body)


def _handle_recurring_advice(body: str) -> dict:
    """Recurring child success/failure. Ports handleRecurringAdvice (route.ts:152-340)."""
    from apps.billing.models import SubscriptionPaymentAttempt
    from apps.billing.services.subscription_ops import (
        _notify_subscription_payment,
        _revalidate_featured,
    )

    master_order_id = _xml_value(body, "OrderId")
    tx_id = _xml_value(body, "TxId")
    raw_status = (_xml_value(body, "TxStatus") or "").upper()
    try:
        sequence = int(_xml_value(body, "TxSequence") or "0")
    except ValueError:
        sequence = 0
    payment_ref = _xml_value(body, "TxPaymentRef")
    currency = (_xml_value(body, "TxCurrency") or _xml_value(body, "Currency") or "EUR").lower()
    amount_cents = (
        _parse_amount_cents(_xml_value(body, "TxTotal"))
        or _parse_amount_cents(_xml_value(body, "PaymentTotal"))
        or _parse_amount_cents(_xml_value(body, "OrderAmount"))
    )

    if not master_order_id:
        logger.error("[Worldline Advice] Recurring advice without OrderId")
        return {"status_code": 400, "body": {"status": "error", "message": "missing OrderId"}}

    status_value = raw_status if raw_status in RECOGNIZED_STATUSES else "ERROR"

    # Child order id convention matches the classic webhook: "master/N" (route.ts:176).
    child_order_id = f"{master_order_id}/{sequence}" if sequence >= 2 else master_order_id

    # Idempotency: Cardlink retries advices (up to 2) and support can redeliver.
    if tx_id and SubscriptionPaymentAttempt.objects.filter(tx_id=tx_id).exists():
        logger.info("[Worldline Advice] TxId %s already recorded, acknowledging", tx_id)
        return {"status_code": 200, "body": {"status": "ok", "message": "already processed"}}

    sub = Subscription.objects.filter(
        provider=SubscriptionProvider.WORLDLINE,
        worldline_master_order_id=master_order_id,
    ).first()
    if sub is None:
        logger.error("[Worldline Advice] No subscription for master order: %s", master_order_id)
        return {
            "status_code": 404,
            "body": {"status": "error", "message": "subscription not found"},
        }

    if status_value in ("CAPTURED", "AUTHORIZED"):
        now = datetime.now(timezone.utc)
        new_period_start = sub.current_period_end or now
        cycle_days = 365 if sub.billing_interval == BillingInterval.YEAR else 30
        new_period_end = wl.add_billing_cycle_days(new_period_start, cycle_days)
        charged_cents = amount_cents if amount_cents is not None else (sub.amount or 0)

        with transaction.atomic():
            sub.status = SubscriptionStatus.ACTIVE
            sub.current_period_start = new_period_start
            sub.current_period_end = new_period_end
            sub.last_payment_at = now
            sub.payment_count = (sub.payment_count or 0) + 1
            sub.total_paid_lifetime = (sub.total_paid_lifetime or 0) + charged_cents
            sub.amount = charged_cents
            sub.cancel_at_period_end = False
            sub.canceled_at = None
            sub.save()
            _revalidate_featured(sub.profile_id, True)

        # Best-effort audit log (record_attempt is internally try/except'd).
        record_payment_attempt(
            subscription_id=sub.id,
            status=status_value,
            source="recurring_child",
            sequence=sequence or None,
            amount=charged_cents,
            currency=currency,
            tx_id=tx_id or None,
            payment_ref=payment_ref or None,
            order_id=child_order_id,
        )

        # Notify admin (fire-and-forget; never throws) — route.ts:273-291.
        _notify_subscription_payment(
            sub,
            is_renewal=True,
            amount_cents=charged_cents,
            currency=currency,
            order_id=child_order_id,
            payment_ref=payment_ref,
        )

        logger.info(
            "[Worldline Advice] Recurring child #%s %s for %s, period advanced to %s",
            sequence, status_value, sub.profile_id, new_period_end.isoformat(),
        )
        return {"status_code": 200, "body": {"status": "ok", "sequence": sequence}}

    # Failed recurring child (REFUSED / REFUSEDRISK / CANCELED / ERROR) — route.ts:299-339.
    logger.error(
        "[Worldline Advice] Recurring child #%s failed (%s) for master %s",
        sequence, status_value, master_order_id,
    )

    sub.status = SubscriptionStatus.PAST_DUE
    sub.save(update_fields=["status", "updated_at"])
    _revalidate_featured(sub.profile_id, False)

    record_payment_attempt(
        subscription_id=sub.id,
        status=status_value,
        source="recurring_child",
        sequence=sequence or None,
        amount=amount_cents if amount_cents is not None else (sub.amount or 0),
        currency=currency,
        tx_id=tx_id or None,
        payment_ref=payment_ref or None,
        order_id=child_order_id,
    )

    # 200: the advice was received and processed; the *payment* failed, not the delivery.
    return {"status_code": 200, "body": {"status": "ok", "sequence": sequence, "payment": "failed"}}
