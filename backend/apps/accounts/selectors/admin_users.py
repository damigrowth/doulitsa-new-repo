"""Read queries for admin user-management endpoints (rows 144-170, 144-145, 165, 167, 170)."""
from __future__ import annotations

from typing import Any

from django.db.models import Q, QuerySet

from apps.accounts.models import Session, User
from apps.accounts.models.user import JourneyStep, UserRole, UserType


# ----- list / filter / search ---------------------------------------------


_ALLOWED_SEARCH_FIELDS = {"email", "name", "username", "displayName"}
_ALLOWED_SEARCH_OPS = {"contains", "starts_with", "ends_with"}
_ALLOWED_SORT_FIELDS = {
    "createdAt": "created_at",
    "updatedAt": "updated_at",
    "email": "email",
    "username": "username",
    # The admin table marks name/type/role sortable
    # (admin-users-data-table.tsx); OLD passed sortBy straight to Prisma.
    "name": "name",
    "type": "type",
    "role": "role",
}


def list_users(
    *,
    search_value: str = "",
    search_field: str = "email",
    search_operator: str = "contains",
    type: str | None = None,            # 'user' | 'pro' | 'all'
    provider: str | None = None,         # 'email' | 'google' | 'all'
    step: str | None = None,             # JourneyStep value | 'all'
    status: str | None = None,           # 'verified' | 'unverified' | 'banned' | 'blocked' | 'all'
    role: str | None = None,             # UserRole value | 'all'
    limit: int = 10,
    offset: int = 0,
    sort_by: str = "createdAt",
    sort_direction: str = "desc",
) -> tuple[list[User], int]:
    qs: QuerySet[User] = User.objects.all()

    # Search
    if search_value:
        if search_field not in _ALLOWED_SEARCH_FIELDS:
            search_field = "email"
        if search_operator not in _ALLOWED_SEARCH_OPS:
            search_operator = "contains"
        # Map UI field name → ORM field
        field_map = {
            "email": "email",
            "name": "name",
            "username": "username",
            "displayName": "display_name",
        }
        col = field_map[search_field]
        op_map = {
            "contains": "icontains",
            "starts_with": "istartswith",
            "ends_with": "iendswith",
        }
        qs = qs.filter(**{f"{col}__{op_map[search_operator]}": search_value})

    # Filters
    if type and type != "all":
        qs = qs.filter(type=type if type in {UserType.USER, UserType.PRO} else "user")
    if provider and provider != "all":
        qs = qs.filter(provider=provider)
    if step and step != "all" and step in dict(JourneyStep.choices):
        qs = qs.filter(step=step)
    if role and role != "all" and role in dict(UserRole.choices):
        qs = qs.filter(role=role)
    if status and status != "all":
        if status == "verified":
            qs = qs.filter(email_verified=True)
        elif status == "unverified":
            qs = qs.filter(email_verified=False)
        elif status == "banned":
            qs = qs.filter(banned=True)
        elif status == "blocked":
            qs = qs.filter(blocked=True)

    total = qs.count()

    # Sort
    sort_col = _ALLOWED_SORT_FIELDS.get(sort_by, "created_at")
    if sort_direction == "desc":
        sort_col = f"-{sort_col}"
    qs = qs.order_by(sort_col)

    return list(qs[offset:offset + limit]), total


def get_user_with_relations(user_id: str) -> dict[str, Any] | None:
    """Fetch one user with profile + accounts + sessions for admin detail view."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None

    accounts_qs = user.accounts.all().order_by("-created_at")
    sessions_qs = user.sessions.all().order_by("-created_at")

    return {
        "user": user,
        "accounts": list(accounts_qs),
        "sessions": list(sessions_qs),
    }


# ----- stats ---------------------------------------------------------------


def get_user_stats() -> dict[str, Any]:
    by_step = {
        s.value: User.objects.filter(step=s.value).count()
        for s in JourneyStep
    }
    by_provider = {
        p: User.objects.filter(provider=p).count()
        for p in ("email", "google")
    }
    by_type = {
        UserType.USER: User.objects.filter(type=UserType.USER).count(),
        UserType.PRO: User.objects.filter(type=UserType.PRO).count(),
    }
    return {
        "total": User.objects.count(),
        # OLD active = banned:false + blocked:false + emailVerified:true +
        # confirmed:true (admin/users.ts:1013-1020).
        "active": User.objects.filter(
            confirmed=True, blocked=False, banned=False, email_verified=True
        ).count(),
        "banned": User.objects.filter(banned=True).count(),
        "blocked": User.objects.filter(blocked=True).count(),
        "unverified": User.objects.filter(email_verified=False).count(),
        "byStep": by_step,
        "byProvider": by_provider,
        "byType": by_type,
    }


# ----- sessions ------------------------------------------------------------


def list_user_sessions(user_id: str) -> list[Session]:
    return list(Session.objects.filter(user_id=user_id).order_by("-created_at"))


# ----- team ----------------------------------------------------------------


_ADMIN_ROLES = (UserRole.ADMIN, UserRole.SUPPORT, UserRole.EDITOR)


def list_team_members() -> list[User]:
    """Return admin/support/editor users ordered by role then -created_at."""
    return list(
        User.objects.filter(role__in=_ADMIN_ROLES)
        .order_by("role", "-created_at")
    )


def search_users_for_role_assignment(query: str, limit: int = 10) -> list[User]:
    if not query or len(query) < 2:
        return []
    return list(
        User.objects.filter(
            Q(email__icontains=query)
            | Q(username__icontains=query)
            | Q(display_name__icontains=query)
        ).order_by("email")[:limit]
    )
