"""Account-management endpoints: me/session, update account, change username,
delete account, upgrade to pro, update user type.

Tracker rows: 18, 20, 28, 29, 30, 31, 32.
"""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.selectors.users import serialize_session_user
from apps.accounts.serializers.auth import (
    ChangeUsernameSerializer,
    DeleteAccountSerializer,
    UpdateAccountSerializer,
    UpdateUserTypeSerializer,
    UpgradeToProSerializer,
)
from apps.accounts.services import account as account_service
from apps.accounts.services import sessions as session_service
from apps.accounts.services.auth import issue_tokens


# Refresh-token cookie the frontend sets after login (`lib/api/client.ts`).
REFRESH_COOKIE_NAME = "dj_refresh"


class _RefreshTokenSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class MeView(APIView):
    """GET /api/auth/me (tracker row 32)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"user": serialize_session_user(request.user)})


class SessionView(APIView):
    """GET /api/auth/session (tracker row 31).

    Optional auth — returns `{user: null}` for unauthenticated callers (matches
    Better Auth's getSession behavior).
    """

    permission_classes = []  # AllowAny via empty list

    def get(self, request):
        if request.user.is_authenticated:
            return Response({
                "user": serialize_session_user(request.user),
                "session": {"id": getattr(request.auth, "payload", {}).get("jti")} if request.auth else None,
            })
        return Response({"user": None, "session": None})


class UpdateAccountView(APIView):
    """PATCH /api/auth/account (tracker row 29)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=UpdateAccountSerializer)
    def patch(self, request):
        serializer = UpdateAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        display_name = serializer.validated_data["displayName"]
        image = serializer.validated_data.get("image")
        user = account_service.update_account(
            request.user,
            display_name=display_name,
            image=image,
        )
        # Pro users have a Profile whose denormalised displayName/image must
        # track the account (OLD update-account.ts:90-101). Best-effort.
        try:
            from apps.profiles.services.profile_updates import sync_account_to_profile
            sync_account_to_profile(
                user,
                display_name=user.display_name,
                image=user.image if image is not None else None,
            )
        except Exception:  # pragma: no cover - defensive
            import logging
            logging.getLogger(__name__).exception("account_to_profile_sync_failed")
        return Response({"message": "Ο λογαριασμός ενημερώθηκε"})


class ChangeUsernameView(APIView):
    """POST /api/auth/username/change (tracker row 18)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=ChangeUsernameSerializer)
    def post(self, request):
        serializer = ChangeUsernameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = account_service.change_username(
            request.user,
            serializer.validated_data["newUsername"],
            serializer.validated_data["confirmUsername"],
        )
        # Mirror the new username onto the user's Profile (OLD change-username.ts
        # :117-128). Best-effort.
        try:
            from apps.profiles.services.profile_updates import sync_username_to_profile
            sync_username_to_profile(request.user, result.new_username)
        except Exception:  # pragma: no cover - defensive
            import logging
            logging.getLogger(__name__).exception("username_to_profile_sync_failed")
        return Response({
            "message": "Το username άλλαξε επιτυχώς!",
            "data": {
                "newUsername": result.new_username,
                "nextChangeDate": result.next_change_at.isoformat(),
            },
        })


class DeleteAccountView(APIView):
    """DELETE /api/auth/account (tracker row 20)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=DeleteAccountSerializer)
    def delete(self, request):
        serializer = DeleteAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account_service.delete_account(
            request.user, serializer.validated_data["confirmUsername"]
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class UpgradeToProView(APIView):
    """POST /api/auth/upgrade-to-pro (tracker row 28)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=UpgradeToProSerializer)
    def post(self, request):
        serializer = UpgradeToProSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = account_service.upgrade_to_pro(
            request.user,
            username=serializer.validated_data["username"],
            role=serializer.validated_data["role"],
        )
        # New tokens reflect the updated role/type/step claims.
        tokens = issue_tokens(user)
        return Response({
            "message": "Έγινες επαγγελματίας",
            "user": serialize_session_user(user),
            **tokens,
        })


class UpdateUserTypeView(APIView):
    """PATCH /api/auth/user-type (tracker row 30) — used post-OAuth to record
    type/role choice. Only the user themselves can call this for their own id.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(request=UpdateUserTypeSerializer)
    def patch(self, request):
        serializer = UpdateUserTypeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data["userId"] != request.user.id:
            from common.exceptions import Forbidden
            raise Forbidden("Cannot update another user's type.")
        user = account_service.update_user_type(
            request.user,
            target_type=serializer.validated_data["type"],
            role=serializer.validated_data.get("role"),
        )
        tokens = issue_tokens(user)
        return Response({"user": serialize_session_user(user), **tokens})


class LogoutView(APIView):
    """POST /api/auth/logout — server-side sign-out (audit gap A).

    Blacklists the caller's refresh token so it can't be used to mint new
    access tokens after logout (Better Auth's `signOut` destroyed the server
    session row: `app/api/auth/[...all]/route.ts:4`). The refresh token is read
    from the request body (`{refresh}`) or the `dj_refresh` cookie, matching
    however the frontend sends it. AllowAny + always-200 so logout is
    idempotent and never leaks token state — a missing/expired/already-revoked
    token still yields a clean success.
    """

    permission_classes = [AllowAny]

    @extend_schema(request=_RefreshTokenSerializer)
    def post(self, request):
        serializer = _RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_token = (
            serializer.validated_data.get("refresh")
            or request.COOKIES.get(REFRESH_COOKIE_NAME)
        )
        session_service.blacklist_refresh_token(raw_token)
        return Response({"ok": True})


class RevokeAllSessionsView(APIView):
    """POST /api/auth/sessions/revoke-all — "log out everywhere" (audit gap B).

    Mirrors the OLD self-service session revocation: a user could delete their
    own `sessions` rows (RLS-owned), and the admin path was
    `auth.api.revokeUserSessions` (`actions/admin/users.ts:524-549`). Blacklists
    every outstanding refresh token issued to the caller so all other devices
    are signed out. Access tokens already in flight expire within the 15-minute
    access TTL.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        revoked = session_service.revoke_all_for_user(request.user)
        return Response({"ok": True, "revoked": revoked})
