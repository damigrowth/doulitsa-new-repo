"""Admin user-management endpoints (tracker rows 144-166).

Mounted at `/api/admin/users/...` by `apps.accounts.urls.admin`.
"""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions.admin import AdminResource, HasResourcePermission
from apps.accounts.selectors import admin_users as admin_users_selectors
from apps.accounts.serializers.admin_users import (
    AdminAccountSerializer,
    AdminBanStatusSerializer,
    AdminBanUserSerializer,
    AdminCreateUserSerializer,
    AdminSessionSerializer,
    AdminSetPasswordSerializer,
    AdminSetUserRoleSerializer,
    AdminToggleBlockSerializer,
    AdminToggleConfirmSerializer,
    AdminUpdateBasicInfoSerializer,
    AdminUpdateImageSerializer,
    AdminUpdateStatusSerializer,
    AdminUpdateStepSerializer,
    AdminUpdateUserSerializer,
    AdminUserSerializer,
)
from apps.accounts.services import admin_users as admin_users_service
from common.exceptions import NotFound

# protect_admin_targets: support can't write to admin/support/editor accounts
# (password, role, ban, sessions, delete, basic info…) — AZ-D3 / P2-35.
_PERM_VIEW = HasResourcePermission(AdminResource.USERS, "view", protect_admin_targets=True)
_PERM_EDIT = HasResourcePermission(AdminResource.USERS, "edit", protect_admin_targets=True)
_PERM_FULL = HasResourcePermission(AdminResource.USERS, "full", protect_admin_targets=True)


def _get_target(user_id: str) -> User:
    user = User.objects.filter(id=user_id).first()
    if user is None:
        raise NotFound("Ο χρήστης δεν βρέθηκε", details={"userId": user_id})
    return user


def _profile_summary(p) -> dict:
    """The profile keys the admin user-detail page reads (header links + the
    "Profile & Activity" card)."""
    return {
        "id": p.id,
        "uid": p.user_id,
        "username": p.username,
        "displayName": p.display_name,
        "image": p.image,
        "type": p.type,
        "published": p.published,
        "isActive": p.is_active,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
        "updatedAt": p.updated_at.isoformat() if p.updated_at else None,
        "_count": {
            "services": getattr(p, "_services_count", 0) or 0,
            "reviews": getattr(p, "_reviews_count", 0) or 0,
        },
    }


# ----- list / create / detail (rows 144, 145, 146) ------------------------


class AdminUserListCreateView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    @extend_schema(responses=AdminUserSerializer(many=True))
    def get(self, request):
        users, total = admin_users_selectors.list_users(
            search_value=request.query_params.get("searchValue", ""),
            search_field=request.query_params.get("searchField", "email"),
            search_operator=request.query_params.get("searchOperator", "contains"),
            type=request.query_params.get("type"),
            provider=request.query_params.get("provider"),
            step=request.query_params.get("step"),
            status=request.query_params.get("status"),
            role=request.query_params.get("role"),
            limit=int(request.query_params.get("limit", 10)),
            offset=int(request.query_params.get("offset", 0)),
            sort_by=request.query_params.get("sortBy", "createdAt"),
            sort_direction=request.query_params.get("sortDirection", "desc"),
        )
        return Response({
            "users": AdminUserSerializer(users, many=True).data,
            "total": total,
        })

    @extend_schema(request=AdminCreateUserSerializer, responses=AdminUserSerializer)
    def post(self, request):
        serializer = AdminCreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = admin_users_service.create_user(
            actor=request.user,
            email=data["email"],
            password=data["password"],
            role=data["role"],
            name=data.get("name"),
            display_name=data.get("displayName"),
            username=data.get("username") or None,
        )
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request, user_id):
        result = admin_users_selectors.get_user_with_relations(user_id)
        if result is None:
            raise NotFound("Ο χρήστης δεν βρέθηκε")
        # OLD getUser (actions/admin/users.ts:50-90) returned the Prisma user
        # row FLAT with `profile{…,_count}`, `accounts` and `sessions` included;
        # the copied page does `user = data` then `user.id.slice(...)`.
        profile = result["profile"]
        return Response({
            **AdminUserSerializer(result["user"]).data,
            "profile": _profile_summary(profile) if profile is not None else None,
            "accounts": AdminAccountSerializer(result["accounts"], many=True).data,
            "sessions": AdminSessionSerializer(result["sessions"], many=True).data,
        })

    @extend_schema(request=AdminUpdateUserSerializer)
    def patch(self, request, user_id):
        target = _get_target(user_id)
        serializer = AdminUpdateUserSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if "role" in serializer.validated_data:
            admin_users_service.set_user_role(
                actor=request.user, target_user=target, role=serializer.validated_data["role"]
            )
        return Response(AdminUserSerializer(target).data)

    def delete(self, request, user_id):
        self.permission_classes = [IsAuthenticated, _PERM_FULL]
        self.check_permissions(request)
        target = _get_target(user_id)
        admin_users_service.remove_user(target_user=target)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ----- role / ban / unban / sessions / password / impersonation -----------


