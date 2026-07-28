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

_PERM_VIEW = HasResourcePermission(AdminResource.USERS, "view")
_PERM_EDIT = HasResourcePermission(AdminResource.USERS, "edit")
_PERM_FULL = HasResourcePermission(AdminResource.USERS, "full")


def _get_target(user_id: str) -> User:
    user = User.objects.filter(id=user_id).first()
    if user is None:
        raise NotFound("Ο χρήστης δεν βρέθηκε", details={"userId": user_id})
    return user


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
        return Response({
            "user": AdminUserSerializer(result["user"]).data,
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
        n = admin_users_service.revoke_all_user_sessions(target_user=target)
        return Response({"revoked": n})


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
        from apps.accounts.serializers.auth import UpdateAccountSerializer

        target = _get_target(user_id)
        serializer = UpdateAccountSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        target.display_name = serializer.validated_data.get("displayName", target.display_name)
        image_provided = "image" in serializer.validated_data
        if image_provided:
            image = serializer.validated_data["image"]
            target.image = (
                image.get("secure_url") if isinstance(image, dict) else image
            ) if image else None
        target.save(update_fields=["display_name", "image", "updated_at"])
        # Same best-effort sync as the public path
        # (apps/accounts/views/public/account.py).
        try:
            from apps.profiles.services.profile_updates import sync_account_to_profile
            sync_account_to_profile(
                target,
                display_name=target.display_name,
                image=target.image if image_provided else None,
            )
        except Exception:  # pragma: no cover - defensive
            import logging
            logging.getLogger(__name__).exception(
                "admin_account_to_profile_sync_failed", extra={"user_id": target.id}
            )
        return Response(AdminUserSerializer(target).data)
