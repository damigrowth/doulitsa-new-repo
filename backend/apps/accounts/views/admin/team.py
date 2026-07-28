"""Admin team-management endpoints (tracker rows 167-170)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions.admin import AdminResource, HasResourcePermission
from apps.accounts.selectors import admin_users as admin_users_selectors
from apps.accounts.serializers.admin_users import AdminAssignRoleSerializer, AdminTeamMemberSerializer
from apps.accounts.services import admin_users as admin_users_service
from common.exceptions import NotFound

_TEAM_VIEW = HasResourcePermission(AdminResource.TEAM, "view")
_TEAM_EDIT = HasResourcePermission(AdminResource.TEAM, "edit")


class AdminTeamListView(APIView):
    """GET /api/admin/team/ — admin/support/editor users (row 167)."""

    permission_classes = [IsAuthenticated, _TEAM_VIEW]

    def get(self, request):
        members = admin_users_selectors.list_team_members()
        return Response(AdminTeamMemberSerializer(members, many=True).data)


class AdminTeamRoleView(APIView):
    """POST = assign role (row 168), DELETE = remove admin role (row 169)."""

    permission_classes = [IsAuthenticated, _TEAM_EDIT]

    @extend_schema(request=AdminAssignRoleSerializer)
    def post(self, request, user_id):
        target = User.objects.filter(id=user_id).first()
        if target is None:
            raise NotFound("Ο χρήστης δεν βρέθηκε")
        serializer = AdminAssignRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admin_users_service.assign_admin_role(
            actor=request.user, target_user=target, role=serializer.validated_data["role"]
        )
        return Response({"success": True})

    def delete(self, request, user_id):
        target = User.objects.filter(id=user_id).first()
        if target is None:
            raise NotFound("Ο χρήστης δεν βρέθηκε")
        admin_users_service.remove_admin_role(actor=request.user, target_user=target)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminTeamSearchView(APIView):
    """GET /api/admin/team/search?search=&limit= (row 170)."""

    permission_classes = [IsAuthenticated, _TEAM_VIEW]

    def get(self, request):
        results = admin_users_selectors.search_users_for_role_assignment(
            request.query_params.get("search", ""),
            limit=int(request.query_params.get("limit", 10)),
        )
        return Response(AdminTeamMemberSerializer(results, many=True).data)
