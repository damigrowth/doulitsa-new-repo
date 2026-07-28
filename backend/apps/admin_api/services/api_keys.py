"""Admin API key management. Backs rows 132-138."""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from django.conf import settings

from apps.accounts.models import User
from apps.admin_api.models import ApiKey
from common.exceptions import ApiError, FieldErrors

logger = logging.getLogger(__name__)


def validate_static_or_db_key(provided: str) -> dict[str, Any]:
    """Used by row 132: hand a key, get back whether it's valid + the source.

    OLD (actions/admin/api-keys.ts:20-61) returns `source: 'environment'` for the
    env fallback key and `source: 'database'` for a verified DB key — match those
    string values (NEW previously returned 'env'/'db').
    """
    if not provided:
        return {"success": True, "valid": False, "source": None, "data": None}
    if settings.ADMIN_API_KEY and provided == settings.ADMIN_API_KEY:
        return {
            "success": True,
            "valid": True,
            "source": "environment",
            "data": {
                "name": "Environment Admin Key",
                "metadata": {"purpose": "initial-access"},
            },
        }
    key = ApiKey.objects.filter(key=provided, enabled=True).first()
    if key is None:
        return {"success": True, "valid": False, "source": None, "data": None}
    if key.expires_at and key.expires_at < datetime.now(timezone.utc):
        return {"success": True, "valid": False, "source": None, "data": None}
    return {"success": True, "valid": True, "source": "database", "data": _row(key)}


def create_api_key(*, actor: User, name: str, expires_in: int | None = None,
                   metadata: dict | None = None) -> dict[str, Any]:
    if not name:
        raise FieldErrors(details={"name": ["Required"]})
    raw = "sk_" + secrets.token_urlsafe(32)
    # OLD (actions/admin/api-keys.ts:90 + lib/validations/admin.ts:204): `expiresIn`
    # is in DAYS (default 365, max 365), converted to a duration via *24*60*60.
    # The previous NEW code treated it as raw seconds — a 365-input would expire
    # the key in 365 seconds. Match OLD by treating the value as days.
    days = expires_in if expires_in else 365
    expires_at = datetime.now(timezone.utc) + timedelta(days=days)
    # OLD permission set (actions/admin/api-keys.ts:91-95).
    permissions = {
        "admin": ["read", "write", "delete"],
        "users": ["read", "write", "delete"],
        "sessions": ["read", "delete"],
    }
    # OLD metadata (actions/admin/api-keys.ts:96-101): always stamps the
    # admin-access purpose + creator, then merges any caller-supplied metadata.
    meta = {
        "purpose": "admin-access",
        "createdBy": actor.id,
        "createdByEmail": actor.email,
    }
    if metadata:
        meta.update({k: v for k, v in metadata.items() if v is not None})
    api_key = ApiKey.objects.create(
        name=name,
        key=raw,
        user=actor,
        enabled=True,
        expires_at=expires_at,
        start=raw[:8],
        prefix="sk_",
        metadata=meta,
        permissions=permissions,
    )
    # Return the raw key ONCE — never again after creation
    return {**_row(api_key), "key": raw}


def list_api_keys() -> list[dict[str, Any]]:
    # OLD (actions/admin/api-keys.ts:135-138) only surfaces admin-purpose keys:
    # `key.permissions?.admin && key.metadata?.purpose === 'admin-access'`.
    # The previous NEW code returned every ApiKey row (data exposure). Filter to
    # match OLD.
    rows = []
    for k in ApiKey.objects.all().order_by("-created_at"):
        perms = k.permissions or {}
        meta = k.metadata or {}
        if perms.get("admin") and meta.get("purpose") == "admin-access":
            rows.append(_row(k))
    return rows


def update_api_key(key_id: str, *, name: str | None = None,
                   enabled: bool | None = None) -> dict[str, Any]:
    key = ApiKey.objects.filter(id=key_id).first()
    if key is None:
        raise ApiError("API key not found", code="api_key_not_found", status_code=404)
    updates = []
    if name is not None:
        key.name = name
        updates.append("name")
    if enabled is not None:
        key.enabled = enabled
        updates.append("enabled")
    if updates:
        updates.append("updated_at")
        key.save(update_fields=updates)
    return _row(key)


def delete_api_key(key_id: str) -> None:
    key = ApiKey.objects.filter(id=key_id).first()
    if key is None:
        raise ApiError("API key not found", code="api_key_not_found", status_code=404)
    key.delete()


def _row(k: ApiKey) -> dict[str, Any]:
    return {
        "id": k.id,
        "name": k.name,
        "start": k.start,
        "prefix": k.prefix,
        "enabled": k.enabled,
        "expiresAt": k.expires_at.isoformat() if k.expires_at else None,
        "createdAt": k.created_at.isoformat() if k.created_at else None,
        "updatedAt": k.updated_at.isoformat() if k.updated_at else None,
        "userId": k.user_id,
    }


# ----- Admin navigation (row 138) ----------------------------------------


_NAV = [
    {"key": "dashboard", "label": "Dashboard", "href": "/admin", "resource": "dashboard"},
    {"key": "users", "label": "Users", "href": "/admin/users", "resource": "users"},
    {"key": "team", "label": "Team", "href": "/admin/team", "resource": "team"},
    {"key": "profiles", "label": "Profiles", "href": "/admin/profiles", "resource": "profiles"},
    {"key": "verifications", "label": "Verifications", "href": "/admin/verifications", "resource": "verifications"},
    {"key": "services", "label": "Services", "href": "/admin/services", "resource": "services"},
    {"key": "reviews", "label": "Reviews", "href": "/admin/reviews", "resource": "reviews"},
    {"key": "subscriptions", "label": "Subscriptions", "href": "/admin/subscriptions", "resource": "subscriptions"},
    {"key": "chats", "label": "Chats", "href": "/admin/chats", "resource": "chats"},
    {"key": "blog", "label": "Blog", "href": "/admin/articles", "resource": "blog"},
    {"key": "taxonomies", "label": "Taxonomies", "href": "/admin/taxonomies", "resource": "taxonomies"},
    {"key": "analytics", "label": "Analytics", "href": "/admin/analytics", "resource": "analytics"},
    {"key": "git", "label": "Git", "href": "/admin/git", "resource": "git"},
    {"key": "settings", "label": "Settings", "href": "/admin/settings", "resource": "settings"},
]


def get_navigation_for_user(user: User) -> list[dict[str, Any]]:
    """Return the nav items the user has at least 'view' access to."""
    from apps.accounts.permissions.admin import has_resource_permission

    return [
        item for item in _NAV
        if has_resource_permission(user.role, item["resource"], "view")
    ]
