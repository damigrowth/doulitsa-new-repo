"""Public service endpoints (rows 52-74)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.roles import IsProfessional
from apps.services.selectors import service_reads
from apps.services.serializers.service import (
    CreateServiceSerializer,
    DraftServiceSerializer,
    ReportServiceSerializer,
    ServiceArchiveRequestSerializer,
    ServiceFiltersSerializer,
    UpdateServiceMediaSerializer,
    UpdateServiceSerializer,
)
from apps.services.services import service_writes
from common.exceptions import NotFound
from common.throttling import ReportThrottle, ServiceDraftThrottle


# ----- CRUD ---------------------------------------------------------------


class CreateServiceView(APIView):
    """POST /api/services (row 52)."""

    permission_classes = [IsAuthenticated, IsProfessional]

    @extend_schema(request=CreateServiceSerializer)
    def post(self, request):
        s = CreateServiceSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        service = service_writes.create_service(user=request.user, payload=s.validated_data)
        return Response({
            "serviceId": service.id,
            "serviceTitle": service.title,
        }, status=status.HTTP_201_CREATED)


class CreateServiceDraftView(APIView):
    """POST /api/services/draft (row 53)."""

    permission_classes = [IsAuthenticated, IsProfessional]
    throttle_classes = [ServiceDraftThrottle]

    @extend_schema(request=DraftServiceSerializer)
    def post(self, request):
        s = DraftServiceSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        service = service_writes.save_service_as_draft(user=request.user, payload=s.validated_data)
        return Response({"message": "Draft αποθηκεύτηκε", "serviceId": service.id})


class ServiceDetailView(APIView):
    """DELETE /api/services/{id} (row 54), PATCH /api/services/{id} (row 73)."""

    permission_classes = [IsAuthenticated, IsProfessional]

    def delete(self, request, service_id):
        service_writes.delete_service(user=request.user, service_id=service_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(request=UpdateServiceSerializer)
    def patch(self, request, service_id):
        s = UpdateServiceSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        service_writes.update_service_info(
            user=request.user, service_id=service_id, payload=s.validated_data
        )
        return Response({"message": "Η υπηρεσία ενημερώθηκε"})


class ArchiveServiceView(APIView):
    """POST /api/services/{id}/archive (row 55)."""

    permission_classes = [IsAuthenticated, IsProfessional]

    def post(self, request, service_id):
        service_writes.archive_service(user=request.user, service_id=service_id)
        return Response({"message": "Η υπηρεσία αρχειοθετήθηκε"})


class UpdateServiceMediaView(APIView):
    """PATCH /api/services/{id}/media (row 72)."""

    permission_classes = [IsAuthenticated, IsProfessional]

    @extend_schema(request=UpdateServiceMediaSerializer)
    def patch(self, request, service_id):
        s = UpdateServiceMediaSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        service_writes.update_service_media(
            user=request.user, service_id=service_id, media=s.validated_data["media"]
        )
        return Response({"message": "Τα media ενημερώθηκαν"})


class RefreshServiceView(APIView):
    """POST /api/services/{id}/refresh (row 70)."""

    permission_classes = [IsAuthenticated, IsProfessional]

    def post(self, request, service_id):
        return Response(service_writes.refresh_service(user=request.user, service_id=service_id))


class ReportServiceView(APIView):
    """POST /api/services/{id}/report (row 71)."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ReportThrottle]

    @extend_schema(request=ReportServiceSerializer)
    def post(self, request, service_id):
        s = ReportServiceSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data
        # Notify admin (OLD report-service.ts:78 sendServiceReportEmail). Reuse
        # the existing generic admin-email task; best-effort, never blocks the
        # response.
        try:
            from apps.messaging.tasks import send_contact_admin_email
            reporter = request.user
            name = getattr(reporter, "display_name", None) or getattr(reporter, "username", None) or "Unknown User"
            subject = f"Αναφορά υπηρεσίας: {data['serviceTitle']}"
            message = (
                f"Service ID: {service_id}\n"
                f"Slug: {data['serviceSlug']}\n\n"
                f"{data['description']}"
            )
            send_contact_admin_email.delay(name, getattr(reporter, "email", ""), subject, message)
        except Exception:  # pragma: no cover - email is best-effort
            pass
        return Response({"message": "Η αναφορά υποβλήθηκε"})


# ----- reads (rows 56-67, 74) ---------------------------------------------


class ServiceCategoriesView(APIView):
    """GET /api/services/categories (row 56)."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(service_reads.get_categories_page(
            category_slug=request.query_params.get("categorySlug"),
            subcategory_slug=request.query_params.get("subcategorySlug"),
            limit=int(request.query_params.get("limit", 15)),
        ))


class NavigationMenuView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(service_reads.get_navigation_menu_data())


class RecentServicesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(service_reads.get_recent_services_for_user(request.user))


class ServiceBySlugView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        service = service_reads.get_by_slug(slug)
        if service is None:
            raise NotFound("Service not found")
        from apps.services.selectors.service_reads import _card
        return Response(_card(service))


class ServicePageView(APIView):
    """GET /api/services/{id}/page (row 60)."""

    permission_classes = [AllowAny]

    def get(self, request, service_id):
        bundle = service_reads.get_service_page_bundle(int(service_id))
        if bundle is None:
            raise NotFound("Service not found")
        return Response(bundle)


class ServiceForEditView(APIView):
    permission_classes = [IsAuthenticated, IsProfessional]

    def get(self, request, service_id):
        service = service_reads.get_for_edit(request.user, int(service_id))
        if service is None:
            raise NotFound("Service not found or not owned")
        # Return the RAW row (category = stored id, not the Greek label) so the
        # edit form posts the id back unchanged. Using `_card` here would leak the
        # label into `services.category` on save (OLD `getServiceForEdit` returns
        # the raw row).
        from apps.services.selectors.service_reads import _edit_card
        return Response({"service": _edit_card(service)})


class FeaturedServicesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(service_reads.get_featured_services())


class ServicesListView(APIView):
    """GET /api/services (row 63)."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(service_reads.get_services_paginated(
            page=int(request.query_params.get("page", 1)),
            # OLD `getServicesWithPagination` default limit is 4 (get-services.ts:301).
            limit=int(request.query_params.get("limit", 4)),
            category=request.query_params.get("category"),
            exclude_featured=request.query_params.get("excludeFeatured") in ("true", "1"),
        ))


class ServicesSearchView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=ServiceFiltersSerializer)
    def post(self, request):
        s = ServiceFiltersSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(service_reads.search_services(s.validated_data))


class ServicesCountView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=ServiceFiltersSerializer)
    def post(self, request):
        s = ServiceFiltersSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(service_reads.count_services(s.validated_data))


class ServicesTaxonomyPathsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(service_reads.get_taxonomy_paths())


class ServicesArchiveView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=ServiceArchiveRequestSerializer)
    def post(self, request):
        s = ServiceArchiveRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        return Response(service_reads.get_archive_bundle(
            category_slug=d.get("categorySlug"),
            subcategory_slug=d.get("subcategorySlug"),
            subdivision_slug=d.get("subdivisionSlug"),
            limit=d["limit"],
            search_params=d.get("searchParams") or {},
        ))


class MyServicesView(APIView):
    """GET /api/services/me (row 68)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(service_reads.get_user_services_dashboard(
            request.user, query=request.query_params.dict()
        ))


class MyServiceStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(service_reads.get_user_services_stats(request.user))


class ServiceSearchSuggestionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(service_reads.search_suggestions(request.query_params.get("q", "")))
