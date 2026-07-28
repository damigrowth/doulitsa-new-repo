"""Smoke tests for the admin user-management surface.

Verifies imports + URL wiring + role hierarchy + permission factory.
Database tests live in `test_admin_users.py` once Postgres is wired locally.
"""
from __future__ import annotations


def test_admin_modules_importable() -> None:
    from apps.accounts.selectors import admin_users as sel
    from apps.accounts.serializers import admin_users as ser
    from apps.accounts.services import admin_users as svc
    from apps.accounts.views.admin import team as team_views
    from apps.accounts.views.admin import users as user_views

    assert callable(svc.create_user)
    assert callable(sel.list_users)
    assert ser.AdminUserSerializer is not None
    assert user_views.AdminUserListCreateView is not None
    assert team_views.AdminTeamListView is not None
    assert team_views.AdminTeamRoleView.post is not None
    assert team_views.AdminTeamRoleView.delete is not None


def test_role_hierarchy() -> None:
    from apps.accounts.services.admin_users import can_assign_role

    # Admin can assign any role
    for r in ("user", "freelancer", "company", "admin", "support", "editor"):
        assert can_assign_role("admin", r), f"admin should be able to assign {r}"

    # Support can only assign user-level roles
    assert can_assign_role("support", "user")
    assert can_assign_role("support", "freelancer")
    assert can_assign_role("support", "company")
    assert not can_assign_role("support", "admin")
    assert not can_assign_role("support", "support")
    assert not can_assign_role("support", "editor")

    # Editor cannot assign anything
    for r in ("user", "freelancer", "company", "admin", "support", "editor"):
        assert not can_assign_role("editor", r), f"editor should NOT be able to assign {r}"


def test_admin_urls_wired() -> None:
    from apps.accounts.urls import admin

    paths = [p.pattern.describe() for p in admin.urlpatterns]
    # Spot-check the static-before-dynamic ordering required for correct routing
    assert any("users/stats" in p for p in paths)
    assert any("users/me/stop-impersonating" in p for p in paths)
    assert any("users/sessions/<str:session_token>" in p for p in paths)
    # Detail + nested actions
    assert any("users/<str:user_id>" in p for p in paths)
    assert any("users/<str:user_id>/role" in p for p in paths)
    assert any("users/<str:user_id>/ban" in p for p in paths)
    assert any("users/<str:user_id>/journey-step" in p for p in paths)
    # Team
    assert any("team" in p for p in paths)
    assert any("team/search" in p for p in paths)
    assert any("team/<str:user_id>/role" in p for p in paths)


def test_resource_permission_factory() -> None:
    from apps.accounts.permissions.admin import (
        AdminResource,
        HasResourcePermission,
        has_resource_permission,
    )

    # admin/users/full → admin yes, support no (cannot 'full' on users? actually
    # support's users perm is 'full' — confirm by lookup)
    assert has_resource_permission("admin", AdminResource.USERS, "full")
    assert has_resource_permission("support", AdminResource.USERS, "full")
    assert not has_resource_permission("editor", AdminResource.USERS, "view")

    # team is admin-only
    assert has_resource_permission("admin", AdminResource.TEAM, "full")
    assert not has_resource_permission("support", AdminResource.TEAM, "view")
    assert not has_resource_permission("editor", AdminResource.TEAM, "view")

    # Factory returns a class with a sane name
    klass = HasResourcePermission(AdminResource.USERS, "edit")
    assert klass.__name__ == "HasUsersEditPermission"
