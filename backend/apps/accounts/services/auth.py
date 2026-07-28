"""Authentication service: password verification + JWT issuance.

This is the Django equivalent of Better Auth's `signInEmail`. Behavioral
parity points (must match the Next.js login flow):

1. Identifier must contain '@' (Greek error message kept).
2. User looked up by lowercase email.
3. Password verified against the `accounts` row with provider_id='credential'.
4. EMAIL_NOT_VERIFIED returns success=True with a redirectPath to
   `/register/success?email=...` (NOT a login error — the frontend redirects
   the user to the resend-verification page).
5. Blocked users get a Greek "Ο λογαριασμός σας έχει αποκλειστεί" error.
6. Successful login derives `redirectPath` from user.step + user.role:
   - step==ONBOARDING        -> /onboarding
   - step==DASHBOARD + admin  -> /admin
   - step==DASHBOARD + other  -> /dashboard
   - any other step           -> /register/success?email=...
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

from django.contrib.auth.hashers import check_password
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User
from apps.accounts.models.user import JourneyStep, UserRole
from apps.accounts.selectors.users import (
    get_password_account,
    get_user_by_email,
    get_user_by_identifier,
    serialize_session_user,
)
from common.exceptions import ApiError, FieldErrors


@dataclass
class LoginResult:
    user: dict[str, Any]
    redirect_path: str
    access: str | None
    refresh: str | None


def login(identifier: str, password: str) -> LoginResult:
    """Run the full Better-Auth-equivalent login flow.

    Returns either a successful LoginResult (with tokens) or, for the special
    EMAIL_NOT_VERIFIED case, a LoginResult with no tokens and a redirect to
    the resend-verification page (mirrors Next.js behavior — the user is told
    they exist but must verify before logging in).
    """
    if not identifier:
        raise FieldErrors(details={"identifier": ["Το email ή το όνομα χρήστη είναι πολύ μικρό"]})
    if not password:
        raise FieldErrors(details={"password": ["Ο κωδικός είναι υποχρεωτικός"]})

    if "@" not in identifier:
        # Better Auth required email; mirror that constraint.
        raise ApiError(
            "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email",
            code="invalid_identifier",
        )

    user = get_user_by_email(identifier)
    if user is None or not _verify_password(user, password):
        raise ApiError(
            "Λάθος email ή κωδικός πρόσβασης",
            code="invalid_credentials",
            status_code=401,
        )

    # Blocked OR banned (Better Auth admin plugin `banned` flag) — same Greek
    # blocked-account message OLD produced at sign-in.
    if user.blocked or user.banned:
        raise ApiError(
            "Ο λογαριασμός σας έχει αποκλειστεί",
            code="account_blocked",
            status_code=403,
        )

    # Email not verified → success path that asks the user to verify first.
    # We do NOT issue tokens. Frontend redirects to /register/success.
    if not user.email_verified:
        return LoginResult(
            user={},
            redirect_path=f"/register/success?email={quote(user.email)}",
            access=None,
            refresh=None,
        )

    redirect_path = _derive_redirect_path(user)
    refresh = RefreshToken.for_user(user)
    return LoginResult(
        user=serialize_session_user(user),
        redirect_path=redirect_path,
        access=str(refresh.access_token),
        refresh=str(refresh),
    )


def login_by_identifier(identifier: str, password: str) -> LoginResult:
    """Variant that accepts username OR email. Used by the username-supporting
    `/api/auth/login` endpoint (the Next.js form accepts either)."""
    if "@" not in identifier:
        # Resolve username -> email then run the standard flow.
        resolved = get_user_by_identifier(identifier)
        if resolved is None:
            raise ApiError(
                "Λάθος email ή κωδικός πρόσβασης",
                code="invalid_credentials",
                status_code=401,
            )
        return login(resolved.email, password)
    return login(identifier, password)


def _verify_password(user: User, password: str) -> bool:
    """Verify password against the `accounts` row that holds the bcrypt hash.

    Better Auth stored the bcrypt hash directly in `accounts.password` (no
    Django algorithm prefix). Django's `check_password` calls `identify_hasher`,
    which only recognises encoded strings with a leading algorithm prefix —
    raw bcrypt (`$2a$…`, `$2b$…`, `$2y$…`) confuses it. So when we see a raw
    bcrypt hash we delegate straight to our `BetterAuthBcryptPasswordHasher`;
    Argon2/Django-shaped hashes (used for new passwords + admin resets) keep
    the standard path.
    """
    account = get_password_account(user)
    if account is None or not account.password:
        return False
    encoded = account.password
    if encoded.startswith(("$2a$", "$2b$", "$2y$")):
        from common.hashers import BetterAuthBcryptPasswordHasher
        return BetterAuthBcryptPasswordHasher().verify(password, encoded)
    return check_password(password, encoded)


def _derive_redirect_path(user: User) -> str:
    """Replicates the redirect logic from `actions/auth/login.ts` lines 109-124."""
    if not user.email_verified:
        return f"/register/success?email={quote(user.email)}"
    if user.step == JourneyStep.ONBOARDING:
        return "/onboarding"
    if user.step == JourneyStep.DASHBOARD:
        if user.role in {UserRole.ADMIN, UserRole.SUPPORT, UserRole.EDITOR}:
            return "/admin"
        return "/dashboard"
    return f"/register/success?email={quote(user.email)}"


def issue_tokens(user: User) -> dict[str, str]:
    """Used by OAuth completion + tests. Pairs with TokenObtainPairView."""
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}
