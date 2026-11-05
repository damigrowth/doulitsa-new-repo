"""Custom authentication classes.

`ApiKeyAuthentication`: Authorization: ApiKey <env-key | DB key>. Opt-in per
view (`allow_api_key_auth = True`); ignored everywhere else. DB keys are owned
by an admin user and may be enabled/disabled or expired.

`CookieJWTAuthentication`: reads the SimpleJWT access token from the
`dj_access` cookie that Next.js sets `httpOnly` after login. Lets client
components that can't read httpOnly cookies still talk to the API by relying
on the browser to send the cookie via `credentials: 'include'`.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from django.conf import settings
from django.utils.crypto import constant_time_compare
from rest_framework import authentication, exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


COOKIE_NAME_ACCESS = "dj_access"


class RevocationAwareJWTAuthentication(JWTAuthentication):
    """JWTAuthentication that honors the per-user revocation epoch.

    P0-6: admin "revoke all sessions" blacklists refresh tokens, but access
    tokens already in the wild stayed valid for up to 15 minutes. The revoke
    helper stores `auth:revoked-before:{user_id}` (a unix timestamp, TTL just
    over the access lifetime); any access token ISSUED before that moment is
    rejected here — for both the Bearer header path (this class as the
    settings default) and the cookie path (CookieJWTAuthentication subclasses
    it). Cache misses and cache outages fail OPEN (the token's own 15-minute
    TTL remains the backstop, as before this check existed).
    """

    def get_validated_token(self, raw_token):  # type: ignore[override]
        validated = super().get_validated_token(raw_token)
        try:
            from django.core.cache import cache

            user_id = validated.get("user_id")
            revoked_before = cache.get(f"auth:revoked-before:{user_id}") if user_id else None
            if revoked_before is not None and validated.get("iat", 0) < float(revoked_before):
                raise InvalidToken("Session revoked")
        except InvalidToken:
            raise
        except Exception:  # pragma: no cover — cache down: fail open
            pass
        return validated


class CookieJWTAuthentication(RevocationAwareJWTAuthentication):
    """JWT auth that pulls the access token from the `dj_access` cookie.

    Returns `None` (not an error) when the cookie is missing, so the request
    falls through to the other authentication classes (Authorization header
    Bearer, API key, etc.). Malformed/expired tokens and unknown/inactive users
    also return `None` (to avoid leaking SimpleJWT's error envelope from public
    endpoints accessed by browsing users whose refresh token may also have
    expired). Any other error (e.g. the DB is down) propagates.
    """

    def authenticate(self, request: Any) -> tuple[Any, Any] | None:
        raw_token = request.COOKIES.get(COOKIE_NAME_ACCESS)
        if not raw_token:
            return None
        try:
            validated = self.get_validated_token(raw_token)
            return (self.get_user(validated), validated)
        except (exceptions.AuthenticationFailed, InvalidToken, TokenError):
            # Only auth failures (bad/expired token, unknown or inactive user)
            # read as "anonymous". A DB error must surface as a 500, not as a
            # silent logout (P5-BR-8; it fed the cookie-clearing refresh path).
            return None


class ApiKeyAuthentication(authentication.BaseAuthentication):
    """Admin API-key authentication — OPT-IN per view (AZ-D1 / P1-4).

    OLD never accepted API keys as session credentials (`validateAdminApiKey`
    was validate-only; better-auth `enableSessionForAPIKeys` defaulted to
    false). This class sits in DEFAULT_AUTHENTICATION_CLASSES, which made any
    key a bearer credential for the whole API. It now authenticates ONLY on
    views that set `allow_api_key_auth = True` (none do today), and even then
    compares in constant time and requires the key owner to be an active admin.
    On every other view the header is ignored (returns None).
    """

    keyword = "ApiKey"

    def authenticate(self, request: Any) -> tuple[Any, str] | None:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith(f"{self.keyword} "):
            return None

        view = (getattr(request, "parser_context", None) or {}).get("view")
        if not getattr(view, "allow_api_key_auth", False):
            return None

        provided_key = auth_header[len(self.keyword) + 1 :].strip()
        if not provided_key:
            raise exceptions.AuthenticationFailed("Empty API key.")

        # 1. Static env-level key (used by infra/ops scripts)
        if settings.ADMIN_API_KEY and constant_time_compare(provided_key, settings.ADMIN_API_KEY):
            user = self._get_static_admin_user()
            return (self._require_active_admin(user), provided_key)

        # 2. DB-backed admin API key
        from apps.admin_api.models.api_key import ApiKey

        candidates = ApiKey.objects.select_related("user").filter(enabled=True)
        match = next(
            (k for k in candidates if k.key and constant_time_compare(k.key, provided_key)),
            None,
        )
        if match is None:
            raise exceptions.AuthenticationFailed("Invalid API key.")

        if match.expires_at and match.expires_at < datetime.now(timezone.utc):
            raise exceptions.AuthenticationFailed("API key expired.")

        return (self._require_active_admin(match.user), provided_key)

    def authenticate_header(self, request: Any) -> str:
        return self.keyword

    @staticmethod
    def _require_active_admin(user: Any) -> Any:
        from apps.accounts.models.user import UserRole

        if (
            user is None
            or getattr(user, "role", None) != UserRole.ADMIN
            or not getattr(user, "is_active", False)
        ):
            raise exceptions.AuthenticationFailed("API key owner is not an active admin.")
        return user

    @staticmethod
    def _get_static_admin_user() -> Any:
        """The env-level key maps to the oldest ACTIVE admin (never a synthetic
        unsaved user)."""
        from apps.accounts.models.user import User, UserRole

        for user in User.objects.filter(role=UserRole.ADMIN).order_by("created_at"):
            if user.is_active:
                return user
        return None
