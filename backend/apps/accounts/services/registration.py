"""User registration + email verification.

Mirrors `actions/auth/register.ts` and `actions/auth/resend-verification.ts`:

- `register()` creates a User row + an Account row with the bcrypt password,
  generates a verification token in the `verification` table, and triggers a
  Brevo email. The user starts at step=EMAIL_VERIFICATION.
- `verify_email_token()` validates a token and either advances the user to the
  next step (DASHBOARD for simple users, ONBOARDING for pros) or returns an
  error. Mirrors the Better Auth `databaseHooks.user.update.after` behavior
  from `lib/auth/config.ts`.
- `resend_verification_email()` re-issues a token (rate-limited at the view).
"""
from __future__ import annotations

import logging
import random
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from django.contrib.auth.hashers import make_password
from django.db import transaction

from apps.accounts.models import Account, User, Verification
from apps.accounts.models.user import JourneyStep, UserRole, UserType
from apps.accounts.selectors.users import get_user_by_email, is_username_available
from common.exceptions import ApiError, FieldErrors

logger = logging.getLogger(__name__)

VERIFICATION_TOKEN_TTL = timedelta(hours=1)  # mirrors Better Auth default


@dataclass
class RegistrationResult:
    user_id: str
    email: str
    verification_token: str  # caller emails this via Brevo


def register(
    *,
    email: str,
    password: str,
    auth_type: str,                    # 'user' | 'pro'
    role: str | None = None,           # 'freelancer' | 'company' | None
    username: str | None = None,
    display_name: str | None = None,
    consent: list[str] | None = None,
) -> RegistrationResult:
    """Create a new user + initial Account row + verification token.

    Mirrors register.ts behavior: pro users need username + displayName + role.
    Username collisions auto-append a numeric suffix.
    """
    _validate_register_input(email, password, auth_type, role, username, display_name, consent)

    if get_user_by_email(email):
        raise ApiError(
            "Υπάρχει ήδη λογαριασμός με αυτό το email",
            code="email_taken",
            status_code=409,
        )

    if auth_type == "pro":
        # OLD register.ts:117-123: a taken pro-chosen username is a hard error.
        final_username = _resolve_pro_username(username)
    else:
        # OLD register.ts:54-57 + 103-116: simple users get a username generated
        # from the email localpart, silently suffixed with random digits on
        # collision.
        base = username or generate_username_from_email(email)
        final_username = resolve_simple_username(base)
    role_resolved = role if auth_type == "pro" else UserRole.USER
    type_resolved = UserType.PRO if auth_type == "pro" else UserType.USER

    with transaction.atomic():
        user = User.objects.create(
            email=email.lower(),
            username=final_username,
            display_username=final_username if auth_type == "pro" else None,
            display_name=display_name,
            name=display_name or final_username,
            role=role_resolved,
            type=type_resolved,
            step=JourneyStep.EMAIL_VERIFICATION,
            email_verified=False,
            # OLD config.ts:385: email-credential signups start confirmed=True
            # (email_verified stays False — verification still gates the step).
            confirmed=True,
            provider="email",
        )

        # Create credentials Account row holding the bcrypt password (Better Auth shape).
        Account.objects.create(
            user=user,
            account_id=user.id,
            provider_id="credential",
            password=make_password(password),
        )

        token = secrets.token_urlsafe(48)
        Verification.objects.create(
            identifier=user.email,
            value=token,
            expires_at=datetime.now(timezone.utc) + VERIFICATION_TOKEN_TTL,
        )

    return RegistrationResult(user_id=user.id, email=user.email, verification_token=token)


def _validate_register_input(
    email: str,
    password: str,
    auth_type: str,
    role: str | None,
    username: str | None,
    display_name: str | None,
    consent: list[str] | None,
) -> None:
    errors: dict[str, list[str]] = {}
    if not email or "@" not in email:
        errors.setdefault("email", []).append("Μη έγκυρο email")
    if not password or len(password) < 6:
        errors.setdefault("password", []).append(
            "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες",
        )
    if auth_type not in {"user", "pro"}:
        errors.setdefault("authType", []).append("Επίλεξε τύπο λογαριασμού")
    if not consent:
        errors.setdefault("consent", []).append("Πρέπει να αποδεχτείς τους όρους χρήσης")

    if auth_type == "pro":
        if role not in {UserRole.FREELANCER, UserRole.COMPANY}:
            errors.setdefault("role", []).append("Επίλεξε ρόλο (freelancer ή company)")
        if not username or len(username) < 3:
            errors.setdefault("username", []).append(
                "Το username πρέπει να έχει τουλάχιστον 3 χαρακτήρες",
            )
        if not display_name or not display_name.strip():
            errors.setdefault("displayName", []).append(
                "Το όνομα προβολής είναι υποχρεωτικό",
            )

    if errors:
        raise FieldErrors(details=errors)


def generate_username_from_email(email: str) -> str:
    """Mirror OLD `generateUsernameFromEmail` (formats.ts:51-54): email
    localpart, stripped to [a-zA-Z0-9_-], lowercased."""
    local_part = (email or "").split("@")[0] or (email or "")
    return re.sub(r"[^a-zA-Z0-9_-]", "", local_part).lower()


