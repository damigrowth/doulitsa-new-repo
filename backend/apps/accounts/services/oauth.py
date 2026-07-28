"""OAuth completion + Better Auth catch-all + exchange-token.

Mirrors `actions/auth/oauth-setup.ts` plus the two routes from
`app/api/auth/[...all]/route.ts` and `app/api/auth/exchange-token/route.ts`.

The catch-all is implemented as a manifest of supported sub-routes so the
Next.js frontend can keep using the same URL shape during cutover. Each
sub-route delegates to existing services (LoginView, RegisterView, etc.).
"""
from __future__ import annotations

import time

from django.conf import settings
from django.db import transaction

from apps.accounts.models import User
from apps.accounts.models.user import JourneyStep, UserRole, UserType
from apps.accounts.selectors.users import is_username_available
from common.exceptions import ApiError, FieldErrors


def complete_oauth_setup(
    *,
    user: User,
    username: str,
    display_name: str,
    role: str,
    type: str,
) -> User:
    """After OAuth + type-selection, the user lands here to pick a username
    and confirm role + type. Mirrors completeOAuth() from oauth-setup.ts.

    Pro users: must provide username + displayName + role.
    Simple users: username optional.
    """
    if type not in (UserType.USER, UserType.PRO):
        raise FieldErrors(details={"type": ["Invalid"]})
    if type == UserType.PRO and role not in (UserRole.FREELANCER, UserRole.COMPANY):
        raise FieldErrors(details={"role": ["Invalid for pro"]})
    if type == UserType.PRO:
        if not username or len(username) < 3:
            raise FieldErrors(details={"username": ["Required ≥3 chars"]})
        if not display_name or not display_name.strip():
            raise FieldErrors(details={"displayName": ["Required"]})

    if type == UserType.USER:
        # OLD oauth-setup.ts:36-58: simple users get an auto-generated username
        # from the email localpart, silently suffixed with random digits on
        # collision.
        from apps.accounts.services.registration import (
            generate_username_from_email,
            resolve_simple_username,
        )
        if not username:
            username = generate_username_from_email(user.email)
        username = resolve_simple_username(username, exclude_user_id=user.id)
    elif username and not is_username_available(username, exclude_user_id=user.id):
        # OLD oauth-setup.ts:59-64: pro-chosen usernames error on collision.
        raise ApiError(
            "Το συγκεκριμένο username χρησιμοποιείται ήδη. Επιλέξτε ένα διαφορετικό username.",
            code="username_taken",
            status_code=409,
        )

    with transaction.atomic():
        if username:
            user.username = username.lower()
            user.display_username = username
        if display_name:
            user.display_name = display_name.strip()
            user.name = display_name.strip()
        user.type = type
        user.role = role if type == UserType.PRO else UserRole.USER
        user.step = (
            JourneyStep.ONBOARDING if type == UserType.PRO else JourneyStep.DASHBOARD
        )
        user.save(update_fields=[
            "username", "display_username", "display_name", "name",
            "type", "role", "step", "updated_at",
        ])

        # Create the Profile row for pro users
        if type == UserType.PRO:
            try:
                from apps.profiles.services.profile_updates import ensure_profile_exists
                ensure_profile_exists(user)
            except ImportError:
                pass

    # Brevo list sync (OLD oauth-setup.ts:99 handleOAuthSetupComplete).
    # Fire-and-forget — never break setup completion on task errors.
    try:
        from apps.messaging.tasks import brevo_state_change
        brevo_state_change.delay(user.id, "oauth_setup_complete")
    except Exception:
        pass

    return user


def mint_supabase_jwt(user: User) -> dict[str, str]:
    """Issue a short-lived JWT for Supabase RLS (row 2).

    Used during cutover so the existing Supabase Realtime subscriptions keep
    working. Becomes obsolete once Channels replaces Supabase Realtime.
    """
    try:
        import jwt as pyjwt
    except ImportError as exc:
        raise ApiError("PyJWT not installed", code="dependency", status_code=500) from exc

    signing_key = settings.SIMPLE_JWT.get("SIGNING_KEY", "") or settings.SECRET_KEY
    now = int(time.time())
    payload = {
        "sub": user.id,
        "role": user.role,
        "user_role": user.role,
        "user_type": user.type,
        "iat": now,
        "exp": now + 3600,
        "iss": "django-backend",
    }
    token = pyjwt.encode(payload, signing_key, algorithm="HS256")
    return {"token": token, "expiresIn": 3600}
