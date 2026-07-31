"""Read queries for users / sessions / accounts. Keep views thin by routing
all DB reads through this module."""
from __future__ import annotations

from typing import Any

from django.db.models import QuerySet

from apps.accounts.models import Account, Session, User


def get_user_by_email(email: str) -> User | None:
    if not email:
        return None
    return User.objects.filter(email__iexact=email).first()


def get_user_by_username(username: str) -> User | None:
    if not username:
        return None
    return User.objects.filter(username__iexact=username).first()


def get_user_by_id(user_id: str) -> User | None:
    if not user_id:
        return None
    return User.objects.filter(id=user_id).first()


def get_user_by_identifier(identifier: str) -> User | None:
    """Login accepts either email OR username."""
    if not identifier:
        return None
    if "@" in identifier:
        return get_user_by_email(identifier)
    return get_user_by_username(identifier)


def get_password_account(user: User) -> Account | None:
    """The Better Auth `accounts` row that holds the bcrypt password.

    For email/password users the row has provider_id='credential' and the
    password column populated. OAuth users may have multiple `accounts` rows
    (one per provider) with no password.
    """
    return Account.objects.filter(user=user, provider_id="credential").first()


def is_username_available(username: str, exclude_user_id: str | None = None) -> bool:
    qs: QuerySet[User] = User.objects.filter(username__iexact=username)
    if exclude_user_id:
        qs = qs.exclude(id=exclude_user_id)
    return not qs.exists()


def is_email_taken(email: str, exclude_user_id: str | None = None) -> bool:
    qs = User.objects.filter(email__iexact=email)
    if exclude_user_id:
        qs = qs.exclude(id=exclude_user_id)
    return qs.exists()


def get_active_sessions_for_user(user: User) -> QuerySet[Session]:
    return Session.objects.filter(user=user).order_by("-created_at")


def serialize_session_user(user: User) -> dict[str, Any]:
    """Public-facing user payload used by GET /api/auth/me and /api/auth/session.

    Mirrors the AuthUser shape returned by Next.js `getCurrentUser()`.
    """
    return {
        "id": user.id,
        "email": user.email,
        "emailVerified": user.email_verified,
        "username": user.username,
        "displayUsername": user.display_username,
        "displayName": user.display_name,
        "name": user.name,
        "image": user.image,
        "role": user.role,
        "type": user.type,
        "step": user.step,
        "confirmed": user.confirmed,
        "blocked": user.blocked,
        "banned": user.banned,
        # The frontend payments gate (lib/payment/test-mode.ts) reads
        # `user.testUser` to allow checkout in test mode — must be in the
        # session payload or a test user can never reach the payment page.
        "testUser": user.test_user,
        "banReason": user.ban_reason,
        "banExpires": user.ban_expires.isoformat() if user.ban_expires else None,
        "provider": user.provider,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        # Read by form-change-username.tsx for the 30-day cooldown UI.
        "lastUsernameChangeAt": (
            user.last_username_change_at.isoformat() if user.last_username_change_at else None
        ),
    }
