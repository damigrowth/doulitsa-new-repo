"""Profile aggregation endpoints (rows 40, 43, 44, 45, 46)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.profiles.selectors import profile_aggregations as aggs
from apps.profiles.serializers.profile_filters import (
    ArchiveRequestSerializer,
    ProfileFiltersSerializer,
)
from common.exceptions import NotFound


class ProfilesDirectoryView(APIView):
    """GET /api/profiles/directory (row 40)."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(aggs.directory_data(
            limit=int(request.query_params.get("limit", 15)),
            category_slug=request.query_params.get("categorySlug"),
            subcategory_slug=request.query_params.get("subcategorySlug"),
        ))


class ProfilesSearchView(APIView):
    """POST /api/profiles/search (row 44) — complex filter payload."""

    permission_classes = [AllowAny]

    @extend_schema(request=ProfileFiltersSerializer)
    def post(self, request):
        s = ProfileFiltersSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(aggs.list_profiles_by_filters(s.validated_data))


class ProfilesCountView(APIView):
    """POST /api/profiles/count (row 45)."""

    permission_classes = [AllowAny]

    @extend_schema(request=ProfileFiltersSerializer)
    def post(self, request):
        s = ProfileFiltersSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(aggs.count_profiles_by_filters(s.validated_data))


class ProfilesArchiveView(APIView):
    """POST /api/profiles/archive (row 46)."""

    permission_classes = [AllowAny]

    @extend_schema(request=ArchiveRequestSerializer)
    def post(self, request):
        s = ArchiveRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        return Response(aggs.archive_data(
            archive_type=d["archiveType"],
            category_slug=d.get("categorySlug"),
            subcategory_slug=d.get("subcategorySlug"),
            limit=d["limit"],
            search_params=d.get("searchParams") or {},
        ))


class ProfilePageView(APIView):
    """GET /api/profiles/page/{username} (row 43)."""

    permission_classes = [AllowAny]

    def get(self, request, username):
        payload = aggs.profile_page_bundle(username)
        if payload is None:
            raise NotFound("Το προφίλ δεν βρέθηκε")
        return Response(payload)
