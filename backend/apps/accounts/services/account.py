"""Account-management services: update profile-attached fields, change username,
delete account, upgrade to pro, OAuth intent storage.

Mirrors:
- `actions/auth/update-account.ts`
- `actions/auth/change-username.ts`           (30-day cooldown)
- `actions/auth/delete-account.ts`
- `actions/auth/upgrade-to-pro.ts`
- `actions/auth/store-oauth-intent.ts`
- `actions/auth/update-user-type.ts`
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from django.db import transaction

from apps.accounts.models import User
from apps.accounts.models.user import JourneyStep, UserRole, UserType
from apps.accounts.selectors.users import is_username_available
from common.exceptions import ApiError, FieldErrors

USERNAME_COOLDOWN_DAYS = 30  # matches OLD cooldown.ts:8
OAUTH_INTENT_COOKIE = "oauth_intent"
OAUTH_INTENT_TTL = timedelta(minutes=10)


# ----- Update display name + image (PATCH /api/auth/account) ---------------


def update_account(user: User, *, display_name: str, image: dict | None) -> User:
    if not display_name or len(display_name.strip()) < 5:
        raise FieldErrors(
            details={"displayName": ["Το όνομα εμφάνισης πρέπει να έχει τουλάχιστον 5 χαρακτήρες"]}
        )
    if len(display_name) > 50:
        raise FieldErrors(
            details={"displayName": ["Το όνομα εμφάνισης δεν μπορεί να υπερβαίνει τους 50 χαρακτήρες"]}
        )

    user.display_name = display_name.strip()
    user.name = display_name.strip()
    if image is not None:
        # Persist Cloudinary secure_url. The full resource lives in Profile.
        user.image = image.get("secure_url") or image.get("url") if isinstance(image, dict) else image
    user.save(update_fields=["display_name", "name", "image", "updated_at"])

    # Profile sync (image + display_name) is handled by the profiles service
    # to avoid cross-app coupling in tests. The view will call it.
    return user


# ----- Change username (POST /api/auth/username/change) --------------------


@dataclass
class UsernameChangeResult:
    new_username: str
    next_change_at: datetime


def change_username(user: User, new_username: str, confirm_username: str) -> UsernameChangeResult:
    if not new_username or not confirm_username:
        raise FieldErrors(details={"_errors": ["Συμπλήρωσε όλα τα πεδία"]})
    if new_username != confirm_username:
        raise FieldErrors(details={"confirmUsername": ["Τα usernames δεν ταιριάζουν"]})

    if not user.is_pro():
        raise ApiError(
            "Μόνο επαγγελματίες μπορούν να αλλάξουν το username τους",
            code="not_pro",
            status_code=403,
        )

    if user.last_username_change_at:
        elapsed = datetime.now(timezone.utc) - user.last_username_change_at
        if elapsed < timedelta(days=USERNAME_COOLDOWN_DAYS):
            days_remaining = USERNAME_COOLDOWN_DAYS - elapsed.days
            raise ApiError(
                f"Πρέπει να περιμένετε {days_remaining} ημέρες πριν αλλάξετε ξανά το username.",
                code="cooldown_active",
                status_code=429,
                details={"daysRemaining": days_remaining},
            )

    new_lower = new_username.lower()
    if user.username and user.username.lower() == new_lower:
        raise ApiError(
            "Το νέο username είναι ίδιο με το τρέχον",
            code="same_username",
            status_code=400,
        )

    if not is_username_available(new_lower, exclude_user_id=user.id):
        raise ApiError(
            "Αυτό το username χρησιμοποιείται ήδη",
            code="username_taken",
            status_code=409,
        )

    now = datetime.now(timezone.utc)
    with transaction.atomic():
        user.username = new_lower
        user.display_username = new_username  # preserve original case
        user.last_username_change_at = now
        user.save(update_fields=[
            "username", "display_username", "last_username_change_at", "updated_at",
        ])
        # Profile.username sync — done lazily by the profiles app to avoid
        # cross-app import; view will call profiles.services.sync_username().

    return UsernameChangeResult(
        new_username=new_lower,
        next_change_at=now + timedelta(days=USERNAME_COOLDOWN_DAYS),
    )


# ----- Delete account (DELETE /api/auth/account) ---------------------------


def delete_account(user: User, confirm_username: str) -> None:
    """Delete the user and run the OLD `beforeDelete` GDPR side-effects.

    Mirrors Better Auth's `deleteUser` flow (`actions/auth/delete-account.ts:60`
    → `lib/auth/config.ts:209-246`). Better Auth, before cascading the user
    delete, ran a `beforeDelete` hook that:
      1. removed the user's Brevo email contact (GDPR) — `config.ts:212-228`;
      2. deleted dangling verification tokens keyed by the user's email
         (`Verification` has no FK to `User`, so the cascade misses it) —
         `config.ts:230-244` (`prisma.verification.deleteMany({ identifier })`).

    The user row itself, plus its FK-cascaded children (accounts, sessions,
    profile, media, reviews, …), are removed by `user.delete()` — the Prisma
    schema declared `onDelete: Cascade` and the Django models mirror it
    (`on_delete=models.CASCADE`), so owned rows go with the user.

    Final verification that the typed username matches before any destruction.
    """
    if not user.username:
        raise ApiError(
            "Ο λογαριασμός σου δεν έχει username — επικοινώνησε με τη υποστήριξη",
            code="no_username",
            status_code=400,
        )
    if confirm_username != user.username:
        raise ApiError(
            "Η επιβεβαίωση ονόματος χρήστη δεν ταιριάζει",
            code="username_mismatch",
            status_code=400,
        )

    # Lazy imports keep this service free of heavy/optional dependencies at
    # module load time and avoid a cross-app import cycle.
    from apps.accounts.models import Verification
    from apps.accounts.services import sessions as session_service

    email = user.email

    with transaction.atomic():
        # 1. Invalidate every outstanding refresh token so a leaked/cached token
        #    can't be used after the account is gone (the JWT user lookup would
        #    404, but blacklisting is explicit and cheap).
        session_service.revoke_all_for_user(user)

        # 2. Verification tokens are keyed by `identifier` (= email) with no FK
        #    to User, so the cascade misses them. Port OLD `config.ts:230-244`.
        if email:
            Verification.objects.filter(identifier=email).delete()

        # 3. GDPR: remove the user's Brevo email contact (config.ts:212-228).
        #    Best-effort enqueue — a queue/import hiccup must not block deletion.
        if email:
            try:
                from apps.messaging.tasks import brevo_delete_contact
                brevo_delete_contact.delay(email)
            except Exception:  # pragma: no cover - defensive
                import logging
                logging.getLogger(__name__).exception(
                    "brevo_delete.enqueue_failed", extra={"email": email}
                )

        # 4. Cascade-delete the user + all FK'd children (accounts, sessions,
        #    profile, media, reviews, …) via on_delete=CASCADE.
        user.delete()

    return None


# ----- Upgrade simple user → pro (POST /api/auth/upgrade-to-pro) -----------


def upgrade_to_pro(user: User, *, username: str, role: str) -> User:
    if user.role != UserRole.USER:
        raise ApiError(
            "Μόνο απλοί χρήστες μπορούν να γίνουν επαγγελματίες",
            code="not_simple_user",
            status_code=403,
        )
    if role not in {UserRole.FREELANCER, UserRole.COMPANY}:
        raise FieldErrors(details={"role": ["Επίλεξε ρόλο: freelancer ή company"]})
    if not username or len(username) < 3:
        raise FieldErrors(details={"username": ["Το username πρέπει να έχει τουλάχιστον 3 χαρακτήρες"]})

    if not is_username_available(username, exclude_user_id=user.id):
        raise ApiError(
            "Αυτό το username χρησιμοποιείται ήδη",
            code="username_taken",
            status_code=409,
        )

    with transaction.atomic():
        user.username = username.lower()
        user.display_username = username
        user.role = role
        user.type = UserType.PRO
        user.step = JourneyStep.ONBOARDING
        user.save(update_fields=[
            "username", "display_username", "role", "type", "step", "updated_at",
        ])

    # Brevo list sync: USERS → EMPTYPROFILE (OLD upgrade-to-pro.ts:92).
    # Fire-and-forget — never break the upgrade on task errors.
    try:
        from apps.messaging.tasks import brevo_state_change
        brevo_state_change.delay(user.id, "upgrade_to_pro")
    except Exception:
        pass

    return user


# ----- OAuth intent storage (POST/GET /api/auth/oauth/intent) --------------


def serialize_intent(*, type: str, role: str | None) -> str:
    if type not in {"user", "pro"}:
        raise FieldErrors(details={"type": ["Άκυρος τύπος"]})
    if type == "pro" and role not in {UserRole.FREELANCER, UserRole.COMPANY}:
        raise FieldErrors(details={"role": ["Άκυρος ρόλος"]})
    return json.dumps({"type": type, "role": role})


def parse_intent_cookie(cookie_value: str | None) -> dict[str, Any] | None:
    if not cookie_value:
        return None
    try:
        data = json.loads(cookie_value)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(data, dict) or data.get("type") not in {"user", "pro"}:
        return None
    return data


def update_user_type(user: User, *, target_type: str, role: str | None) -> User:
    """Used post-OAuth to record the chosen account type.

    The OAuth flow lands users at step=TYPE_SELECTION (when they're new).
    This service moves them forward to OAUTH_SETUP for username selection.
    """
    if target_type not in {"user", "pro"}:
        raise FieldErrors(details={"type": ["Άκυρος τύπος"]})
    if target_type == "pro" and role not in {UserRole.FREELANCER, UserRole.COMPANY}:
        raise FieldErrors(details={"role": ["Άκυρος ρόλος"]})

    user.type = UserType.PRO if target_type == "pro" else UserType.USER
    # OLD update-user-type.ts:21-40: type 'user' always forces role='user';
    # pro users take the validated freelancer/company role.
    user.role = role if target_type == "pro" else UserRole.USER
    user.step = JourneyStep.OAUTH_SETUP
    user.save(update_fields=["type", "role", "step", "updated_at"])
    return user
