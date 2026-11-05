"""Greek AFM (tax registry) lookup via the AADE SOAP API.

Mirrors `actions/profiles/lookup-afm.ts`. The official endpoint is at:

    https://www1.gsis.gr/wsaade/RgWsPublic2/RgWsPublic2

It uses WS-Security (UsernameToken) for auth. Credentials come from the
AADE.USERNAME / AADE.PASSWORD env vars.

We use `zeep` for SOAP. The request body asks for VAT registry info given
an AFM, returning company name, address, profession, status, etc.

Behaviour parity points:
1. AFM must be 9 digits (caller validates with the regex serializer).
2. Network/auth errors are translated to user-facing Greek messages.
3. Result shape mirrors the Next.js return value VERBATIM (raw AADE field
   names: onomasia/doy_descr/firm_act_descr/postal_*) so the autofill form
   keeps working without changes (lookup-afm.ts:104-114).
"""
from __future__ import annotations

import logging
import threading
from typing import Any

from django.conf import settings

from common.exceptions import ApiError

logger = logging.getLogger(__name__)

_AADE_WSDL = "https://www1.gsis.gr/wsaade/RgWsPublic2/RgWsPublic2?WSDL"


_CLIENT_CACHE: dict[tuple[str, str], Any] = {}
_CLIENT_LOCK = threading.Lock()
# P5-BR-9: bound every AADE round-trip (WSDL load + operation). OLD's fetch had
# no explicit timeout, but a hung AADE must not pin a worker thread forever.
_WSDL_TIMEOUT = 15
_OPERATION_TIMEOUT = 20


def _get_client(username: str, password: str):
    """Process-wide zeep client (P5-BR-9): parsing the AADE WSDL on every
    request re-downloaded it each time. Keyed by the credentials so a rotated
    password builds a fresh client."""
    key = (username, password)
    client = _CLIENT_CACHE.get(key)
    if client is not None:
        return client
    with _CLIENT_LOCK:
        client = _CLIENT_CACHE.get(key)
        if client is None:
            import zeep
            from zeep.transports import Transport
            from zeep.wsse.username import UsernameToken

            client = zeep.Client(
                wsdl=_AADE_WSDL,
                wsse=UsernameToken(username, password),
                transport=Transport(timeout=_WSDL_TIMEOUT, operation_timeout=_OPERATION_TIMEOUT),
            )
            _CLIENT_CACHE.clear()
            _CLIENT_CACHE[key] = client
    return client


