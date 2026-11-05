"""Resource-based admin permissions ported from `lib/auth/roles.ts` ROLE_PERMISSIONS.

The Next.js code uses `hasAccess(role, resource)`, `canEdit(role, resource)`,
`hasFullAccess(role, resource)` plus a wrapper `getAdminSessionWithPermission()`.
We expose a single configurable DRF permission class and resource constants.

Use:
    permission_classes = [HasResourcePermission(AdminResource.USERS, level="view")]

Levels:
    full -> create / read / update / delete / special actions
    edit -> read + update
    view -> read only
"""
from __future__ import annotations

from typing import Literal

from rest_framework.permissions import BasePermission

from apps.accounts.models.user import UserRole

PermissionLevel = Literal["full", "edit", "view"]


class AdminResource:
    DASHBOARD = "dashboard"
    SERVICES = "services"
    VERIFICATIONS = "verifications"
    PROFILES = "profiles"
    USERS = "users"
    TEAM = "team"
    TAXONOMIES = "taxonomies"
    CHATS = "chats"
    REVIEWS = "reviews"
    SUBSCRIPTIONS = "subscriptions"
    ANALYTICS = "analytics"
    GIT = "git"
    SETTINGS = "settings"
    BLOG = "blog"


# Mirror of ROLE_PERMISSIONS in src/lib/auth/roles.ts. Order matters for `_satisfies`:
# full > edit > view.
ROLE_PERMISSIONS: dict[str, dict[str, str | None]] = {
    UserRole.ADMIN: {
        AdminResource.DASHBOARD: "full",
        AdminResource.SERVICES: "full",
        AdminResource.VERIFICATIONS: "full",
        AdminResource.PROFILES: "full",
        AdminResource.USERS: "full",
        AdminResource.TEAM: "full",
        AdminResource.TAXONOMIES: "full",
        AdminResource.CHATS: "full",
        AdminResource.REVIEWS: "full",
        AdminResource.SUBSCRIPTIONS: "full",
        AdminResource.ANALYTICS: "full",
        AdminResource.GIT: "full",
        AdminResource.SETTINGS: "full",
        AdminResource.BLOG: "full",
    },
    UserRole.SUPPORT: {
        AdminResource.DASHBOARD: "view",
        AdminResource.SERVICES: "full",
        AdminResource.VERIFICATIONS: "full",
        AdminResource.PROFILES: "full",
        AdminResource.USERS: "full",
        AdminResource.TEAM: None,
        AdminResource.TAXONOMIES: None,
        AdminResource.CHATS: "full",
        AdminResource.REVIEWS: "full",
        AdminResource.SUBSCRIPTIONS: None,
        AdminResource.ANALYTICS: None,
        AdminResource.GIT: None,
        AdminResource.SETTINGS: None,
        AdminResource.BLOG: "full",
    },
    UserRole.EDITOR: {
        AdminResource.DASHBOARD: "view",
        AdminResource.SERVICES: "full",
        AdminResource.VERIFICATIONS: None,
        AdminResource.PROFILES: None,
        AdminResource.USERS: None,
        AdminResource.TEAM: None,
        AdminResource.TAXONOMIES: None,
        AdminResource.CHATS: None,
        AdminResource.REVIEWS: None,
        AdminResource.SUBSCRIPTIONS: None,
        AdminResource.ANALYTICS: None,
        AdminResource.GIT: None,
        AdminResource.SETTINGS: None,
        AdminResource.BLOG: None,
    },
}


def _satisfies(actual: str | None, required: PermissionLevel) -> bool:
    """A role's actual level (full/edit/view/None) satisfies a required level if it is >= required."""
    if actual is None:
        return False
    rank = {"view": 1, "edit": 2, "full": 3}
    return rank.get(actual, 0) >= rank.get(required, 0)


def has_resource_permission(
    role: str | None,
    resource: str,
    level: PermissionLevel = "view",
) -> bool:
    if not role or role not in ROLE_PERMISSIONS:
        return False
    return _satisfies(ROLE_PERMISSIONS[role].get(resource), level)


_ADMIN_LIKE_ROLES = {UserRole.ADMIN, UserRole.SUPPORT, UserRole.EDITOR}
_SAFE_METHODS = ("GET", "HEAD", "OPTIONS")
ADMIN_TARGET_FORBIDDEN_MESSAGE = (
    "Μόνο ένας διαχειριστής μπορεί να τροποποιήσει λογαριασμό της ομάδας διαχείρισης"
)


def _writes_admin_like_target(request, view) -> bool:
    """True when a non-admin actor sends a write to a `<user_id>` URL whose
    target is an admin/support/editor account (AZ-D3 / P2-35). OLD support
    lacked set-password/set-role and the admin plugin refused writes on admins
    unless the actor was in ADMIN_USER_IDS."""
    if request.method in _SAFE_METHODS:
        return False
    if getattr(request.user, "role", None) == UserRole.ADMIN:
        return False
    target_id = (getattr(view, "kwargs", None) or {}).get("user_id")
    if not target_id:
        return False
    from apps.accounts.models import User

    target_role = User.objects.filter(id=target_id).values_list("role", flat=True).first()
    return target_role in _ADMIN_LIKE_ROLES


def HasResourcePermission(
    resource: str,
    level: PermissionLevel = "view",
    *,
    protect_admin_targets: bool = False,
) -> type[BasePermission]:
    """Permission class factory.

    Used as `permission_classes = [HasResourcePermission(AdminResource.USERS, "edit")]`.
    With `protect_admin_targets=True`, writes to an admin-like `<user_id>`
    target are refused unless the actor is an admin.
    """

    class _Permission(BasePermission):
        message = f"Insufficient permission for {resource} ({level})."

        def has_permission(self, request, view) -> bool:
            user = request.user
            if not user or not user.is_authenticated:
                return False
            if not has_resource_permission(user.role, resource, level):
                return False
            if protect_admin_targets and _writes_admin_like_target(request, view):
                self.message = ADMIN_TARGET_FORBIDDEN_MESSAGE
                return False
            return True

    _Permission.__name__ = f"Has{resource.title()}{level.title()}Permission"
    return _Permission


# Pre-built convenience classes for common combos
HasUsersView = HasResourcePermission(AdminResource.USERS, "view")
HasUsersEdit = HasResourcePermission(AdminResource.USERS, "edit")
HasUsersFull = HasResourcePermission(AdminResource.USERS, "full")
HasTeamView = HasResourcePermission(AdminResource.TEAM, "view")
HasTeamEdit = HasResourcePermission(AdminResource.TEAM, "edit")
HasTeamFull = HasResourcePermission(AdminResource.TEAM, "full")
HasSettingsView = HasResourcePermission(AdminResource.SETTINGS, "view")
HasSettingsEdit = HasResourcePermission(AdminResource.SETTINGS, "edit")
