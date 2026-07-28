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
from typing import Any

from django.conf import settings

from common.exceptions import ApiError

logger = logging.getLogger(__name__)

_AADE_WSDL = "https://www1.gsis.gr/wsaade/RgWsPublic2/RgWsPublic2?WSDL"


def lookup_afm(afm: str) -> dict[str, Any]:
    """Fetch AADE registry data for the given AFM.

    Mirrors OLD `actions/profiles/lookup-afm.ts:104-114` — returns the AADE
    field names VERBATIM (`onomasia`, `doy_descr`, `firm_act_descr`, and the
    separate `postal_*` parts) so the verification/billing autofill form can
    read each field individually. Do NOT rename or pre-join these keys.
    """
    creds = settings.AADE
    if not creds.get("USERNAME") or not creds.get("PASSWORD"):
        raise ApiError(
            "AADE credentials not configured",
            code="aade_unconfigured",
            status_code=500,
        )

    try:
        import zeep
        from zeep.wsse.username import UsernameToken
    except ImportError as exc:  # pragma: no cover
        raise ApiError(
            "zeep dependency missing — install with `pip install zeep`",
            code="dependency_missing",
            status_code=500,
        ) from exc

    try:
        client = zeep.Client(
            wsdl=_AADE_WSDL,
            wsse=UsernameToken(creds["USERNAME"], creds["PASSWORD"]),
        )
        result = client.service.rgWsPublic2AfmMethod(
            INPUT_REC={"afm_called_by": creds["USERNAME"], "afm_called_for": afm},
        )
    except Exception as exc:
        logger.warning("aade_lookup_failed", extra={"afm": afm, "error": str(exc)})
        raise ApiError(
            "Αποτυχία επικοινωνίας με την υπηρεσία ΑΑΔΕ",
            code="aade_unavailable",
            status_code=502,
        ) from exc

    # Parse zeep response into a flat dict. OLD reads `onomasia` and only
    # treats the lookup as "not found" when it is missing (lookup-afm.ts:99-102).
    basic = getattr(result, "basic_rec", None)
    onomasia = _text(getattr(basic, "onomasia", None)) if basic else ""
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
        "firm_act_descr": _text(getattr(basic, "firm_act_descr", None)),
        "postal_address": _text(getattr(basic, "postal_address", None)),
        "postal_address_no": _text(getattr(basic, "postal_address_no", None)),
        "postal_zip_code": _text(getattr(basic, "postal_zip_code", None)),
        "postal_area_description": _text(getattr(basic, "postal_area_description", None)),
    }


def _text(value: Any) -> str:
    """Mirror OLD `get()` (lookup-afm.ts:85-90): nil/None elements become ''."""
    if value is None:
        return ""
    return str(value).strip()
