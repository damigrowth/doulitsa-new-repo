"""Worldline / Cardlink (eurocommerce) low-level integration.

Ported verbatim from the OLD app:
  - digest + 46-field order      : providers/worldline/digest.ts
  - config (test/live selection) : worldline-config.ts  (driven by PAYMENTS_TEST_MODE)
  - XML SaleRequest v2.1 charge  : providers/worldline/xml.ts:executeRecurringCharge
  - XML RecurringOperation Cancel: providers/worldline/xml.ts:cancelRecurring
  - Athens-calendar period add   : lib/utils/date.ts:addBillingCycleDays

Field order and digest algorithm are MONEY-CRITICAL — see DIGEST_FIELD_ORDER.
"""
from __future__ import annotations

import base64
import logging
import re
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Config (test/live selection driven by PAYMENTS_TEST_MODE) — worldline-config.ts
# ---------------------------------------------------------------------------

# Cardlink endpoints (Worldline = eurocommerce) — worldline-config.ts:19-28
_ENDPOINTS = {
    "sandbox": {
        "redirect": "https://eurocommerce-test.cardlink.gr/vpos/shophandlermpi",
        "xml": "https://eurocommerce-test.cardlink.gr/vpos/xmlpayvpos",
    },
    "production": {
        "redirect": "https://vpos.eurocommerce.gr/vpos/shophandlermpi",
        "xml": "https://vpos.eurocommerce.gr/vpos/xmlpayvpos",
    },
}


def is_payments_test_mode() -> bool:
    return bool(getattr(settings, "PAYMENTS_TEST_MODE", False))


def get_worldline_config() -> dict[str, Any]:
    """Select sandbox/production credentials + endpoints based on PAYMENTS_TEST_MODE.

    Mirrors getWorldlineConfig (worldline-config.ts:38-58). Falls back to the single
    generic WORLDLINE.{MERCHANT_ID,SHARED_SECRET,BASE_URL,API_URL} keys when the
    test/live-specific keys aren't set, so existing deployments keep working.
    """
    cfg = settings.WORLDLINE
    test_mode = is_payments_test_mode()

    if test_mode:
        mid = cfg.get("TEST_MID") or cfg.get("MERCHANT_ID") or ""
        secret = cfg.get("TEST_SHARED_SECRET") or cfg.get("SHARED_SECRET") or ""
        endpoints = _ENDPOINTS["sandbox"]
    else:
        mid = cfg.get("LIVE_MID") or cfg.get("MERCHANT_ID") or ""
        secret = cfg.get("LIVE_SHARED_SECRET") or cfg.get("SHARED_SECRET") or ""
        endpoints = _ENDPOINTS["production"]

    return {
        "mid": mid,
        "shared_secret": secret,
        # Explicit override (cfg["BASE_URL"]/["API_URL"]) wins, else the env-derived endpoint.
        "redirect_url": cfg.get("BASE_URL") or endpoints["redirect"],
        "xml_url": cfg.get("API_URL") or endpoints["xml"],
        "is_test_mode": test_mode,
    }


# ---------------------------------------------------------------------------
# Digest — providers/worldline/digest.ts
# ---------------------------------------------------------------------------

# Fixed 46-field order for digest calculation (digest.ts:8-18).
# Verified empirically against Cardlink sandbox. extTokenOptions/extToken go
# BETWEEN cancelUrl and var1.
DIGEST_FIELD_ORDER = (
    "version", "mid", "lang", "deviceCategory", "orderid", "orderDesc",
    "orderAmount", "currency", "payerEmail", "payerPhone", "billCountry",
    "billState", "billZip", "billCity", "billAddress", "weight", "dimensions",
    "shipCountry", "shipState", "shipZip", "shipCity", "shipAddress",
    "addFraudScore", "maxPayRetries", "reject3dsU", "payMethod", "trType",
    "extInstallmentoffset", "extInstallmentperiod", "extRecurringfrequency",
    "extRecurringenddate", "blockScore", "cssUrl", "confirmUrl", "cancelUrl",
    "extTokenOptions", "extToken",
    "var1", "var2", "var3", "var4", "var5", "var6", "var7", "var8", "var9",
)


