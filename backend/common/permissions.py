"""Project-wide DRF permissions. App-specific permissions live in `apps/<app>/permissions/`."""
from __future__ import annotations

from typing import Any

from rest_framework.permissions import BasePermission


class IsOwnerOrReadOnly(BasePermission):
    """Allow owners to edit their own objects; everyone else read-only.

    Why: many endpoints (services, reviews, profiles) need owner-only writes
    while keeping reads public. Centralising this avoids duplicating the
    pattern in every viewset.
    """

    owner_field: str = "user_id"

    def has_object_permission(self, request: Any, view: Any, obj: Any) -> bool:
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return getattr(obj, self.owner_field, None) == getattr(request.user, "id", None)


class IsAuthenticatedAndConfirmed(BasePermission):
    """Require an authenticated, email-confirmed (and not banned/blocked) user."""

    message = "Account must be confirmed and active."

    def has_permission(self, request: Any, view: Any) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "blocked", False) or getattr(user, "banned", False):
            return False
        return bool(getattr(user, "email_verified", False))


class HasActiveSubscription(BasePermission):
    """Gate features that require a paid subscription.

    Defers the actual lookup to a selector so this stays cheap on cold paths.
    """

    message = "An active subscription is required."

    def has_permission(self, request: Any, view: Any) -> bool:
        from apps.billing.selectors.subscription_selectors import has_active_subscription

        return bool(request.user.is_authenticated and has_active_subscription(request.user))


class IsCronOrAdmin(BasePermission):
    """Allow either a valid cron secret header OR an authenticated admin.

    Used on the legacy `/api/cron/*` endpoints kept as HTTP triggers in addition
    to Celery beat. The cron secret matches `CRON_SECRET` in the environment.
    """

    message = "Cron secret or admin role required."

    def has_permission(self, request: Any, view: Any) -> bool:
        from django.conf import settings

        secret = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if settings.CRON_SECRET and secret == settings.CRON_SECRET:
            return True
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, "role", None) == "admin")
