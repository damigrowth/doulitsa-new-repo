"""Admin API key endpoints (rows 132-138)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.admin import AdminResource, HasResourcePermission
from apps.accounts.permissions.roles import IsAdminLike
from apps.admin_api.services import api_keys as svc

_VIEW = HasResourcePermission(AdminResource.SETTINGS, "view")
_EDIT = HasResourcePermission(AdminResource.SETTINGS, "edit")


# ----- Serializers --------------------------------------------------------


class ValidateKeySerializer(serializers.Serializer):
    apiKey = serializers.CharField(max_length=512)


class CreateKeySerializer(serializers.Serializer):
    # OLD createAdminApiKeySchema (lib/validations/admin.ts:202-211): name min 3,
    # expiresIn DAYS min 1 / max 365 (default applied in the service).
    name = serializers.CharField(min_length=3, max_length=255)
    expiresIn = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=365)
    metadata = serializers.JSONField(required=False, allow_null=True)


class UpdateKeySerializer(serializers.Serializer):
    name = serializers.CharField(required=False, max_length=255)
    enabled = serializers.BooleanField(required=False)


# ----- Views -------------------------------------------------------------


class ValidateApiKeyView(APIView):
    """POST /api/admin/api-keys/validate (row 132) — accepts an unauthenticated
    caller because the very purpose is to check whether a key is valid."""

    permission_classes = [AllowAny]

    @extend_schema(request=ValidateKeySerializer)
    def post(self, request):
        s = ValidateKeySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(svc.validate_static_or_db_key(s.validated_data["apiKey"]))


class CreateOrListKeysView(APIView):
    """POST /api/admin/api-keys (row 133) + GET (row 134)."""

    permission_classes = [IsAuthenticated, _VIEW]

    def get(self, request):
        return Response(svc.list_api_keys())

    @extend_schema(request=CreateKeySerializer)
    def post(self, request):
        self.permission_classes = [IsAuthenticated, _EDIT]
        self.check_permissions(request)
        s = CreateKeySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(svc.create_api_key(
            actor=request.user,
            name=s.validated_data["name"],
            expires_in=s.validated_data.get("expiresIn"),
            metadata=s.validated_data.get("metadata"),
        ), status=status.HTTP_201_CREATED)


class ApiKeyDetailView(APIView):
    """PATCH (row 135) + DELETE (row 136)."""

    permission_classes = [IsAuthenticated, _EDIT]

    @extend_schema(request=UpdateKeySerializer)
    def patch(self, request, key_id):
        s = UpdateKeySerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(svc.update_api_key(
            key_id,
            name=s.validated_data.get("name"),
            enabled=s.validated_data.get("enabled"),
        ))

    def delete(self, request, key_id):
        self.permission_classes = [IsAuthenticated, _VIEW]
        self.check_permissions(request)
        svc.delete_api_key(key_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyAdminAccessView(APIView):
    """GET /api/admin/api-keys/me/access (row 137)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.accounts.permissions.admin import has_resource_permission
        has_access = has_resource_permission(request.user.role, AdminResource.SETTINGS, "view")
        return Response({
            "hasAccess": has_access,
            "user": {
                "id": request.user.id,
                "email": request.user.email,
                "role": request.user.role,
            } if has_access else None,
        })


class AdminNavigationView(APIView):
    """GET /api/admin/navigation (row 138)."""

    permission_classes = [IsAuthenticated, IsAdminLike]

    def get(self, request):
        return Response({"items": svc.get_navigation_for_user(request.user)})