def calculate_request_digest(form_fields: dict[str, str], shared_secret: str) -> str:
    """base64(sha256(utf8(concat fields in fixed 46-order) + sharedSecret)).

    Mirrors calculateRequestDigest (digest.ts:26-33). Missing fields default to "".
    """
    concatenated = "".join(str(form_fields.get(k, "") or "") for k in DIGEST_FIELD_ORDER) + shared_secret
    return base64.b64encode(sha256(concatenated.encode("utf-8")).digest()).decode("ascii")


def validate_response_digest_from_items(items: list[tuple[str, str]], shared_secret: str) -> bool:
    """Validate digest from a Cardlink response.

    `items` MUST be the (key, value) pairs in the exact insertion order Cardlink
    POSTed them (excluding nothing — the `digest` field is filtered here). Mirrors
    validateResponseDigestFromFormData (digest.ts:40-58), which concatenates all
    non-digest values in POST-body order then base64-sha256s with the secret.
    """
    # Cardlink signs only the real response fields. When the result returns via
    # the browser auto-submit form (not server-to-server), the browser appends
    # its own control fields — `_charset_` (empty hidden input) and the submit
    # button — which are NOT part of Cardlink's digest. Excluding them here (in
    # addition to `digest` itself) makes the browser-redirect path validate the
    # same as the S2S path.
    non_digest_control_fields = {"digest", "_charset_", "submitButton"}
    digest = ""
    values: list[str] = []
    keys: list[str] = []
    for key, value in items:
        if key == "digest":
            digest = str(value)
        elif key in non_digest_control_fields:
            continue
        else:
            keys.append(str(key))
            values.append(str(value))
    concatenated = "".join(values) + shared_secret
    calculated = base64.b64encode(sha256(concatenated.encode("utf-8")).digest()).decode("ascii")
    ok = bool(digest) and calculated == digest

    if not ok:
        # Diagnostic (no PII — keys/hashes/secret fingerprint only). Also test a
        # key-sorted ordering so the log tells us whether the failure is a
        # wrong/empty secret vs. a field-ordering mismatch.
        pairs = list(zip(keys, values))
        sorted_pairs = sorted(pairs, key=lambda kv: kv[0])
        sorted_concat = "".join(v for _, v in sorted_pairs) + shared_secret
        sorted_calc = base64.b64encode(sha256(sorted_concat.encode("utf-8")).digest()).decode("ascii")
        logger.error(
            "[Worldline Webhook] Digest mismatch. received=%s post_order_calc=%s "
            "sorted_calc=%s keys=%s secret_len=%d secret_fp=%s",
            digest, calculated, sorted_calc, keys,
            len(shared_secret or ""),
            (shared_secret[:1] + "…" + shared_secret[-1:]) if shared_secret else "<empty>",
        )
    return ok


# ---------------------------------------------------------------------------
# Athens-calendar billing-cycle add — lib/utils/date.ts:addBillingCycleDays
# ---------------------------------------------------------------------------


def add_billing_cycle_days(start: datetime, cycle_days: int) -> datetime:
    """Add N cycle days (30/365) matching Cardlink's scheduled-recurring cadence.

    Mirrors addBillingCycleDays (date.ts:15-19): plain calendar-day addition. With
    TZ=Europe/Athens this is Athens-calendar terms, matching Cardlink's schedule.
    """
    return start + timedelta(days=cycle_days)


# ---------------------------------------------------------------------------
# XML API v2.1 — providers/worldline/xml.ts
# ---------------------------------------------------------------------------


def _calculate_xml_digest(message_xml: str, shared_secret: str) -> str:
    """base64(sha256(Message XML + sharedSecret)) — xml.ts:42-46."""
    return base64.b64encode(sha256((message_xml + shared_secret).encode("utf-8")).digest()).decode("ascii")


