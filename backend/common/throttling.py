"""Custom throttle classes referenced by `DEFAULT_THROTTLE_RATES`.

Two things on top of DRF's defaults:

1. **Per real visitor, not per frontend-container IP.** Public pages are
   server-rendered, so their API calls originate from the Next.js container —
   meaning every anonymous visitor would otherwise share ONE ip for the `anon`
   scope and the limit would be a *global* cap. The frontend forwards the real
   visitor IP in `X-Real-Client-IP`, authenticated by a shared secret
   (`X-Internal-Proxy-Secret` == settings.INTERNAL_PROXY_SECRET) so an external
   client hitting the API directly can't spoof it. When the secret isn't set we
   fall back to DRF's normal ident (so local/dev still works).

2. **Period multipliers** like `100/5s` (100 requests / 5 seconds) or `3/10min`
   — stock DRF only understands a single unit char, so this also repairs the
   existing `1/30sec` / `3/10min` rates.
"""
from __future__ import annotations

import re

from django.conf import settings
from django.utils.crypto import constant_time_compare
from rest_framework.throttling import (
    AnonRateThrottle as _AnonRateThrottle,
    ScopedRateThrottle as _ScopedRateThrottle,
    UserRateThrottle as _UserRateThrottle,
)

_PERIOD_RE = re.compile(r"(\d*)\s*([smhd])")
_UNIT_SECONDS = {"s": 1, "m": 60, "h": 3600, "d": 86400}


class ClientIPThrottleMixin:
    """Key throttles on the real visitor IP and understand `N/<count><unit>`."""

    def get_ident(self, request):
        secret = getattr(settings, "INTERNAL_PROXY_SECRET", "") or ""
        if secret:
            sent = request.META.get("HTTP_X_INTERNAL_PROXY_SECRET", "")
            real_ip = request.META.get("HTTP_X_REAL_CLIENT_IP", "")
            if sent and real_ip and constant_time_compare(sent, secret):
                return real_ip.strip()
        return super().get_ident(request)

    def parse_rate(self, rate):
        # Extends DRF: supports a period multiplier, e.g. "100/5s" => 100 per 5s,
        # "3/10min" => 3 per 600s. Single-unit forms ("200/sec", "60/min") work
        # too. Falls back to DRF for anything unrecognised.
        if rate is None:
            return (None, None)
        num, period = rate.split("/")
        m = _PERIOD_RE.match(period)
        if not m:
            return super().parse_rate(rate)
        count = int(m.group(1) or 1)
        return (int(num), count * _UNIT_SECONDS[m.group(2)])


class AnonRateThrottle(ClientIPThrottleMixin, _AnonRateThrottle):
    pass


class UserRateThrottle(ClientIPThrottleMixin, _UserRateThrottle):
    pass


class ScopedRateThrottle(ClientIPThrottleMixin, _ScopedRateThrottle):
    pass


class LoginThrottle(ScopedRateThrottle):
    scope = "login"


class RegisterThrottle(ScopedRateThrottle):
    scope = "register"


class PasswordResetThrottle(ScopedRateThrottle):
    scope = "password_reset"


class VerificationResendThrottle(ScopedRateThrottle):
    scope = "verification_resend"


class ServiceDraftThrottle(ScopedRateThrottle):
    scope = "service_draft"


class TaxonomySubmissionThrottle(ScopedRateThrottle):
    scope = "taxonomy_submission"


class AfmLookupThrottle(ScopedRateThrottle):
    scope = "afm_lookup"


class ContactFormThrottle(ScopedRateThrottle):
    scope = "contact_form"


class ReportThrottle(ScopedRateThrottle):
    scope = "report"
