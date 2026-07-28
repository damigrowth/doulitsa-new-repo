"""Admin user-management business logic.

Mirrors `actions/admin/users.ts`. Each function enforces:
- Role hierarchy on assignment (admin can assign anything, support can only
  assign user/freelancer/company, editor can assign nothing)
- Profile completion validation when transitioning a pro user to DASHBOARD
- Brevo list sync hooks (currently TODO — wired through `_sync_brevo` so
  switching to a real implementation later is one-line)
- Self-demotion protection on the team endpoints

Brevo sync is invoked via `_sync_brevo(user)` everywhere the original code
called `brevoWorkflowService.handleUserStateChange(userId)`. The placeholder
schedules a Celery task once `apps/messaging/tasks.brevo_sync` exists; until
then it logs and no-ops.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from django.contrib.auth.hashers import make_password
from django.db import transaction

from apps.accounts.models import Account, Session, User, Verification
from apps.accounts.models.user import JourneyStep, UserRole, UserType
from apps.accounts.selectors.users import is_username_available
from common.exceptions import ApiError, FieldErrors

logger = logging.getLogger(__name__)


# ----- Role hierarchy -------------------------------------------------------


_ASSIGN_ALLOWED: dict[str, set[str]] = {
    UserRole.ADMIN: {
        UserRole.USER, UserRole.FREELANCER, UserRole.COMPANY,
        UserRole.ADMIN, UserRole.SUPPORT, UserRole.EDITOR,
    },
    UserRole.SUPPORT: {UserRole.USER, UserRole.FREELANCER, UserRole.COMPANY},
    UserRole.EDITOR: set(),
}


def can_assign_role(actor_role: str, target_role: str) -> bool:
    return target_role in _ASSIGN_ALLOWED.get(actor_role, set())


def _require_can_assign(actor: User, target_role: str) -> None:
    if not can_assign_role(actor.role, target_role):
        raise ApiError(
            f"Δεν έχετε δικαίωμα να αναθέσετε το ρόλο '{target_role}'",
            code="role_assignment_forbidden",
            status_code=403,
        )


# ----- Brevo placeholder ---------------------------------------------------


def _sync_brevo(user: User, *, reason: str = "state_change") -> None:
    """Hook for Brevo list-sync — ports `brevoWorkflowService.handleUserStateChange`
    (workflows.ts:370). Schedules the async task; best-effort and a NO-OP when
    Brevo is unconfigured (handled inside the task).

    `reason` is one of: state_change | created | banned | unbanned | blocked |
    unblocked | role_changed | step_changed | type_changed | admin_assigned |
    admin_removed.
    """
    logger.info("brevo_sync.scheduled", extra={"user_id": user.id, "reason": reason})
    try:
        from apps.messaging.tasks import brevo_state_change
        brevo_state_change.delay(user.id, reason)
    except Exception:
        # Never let a queue/import hiccup break the admin action.
        logger.exception("brevo_sync.enqueue_failed", extra={"user_id": user.id, "reason": reason})


def _delete_brevo_contact(email: str) -> None:
    """Hard-delete contact (used only by removeUser). Ports
    `brevoListManager.deleteContact` (list-management.ts:338). Best-effort."""
    logger.info("brevo_delete.scheduled", extra={"email": email})
    try:
        from apps.messaging.tasks import brevo_delete_contact
        brevo_delete_contact.delay(email)
    except Exception:
        logger.exception("brevo_delete.enqueue_failed", extra={"email": email})


# ----- Pro-user dashboard prerequisite check -------------------------------


def _ensure_pro_dashboard_eligible(user: User, target_step: str) -> str:
    """If user.type=='pro' and target_step==DASHBOARD, require a complete
    Profile (image + category + subcategory). Otherwise auto-correct to
    ONBOARDING. Mirrors the auto-correct in updateUserStatus / updateUserJourneyStep.
    """
    if target_step != JourneyStep.DASHBOARD or user.type != UserType.PRO:
        return target_step

    # Lazy profile lookup to avoid cross-app import cycles
    try:
        from apps.profiles.models.profile import Profile  # type: ignore
    except ImportError:
        # profiles app not migrated yet — be permissive but log loudly
        logger.warning("profiles_app_not_loaded.skipping_dashboard_check")
        return target_step

    profile = Profile.objects.filter(user_id=user.id).first()
    if not profile or not (profile.image and profile.category and profile.subcategory):
        logger.info(
            "auto_correct_step_dashboard_to_onboarding",
            extra={"user_id": user.id, "reason": "incomplete_pro_profile"},
        )
        return JourneyStep.ONBOARDING
    return target_step


# ----- CRUD ----------------------------------------------------------------


def create_user(
    *,
    actor: User,
    email: str,
    password: str,
    role: str,
    name: str | None = None,
    display_name: str | None = None,
    username: str | None = None,
) -> User:
    if role not in dict(UserRole.choices):
        raise FieldErrors(details={"role": ["Άκυρος ρόλος"]})
    _require_can_assign(actor, role)

    if User.objects.filter(email__iexact=email).exists():
        raise ApiError(
            "Υπάρχει ήδη χρήστης με αυτό το email",
            code="email_taken",
            status_code=409,
        )
    if username and not is_username_available(username):
        raise ApiError(
            "Αυτό το username χρησιμοποιείται ήδη",
            code="username_taken",
            status_code=409,
        )

    type_ = UserType.PRO if role in {UserRole.FREELANCER, UserRole.COMPANY} else UserType.USER

    with transaction.atomic():
        user = User.objects.create(
            email=email.lower(),
            name=name or display_name or username or email,
            display_name=display_name,
            username=username.lower() if username else None,
            display_username=username,
            role=role,
            type=type_,
            confirmed=True,
            email_verified=True,
            step=(JourneyStep.ONBOARDING if type_ == UserType.PRO else JourneyStep.DASHBOARD),
            provider="email",
        )
        Account.objects.create(
            user=user,
            account_id=user.id,
            provider_id="credential",
            password=make_password(password),
        )
    _sync_brevo(user, reason="created")
    return user


def set_user_role(*, actor: User, target_user: User, role: str) -> User:
    if role not in dict(UserRole.choices):
        raise FieldErrors(details={"role": ["Άκυρος ρόλος"]})
    _require_can_assign(actor, role)
    target_user.role = role
    target_user.save(update_fields=["role", "updated_at"])
    _sync_brevo(target_user, reason="role_changed")
    return target_user


def update_user_basic_info(
    *,
    target_user: User,
    name: str | None = None,
    email: str | None = None,
    username: str | None = None,
    display_name: str | None = None,
) -> User:
    if email and email.lower() != target_user.email and User.objects.filter(email__iexact=email).exists():
        raise ApiError(
            "Υπάρχει ήδη χρήστης με αυτό το email",
            code="email_taken",
            status_code=409,
        )
    if username and (username.lower() != (target_user.username or "").lower()) and not is_username_available(
        username, exclude_user_id=target_user.id
    ):
        raise ApiError(
            "Αυτό το username χρησιμοποιείται ήδη",
            code="username_taken",
            status_code=409,
        )

    update_fields: list[str] = []
    if name is not None:
        target_user.name = name
        update_fields.append("name")
    if email is not None:
        target_user.email = email.lower()
        update_fields.append("email")
    if username is not None:
        target_user.username = username.lower()
        target_user.display_username = username
        update_fields += ["username", "display_username"]
    if display_name is not None:
        target_user.display_name = display_name
        update_fields.append("display_name")

    if update_fields:
        update_fields.append("updated_at")
        target_user.save(update_fields=update_fields)
    return target_user


def update_user_status(
    *,
    target_user: User,
    type: str | None = None,
    confirmed: bool | None = None,
    blocked: bool | None = None,
    email_verified: bool | None = None,
    step: str | None = None,
) -> User:
    update_fields: list[str] = []
    sync_reason: str | None = None

    if type is not None:
        if type not in dict(UserType.choices):
            raise FieldErrors(details={"type": ["Άκυρος τύπος"]})
        target_user.type = type
        update_fields.append("type")
        sync_reason = "type_changed"
    if confirmed is not None:
        target_user.confirmed = confirmed
        update_fields.append("confirmed")
    if blocked is not None:
        target_user.blocked = blocked
        update_fields.append("blocked")
        sync_reason = "blocked" if blocked else "unblocked"
    if email_verified is not None:
        target_user.email_verified = email_verified
        update_fields.append("email_verified")
    if step is not None:
        if step not in dict(JourneyStep.choices):
            raise FieldErrors(details={"step": ["Άκυρο step"]})
        corrected = _ensure_pro_dashboard_eligible(target_user, step)
        target_user.step = corrected
        update_fields.append("step")
        sync_reason = "step_changed"

    if update_fields:
        update_fields.append("updated_at")
        target_user.save(update_fields=update_fields)
        if sync_reason:
            _sync_brevo(target_user, reason=sync_reason)
    return target_user


def update_user_journey_step(*, target_user: User, step: str) -> User:
    if step not in dict(JourneyStep.choices):
        raise FieldErrors(details={"step": ["Άκυρο step"]})
    corrected = _ensure_pro_dashboard_eligible(target_user, step)
    target_user.step = corrected
    target_user.save(update_fields=["step", "updated_at"])
    _sync_brevo(target_user, reason="step_changed")
    return target_user


def update_user_image(*, target_user: User, image: str | None) -> User:
    target_user.image = image
    target_user.save(update_fields=["image", "updated_at"])
    return target_user


def toggle_user_block(*, target_user: User, blocked: bool) -> User:
    target_user.blocked = blocked
    target_user.save(update_fields=["blocked", "updated_at"])
    _sync_brevo(target_user, reason="blocked" if blocked else "unblocked")
    return target_user


def toggle_user_confirmation(*, target_user: User, confirmed: bool) -> User:
    target_user.confirmed = confirmed
    target_user.save(update_fields=["confirmed", "updated_at"])
    return target_user


def update_user_ban_status(
    *,
    target_user: User,
    banned: bool,
    ban_reason: str | None = None,
    ban_expires: datetime | None = None,
) -> User:
    target_user.banned = banned
    target_user.ban_reason = ban_reason if banned else None
    target_user.ban_expires = ban_expires if banned else None
    target_user.save(update_fields=["banned", "ban_reason", "ban_expires", "updated_at"])
    _sync_brevo(target_user, reason="banned" if banned else "unbanned")
    return target_user


def ban_user(
    *,
    target_user: User,
    ban_reason: str | None = None,
    ban_expires_in_seconds: int | None = None,
) -> User:
    if ban_reason and len(ban_reason) > 500:
        raise FieldErrors(details={"banReason": ["Μέγιστο μήκος 500 χαρακτήρες"]})
    expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=ban_expires_in_seconds)
        if ban_expires_in_seconds
        else None
    )
    return update_user_ban_status(
        target_user=target_user,
        banned=True,
        ban_reason=ban_reason,
        ban_expires=expires_at,
    )


def unban_user(*, target_user: User) -> User:
    return update_user_ban_status(target_user=target_user, banned=False)


def set_user_password(*, target_user: User, new_password: str) -> None:
    if not new_password or len(new_password) < 6:
        raise FieldErrors(
            details={"newPassword": ["Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες"]}
        )
    account = Account.objects.filter(user=target_user, provider_id="credential").first()
    if account is None:
        Account.objects.create(
            user=target_user,
            account_id=target_user.id,
            provider_id="credential",
            password=make_password(new_password),
        )
    else:
        account.password = make_password(new_password)
        account.save(update_fields=["password", "updated_at"])


def remove_user(*, target_user: User) -> None:
    """Cascade-delete user; cleanup Brevo + outstanding verification tokens."""
    email = target_user.email
    with transaction.atomic():
        Verification.objects.filter(identifier=email).delete()
        target_user.delete()
    _delete_brevo_contact(email)


# ----- Sessions / impersonation -------------------------------------------


def revoke_session(*, session_token: str) -> bool:
    deleted, _ = Session.objects.filter(token=session_token).delete()
    return deleted > 0


def revoke_all_user_sessions(*, target_user: User) -> int:
    deleted, _ = Session.objects.filter(user=target_user).delete()
    return int(deleted)


def impersonate_user(*, actor: User, target_user: User) -> dict[str, Any]:
    """Create an impersonation Session row; the JWT subject is still actor.id
    but `impersonated_by` records the impersonator. Frontend uses the row
    server-side (Better Auth-equivalent admin plugin behaviour).

    Access gate: OLD `impersonateUser` only required `users:edit`
    (admin/users.ts:422 → getAdminSessionWithPermission(USERS, 'edit')), which
    `support` satisfies (ROLE_PERMISSIONS.support.users = 'full'). The view layer
    enforces that via `HasResourcePermission(USERS, 'edit')`, so no extra
    role==admin restriction here — that would wrongly block support."""
    import secrets

    token = secrets.token_urlsafe(48)
    session = Session.objects.create(
        user=target_user,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        impersonated_by=actor.id,
    )
    return {"sessionId": session.id, "token": token, "expiresAt": session.expires_at}


def stop_impersonating(*, actor: User) -> int:
    """Revoke any sessions where impersonated_by == actor.id."""
    deleted, _ = Session.objects.filter(impersonated_by=actor.id).delete()
    return int(deleted)


# ----- Team mgmt -----------------------------------------------------------


_ADMIN_LIKE = {UserRole.ADMIN, UserRole.SUPPORT, UserRole.EDITOR}


def assign_admin_role(*, actor: User, target_user: User, role: str) -> User:
    if role not in dict(UserRole.choices):
        raise FieldErrors(details={"role": ["Άκυρος ρόλος"]})
    _require_can_assign(actor, role)

    # Self-demotion protection
    if actor.id == target_user.id and role != UserRole.ADMIN and actor.role == UserRole.ADMIN:
        raise ApiError(
            "Δεν μπορείς να αφαιρέσεις τα δικαιώματα admin από τον εαυτό σου",
            code="self_demotion_forbidden",
            status_code=403,
        )

    target_user.role = role
    if role in _ADMIN_LIKE:
        target_user.step = JourneyStep.DASHBOARD
        target_user.save(update_fields=["role", "step", "updated_at"])
    else:
        target_user.save(update_fields=["role", "updated_at"])
    _sync_brevo(target_user, reason="admin_assigned")
    return target_user


def remove_admin_role(*, actor: User, target_user: User) -> User:
    if actor.id == target_user.id:
        raise ApiError(
            "Δεν μπορείς να αφαιρέσεις τα δικαιώματα admin από τον εαυτό σου",
            code="self_demotion_forbidden",
            status_code=403,
        )

    # Infer original role from type/profile
    if target_user.type == UserType.PRO:
        try:
            from apps.profiles.models.profile import Profile  # type: ignore
            profile = Profile.objects.filter(user_id=target_user.id).first()
            new_role = profile.type if profile and profile.type in {UserRole.FREELANCER, UserRole.COMPANY} else UserRole.FREELANCER
        except ImportError:
            new_role = UserRole.FREELANCER
    else:
        new_role = UserRole.USER

    target_user.role = new_role
    target_user.save(update_fields=["role", "updated_at"])
    _sync_brevo(target_user, reason="admin_removed")
    return target_user
