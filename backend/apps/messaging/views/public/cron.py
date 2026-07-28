"""Cron entrypoint for unread-message email digests (/api/cron/process-email-batches).

Pattern-matches WorldlineRenewalsCronView (billing/views/public/billing.py):
AllowAny + `Authorization: Bearer <CRON_SECRET>` guard, GET + POST (Vercel
cron sends GET; the Next.js proxy forwards either). Runs the Celery task
function synchronously and returns its result dict.
"""
from __future__ import annotations

import logging

from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class ProcessEmailBatchesCronView(APIView):
    """POST/GET /api/cron/process-email-batches — send unread-message digests
    (OLD cron/process-email-batches/route.ts)."""

    permission_classes = [AllowAny]

    def post(self, request):
        return self._run(request)

    def get(self, request):
        return self._run(request)

    @staticmethod
    def _run(request):
        from apps.messaging.tasks import process_email_batches

        cron_secret = settings.CRON_SECRET
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not cron_secret or auth_header != f"Bearer {cron_secret}":
            return Response({"error": "Unauthorized"}, status=401)
        try:
            # Call the task function directly (synchronously) — no broker needed.
            results = process_email_batches()
        except Exception:  # noqa: BLE001
            logger.exception("[Email Batches] Cron job failed")
            return Response({"error": "Cron job failed"}, status=500)
        logger.info("[Email Batches] %s", results)
        return Response(results)
