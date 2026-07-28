"""Admin verification management (rows 184-188)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.admin import AdminResource, HasResourcePermission
from apps.profiles.serializers.admin_profile_serializers import AdminVerificationStatusSerializer
from apps.profiles.services import admin_profiles as svc
from common.exceptions import NotFound

_PERM_VIEW = HasResourcePermission(AdminResource.VERIFICATIONS, "view")
_PERM_EDIT = HasResourcePermission(AdminResource.VERIFICATIONS, "edit")
_PERM_FULL = HasResourcePermission(AdminResource.VERIFICATIONS, "full")


class AdminVerificationListView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        return Response(svc.list_verifications(filters={
            "searchQuery": request.query_params.get("searchQuery"),
            "status": request.query_params.get("status"),
            "limit": request.query_params.get("limit", 10),
            "offset": request.query_params.get("offset", 0),
            "sortBy": request.query_params.get("sortBy", "createdAt"),
            "sortDirection": request.query_params.get("sortDirection", "desc"),
        }))


class AdminVerificationDetailView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request, verification_id):
        payload = svc.get_verification_detail(verification_id)
        if payload is None:
            raise NotFound("Verification δεν βρέθηκε")
        return Response(payload)

    def delete(self, request, verification_id):
        self.permission_classes = [IsAuthenticated, _PERM_FULL]
        self.check_permissions(request)
        svc.delete_verification(verification_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminVerificationStatusView(APIView):
    """PATCH /api/admin/verifications/{id}/status (row 186)."""

    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=AdminVerificationStatusSerializer)
    def patch(self, request, verification_id):
        s = AdminVerificationStatusSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        v = svc.update_verification_status(
            verification_id,
            status=s.validated_data["status"],
            notes=s.validated_data.get("notes"),
        )
        return Response(svc._verification_row(v))


class AdminProfileVerificationStatusView(APIView):
    """PATCH /api/admin/profiles/{profile_id}/verification-status (row 211).

    OLD `updateVerificationStatus` (actions/admin/profiles.ts:517) is gated by
    PROFILES.edit and upserts the verification by profile id. The previous alias
    pointed at AdminVerificationStatusView, whose handler signature expected
    `verification_id` — so Django passed `profile_id` and the view 500'd.
    """

    permission_classes = [IsAuthenticated, HasResourcePermission(AdminResource.PROFILES, "edit")]

    @extend_schema(request=AdminVerificationStatusSerializer)
    def patch(self, request, profile_id):
        s = AdminVerificationStatusSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        v = svc.update_verification_status_for_profile(
            profile_id,
            status=s.validated_data["status"],
            notes=s.validated_data.get("notes"),
        )
        return Response(svc._verification_row(v))


class AdminVerificationStatsView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        return Response(svc.get_verification_stats())