def _xml_escape(value: str) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def execute_recurring_charge(
    *, order_id: str, amount: str, currency: str, email: str, token: str,
    recurring_frequency: str, recurring_end_date: str,
) -> dict[str, Any]:
    """Execute a recurring charge with a stored token via Direct XML API v2.1 SaleRequest.

    Ports executeRecurringCharge (xml.ts:52-134). Returns
    {status, message?, txId?, paymentRef?, orderAmount?}.
    """
    cfg = get_worldline_config()
    if not cfg["mid"] or not cfg["shared_secret"]:
        raise RuntimeError("Worldline not configured: missing MID or shared secret")

    message_id = f"m{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    timestamp = datetime.now(timezone.utc).isoformat()

    # Inner SaleRequest body — identical in both serializations below.
    body = (
        f"<SaleRequest>"
        f"<Authentication><Mid>{_xml_escape(cfg['mid'])}</Mid></Authentication>"
        f"<OrderInfo>"
        f"<OrderId>{_xml_escape(order_id)}</OrderId>"
        f"<OrderAmount>{_xml_escape(amount)}</OrderAmount>"
        f"<Currency>{_xml_escape(currency)}</Currency>"
        f"<PayerEmail>{_xml_escape(email)}</PayerEmail>"
        f"</OrderInfo>"
        f"<PaymentInfo>"
        f"<ExtToken>{_xml_escape(token)}</ExtToken>"
        f"<RecurringIndicator>R</RecurringIndicator>"
        f"<RecurringParameters>"
        f"<ExtRecurringfrequency>{_xml_escape(recurring_frequency)}</ExtRecurringfrequency>"
        f"<ExtRecurringenddate>{_xml_escape(recurring_end_date)}</ExtRecurringenddate>"
        f"</RecurringParameters>"
        f"</PaymentInfo>"
        f"</SaleRequest>"
    )

    # Cardlink validates against the VPOS XML schema (namespace REQUIRED on the
    # VPOS root) and verifies the digest over the CANONICALIZED Message — i.e.
    # the Message as it looks after inheriting the VPOS namespaces and having its
    # attributes reordered by c14n (xmlns, xmlns:ns2, messageId, timeStamp,
    # version). Mirrors OLD cancelRecurring (xml.ts:157-181); the OLD
    # executeRecurringCharge built a bare <VPOS> and Cardlink rejected it with
    # "unexpected element VPOS" (error XE) — this fixes that.
    canonical_message_xml = (
        f'<Message xmlns="{_VPOS_NS}" xmlns:ns2="{_XMLDSIG_NS}" '
        f'messageId="{_xml_escape(message_id)}" timeStamp="{_xml_escape(timestamp)}" version="2.1">'
        f"{body}"
        f"</Message>"
    )
    digest = _calculate_xml_digest(canonical_message_xml, cfg["shared_secret"])

    final_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<VPOS xmlns="{_VPOS_NS}" xmlns:ns2="{_XMLDSIG_NS}">'
        f'<Message version="2.1" messageId="{_xml_escape(message_id)}" timeStamp="{_xml_escape(timestamp)}">'
        f"{body}"
        f"</Message>"
        f"<Digest>{_xml_escape(digest)}</Digest>"
        "</VPOS>"
    )

    resp = requests.post(
        cfg["xml_url"], data=final_xml.encode("utf-8"),
        headers={"Content-Type": "application/xml"}, timeout=15,
    )
    if not resp.ok:
        raise RuntimeError(f"Worldline XML API returned {resp.status_code}: {resp.reason}")

    return _parse_sale_response(resp.text)


def _parse_sale_response(response_text: str) -> dict[str, Any]:
    import xml.etree.ElementTree as ET

    def _strip_ns(tag: str) -> str:
        return tag.rsplit("}", 1)[-1]

    try:
        root = ET.fromstring(response_text)
    except ET.ParseError as exc:
        raise RuntimeError("Invalid XML response from Worldline") from exc

    fields: dict[str, str] = {}
    for el in root.iter():
        tag = _strip_ns(el.tag)
        if tag in ("Status", "Message", "ErrorMessage", "TxId", "PaymentRef", "OrderAmount"):
            fields[tag] = (el.text or "").strip()

    return {
        "status": fields.get("Status") or "ERROR",
        "message": fields.get("Message") or fields.get("ErrorMessage"),
        "txId": fields.get("TxId"),
        "paymentRef": fields.get("PaymentRef"),
        "orderAmount": fields.get("OrderAmount"),
    }


