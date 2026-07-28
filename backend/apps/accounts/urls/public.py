"""Public account/auth URL routes. Mounted at `/api/auth/` from config/urls.py."""
from __future__ import annotations

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from apps.accounts.views.public import account as account_views
from apps.accounts.views.public import auth as auth_views
from apps.accounts.views.public import oauth as oauth_views
from apps.accounts.views.public import oauth_setup as oauth_setup_views
from apps.accounts.views.public.onboarding import CompleteOnboardingView
from apps.core.views.public.health import MaintenanceStatusView

app_name = "accounts_public"

urlpatterns = [
    # Login & registration
    path("login", auth_views.LoginView.as_view(), name="login"),                       # row 15
    path("register", auth_views.RegisterView.as_view(), name="register"),              # row 16

    # Password
    path("password/change", auth_views.ChangePasswordView.as_view(), name="password-change"),  # row 17
    path("password/forgot", auth_views.ForgotPasswordView.as_view(), name="password-forgot"),  # row 21
    path("password/reset", auth_views.ResetPasswordView.as_view(), name="password-reset"),     # row 23

    # Email verification
    path("verification/resend", auth_views.ResendVerificationView.as_view(), name="verification-resend"),  # row 22
    path("verify-email/", auth_views.VerifyEmailRedirectView.as_view(), name="verify-email"),              # row 3

    # Session / me
    path("session", account_views.SessionView.as_view(), name="session"),  # row 31
    path("me", account_views.MeView.as_view(), name="me"),                  # row 32

    # Logout + self-service session revocation (audit gaps A & B).
    # MUST be declared before the `<path:rest>` catch-all below, otherwise it
    # would shadow these concrete paths.
    path("logout", account_views.LogoutView.as_view(), name="logout"),
    path(
        "sessions/revoke-all",
        account_views.RevokeAllSessionsView.as_view(),
        name="sessions-revoke-all",
    ),

    # Account management
    path("account", account_views.UpdateAccountView.as_view(), name="account-update"),    # row 29
    path("account/delete", account_views.DeleteAccountView.as_view(), name="account-delete"),  # row 20
    path("username/change", account_views.ChangeUsernameView.as_view(), name="username-change"),  # row 18
    path("upgrade-to-pro", account_views.UpgradeToProView.as_view(), name="upgrade-to-pro"),     # row 28
    path("user-type", account_views.UpdateUserTypeView.as_view(), name="user-type"),             # row 30
    path("onboarding/complete", CompleteOnboardingView.as_view(), name="onboarding-complete"),    # row 19

    # OAuth helpers
    path("oauth/intent", oauth_views.OAuthIntentView.as_view(), name="oauth-intent"),  # rows 25, 26
    path("oauth/setup", oauth_setup_views.OAuthSetupView.as_view(), name="oauth-setup"),  # row 27
    # Server-side Google code exchange — called by the Next.js callback route only.
    path("oauth/google/exchange", oauth_views.GoogleOAuthExchangeView.as_view(), name="oauth-google-exchange"),

    # Supabase RLS JWT exchange (row 2 — obsolete once Channels replaces Supabase)
    path("exchange-token", oauth_setup_views.ExchangeTokenView.as_view(), name="exchange-token"),

    # JWT — refresh + verify
    path("token/refresh", TokenRefreshView.as_view(), name="token-refresh"),
    path("token/verify", TokenVerifyView.as_view(), name="token-verify"),

    # Maintenance status (row 24) — kept under /api/auth/ so the catch-all
    # below doesn't shadow it.
    path("maintenance", MaintenanceStatusView.as_view(), name="maintenance"),

    # Better Auth catch-all (row 1) — manifest of supported endpoints for any
    # unmigrated sub-path the frontend still calls
    path("<path:rest>", oauth_setup_views.BetterAuthCatchAllView.as_view(), name="better-auth-catchall"),
]