def resolve_simple_username(desired: str, exclude_user_id: str | None = None) -> str:
    """Mirror OLD register.ts:103-116 / oauth-setup.ts:45-58 for SIMPLE users:
    if taken, append random digits (0-9999), up to 5 attempts."""
    if is_username_available(desired, exclude_user_id=exclude_user_id):
        return desired
    for _ in range(5):
        candidate = f"{desired}{random.randint(0, 9999)}"
        if is_username_available(candidate, exclude_user_id=exclude_user_id):
            return candidate
    raise ApiError("Αδύνατο να βρεθεί διαθέσιμο username", code="username_resolution")


def _resolve_pro_username(desired: str) -> str:
    """Mirror OLD register.ts:117-123 for PRO users: a taken chosen username is
    an error (never silently suffixed)."""
    if is_username_available(desired):
        return desired
    raise ApiError(
        "Το συγκεκριμένο username χρησιμοποιείται ήδη. Επιλέξτε ένα διαφορετικό username.",
        code="username_taken",
        status_code=409,
    )


class VerificationFailed(ApiError):
    """Verification-link failure. Carries the token's email (when the token
    row is known) so the view can send the user to the resend form
    (`/register/failure?email=...`), as OLD did."""

    def __init__(self, message: str, *, code: str, email: str | None = None) -> None:
        super().__init__(message, code=code, status_code=400)
        self.email = email


def verify_email_token(token: str) -> User:
    """Validate a verification token and advance the user's journey.

    Mirrors the auth-config databaseHooks: on email verification, simple users
    jump straight to DASHBOARD; professional users move to ONBOARDING.

    OLD parity (P1-5 / P3-D3): better-auth's token was a stateless JWT, valid
    until it expired and usable more than once (each click signed the user in
    again). So the row is NOT deleted on use; it simply expires after
    VERIFICATION_TOKEN_TTL. Re-clicking a still-valid link is a no-op on the
    user row and does not re-fire the post-verification tasks.
    """
    if not token:
        raise VerificationFailed("Λείπει το token επαλήθευσης", code="missing_token")

    record = (
        Verification.objects
        .filter(value=token)
        .order_by("-created_at")
        .first()
    )
    if record is None:
        raise VerificationFailed("Μη έγκυρο token", code="invalid_token")
    expires_at = record.expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        # Legacy safety net: the Verification column was `timestamp without time
        # zone` (Prisma-created schema) until accounts.0002_timestamptz_prisma_columns
        # converted it to timestamptz — values now come back aware, so this branch
        # no longer fires. Kept (guarded on tzinfo is None, so it can never corrupt
        # an aware value) in case an unmigrated DB is ever pointed at this code.
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise VerificationFailed(
            "Το token έχει λήξει", code="expired_token", email=record.identifier,
        )

    user = get_user_by_email(record.identifier)
    if user is None:
        raise VerificationFailed(
            "Λογαριασμός δεν βρέθηκε", code="user_not_found", email=record.identifier,
        )

    newly_verified = not user.email_verified
    if newly_verified:
        with transaction.atomic():
            user.email_verified = True
            # OLD verifyEmail only set emailVerified (confirmed is already
            # True for email signups, config.ts:385); keep confirmed as-is.
            if user.step == JourneyStep.EMAIL_VERIFICATION:
                user.step = (
                    JourneyStep.ONBOARDING if user.type == UserType.PRO else JourneyStep.DASHBOARD
                )
            user.save(update_fields=["email_verified", "step", "updated_at"])

    if newly_verified:
        # OLD timing (config.ts:438-448): the Brevo list sync fires at
        # email-verification success for ALL users. OLD sent NO transactional
        # welcome email ("Welcome email is now sent via Brevo automation when
        # contact is added to list", config.ts:431; `sendWelcomeEmail` was
        # imported but never called) — sending one here as well doubled the
        # welcome (P2-7 / A-D18). Fire-and-forget — never break verification.
        try:
            from apps.messaging.tasks import brevo_state_change
            brevo_state_change.delay(user.id, "email_verified")
        except Exception:
            logger.exception("post-verification tasks failed", extra={"user_id": user.id})

    return user


# OLD resend copy (actions/auth/resend-verification.ts:35-38). better-auth's
# sendVerificationEmail answered status:true for unknown AND already-verified
# emails, so OLD always showed this success message (no enumeration oracle).
RESEND_SUCCESS_MESSAGE = (
    "Το email επιβεβαίωσης στάλθηκε! Έλεγξε τα εισερχόμενά σου και τον φάκελο spam."
)


def resend_verification_email(email: str) -> tuple[User, str] | None:
    """Generate a fresh verification token. Caller emails it via Brevo.

    Returns None (caller still answers with the generic success copy) when the
    email is unknown or already verified — OLD never disclosed either case.
    """
    user = get_user_by_email(email)
    if user is None or user.email_verified:
        return None

    token = secrets.token_urlsafe(48)
    Verification.objects.create(
        identifier=user.email,
        value=token,
        expires_at=datetime.now(timezone.utc) + VERIFICATION_TOKEN_TTL,
    )
    return user, token


def determine_post_verification_redirect(user: User) -> str:
    """Used by `GET /api/auth/verify-email` after consuming a token."""
    if user.type == UserType.PRO and user.step == JourneyStep.ONBOARDING:
        return "/onboarding"
    if user.role in {UserRole.ADMIN, UserRole.SUPPORT, UserRole.EDITOR}:
        return "/admin"
    return "/dashboard"


def serialize_journey_state(user: User) -> dict[str, Any]:
    return {"step": user.step, "type": user.type, "role": user.role}
