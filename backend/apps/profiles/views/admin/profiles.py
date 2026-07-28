"""Admin profile management endpoints (rows 205-222)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.admin import AdminResource, HasResourcePermission
from apps.profiles.serializers.admin_profile_serializers import (
    AdminProfileSettingsSerializer,
    AdminUpdateProfileSerializer,
)
from apps.profiles.serializers.profile_updates import (
    UpdateAdditionalInfoSerializer,
    UpdateBasicInfoSerializer,
    UpdateBillingSerializer,
    UpdateCoverageSerializer,
    UpdatePortfolioSerializer,
    UpdatePresentationSerializer,
)
from apps.profiles.services import admin_profiles as svc
from common.exceptions import NotFound

_PERM_VIEW = HasResourcePermission(AdminResource.PROFILES, "view")
_PERM_EDIT = HasResourcePermission(AdminResource.PROFILES, "edit")
_PERM_FULL = HasResourcePermission(AdminResource.PROFILES, "full")
_PERM_SERVICES_EDIT = HasResourcePermission(AdminResource.SERVICES, "edit")


class AdminProfileListView(APIView):
    """GET /api/admin/profiles (row 205)."""

    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        # The frontend dropdown sends `status=featured` or `status=top` from
        # the same control — Profile has no `status` column, just `featured`
        # and `top` booleans. Translate here.
        status_raw = request.query_params.get("status")
        featured = _bool(request.query_params.get("featured"))
        top = None
        if status_raw == "featured":
            featured = True
        elif status_raw == "top":
            top = True

        return Response(svc.list_profiles(filters={
            "searchQuery": request.query_params.get("searchQuery"),
            "type": request.query_params.get("type"),
            "category": request.query_params.get("category"),
            "subcategory": request.query_params.get("subcategory"),
            "published": _bool(request.query_params.get("published")),
            "verified": _bool(request.query_params.get("verified")),
            "featured": featured,
            "top": top,
            "limit": request.query_params.get("limit", 10),
            "offset": request.query_params.get("offset", 0),
            "sortBy": request.query_params.get("sortBy", "createdAt"),
            "sortDirection": request.query_params.get("sortDirection", "desc"),
        }))


def _bool(v):
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if v == "":
        return None
    # 'all' means "no filter" — pass None so list_profiles skips it instead of
    # coercing to False (which silently filtered to published/verified/featured
    # = False rows).
    if v.lower() == "all":
        return None
    return v.lower() in ("true", "1", "yes", "verified", "featured", "top", "published")


class AdminProfileDetailView(APIView):
    """GET / PATCH / DELETE /api/admin/profiles/{id} (rows 206, 207, 212)."""

    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request, profile_id):
        payload = svc.get_profile_detail(profile_id)
        if payload is None:
            raise NotFound("Το προφίλ δεν βρέθηκε")
        return Response(payload)

    @extend_schema(request=AdminUpdateProfileSerializer)
    def patch(self, request, profile_id):
        self.permission_classes = [IsAuthenticated, _PERM_EDIT]
        self.check_permissions(request)
        s = AdminUpdateProfileSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        svc.update_profile(profile_id, **{k: v for k, v in s.validated_data.items()})
        return Response(svc.get_profile_detail(profile_id))

    def delete(self, request, profile_id):
        self.permission_classes = [IsAuthenticated, _PERM_FULL]
        self.check_permissions(request)
        cascade = svc.delete_profile(profile_id)
        return Response({"deletedProfile": cascade["profileId"], "cascadeInfo": cascade},
                        status=status.HTTP_200_OK)


class AdminProfileTogglePublishedView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    def post(self, request, profile_id):
        svc.toggle_published(profile_id)
        return Response(svc.get_profile_detail(profile_id))


class AdminProfileToggleFeaturedView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    def post(self, request, profile_id):
        svc.toggle_featured(profile_id)
        return Response(svc.get_profile_detail(profile_id))


class AdminProfileToggleVerifiedView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    def post(self, request, profile_id):
        svc.toggle_verified(profile_id)
        return Response(svc.get_profile_detail(profile_id))


class AdminProfileSearchView(APIView):
    """GET /api/admin/profiles/search (row 213)."""

    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        results = svc.search_profiles_for_selection(request.query_params.get("searchQuery", ""))
        return Response(results)


class AdminProfileSearchForServicesView(APIView):
    """GET /api/admin/profiles/search/for-services (row 214) — gated by SERVICES.edit."""

    permission_classes = [IsAuthenticated, _PERM_SERVICES_EDIT]

    def get(self, request):
        results = svc.search_profiles_for_selection(request.query_params.get("searchQuery", ""))
        return Response(results)


class AdminProfileStatsView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        return Response(svc.get_profile_stats())


class AdminProfileBrevoStatsView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        return Response(svc.get_brevo_stats())


class AdminProfileSettingsView(APIView):
    """PATCH /api/admin/profiles/{id}/settings (row 217)."""

    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=AdminProfileSettingsSerializer)
    def patch(self, request, profile_id):
        s = AdminProfileSettingsSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        mapping = {
            "published": "published",
            "featured": "featured",
            "verified": "verified",
            "top": "top",
            "isActive": "is_active",
        }
        updates = {mapping[k]: v for k, v in s.validated_data.items() if k in mapping}
        svc.update_profile(profile_id, **updates)
        return Response(svc.get_profile_detail(profile_id))


# ----- Admin variants of own-profile updates (rows 218-222) ---------------
# These reuse the same field shapes as the public endpoints but target a
# specific profile by ID instead of the caller's profile.


def _patch_profile_fields(profile_id: str, mapping: dict[str, str], data: dict) -> None:
    """Generic helper: map serializer field → DB column."""
    update_kwargs = {}
    for field, col in mapping.items():
        if field in data:
            update_kwargs[col] = data[field]
    if update_kwargs:
        svc.update_profile(profile_id, **update_kwargs)


class AdminProfileBasicInfoView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=UpdateBasicInfoSerializer)
    def patch(self, request, profile_id):
        s = UpdateBasicInfoSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        # OLD actions/admin/profiles/basic-info.ts:120-133: persists tagline
        # (+normalized), bio (+normalized), category, subcategory, speciality,
        # skills. `image`/`coverage` are accepted by the form but NOT written —
        # the admin service mirrors that quirk.
        svc.admin_update_basic_info(
            profile_id,
            tagline=d.get("tagline"),
            bio=d.get("bio"),
            category=d.get("category"),
            subcategory=d.get("subcategory"),
            speciality=d.get("speciality"),
            skills=d.get("skills"),
        )
        return Response(svc.get_profile_detail(profile_id))


class AdminProfileAdditionalInfoView(APIView):
    """PATCH /api/admin/profiles/{id}/additional-info — was missing entirely;
    the FE used to route this through the generic PATCH (silent no-op)."""

    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=UpdateAdditionalInfoSerializer)
    def patch(self, request, profile_id):
        s = UpdateAdditionalInfoSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        svc.admin_update_additional_info(
            profile_id,
            rate=d.get("rate"),
            commencement=d.get("commencement"),
            contact_methods=d.get("contactMethods"),
            payment_methods=d.get("paymentMethods"),
            settlement_methods=d.get("settlementMethods"),
            budget=d.get("budget"),
            terms=d.get("terms"),
        )
        return Response(svc.get_profile_detail(profile_id))


class AdminProfilePresentationView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=UpdatePresentationSerializer)
    def patch(self, request, profile_id):
        s = UpdatePresentationSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        _patch_profile_fields(profile_id, {
            "phone": "phone", "website": "website", "viber": "viber",
            "whatsapp": "whatsapp", "visibility": "visibility", "socials": "socials",
        }, s.validated_data)
        return Response(svc.get_profile_detail(profile_id))


class AdminProfilePortfolioView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=UpdatePortfolioSerializer)
    def patch(self, request, profile_id):
        s = UpdatePortfolioSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        # OLD actions/admin/profiles/portfolio.ts:101-108 sanitizes each
        # Cloudinary resource before persisting (the generic PATCH bypassed it).
        svc.admin_update_portfolio(profile_id, portfolio=s.validated_data["portfolio"])
        return Response(svc.get_profile_detail(profile_id))


class AdminProfileCoverageView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=UpdateCoverageSerializer)
    def patch(self, request, profile_id):
        s = UpdateCoverageSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        # OLD actions/admin/profiles/coverage.ts:95-101 regenerates
        # coverageNormalized (the generic PATCH skipped it → stale geo-search).
        svc.admin_update_coverage(profile_id, coverage=s.validated_data["coverage"])
        return Response(svc.get_profile_detail(profile_id))


class AdminProfileBillingView(APIView):
    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=UpdateBillingSerializer)
    def patch(self, request, profile_id):
        s = UpdateBillingSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        svc.update_profile(profile_id, billing={
            "receipt": d["receipt"], "invoice": d["invoice"],
            "afm": d.get("afm"), "doy": d.get("doy"),
            "name": d.get("name"), "profession": d.get("profession"),
            "address": d.get("address"),
        })
        return Response(svc.get_profile_detail(profile_id))
