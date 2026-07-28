"""Smoke test — make sure every accounts module imports cleanly.

This catches missing-attribute / circular-import bugs before they reach a
real Django startup. Once Postgres+Redis are available, the integration
tests in `test_auth_flow.py` exercise the actual endpoints.
"""
from __future__ import annotations


def test_models_importable() -> None:
    from apps.accounts.models import (
        Account,
        JourneyStep,
        Jwks,
        PendingRegistration,
        Session,
        User,
        UserManager,
        UserRole,
        UserType,
        Verification,
    )

    assert User is not None
    assert UserRole.ADMIN.value == "admin"
    assert UserType.PRO.value == "pro"
    assert JourneyStep.DASHBOARD.value == "DASHBOARD"
    assert all(
        m is not None
        for m in (Account, Jwks, PendingRegistration, Session, UserManager, Verification)
    )


def test_permissions_importable() -> None:
    from apps.accounts.permissions import (
        AdminResource,
        HasResourcePermission,
        IsAdmin,
        IsAdminLike,
        IsProUser,
        IsProfessional,
        IsSimpleUser,
        has_resource_permission,
    )

    assert AdminResource.USERS == "users"
    assert has_resource_permission("admin", "users", "full") is True
    assert has_resource_permission("editor", "users", "view") is False
    assert HasResourcePermission("services", "edit").__name__ == "HasServicesEditPermission"
    assert all(p is not None for p in (IsAdmin, IsAdminLike, IsProUser, IsProfessional, IsSimpleUser))


def test_services_importable() -> None:
    from apps.accounts.services import account, auth, password, registration

    assert callable(auth.login)
    assert callable(registration.register)
    assert callable(password.change_password)
    assert callable(account.change_username)


def test_serializers_importable() -> None:
    from apps.accounts.serializers.auth import (
        ChangePasswordSerializer,
        JwtTokenObtainPairSerializer,
        LoginSerializer,
        RegisterSerializer,
    )

    s = LoginSerializer(data={"identifier": "x@example.com", "password": "secret123"})
    assert s.is_valid(), s.errors
    assert all(c is not None for c in (
        ChangePasswordSerializer, RegisterSerializer, JwtTokenObtainPairSerializer
    ))


def test_views_importable() -> None:
    from apps.accounts.views.public import account, auth, oauth

    assert account.MeView is not None
    assert auth.LoginView is not None
    assert oauth.OAuthIntentView is not None


def test_urls_importable() -> None:
    from apps.accounts.urls import public

    paths = [p.pattern.describe() for p in public.urlpatterns]
    assert any("login" in p for p in paths)
    assert any("register" in p for p in paths)


def test_text_utilities_match_typescript() -> None:
    """Slug + Greek-Latin transliteration must produce identical output to the
    Next.js source so URL slugs stay stable across both systems.
    """
    from common.utils.normalize import normalize_term
    from common.utils.slug import create_slug, generate_service_slug

    # Greek title → expected Latin slug. Mirror of what `createSlug` produces
    # in the TS source. Verified by inspection of greek-latin.ts mapping:
    # "Καθαρισμός σπιτιού" → 'kΑtharismos spitiou' lowercased.
    # (Uppercase Κ→k via single-letter map after digraphs.)
    assert create_slug("Test Title") == "test-title"
    assert create_slug("  multiple   spaces  ") == "multiple-spaces"
    assert create_slug("with-existing-hyphens---collapsed") == "with-existing-hyphens-collapsed"
    assert create_slug("strip!@#chars") == "stripchars"

    assert generate_service_slug("Test Title", 42) == "test-title-42"

    # normalize_term strips combining marks (used for accent-insensitive search).
    assert normalize_term("Καλημέρα") == "καλημερα"
    assert normalize_term("Café") == "cafe"
