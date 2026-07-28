"""Saved-items endpoints (rows 90-92)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.saved.selectors.saved_reads import get_saved_items_page
from apps.saved.serializers.saved import SavedListQuerySerializer, ToggleSaveSerializer
from apps.saved.services.toggle import get_saved_state, toggle


class SavedToggleView(APIView):
    """POST /api/saved/toggle (row 90)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=ToggleSaveSerializer)
    def post(self, request):
        s = ToggleSaveSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        is_saved = toggle(
            request.user,
            item_type=s.validated_data["itemType"],
            item_id=s.validated_data["itemId"],
        )
        return Response({"isSaved": is_saved})


class SavedListView(APIView):
    """GET /api/saved (row 91)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        s = SavedListQuerySerializer(data=request.query_params)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        return Response(get_saved_items_page(
            request.user,
            services_page=d["servicesPage"],
            services_limit=d["servicesLimit"],
            profiles_page=d["profilesPage"],
            profiles_limit=d["profilesLimit"],
        ))


class SavedStateView(APIView):
    """GET /api/saved/state (row 92) — optional auth; returns empty for anon."""

    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"serviceIds": [], "profileIds": []})
        return Response(get_saved_state(request.user))
