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
    BaseThrottle,
    SimpleRateThrottle,
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
    """DRF's view-attribute variant: limits only views that set
    `throttle_scope`. (It overwrites any class-level `scope` with
    `view.throttle_scope`, so it can NOT be subclassed per scope.)"""


class ClassScopedRateThrottle(ClientIPThrottleMixin, SimpleRateThrottle):
    """Throttle whose `scope` is the class attribute (XC-THROTTLE fix).

    The old per-scope classes subclassed DRF's ScopedRateThrottle, which resets
    `self.scope` from `view.throttle_scope` (unset everywhere) and then allows
    every request, so they were all no-ops. This honours `scope` and keys on
    the user id (authenticated) or the real visitor IP.
    """

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class DefaultRatesThrottle(BaseThrottle):
    """Applies exactly the global `anon` + `user` throttles.

    A view's `throttle_classes` REPLACES `DEFAULT_THROTTLE_CLASSES`, so a view
    listing only a per-endpoint class used to drop the global limits too. The
    endpoint classes below inherit from this one, which keeps the global
    anon/user buckets (same cache keys) for those views.
    """

    def __init__(self):
        self._throttles = [AnonRateThrottle(), UserRateThrottle()]
        self._failed: list = []

    def allow_request(self, request, view):
        self._failed = [t for t in self._throttles if not t.allow_request(request, view)]
        return not self._failed

    def wait(self):
        waits = [w for w in (t.wait() for t in self._failed) if w is not None]
        return max(waits) if waits else None


# ----- Per-endpoint classes -------------------------------------------------
#
# Parity (MASTER XC-THROTTLE / §5 D-10, pass4-verify-auth §0): OLD had NO rate
# limit on any of these endpoints (better-auth's limiter only ran inside its
# HTTP router, which the server actions bypassed). The only OLD limit was
# forgot-password, 1 request / 10 min PER EMAIL, which is implemented in
# `ForgotPasswordView` (it keys on the email, not on the client).
#
# So each endpoint class applies only the global anon/user limits. `scope`
# names the `DEFAULT_THROTTLE_RATES` entry that turns on a stricter
# per-endpoint limit: to enforce it (a product decision, D-10), add
# `ClassScopedRateThrottle` to the class bases, e.g.
#     class LoginThrottle(ClassScopedRateThrottle): scope = "login"
# and keep `DefaultRatesThrottle` in the view's throttle_classes.


class _EndpointThrottle(DefaultRatesThrottle):
    scope: str = ""


class LoginThrottle(_EndpointThrottle):
    scope = "login"


class RegisterThrottle(_EndpointThrottle):
    scope = "register"


class PasswordResetThrottle(_EndpointThrottle):
    scope = "password_reset"


class VerificationResendThrottle(ClassScopedRateThrottle):
    """Enforced (D-10 resolved 2026-11-07): `verification_resend` = 3/10min per
    visitor. The view must list DefaultRatesThrottle alongside this class to
    keep the global anon/user buckets."""
    scope = "verification_resend"


class ServiceDraftThrottle(_EndpointThrottle):
    scope = "service_draft"


class TaxonomySubmissionThrottle(_EndpointThrottle):
    scope = "taxonomy_submission"


class AfmLookupThrottle(_EndpointThrottle):
    scope = "afm_lookup"


class ContactFormThrottle(_EndpointThrottle):
    scope = "contact_form"


class ReportThrottle(_EndpointThrottle):
    scope = "report"