class AdminUserRoleView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    @extend_schema(request=AdminSetUserRoleSerializer)
    def post(self, request, user_id):
        target = _get_target(user_id)
        serializer = AdminSetUserRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admin_users_service.set_user_role(
            actor=request.user, target_user=target, role=serializer.validated_data["role"]
        )
        return Response({"success": True})


class AdminUserBanView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    @extend_schema(request=AdminBanUserSerializer)
    def post(self, request, user_id):
        target = _get_target(user_id)
        serializer = AdminBanUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admin_users_service.ban_user(
            target_user=target,
            ban_reason=serializer.validated_data.get("banReason"),
            ban_expires_in_seconds=serializer.validated_data.get("banExpiresIn"),
        )
        return Response({"success": True})


class AdminUserUnbanView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def post(self, request, user_id):
        target = _get_target(user_id)
        admin_users_service.unban_user(target_user=target)
        return Response({"success": True})


class AdminUserSessionsView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    def get(self, request, user_id):
        sessions = admin_users_selectors.list_user_sessions(user_id)
        return Response(AdminSessionSerializer(sessions, many=True).data)


class AdminRevokeAllSessionsView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def post(self, request, user_id):
        target = _get_target(user_id)
        # OLD auth.api.revokeUserSessions killed every session immediately
        # (actions/admin/users.ts:524-551). Auth is SimpleJWT now, so the
        # legacy `Session` rows are inert: blacklist every outstanding refresh
        # token (same as the user-facing "log out everywhere",
        # views/public/account.py) so no new access token can be minted.
        from apps.accounts.services import sessions as session_service

        legacy = admin_users_service.revoke_all_user_sessions(target_user=target)
        jwt_revoked = session_service.revoke_all_for_user(target)
        return Response({"revoked": jwt_revoked + legacy, "refreshTokensRevoked": jwt_revoked})


class AdminRevokeSessionView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def delete(self, request, session_token):
        ok = admin_users_service.revoke_session(session_token=session_token)
        if not ok:
            raise NotFound("Session δεν βρέθηκε")
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminImpersonateView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    def post(self, request, user_id):
        target = _get_target(user_id)
        payload = admin_users_service.impersonate_user(actor=request.user, target_user=target)
        return Response(payload)


class AdminStopImpersonateView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    def post(self, request):
        n = admin_users_service.stop_impersonating(actor=request.user)
        return Response({"stopped": n})


class AdminUserPasswordView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=AdminSetPasswordSerializer)
    def post(self, request, user_id):
        target = _get_target(user_id)
        serializer = AdminSetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admin_users_service.set_user_password(
            target_user=target, new_password=serializer.validated_data["newPassword"]
        )
        return Response({"success": True})


# ----- granular updates ----------------------------------------------------


class AdminUserBasicInfoView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    @extend_schema(request=AdminUpdateBasicInfoSerializer)
    def patch(self, request, user_id):
        target = _get_target(user_id)
        serializer = AdminUpdateBasicInfoSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = admin_users_service.update_user_basic_info(
            target_user=target,
            name=serializer.validated_data.get("name"),
            email=serializer.validated_data.get("email"),
            username=serializer.validated_data.get("username"),
            display_name=serializer.validated_data.get("displayName"),
        )
        return Response(AdminUserSerializer(user).data)


class AdminUserStatusView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=AdminUpdateStatusSerializer)
    def patch(self, request, user_id):
        target = _get_target(user_id)
        serializer = AdminUpdateStatusSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = admin_users_service.update_user_status(
            target_user=target,
            type=data.get("type"),
            confirmed=data.get("confirmed"),
            blocked=data.get("blocked"),
            email_verified=data.get("emailVerified"),
            step=data.get("step"),
        )
        return Response(AdminUserSerializer(user).data)


