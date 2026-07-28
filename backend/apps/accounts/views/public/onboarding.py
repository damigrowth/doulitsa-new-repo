"""Pro onboarding completion endpoint (row 19).

Mirrors `actions/auth/complete-onboarding.ts`. Saves the onboarding-form
fields onto the user's Profile and advances the journey:
    step: ONBOARDING → DASHBOARD
"""
from __future__ import annotations

import logging

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models.user import JourneyStep
from apps.accounts.permissions.roles import IsProfessional
from common.exceptions import ApiError

logger = logging.getLogger(__name__)


class CompleteOnboardingSerializer(serializers.Serializer):
    image = serializers.JSONField(required=False, allow_null=True)
    bio = serializers.CharField(min_length=20, max_length=20000)
    category = serializers.CharField(max_length=64)
    subcategory = serializers.CharField(max_length=64)
    coverage = serializers.JSONField()
    portfolio = serializers.ListField(child=serializers.JSONField(), required=False, allow_empty=True)


class CompleteOnboardingView(APIView):
    """POST /api/auth/onboarding/complete (row 19).

    Validates required pro fields, writes them to Profile via the profile-
    updates service, then advances user.step to DASHBOARD.
    """

    permission_classes = [IsAuthenticated, IsProfessional]

    @extend_schema(request=CompleteOnboardingSerializer)
    def post(self, request):
        s = CompleteOnboardingSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data

        # OLD complete-onboarding.ts:36-41: only accounts mid-onboarding may
        # complete it.
        if request.user.step != JourneyStep.ONBOARDING:
            raise ApiError(
                "Ο λογαριασμός δεν είναι στη φάση ολοκλήρωσης εγγραφής",
                code="not_in_onboarding",
                status_code=409,
            )

        # OLD complete-onboarding.ts:99-121: profile image is required for pro
        # accounts, must not be a client-side blob: URL, and must be https.
        image = data.get("image")
        image_url = (
            (image.get("secure_url") or image.get("url"))
            if isinstance(image, dict) else image
        )
        if not image_url:
            raise ApiError(
                "Η εικόνα προφίλ είναι υποχρεωτική για επαγγελματικό προφίλ",
                code="image_required",
                status_code=400,
            )
        if isinstance(image_url, str) and image_url.startswith("blob:"):
            raise ApiError(
                "Η εικόνα δεν έχει ανέβει. Παρακαλώ περιμένετε να ολοκληρωθεί "
                "το ανέβασμα και δοκιμάστε ξανά.",
                code="image_not_uploaded",
                status_code=400,
            )
        if not (isinstance(image_url, str) and image_url.startswith("https://")):
            raise ApiError(
                "Μη έγκυρη διεύθυνση εικόνας προφίλ",
                code="invalid_image_url",
                status_code=400,
            )

        try:
            from apps.profiles.services.profile_updates import (
                ensure_profile_exists,
                update_basic_info,
                update_coverage,
                update_portfolio,
            )
        except ImportError as exc:
            raise ApiError("Profiles app required", code="dependency", status_code=500) from exc

        # Ensure Profile exists (idempotent — handles OAuth users who skipped it)
        ensure_profile_exists(request.user)

        # Write basic-info + portfolio in one go
        update_basic_info(
            user=request.user,
            tagline=None,
            bio=data["bio"],
            category=data["category"],
            subcategory=data["subcategory"],
            speciality=None,
            image=data.get("image"),
            skills=None,
            coverage=data["coverage"],
        )
        # update_basic_info intentionally ignores `coverage` (coverage has its
        # own writer), so persist it explicitly here — otherwise onboarding
        # silently drops the service areas the user filled in.
        if data.get("coverage"):
            update_coverage(user=request.user, coverage=data["coverage"])
        if data.get("portfolio"):
            update_portfolio(user=request.user, portfolio=data["portfolio"])

        # Publish/activate the profile — OLD complete-onboarding set
        # published/isActive/visibility on completion (complete-onboarding.ts:138-161).
        # Without this the new pro stays published=False, isActive=False and is
        # invisible in every directory/search/profile query.
        role = request.user.role
        profile = ensure_profile_exists(request.user)
        profile.published = role in ("freelancer", "company")
        profile.is_active = True
        if role in ("freelancer", "company") and not profile.type:
            profile.type = role
        if not profile.visibility:
            profile.visibility = {"email": False, "phone": True, "address": True}
        profile.save(update_fields=["published", "is_active", "type", "visibility", "updated_at"])

        # Advance journey step
        request.user.step = JourneyStep.DASHBOARD
        request.user.save(update_fields=["step", "updated_at"])

        # OLD timing: the welcome email goes out at email verification, NOT
        # here (config.ts:427). Onboarding completion instead notifies the
        # admin of the new pro profile (complete-onboarding.ts:197-212) and
        # syncs the Brevo list (complete-onboarding.ts:219). Fire-and-forget.
        try:
            from apps.messaging.tasks import brevo_state_change, send_new_profile_email
            send_new_profile_email.delay(
                str(profile.id),
                request.user.display_name or request.user.username or "Unknown",
                request.user.username or "",
                request.user.email or "",
                request.user.type,
            )
            brevo_state_change.delay(request.user.id, "onboarding_complete")
        except Exception:
            logger.exception(
                "onboarding completion notifications failed",
                extra={"user_id": request.user.id},
            )
        logger.info("onboarding.completed", extra={"user_id": request.user.id})

        return Response({"message": "Καλώς ήρθες στο dashboard"})
