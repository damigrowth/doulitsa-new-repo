"""Admin user + team URL routes. Mounted at `/api/admin/` from config/urls.py."""
from __future__ import annotations

from django.urls import path

from apps.accounts.views.admin import team as team_views
from apps.accounts.views.admin import users as user_views

app_name = "accounts_admin"

urlpatterns = [
    # Users (rows 144-166)
    path("users", user_views.AdminUserListCreateView.as_view(), name="users-list"),                      # 144 (GET) + 145 (POST)
    path("users/stats", user_views.AdminUserStatsView.as_view(), name="users-stats"),                    # 165
    path("users/me/stop-impersonating", user_views.AdminStopImpersonateView.as_view(), name="stop-impersonate"),  # 152
    path("users/sessions/<str:session_token>", user_views.AdminRevokeSessionView.as_view(), name="revoke-session"),  # 154

    path("users/<str:user_id>", user_views.AdminUserDetailView.as_view(), name="users-detail"),          # 144 GET / 156 PATCH / 150 DELETE
    path("users/<str:user_id>/role", user_views.AdminUserRoleView.as_view(), name="users-role"),         # 147
    path("users/<str:user_id>/ban", user_views.AdminUserBanView.as_view(), name="users-ban"),            # 148
    path("users/<str:user_id>/unban", user_views.AdminUserUnbanView.as_view(), name="users-unban"),      # 149
    path("users/<str:user_id>/sessions", user_views.AdminUserSessionsView.as_view(), name="users-sessions-list"),    # 153
    path("users/<str:user_id>/sessions/revoke-all", user_views.AdminRevokeAllSessionsView.as_view(), name="users-sessions-revoke-all"),  # 155
    path("users/<str:user_id>/impersonate", user_views.AdminImpersonateView.as_view(), name="users-impersonate"),    # 151
    path("users/<str:user_id>/password", user_views.AdminUserPasswordView.as_view(), name="users-password"),         # 157
    path("users/<str:user_id>/basic-info", user_views.AdminUserBasicInfoView.as_view(), name="users-basic-info"),    # 158
    path("users/<str:user_id>/status", user_views.AdminUserStatusView.as_view(), name="users-status"),               # 159
    path("users/<str:user_id>/ban-status", user_views.AdminUserBanStatusView.as_view(), name="users-ban-status"),    # 160
    path("users/<str:user_id>/image", user_views.AdminUserImageView.as_view(), name="users-image"),                  # 161
    path("users/<str:user_id>/blocked/toggle", user_views.AdminToggleBlockView.as_view(), name="users-toggle-block"),       # 162
    path("users/<str:user_id>/confirmed/toggle", user_views.AdminToggleConfirmView.as_view(), name="users-toggle-confirm"), # 163
    path("users/<str:user_id>/journey-step", user_views.AdminUpdateStepView.as_view(), name="users-step"),                  # 164
    path("users/<str:user_id>/account", user_views.AdminAccountUpdateView.as_view(), name="users-account"),                 # 166

    # Team (rows 167-170)
    path("team", team_views.AdminTeamListView.as_view(), name="team-list"),                          # 167
    path("team/search", team_views.AdminTeamSearchView.as_view(), name="team-search"),               # 170
    path("team/<str:user_id>/role", team_views.AdminTeamRoleView.as_view(), name="team-role"),  # 168 (POST assign) + 169 (DELETE remove)
]
