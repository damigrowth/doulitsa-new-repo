"""Password operations: change, forgot, reset.

Mirrors:
- `actions/auth/change-password.ts`
- `actions/auth/forgot-password.ts`  (10-minute rate limit at view level)
- `actions/auth/reset-password.ts`
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from django.contrib.auth.hashers import make_password
from django.db import transaction

from apps.accounts.models import Account, User, Verification
from apps.accounts.selectors.users import get_password_account, get_user_by_email
from apps.accounts.services.auth import _verify_password
from common.exceptions import ApiError, FieldErrors

RESET_TOKEN_TTL = timedelta(hours=1)


def change_password(user: User, current_password: str, new_password: str) -> None:
    """Change a logged-in user's password. Mirrors Better Auth's changePassword."""
    if not current_password or not new_password:
        raise FieldErrors(details={"_errors": ["Συμπλήρωσε όλα τα πεδία"]})
    if len(new_password) < 6:
        raise FieldErrors(
            details={"newPassword": ["Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες"]}
        )
    if current_password == new_password:
        raise FieldErrors(
            details={"newPassword": ["Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον τρέχοντα"]}
        )

    account = get_password_account(user)
    if account is None or not account.password:
        # OAuth-only user trying to change password — disallow.
        raise ApiError(
            "Δεν μπορείς να αλλάξεις κωδικό για λογαριασμό OAuth",
            code="oauth_no_password",
            status_code=400,
        )
    # Reuse the login-path verifier: legacy Better Auth rows hold RAW bcrypt
    # hashes ($2a$/$2b$/$2y$…) that Django's check_password can't identify.
    if not _verify_password(user, current_password):
        raise ApiError(
            "Λάθος τρέχων κωδικός",
            code="wrong_current_password",
            status_code=400,
        )

    # Successful change always rewrites with the default hasher (Argon2).
    account.password = make_password(new_password)
    account.save(update_fields=["password", "updated_at"])


def initiate_password_reset(email: str) -> tuple[User, str] | None:
    """Generate a reset token. Returns None silently if no such email
    (so the API doesn't leak which addresses are registered).
    Caller is responsible for emailing the token via Brevo.
    """
    user = get_user_by_email(email)
    if user is None:
        return None

    token = secrets.token_urlsafe(48)
    Verification.objects.create(
        identifier=user.email,
        value=f"reset:{token}",
        expires_at=datetime.now(timezone.utc) + RESET_TOKEN_TTL,
    )
    return user, token


def reset_password(token: str, new_password: str) -> User:
    """Consume a reset token and set a new password."""
    if not token or not new_password:
        raise FieldErrors(details={"_errors": ["Λείπουν στοιχεία"]})
    if len(new_password) < 6:
        raise FieldErrors(
            details={"newPassword": ["Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες"]}
        )

    record = (
        Verification.objects
        .filter(value=f"reset:{token}")
        .order_by("-created_at")
        .first()
    )
    if record is None:
        raise ApiError("Μη έγκυρο token", code="invalid_token", status_code=400)
    expires_at = record.expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        # Legacy safety net: the Verification column was `timestamp without time
        # zone` (Prisma-created schema) until accounts.0002_timestamptz_prisma_columns
        # converted it to timestamptz — values now come back aware, so this branch
        # no longer fires. Kept (guarded on tzinfo is None, so it can never corrupt
        # an aware value) in case an unmigrated DB is ever pointed at this code.
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise ApiError("Το token έχει λήξει", code="expired_token", status_code=400)

    user = get_user_by_email(record.identifier)
    if user is None:
        raise ApiError("Λογαριασμός δεν βρέθηκε", code="user_not_found", status_code=404)

    with transaction.atomic():
        account = get_password_account(user)
        if account is None:
            account = Account.objects.create(
                user=user,
                account_id=user.id,
                provider_id="credential",
                password=make_password(new_password),
            )
        else:
            account.password = make_password(new_password)
            account.save(update_fields=["password", "updated_at"])
        record.delete()

    return user
