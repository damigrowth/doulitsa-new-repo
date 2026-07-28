"""Cache revalidation webhook + admin endpoint (rows 8, 243)."""
from __future__ import annotations

import hmac
import logging

from django.conf import settings
from django.core.cache import cache
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.roles import IsAdmin

logger = logging.getLogger(__name__)


def _purge_well_known_prefixes() -> list[str]:
    """Clear cache keys we know we maintain. Redis doesn't have wildcard delete
    via django-redis without iterating, so we delete known compound keys here."""
    known = [
        # Services
        "core:home",
        # Profiles aggregations
        "profiles:directory:_:_:15",
    ]
    cache.delete_many(known)
    # For wildcard purges (count/list keys with variable filter parts) we rely
    # on TTLs to roll over within minutes. Aggressive purge is available via
    # `cache.clear()` if the admin wants — gated behind a separate endpoint.
    return known


class RevalidateAllCachesView(APIView):
    """POST /api/admin/cache/revalidate-all (row 243)."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        keys = _purge_well_known_prefixes()
        return Response({"message": "Caches revalidated", "revalidated": keys})


class RevalidateWebhookView(APIView):
    """POST /api/webhooks/revalidate-cache (row 8) — Vercel deployment webhook.

    Authenticated via a shared secret in the `Authorization: Bearer <secret>`
    header. In Django this is largely a no-op (Django doesn't have an ISR
    layer), but we keep it functional so Vercel post-deploy hooks don't 404.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        provided = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if not settings.CRON_SECRET or not hmac.compare_digest(provided, settings.CRON_SECRET):
            return Response({"error": {"code": "unauthorized", "message": "Invalid webhook secret"}}, status=401)
        keys = _purge_well_known_prefixes()
        logger.info("cache.revalidated_via_webhook", extra={"keys": keys})
        return Response({"ok": True, "revalidated": keys})