def lookup_afm(afm: str) -> dict[str, Any]:
    """Fetch AADE registry data for the given AFM.

    Mirrors OLD `actions/profiles/lookup-afm.ts` — returns the AADE field
    names VERBATIM (`onomasia`, `doy_descr`, `firm_act_descr`, and the
    separate `postal_*` parts) so the verification/billing autofill form can
    read each field individually. Do NOT rename or pre-join these keys.

    AFM-1 (three bugs fixed, per the live WSDL — Soap12Binding, output
    `result: {rg_ws_public2_result_rtType}`):
    1. `afm_called_by` is sent EMPTY, exactly like OLD (`<ns3:afm_called_by/>`,
       lookup-afm.ts:57); it was the AADE username, which is not an AFM.
    2. `error_rec` is read: a non-zero `error_code` fails with AADE's own
       `error_descr` (OLD lookup-afm.ts:92-97) instead of a blind "not found".
    3. `basic_rec` is read from inside `rg_ws_public2_result_rtType` — zeep
       unwraps the body part to `result`, whose only child is that wrapper, so
       `result.basic_rec` was always None → every lookup returned 404.
    """
    creds = settings.AADE
    username = (creds.get("USERNAME") or "").strip()
    password = (creds.get("PASSWORD") or "").strip()
    if not username or not password:
        # OLD lookup-afm.ts:36-38 text.
        raise ApiError(
            "Σφάλμα διαμόρφωσης AADE",
            code="aade_unconfigured",
            status_code=500,
        )

    try:
        import zeep  # noqa: F401
    except ImportError as exc:  # pragma: no cover
        raise ApiError(
            "Σφάλμα διαμόρφωσης AADE",
            code="dependency_missing",
            status_code=500,
        ) from exc

    try:
        client = _get_client(username, password)
        result = client.service.rgWsPublic2AfmMethod(
            INPUT_REC={"afm_called_by": "", "afm_called_for": afm},
        )
    except Exception as exc:
        logger.warning("aade_lookup_failed", extra={"afm": afm, "error": str(exc)})
        # OLD lookup-afm.ts:76-80 text for a failed AADE round-trip.
        raise ApiError(
            "Σφάλμα σύνδεσης με AADE",
            code="aade_unavailable",
            status_code=502,
        ) from exc

    rt = _unwrap_result(result)

    error_rec = getattr(rt, "error_rec", None) if rt is not None else None
    error_code = _text(getattr(error_rec, "error_code", None)) if error_rec is not None else ""
    if error_code and error_code != "0":
        error_descr = _text(getattr(error_rec, "error_descr", None))
        logger.warning("aade_error_rec", extra={"afm": afm, "error_code": error_code, "error_descr": error_descr})
        raise ApiError(
            error_descr or "ΑΦΜ δεν βρέθηκε",
            code="afm_not_found",
            status_code=404,
        )

    # OLD reads `onomasia` and only treats the lookup as "not found" when it is
    # missing (lookup-afm.ts:99-102).
    basic = getattr(rt, "basic_rec", None) if rt is not None else None
    onomasia = _text(getattr(basic, "onomasia", None)) if basic is not None else ""
    if not onomasia:
        raise ApiError(
            "ΑΦΜ δεν βρέθηκε",
            code="afm_not_found",
            status_code=404,
        )

    # Return the AADE field names VERBATIM, matching OLD lookup-afm.ts:104-114.
    return {
        "onomasia": onomasia,
        "doy_descr": _text(getattr(basic, "doy_descr", None)),
        # `firm_act_descr` is NOT a basic_rec field (live WSDL): it lives in
        # `firm_act_tab.item[]`. OLD's regex `get('firm_act_descr')` returned the
        # FIRST occurrence in the reply = the first activity item. Same here.
        "firm_act_descr": _first_firm_act_descr(rt),
        "postal_address": _text(getattr(basic, "postal_address", None)),
        "postal_address_no": _text(getattr(basic, "postal_address_no", None)),
        "postal_zip_code": _text(getattr(basic, "postal_zip_code", None)),
        "postal_area_description": _text(getattr(basic, "postal_area_description", None)),
    }


def _first_firm_act_descr(rt: Any) -> str:
    tab = getattr(rt, "firm_act_tab", None) if rt is not None else None
    items = getattr(tab, "item", None) if tab is not None else None
    if isinstance(tab, dict):
        items = tab.get("item")
    for item in items or []:
        value = item.get("firm_act_descr") if isinstance(item, dict) else getattr(item, "firm_act_descr", None)
        return _text(value)
    return ""


def _unwrap_result(result: Any) -> Any:
    """Return the `rg_ws_public2_result_rtType` record from a zeep reply.

    Normal path: `result.rg_ws_public2_result_rtType`. Tolerates a reply that
    zeep already unwrapped one level further (has `basic_rec`/`error_rec`
    directly) and a dict-shaped reply.
    """
    if result is None:
        return None
    if isinstance(result, dict):
        inner = result.get("rg_ws_public2_result_rtType")
        if inner is not None:
            return inner
        inner = result.get("result")
        if inner is not None:
            return _unwrap_result(inner)
        return result
    inner = getattr(result, "rg_ws_public2_result_rtType", None)
    if inner is not None:
        return inner
    inner = getattr(result, "result", None)
    if inner is not None and inner is not result:
        return _unwrap_result(inner)
    return result


def _text(value: Any) -> str:
    """Mirror OLD `get()` (lookup-afm.ts:85-90): nil/None elements become ''."""
    if value is None:
        return ""
    return str(value).strip()
