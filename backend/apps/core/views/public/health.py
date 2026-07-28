"""Health + maintenance endpoints (rows 131, 24)."""
from __future__ import annotations

import logging

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """GET /api/health (row 131)."""

    permission_classes = [AllowAny]

    def get(self, request):
        db_ok = self._check_db()
        redis_ok = self._check_redis()
        celery_ok = self._check_celery()
        ok = db_ok and redis_ok
        body = {
            "ok": ok,
            "db": db_ok,
            "redis": redis_ok,
            "celery": celery_ok,
        }
        return Response(body, status=200 if ok else 503)

    @staticmethod
    def _check_db() -> bool:
        try:
            with connection.cursor() as c:
                c.execute("SELECT 1")
                c.fetchone()
            return True
        except Exception as e:
            logger.warning("health.db_fail", extra={"error": str(e)})
            return False

    @staticmethod
    def _check_redis() -> bool:
        try:
            cache.set("health:probe", "1", timeout=10)
            return cache.get("health:probe") == "1"
        except Exception as e:
            logger.warning("health.redis_fail", extra={"error": str(e)})
            return False

    @staticmethod
    def _check_celery() -> bool:
        # Best-effort: just verify the broker URL is set. A real ping would
        # require celery.inspect() round-trip which is slow for a healthcheck.
        return bool(settings.CELERY_BROKER_URL)


class MaintenanceStatusView(APIView):
    """GET /api/auth/maintenance (row 24) — moved to core per plan."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "isUnderMaintenance": bool(settings.MAINTENANCE_MODE),
            # Env-configurable message (OLD maintenance.ts:14 MAINTENANCE_MESSAGE).
            "message": settings.MAINTENANCE_MESSAGE if settings.MAINTENANCE_MODE else None,
        })