class AdminUserBanStatusView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=AdminBanStatusSerializer)
    def patch(self, request, user_id):
        target = _get_target(user_id)
        serializer = AdminBanStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = admin_users_service.update_user_ban_status(
            target_user=target,
            banned=serializer.validated_data["banned"],
            ban_reason=serializer.validated_data.get("banReason"),
            ban_expires=serializer.validated_data.get("banExpires"),
        )
        return Response(AdminUserSerializer(user).data)


class AdminUserImageView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=AdminUpdateImageSerializer)
    def patch(self, request, user_id):
        target = _get_target(user_id)
        serializer = AdminUpdateImageSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = admin_users_service.update_user_image(
            target_user=target, image=serializer.validated_data.get("image")
        )
        return Response(AdminUserSerializer(user).data)


class AdminToggleBlockView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    @extend_schema(request=AdminToggleBlockSerializer)
    def post(self, request, user_id):
        target = _get_target(user_id)
        serializer = AdminToggleBlockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = admin_users_service.toggle_user_block(
            target_user=target, blocked=serializer.validated_data["blocked"]
        )
        return Response(AdminUserSerializer(user).data)


class AdminToggleConfirmView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    @extend_schema(request=AdminToggleConfirmSerializer)
    def post(self, request, user_id):
        target = _get_target(user_id)
        serializer = AdminToggleConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = admin_users_service.toggle_user_confirmation(
            target_user=target, confirmed=serializer.validated_data["confirmed"]
        )
        return Response(AdminUserSerializer(user).data)


class AdminUpdateStepView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=AdminUpdateStepSerializer)
    def patch(self, request, user_id):
        target = _get_target(user_id)
        serializer = AdminUpdateStepSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = admin_users_service.update_user_journey_step(
            target_user=target, step=serializer.validated_data["step"]
        )
        return Response(AdminUserSerializer(user).data)


# ----- stats ---------------------------------------------------------------


class AdminUserStatsView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        return Response(admin_users_selectors.get_user_stats())


# ----- account-admin (displayName + image with profile sync) --------------


class AdminAccountUpdateView(APIView):
    """PATCH /api/admin/users/{id}/account/ — display name + image with profile sync.

    Mirrors OLD `updateAccountAdmin` (admin/users.ts:1306-1405): the User row is
    updated AND the denormalised displayName/displayNameNormalized/image on the
    user's Profile row are kept in sync (pro users only — simple users have no
    Profile, so the sync is a no-op).
    """

    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def patch(self, request, user_id):
        from apps.accounts.serializers.admin_users import AdminUpdateAccountSerializer

        target = _get_target(user_id)
        serializer = AdminUpdateAccountSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        update_fields = ["updated_at"]
        # OLD: `displayName: displayName || undefined` — blank leaves it as is.
        display_name = data.get("displayName") or None
        if display_name is not None:
            target.display_name = display_name
            update_fields.append("display_name")
        # OLD: `...(processedImage !== undefined && { image })` — only touch the
        # image when the key was sent; an explicit null clears it on BOTH the
        # User and the Profile (the previous NEW code cleared only the User).
        image_provided = "image" in data
        image_url = None
        if image_provided:
            image = data["image"]
            image_url = (
                image.get("secure_url") if isinstance(image, dict) else image
            ) if image else None
            target.image = image_url
            update_fields.append("image")
        target.save(update_fields=update_fields)
        try:
            from apps.profiles.models import Profile
            from common.utils.normalize import normalize_term

            profile = Profile.objects.filter(user_id=target.id).first()
            if profile is not None:
                p_fields = []
                if display_name is not None:
                    profile.display_name = display_name
                    profile.display_name_normalized = normalize_term(display_name)
                    p_fields += ["display_name", "display_name_normalized"]
                if image_provided:
                    profile.image = image_url
                    p_fields.append("image")
                if p_fields:
                    p_fields.append("updated_at")
                    profile.save(update_fields=p_fields)
        except Exception:  # pragma: no cover - defensive
            import logging
            logging.getLogger(__name__).exception(
                "admin_account_to_profile_sync_failed", extra={"user_id": target.id}
            )
        return Response(AdminUserSerializer(target).data)
