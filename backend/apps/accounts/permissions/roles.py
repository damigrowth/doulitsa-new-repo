"""Role-based DRF permissions ported from `actions/auth/server.ts` helpers.

Each class enforces a specific role contract. Compose them in views via
`permission_classes = [IsAuthenticated, IsProfessional]`.

These mirror the helper functions `requireRole`, `requireAdmin`, etc. but
return 401/403 JSON instead of redirecting (the frontend handles redirects).
"""
from __future__ import annotations

from rest_framework.permissions import BasePermission

from apps.accounts.models.user import UserRole, UserType


class HasRole(BasePermission):
    """Generic role gate. Subclass and set `required_role`."""

    required_role: str = ""
    message = "Required role missing."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.role == self.required_role


class HasAnyRole(BasePermission):
    """Generic any-of-roles gate. Subclass and set `required_roles`."""

    required_roles: tuple[str, ...] = ()
    message = "Required role missing."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.role in self.required_roles


class IsAdmin(BasePermission):
    """User must be `role='admin'`."""

    message = "Admin role required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.role == UserRole.ADMIN)


class IsProfessional(BasePermission):
    """User is freelancer OR company (the two pro role variants)."""

    message = "Professional account required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role in {UserRole.FREELANCER, UserRole.COMPANY}
        )


class IsProUser(BasePermission):
    """User has `type='pro'` (broader than IsProfessional — allows admin-as-pro)."""

    message = "Pro account required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.type == UserType.PRO)


class IsSimpleUser(BasePermission):
    """User has `role='user'` (used for upgrade-to-pro flow)."""

    message = "Simple user account required for this action."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.role == UserRole.USER)


class IsAdminLike(BasePermission):
    """Any admin-like role (admin/support/editor) — used for the admin UI."""

    message = "Admin/support/editor role required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role in {UserRole.ADMIN, UserRole.SUPPORT, UserRole.EDITOR}
        )


class IsEmailVerified(BasePermission):
    """Block actions until the user verifies their email."""

    message = "Email verification required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.email_verified)
