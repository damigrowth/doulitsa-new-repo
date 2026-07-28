"""Public profile endpoints (rows 33-39, 41-43, 47-51).

Update endpoints pull `request.user` and route through services that enforce
ownership + role; read endpoints are mostly anonymous.
"""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.roles import IsProfessional
from apps.profiles.selectors import profile_reads
from apps.profiles.serializers.profile_updates import (
    LookupAfmSerializer,
    ReportProfileSerializer,
    SubmitVerificationSerializer,
    UpdateAdditionalInfoSerializer,
    UpdateBasicInfoSerializer,
    UpdateBillingSerializer,
    UpdateCoverageSerializer,
    UpdatePortfolioSerializer,
    UpdatePresentationSerializer,
)
from apps.profiles.services import afm_lookup as afm_service
from apps.profiles.services import profile_updates as updates_service
from apps.profiles.services import verification as verification_service
from common.exceptions import NotFound
from common.throttling import AfmLookupThrottle, ReportThrottle


# ----- own-profile updates (rows 33-39) -----------------------------------


class MyAdditionalInfoView(APIView):
    permission_classes = [IsAuthenticated, IsProfessional]

    @extend_schema(request=UpdateAdditionalInfoSerializer)
    def patch(self, request):
        s = UpdateAdditionalInfoSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        updates_service.update_additional_info(
            user=request.user,
            rate=d.get("rate"),
            commencement=d.get("commencement"),
            contact_methods=d.get("contactMethods"),
            payment_methods=d.get("paymentMethods"),
            settlement_methods=d.get("settlementMethods"),
            budget=d.get("budget"),
            terms=d.get("terms"),
        )
        return Response({"message": "Τα στοιχεία ενημερώθηκαν"})


class MyBasicInfoView(APIView):
    permission_classes = [IsAuthenticated, IsProfessional]

    @extend_schema(request=UpdateBasicInfoSerializer)
    def patch(self, request):
        s = UpdateBasicInfoSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        updates_service.update_basic_info(
            user=request.user,
            tagline=d.get("tagline"),
            bio=d.get("bio"),
            category=d["category"],
            subcategory=d["subcategory"],
            speciality=d.get("speciality"),
            image=d.get("image"),
            skills=d.get("skills"),
            coverage=d.get("coverage"),
        )
        return Response({"message": "Τα βασικά στοιχεία ενημερώθηκαν"})


class MyBillingView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=UpdateBillingSerializer)
    def patch(self, request):
        s = UpdateBillingSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        updates_service.update_billing(
            user=request.user,
            receipt=d["receipt"],
            invoice=d["invoice"],
            afm=d.get("afm"),
            doy=d.get("doy"),
            name=d.get("name"),
            profession=d.get("profession"),
            address=d.get("address"),
        )
        return Response({"message": "Τα στοιχεία χρέωσης ενημερώθηκαν"})


class MyCoverageView(APIView):
    permission_classes = [IsAuthenticated, IsProfessional]

    @extend_schema(request=UpdateCoverageSerializer)
    def patch(self, request):
        s = UpdateCoverageSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        updates_service.update_coverage(user=request.user, coverage=s.validated_data["coverage"])
        return Response({"message": "Η κάλυψη ενημερώθηκε"})


class MyPortfolioView(APIView):
    permission_classes = [IsAuthenticated, IsProfessional]

    @extend_schema(request=UpdatePortfolioSerializer)
    def patch(self, request):
        s = UpdatePortfolioSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        updates_service.update_portfolio(user=request.user, portfolio=s.validated_data.get("portfolio"))
        return Response({"message": "Το portfolio ενημερώθηκε"})


class MyPresentationView(APIView):
    permission_classes = [IsAuthenticated, IsProfessional]

    @extend_schema(request=UpdatePresentationSerializer)
    def patch(self, request):
        s = UpdatePresentationSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        updates_service.update_presentation(
            user=request.user,
            phone=d.get("phone"),
            website=d.get("website"),
            viber=d.get("viber"),
            whatsapp=d.get("whatsapp"),
            visibility=d.get("visibility"),
            socials=d.get("socials"),
        )
        return Response({"message": "Τα στοιχεία προβολής ενημερώθηκαν"})

    def get(self, request):
        from apps.profiles.models import Profile

        profile = Profile.objects.filter(user_id=request.user.id).first()
        if profile is None:
            raise NotFound("Το προφίλ δεν βρέθηκε")
        return Response({
            "id": profile.id,
            "phone": profile.phone,
            "website": profile.website,
            "viber": profile.viber,
            "whatsapp": profile.whatsapp,
            "visibility": profile.visibility,
            "socials": profile.socials,
        })


# ----- profile reads (rows 41, 42, 43, 47) --------------------------------


class MyProfileView(APIView):
    """GET /api/profiles/me — owner sees full payload (row 41)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = profile_reads.get_profile_by_user_id(request.user.id)
        if profile is None:
            raise NotFound("Το προφίλ δεν βρέθηκε")
        return Response(profile_reads.serialize_profile_owner(profile))


class PublicProfileByUsernameView(APIView):
    """GET /api/profiles/by-username/{username} (row 42)."""

    permission_classes = [AllowAny]

    def get(self, request, username):
        profile = profile_reads.get_public_profile_by_username(username)
        if profile is None:
            raise NotFound("Το προφίλ δεν βρέθηκε")
        return Response(profile_reads.serialize_profile_summary(profile))


class TaxonomyPathsView(APIView):
    """GET /api/profiles/taxonomy-paths?role=freelancer|company (row 47)."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(profile_reads.get_taxonomy_paths(request.query_params.get("role")))


# ----- AFM lookup (row 48) ------------------------------------------------


class LookupAfmView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AfmLookupThrottle]

    @extend_schema(request=LookupAfmSerializer)
    def post(self, request):
        s = LookupAfmSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(afm_service.lookup_afm(s.validated_data["afm"]))


# ----- Reporting (row 49) -------------------------------------------------


class ReportProfileView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ReportThrottle]

    @extend_schema(request=ReportProfileSerializer)
    def post(self, request, profile_id):
        s = ReportProfileSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        verification_service.report_profile(
            reporter=request.user,
            profile_id=profile_id,
            profile_name=s.validated_data["profileName"],
            profile_username=s.validated_data["profileUsername"],
            description=s.validated_data["description"],
        )
        return Response({"message": "Η αναφορά υποβλήθηκε"})


# ----- Verification (rows 50, 51) -----------------------------------------


class MyVerificationView(APIView):
    """POST submit (row 50). GET status (row 51)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=SubmitVerificationSerializer)
    def post(self, request):
        s = SubmitVerificationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        v = verification_service.submit_verification(
            user=request.user,
            afm=s.validated_data["afm"],
            name=s.validated_data["name"],
            address=s.validated_data["address"],
            phone=s.validated_data["phone"],
        )
        return Response({"message": "Η αίτηση επαλήθευσης υποβλήθηκε", "status": v.status})

    def get(self, request):
        return Response(verification_service.get_verification_status(request.user))