_VPOS_NS = "http://www.modirum.com/schemas/vposxmlapi41"
_XMLDSIG_NS = "http://www.w3.org/2000/09/xmldsig#"


def _format_timestamp_with_offset(dt: datetime) -> str:
    """ISO 8601 with timezone offset (e.g. 2024-11-05T18:09:34.343+02:00), not 'Z'.

    Mirrors formatTimestampWithOffset (xml.ts:209-219).
    """
    local = dt.astimezone()
    millis = f"{local.microsecond // 1000:03d}"
    offset = local.utcoffset() or timedelta(0)
    total_minutes = int(offset.total_seconds() // 60)
    sign = "+" if total_minutes >= 0 else "-"
    abs_minutes = abs(total_minutes)
    return (
        f"{local.year:04d}-{local.month:02d}-{local.day:02d}"
        f"T{local.hour:02d}:{local.minute:02d}:{local.second:02d}.{millis}"
        f"{sign}{abs_minutes // 60:02d}:{abs_minutes % 60:02d}"
    )


def cancel_recurring(*, order_id: str) -> dict[str, Any]:
    """Cancel a scheduled recurring subscription via Direct XML API.

    Ports cancelRecurring (xml.ts:147-203). Returns {status, message?, txId?}.
    """
    cfg = get_worldline_config()
    if not cfg["mid"] or not cfg["shared_secret"]:
        raise RuntimeError("Worldline not configured: missing MID or shared secret")

    message_id = f"M{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    timestamp = _format_timestamp_with_offset(datetime.now(timezone.utc))

    # Canonicalized Message XML — namespaces ON the Message tag, attributes in
    # canonical order (xmlns, xmlns:ns2, messageId, timeStamp, version) — xml.ts:158-165.
    canonical_message_xml = (
        f'<Message xmlns="{_VPOS_NS}" xmlns:ns2="{_XMLDSIG_NS}" '
        f'messageId="{message_id}" timeStamp="{timestamp}" version="2.1">'
        f"<RecurringOperationRequest>"
        f"<Authentication><Mid>{_xml_escape(cfg['mid'])}</Mid></Authentication>"
        f"<TransactionInfo><OrderId>{_xml_escape(order_id)}</OrderId></TransactionInfo>"
        f"<Operation>Cancel</Operation>"
        f"</RecurringOperationRequest>"
        f"</Message>"
    )
    digest = _calculate_xml_digest(canonical_message_xml, cfg["shared_secret"])

    # Final XML — namespaces on VPOS element (not on Message) — xml.ts:170-181.
    final_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<VPOS xmlns="{_VPOS_NS}" xmlns:ns2="{_XMLDSIG_NS}">'
        f'<Message version="2.1" messageId="{message_id}" timeStamp="{timestamp}">'
        f"<RecurringOperationRequest>"
        f"<Authentication><Mid>{_xml_escape(cfg['mid'])}</Mid></Authentication>"
        f"<TransactionInfo><OrderId>{_xml_escape(order_id)}</OrderId></TransactionInfo>"
        f"<Operation>Cancel</Operation>"
        f"</RecurringOperationRequest>"
        f"</Message>"
        f"<Digest>{_xml_escape(digest)}</Digest>"
        f"</VPOS>"
    )

    resp = requests.post(
        cfg["xml_url"], data=final_xml.encode("utf-8"),
        headers={"Content-Type": "application/xml"}, timeout=15,
    )
    if not resp.ok:
        raise RuntimeError(f"Worldline XML API returned {resp.status_code}: {resp.reason}")

    import xml.etree.ElementTree as ET

    def _strip_ns(tag: str) -> str:
        return tag.rsplit("}", 1)[-1]

    try:
        root = ET.fromstring(resp.text)
    except ET.ParseError as exc:
        raise RuntimeError("Invalid XML response from Worldline") from exc

    fields: dict[str, str] = {}
    for el in root.iter():
        tag = _strip_ns(el.tag)
        if tag in ("Status", "Message", "ErrorMessage", "Description", "TxId"):
            fields.setdefault(tag, (el.text or "").strip())

    return {
        "status": fields.get("Status") or "ERROR",
        "message": fields.get("Message") or fields.get("ErrorMessage") or fields.get("Description"),
        "txId": fields.get("TxId"),
    }


