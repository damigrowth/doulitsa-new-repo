"""Admin service endpoints (rows 189-204)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status as drf_status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.admin import AdminResource, HasResourcePermission
from apps.services.serializers.service import (
    CreateServiceSerializer,
    UpdateServiceMediaSerializer,
    UpdateServiceSerializer,
)
from apps.services.services import admin_services as svc
from common.exceptions import NotFound

_PERM_VIEW = HasResourcePermission(AdminResource.SERVICES, "view")
_PERM_EDIT = HasResourcePermission(AdminResource.SERVICES, "edit")
_PERM_FULL = HasResourcePermission(AdminResource.SERVICES, "full")


class AdminServiceListView(APIView):
    """GET /api/admin/services (row 189)."""

    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        return Response(svc.list_services(request.query_params.dict()))


class AdminServiceDetailView(APIView):
    """GET / DELETE (rows 190, 202)."""

    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request, service_id):
        payload = svc.get_service_detail(int(service_id))
        if payload is None:
            raise NotFound("Service not found")
        return Response(payload)

    def delete(self, request, service_id):
        self.permission_classes = [IsAuthenticated, _PERM_FULL]
        self.check_permissions(request)
        svc.delete_service(int(service_id))
        return Response(status=drf_status.HTTP_204_NO_CONTENT)


class AdminServiceUpdateView(APIView):
    """PATCH /api/admin/services/{id} (row 191) — generic update."""

    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=UpdateServiceSerializer)
    def patch(self, request, service_id):
        s = UpdateServiceSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        svc.update_service_fields(service_id=int(service_id), fields=s.validated_data)
        return Response(svc.get_service_detail(int(service_id)))


def _make_field_view(fields: list[str]):
    """Factory for the /api/admin/services/{id}/<group> sub-update views."""

    class _Subview(APIView):
        permission_classes = [IsAuthenticated, _PERM_EDIT]

        def patch(self, request, service_id):
            s = UpdateServiceSerializer(data=request.data, partial=True)
            s.is_valid(raise_exception=True)
            payload = {k: v for k, v in s.validated_data.items() if k in fields}
            svc.update_service_fields(service_id=int(service_id), fields=payload)
            return Response(svc.get_service_detail(int(service_id)))

    return _Subview


AdminServiceTaxonomyView = _make_field_view(["category", "subcategory", "subdivision", "tags"])  # 192
AdminServiceBasicView    = _make_field_view(["title", "description"])                             # 193
AdminServicePricingView  = _make_field_view(["price", "fixed", "duration", "subscriptionType"])   # 194


class AdminServiceSettingsView(APIView):                                                          # 195
    """PATCH /api/admin/services/{id}/settings — status + featured.

    `status` is NOT a field on UpdateServiceSerializer, so the generic field
    view silently dropped it and the admin "Approve" never persisted. Route
    status through `update_status` so it persists AND fires the publish
    side-effects (owner email + Brevo re-sync); validate `featured` normally.
    """

    permission_classes = [IsAuthenticated, _PERM_EDIT]

    def patch(self, request, service_id):
        sid = int(service_id)
        status_val = request.data.get("status")
        if status_val:
            svc.update_status(service_id=sid, status=status_val)
        s = UpdateServiceSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        if "featured" in s.validated_data:
            svc.update_service_fields(service_id=sid, fields={"featured": s.validated_data["featured"]})
        return Response(svc.get_service_detail(sid))


AdminServiceAddonsView   = _make_field_view(["addons"])                                            # 196
AdminServiceFaqView      = _make_field_view(["faq"])                                               # 197


class AdminServiceMediaView(APIView):
    """PATCH /api/admin/services/{id}/media (row 198)."""

    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=UpdateServiceMediaSerializer)
    def patch(self, request, service_id):
        s = UpdateServiceMediaSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        # Admin updateServiceMedia drops pending/blob resources before persist
        # (admin/services.ts:956-961).
        from common.utils.cloudinary import sanitize_resources
        media = sanitize_resources(s.validated_data["media"])
        svc.update_service_fields(service_id=int(service_id), fields={"media": media})
        return Response({"message": "Media ενημερώθηκαν"})


class AdminServiceTogglePublishedView(APIView):
    """POST /api/admin/services/{id}/published/toggle (row 199)."""

    permission_classes = [IsAuthenticated, _PERM_EDIT]

    def post(self, request, service_id):
        svc.toggle_published(int(service_id))
        return Response(svc.get_service_detail(int(service_id)))


class AdminServiceToggleFeaturedView(APIView):
    """POST /api/admin/services/{id}/featured/toggle (row 200)."""

    permission_classes = [IsAuthenticated, _PERM_EDIT]

    def post(self, request, service_id):
        svc.toggle_featured(int(service_id))
        return Response(svc.get_service_detail(int(service_id)))


class AdminServiceStatusView(APIView):
    """PATCH /api/admin/services/{id}/status (row 201)."""

    permission_classes = [IsAuthenticated, _PERM_EDIT]

    def patch(self, request, service_id):
        status = request.data.get("status")
        rejection_reason = request.data.get("rejectionReason")
        svc.update_status(service_id=int(service_id), status=status, rejection_reason=rejection_reason)
        return Response(svc.get_service_detail(int(service_id)))


class AdminServiceStatsView(APIView):
    """GET /api/admin/services/stats (row 203)."""

    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        return Response(svc.get_service_stats())


class AdminServiceCreateForProfileView(APIView):
    """POST /api/admin/services/for-profile (row 204)."""

    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=CreateServiceSerializer)
    def post(self, request):
        profile_id = request.data.get("profileId")
        if not profile_id:
            from common.exceptions import FieldErrors
            raise FieldErrors(details={"profileId": ["Required"]})
        s = CreateServiceSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        service = svc.create_for_profile(profile_id=profile_id, payload=s.validated_data)
        return Response({
            "serviceId": service.id,
            "serviceTitle": service.title,
            "serviceSlug": service.slug,
        }, status=drf_status.HTTP_201_CREATED)
