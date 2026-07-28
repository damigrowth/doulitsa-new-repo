"""accounts permissions package."""
from __future__ import annotations

from .admin import (
    AdminResource,
    HasResourcePermission,
    HasSettingsEdit,
    HasSettingsView,
    HasTeamEdit,
    HasTeamFull,
    HasTeamView,
    HasUsersEdit,
    HasUsersFull,
    HasUsersView,
    has_resource_permission,
)
from .roles import (
    HasAnyRole,
    HasRole,
    IsAdmin,
    IsAdminLike,
    IsEmailVerified,
    IsProfessional,
    IsProUser,
    IsSimpleUser,
)

__all__ = (
    "AdminResource",
    "HasAnyRole",
    "HasRole",
    "HasResourcePermission",
    "HasSettingsEdit",
    "HasSettingsView",
    "HasTeamEdit",
    "HasTeamFull",
    "HasTeamView",
    "HasUsersEdit",
    "HasUsersFull",
    "HasUsersView",
    "IsAdmin",
    "IsAdminLike",
    "IsEmailVerified",
    "IsProUser",
    "IsProfessional",
    "IsSimpleUser",
    "has_resource_permission",
)