# ---------------------------------------------------------------------------
# Checkout-session builder — providers/worldline/adapter.ts:createCheckoutSession
# ---------------------------------------------------------------------------


def build_checkout_form_fields(
    *, profile_id: str, plan: str, billing_interval: str,
    amount: str, billing: dict[str, Any] | None, coupon_code: str | None,
    confirm_url: str, cancel_url: str,
) -> tuple[dict[str, str], str]:
    """Build the signed Cardlink redirect form fields + order id.

    Ports adapter.ts:49-124. `amount` is the gross euro string (e.g. "24.80").
    Returns (form_fields_including_digest, order_id).
    """
    cfg = get_worldline_config()

    # Order id encodes the profileId for callback mapping (adapter.ts:55-57).
    timestamp = _to_base36(int(datetime.now(timezone.utc).timestamp() * 1000))
    safe_profile_id = re.sub(r"[^a-zA-Z0-9]", "", profile_id)
    order_id = f"DOL{safe_profile_id}{timestamp}"[:50]

    # Recurring end date: max allowed by Cardlink is 1825 days (~5 years) — adapter.ts:71-74.
    end_date = datetime.now(timezone.utc) + timedelta(days=1825)
    recurring_end_date = end_date.strftime("%Y%m%d")
    # TEST override (WORLDLINE_RECURRING_OVERRIDE_DAYS): when >0, Cardlink is asked
    # to charge every N days (set 1 on test to watch daily renewals). Default 0 =
    # real cadence: 365 (yearly) / 30 (monthly).
    from apps.billing.services.advice import recurring_override_days
    override = recurring_override_days()
    recurring_frequency = str(override) if override else ("365" if billing_interval == "year" else "30")

    billing = billing or {}
    address = (billing.get("address") or {}) if isinstance(billing.get("address"), dict) else {}
    interval_word = "Ετήσια" if billing_interval == "year" else "Μηνιαία"

    form_fields: dict[str, str] = {
        "version": "2",
        "mid": cfg["mid"],
        "lang": "el",
        "deviceCategory": "0",
        "orderid": order_id,
        "orderDesc": (
            f"Doulitsa {plan} - {interval_word} Συνδρομή Προώθησης - "
            "Δυνατότητα ακύρωσης οποιαδήποτε στιγμή"
        ),
        "orderAmount": amount,
        "currency": "EUR",
        "payerEmail": billing.get("email") or "",
        "payerPhone": billing.get("phone") or "",
        "billCountry": address.get("country") or "GR",
        "billZip": address.get("postalCode") or "",
        "billCity": address.get("city") or "",
        "billAddress": address.get("line1") or "",
        "trType": "1",
        "extRecurringfrequency": recurring_frequency,
        "extRecurringenddate": recurring_end_date,
        "confirmUrl": confirm_url,
        "cancelUrl": cancel_url,
        "extTokenOptions": "100",
        "var1": profile_id,
        "var2": plan,
        "var3": billing_interval,
        "var4": coupon_code or "",
    }

    form_fields["digest"] = calculate_request_digest(form_fields, cfg["shared_secret"])
    return form_fields, order_id


def _to_base36(n: int) -> str:
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0:
        return "0"
    digits: list[str] = []
    while n:
        n, rem = divmod(n, 36)
        digits.append(alphabet[rem])
    return "".join(reversed(digits))
