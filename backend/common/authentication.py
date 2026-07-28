"""Custom authentication classes.

`ApiKeyAuthentication`: matches Better Auth's API-key plugin behaviour. The
client passes either a static env-key (Authorization: ApiKey <env-key>) or a
DB-stored key. DB keys are owned by an admin user and may be enabled/disabled
or expired.

`CookieJWTAuthentication`: reads the SimpleJWT access token from the
`dj_access` cookie that Next.js sets `httpOnly` after login. Lets client
components that can't read httpOnly cookies still talk to the API by relying
on the browser to send the cookie via `credentials: 'include'`.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from django.conf import settings
from rest_framework import authentication, exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication


COOKIE_NAME_ACCESS = "dj_access"


class CookieJWTAuthentication(JWTAuthentication):
    """JWT auth that pulls the access token from the `dj_access` cookie.

    Returns `None` (not an error) when the cookie is missing, so the request
    falls through to the other authentication classes (Authorization header
    Bearer, API key, etc.). Only treats malformed/expired tokens as failures
    — and silently does so by returning `None` to avoid leaking SimpleJWT's
    error envelope from public endpoints accessed by browsing users whose
    refresh token may also have expired.
    """

    def authenticate(self, request: Any) -> tuple[Any, Any] | None:
        raw_token = request.COOKIES.get(COOKIE_NAME_ACCESS)
        if not raw_token:
            return None
        try:
            validated = self.get_validated_token(raw_token)
            return (self.get_user(validated), validated)
        except exceptions.AuthenticationFailed:
            return None
        except Exception:
            return None


class ApiKeyAuthentication(authentication.BaseAuthentication):
    keyword = "ApiKey"

    def authenticate(self, request: Any) -> tuple[Any, str] | None:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith(f"{self.keyword} "):
            return None

        provided_key = auth_header[len(self.keyword) + 1 :].strip()
        if not provided_key:
            raise exceptions.AuthenticationFailed("Empty API key.")

        # 1. Static env-level key (used by infra/ops scripts)
        if settings.ADMIN_API_KEY and provided_key == settings.ADMIN_API_KEY:
            user = self._get_static_admin_user()
            return (user, provided_key)

        # 2. DB-backed admin API key
        from apps.admin_api.models.api_key import ApiKey

        try:
            api_key = ApiKey.objects.select_related("user").get(key=provided_key, enabled=True)
        except ApiKey.DoesNotExist as exc:
            raise exceptions.AuthenticationFailed("Invalid API key.") from exc

        if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
            raise exceptions.AuthenticationFailed("API key expired.")

        return (api_key.user, provided_key)

    def authenticate_header(self, request: Any) -> str:
        return self.keyword

    @staticmethod
    def _get_static_admin_user() -> Any:
        """Returns a synthetic super-admin user for the env-level key.

        The user has role='admin' and is_authenticated=True, but is NOT
        persisted. Use sparingly — DB keys are preferred for auditability.
        """
        from apps.accounts.models.user import User

        try:
            return User.objects.filter(role="admin").order_by("created_at").first() or User(
                id="env-admin", email="env@admin", role="admin", type="user"
            )
        except Exception:
            return User(id="env-admin", email="env@admin", role="admin", type="user")
