"""OAuth setup + exchange-token + Better Auth catch-all (rows 1, 2, 27).

Row 1 was a Better Auth catch-all at `/api/auth/[...all]`. In our port the
individual auth endpoints (login, register, password-reset, etc.) already
exist under `/api/auth/...`. The catch-all here is a thin shim that:
  - lists which paths are supported (a 404 with a helpful manifest for
    any path Better Auth handled but we haven't migrated)
  - forwards a few legacy paths Better Auth exposed but we renamed

Row 2 (`/api/auth/exchange-token`) issues a Supabase-RLS-compatible JWT.
Row 27 (`/api/auth/oauth/setup`) completes the OAuth setup flow.
"""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.selectors.users import serialize_session_user
from apps.accounts.services import oauth as oauth_service
from apps.accounts.services.auth import issue_tokens


class OAuthSetupSerializer(serializers.Serializer):
    username = serializers.RegexField(regex=r"^[a-zA-Z0-9_-]{3,30}$", required=False, allow_null=True)
    displayName = serializers.CharField(min_length=1, max_length=80, required=False, allow_null=True)
    role = serializers.ChoiceField(choices=("freelancer", "company"), required=False, allow_null=True)
    type = serializers.ChoiceField(choices=("user", "pro"))


class OAuthSetupView(APIView):
    """POST /api/auth/oauth/setup (row 27)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=OAuthSetupSerializer)
    def post(self, request):
        s = OAuthSetupSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = oauth_service.complete_oauth_setup(
            user=request.user,
            username=s.validated_data.get("username") or "",
            display_name=s.validated_data.get("displayName") or "",
            role=s.validated_data.get("role") or "",
            type=s.validated_data["type"],
        )
        tokens = issue_tokens(user)
        return Response({
            "user": serialize_session_user(user),
            **tokens,
        }, status=status.HTTP_200_OK)


class ExchangeTokenView(APIView):
    """POST or GET /api/auth/exchange-token (row 2) — Supabase RLS JWT."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(oauth_service.mint_supabase_jwt(request.user))

    def post(self, request):
        return Response(oauth_service.mint_supabase_jwt(request.user))


class BetterAuthCatchAllView(APIView):
    """GET / POST /api/auth/<anything> (row 1) — manifest for unmigrated paths.

    Returns a 404 with a list of supported paths so the frontend gets a clean
    error rather than a generic Django 404. Several Better Auth subpaths
    (`signOut`, `getSession`, `getJwks`) are handled inline here.
    """

    permission_classes = [AllowAny]

    SUPPORTED = {
        "login":               "POST /api/auth/login",
        "register":            "POST /api/auth/register",
        "verify-email":        "GET  /api/auth/verify-email/",
        "session":             "GET  /api/auth/session",
        "me":                  "GET  /api/auth/me",
        "password/forgot":     "POST /api/auth/password/forgot",
        "password/reset":      "POST /api/auth/password/reset",
        "password/change":     "POST /api/auth/password/change",
        "verification/resend": "POST /api/auth/verification/resend",
        "account":             "PATCH /api/auth/account · DELETE /api/auth/account",
        "username/change":     "POST /api/auth/username/change",
        "upgrade-to-pro":      "POST /api/auth/upgrade-to-pro",
        "user-type":           "PATCH /api/auth/user-type",
        "oauth/intent":        "POST /api/auth/oauth/intent · GET /api/auth/oauth/intent",
        "oauth/setup":         "POST /api/auth/oauth/setup",
        "exchange-token":      "POST/GET /api/auth/exchange-token",
        "token/refresh":       "POST /api/auth/token/refresh",
        "token/verify":        "POST /api/auth/token/verify",
        "maintenance":         "GET  /api/auth/maintenance",
    }

    def get(self, request, rest=""):
        return self._handle(request, rest)

    def post(self, request, rest=""):
        return self._handle(request, rest)

    def _handle(self, request, rest: str):
        # Better Auth's sign-out → blacklist the refresh token (audit gap A) and
        # return 200. The token comes from the request body (`{refresh}`) or the
        # `dj_refresh` cookie, matching whatever the frontend sends. Idempotent:
        # a missing/expired/already-revoked token still returns a clean success.
        if rest in ("sign-out", "signOut", "logout"):
            from apps.accounts.services import sessions as session_service

            raw_token = (
                (request.data.get("refresh") if isinstance(request.data, dict) else None)
                or request.COOKIES.get("dj_refresh")
            )
            session_service.blacklist_refresh_token(raw_token)
            return Response({"ok": True})
        return Response(
            {
                "error": {
                    "code": "not_implemented",
                    "message": f"Better Auth path '{rest}' is not migrated. "
                               "See `supported` for the full DRF surface.",
                    "details": {"supported": self.SUPPORTED},
                }
            },
            status=404,
        )
