"""Google OAuth code exchange — server-side only (holds the client secret).

The browser-facing redirect + callback live in the Next.js frontend, so the
user never sees the Django URL and the secret never leaves the backend. This
module only does the secret-bearing token exchange, find-or-creates the Google
user (matching OLD Better Auth: provider=google, emailVerified/confirmed=True;
brand-new users land at TYPE_SELECTION so the existing oauth-setup flow can
collect type/role/username), and mints the session tokens. The frontend sets the
dj_access / dj_refresh cookies and routes by `user['step']`.
"""
from __future__ import annotations

from typing import Any

import requests
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Account, User
from apps.accounts.models.user import JourneyStep, UserRole, UserType
from apps.accounts.selectors.users import serialize_session_user
from common.exceptions import ApiError

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def _google_app() -> tuple[str, str]:
    app = (settings.SOCIALACCOUNT_PROVIDERS.get("google") or {}).get("APP") or {}
    client_id, secret = app.get("client_id"), app.get("secret")
    if not client_id or not secret:
        raise ApiError(
            "Google OAuth not configured — set GOOGLE_OAUTH_CLIENT_ID / "
            "GOOGLE_OAUTH_CLIENT_SECRET",
            code="oauth_unconfigured",
            status_code=500,
        )
    return client_id, secret


def _parse_intent(intent: Any) -> tuple[str | None, str | None]:
    """Validate the oauth_intent payload ({type: 'user'|'pro', role?}) relayed
    by the Next.js callback route. Mirrors OLD lib/auth/config.ts:274-299."""
    if not isinstance(intent, dict):
        return None, None
    intent_type = intent.get("type") or intent.get("authType")
    if intent_type not in ("user", "pro"):
        return None, None
    role = intent.get("role")
    if intent_type == "pro" and role in (UserRole.FREELANCER, UserRole.COMPANY):
        return intent_type, role
    return intent_type, None


def exchange_code(*, code: str, redirect_uri: str, intent: Any = None) -> dict[str, Any]:
    """Exchange a Google authorization code for a logged-in session.

    `intent` is the (optional) oauth_intent cookie payload from the register
    flow. Mirrors OLD Better Auth hooks (config.ts:274-299, 358-376): applied
    ONLY when creating a NEW user — with intent the user skips type selection
    and lands at OAUTH_SETUP; without it they land at TYPE_SELECTION. Existing
    users are never overridden.

    Returns {access, refresh, user, isNew}.
    """
    client_id, client_secret = _google_app()

    # 1) authorization code -> Google access token
    try:
        tok = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=15,
        )
    except requests.RequestException as exc:  # pragma: no cover - network
        raise ApiError("Google unreachable", code="oauth_network", status_code=502) from exc
    if tok.status_code != 200:
        raise ApiError("Google token exchange failed", code="oauth_exchange_failed", status_code=400)
    access_token = tok.json().get("access_token")
    if not access_token:
        raise ApiError("Google returned no access token", code="oauth_exchange_failed", status_code=400)

    # 2) access token -> user profile
    try:
        ui = requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
    except requests.RequestException as exc:  # pragma: no cover - network
        raise ApiError("Google unreachable", code="oauth_network", status_code=502) from exc
    if ui.status_code != 200:
        raise ApiError("Google userinfo failed", code="oauth_userinfo_failed", status_code=400)
    info = ui.json()
    email = (info.get("email") or "").strip().lower()
    if not email:
        raise ApiError("Google account has no email", code="oauth_no_email", status_code=400)
    sub = info.get("sub") or email
    name = info.get("name") or email.split("@")[0]
    picture = info.get("picture")

    # 3) find-or-create the user (provider=google, pre-verified)
    user = User.objects.filter(email__iexact=email).first()
    is_new = user is None
    if is_new:
        intent_type, intent_role = _parse_intent(intent)
        user = User.objects.create(
            email=email,
            username=None,
            display_username=None,
            display_name=name,
            name=name,
            image=picture,
            role=intent_role or UserRole.USER,
            type=UserType.PRO if intent_type == "pro" else UserType.USER,
            # With intent (from /register): skip type selection → OAUTH_SETUP.
            # Without intent (from /login): TYPE_SELECTION first.
            step=JourneyStep.OAUTH_SETUP if intent_type else JourneyStep.TYPE_SELECTION,
            email_verified=True,
            confirmed=True,
            provider="google",
        )
        Account.objects.create(user=user, account_id=str(sub), provider_id="google")
    else:
        changed: list[str] = []
        if not user.email_verified:
            user.email_verified = True
            changed.append("email_verified")
        if not user.confirmed:
            user.confirmed = True
            changed.append("confirmed")
        if picture and not user.image:
            user.image = picture
            changed.append("image")
        if changed:
            changed.append("updated_at")
            user.save(update_fields=changed)
        Account.objects.get_or_create(
            account_id=str(sub), defaults={"user": user, "provider_id": "google"}
        )

    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": serialize_session_user(user),
        "isNew": is_new,
    }
