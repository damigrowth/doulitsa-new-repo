"""Cloudinary signing endpoints (rows 4 + 127)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.roles import IsAdmin
from apps.media.serializers.sign import SignCloudinaryParamsSerializer
from apps.media.services.cloudinary_signing import (
    generate_media_library_token,
    sign_params,
)


class SignCloudinaryParamsView(APIView):
    """POST /api/sign-cloudinary-params (row 4) — any authenticated user."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=SignCloudinaryParamsSerializer)
    def post(self, request):
        serializer = SignCloudinaryParamsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(sign_params(serializer.validated_data["paramsToSign"]))


class MediaLibraryTokenView(APIView):
    """POST /api/admin/media/cloudinary/media-library-token (row 127) — admin only."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        return Response(generate_media_library_token())
