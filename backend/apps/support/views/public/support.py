"""Support endpoints (rows 128 contact form, 129 feedback)."""
from __future__ import annotations

import logging

import requests
from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.support.models import Contact
from common.throttling import ContactFormThrottle

logger = logging.getLogger(__name__)


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=255)
    email = serializers.EmailField()
    message = serializers.CharField(min_length=10, max_length=20000)
    subject = serializers.CharField(required=False, allow_blank=True, max_length=512)
    captchaToken = serializers.CharField(required=False, allow_blank=True, max_length=2048)


class FeedbackSerializer(serializers.Serializer):
    # The dashboard dialog (support-feedback-dialog.tsx) emits problem|option|feature
    # (OLD validations/support.ts enum); bug/question/other kept for API compatibility.
    issueType = serializers.ChoiceField(
        choices=("problem", "option", "feature", "bug", "question", "other"),
    )
    description = serializers.CharField(min_length=10, max_length=20000)
    pageUrl = serializers.URLField(required=False, allow_blank=True)


def _verify_recaptcha(token: str) -> bool:
    """Best-effort reCAPTCHA verify. Skips when secret is missing (dev)."""
    if not settings.RECAPTCHA_SECRET_KEY or not token:
        return True
    try:
        resp = requests.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data={"secret": settings.RECAPTCHA_SECRET_KEY, "response": token},
            timeout=5,
        )
        return bool(resp.json().get("success"))
    except Exception:
        logger.warning("recaptcha.unreachable")
        return False


class ContactView(APIView):
    """POST /api/support/contact (row 128)."""

    permission_classes = [AllowAny]
    throttle_classes = [ContactFormThrottle]

    @extend_schema(request=ContactSerializer)
    def post(self, request):
        s = ContactSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        token = s.validated_data.get("captchaToken", "")
        if settings.RECAPTCHA_SECRET_KEY and not _verify_recaptcha(token):
            return Response({"error": {"code": "captcha_failed", "message": "Captcha verification failed"}}, status=400)

        Contact.objects.create(
            name=s.validated_data["name"],
            email=s.validated_data["email"],
            message=s.validated_data["message"],
            subject=s.validated_data.get("subject") or None,
        )
        from apps.messaging.tasks import send_contact_admin_email, send_contact_user_email
        send_contact_admin_email.delay(
            s.validated_data["name"], s.validated_data["email"],
            s.validated_data.get("subject") or "Επικοινωνία", s.validated_data["message"],
        )
        send_contact_user_email.delay(s.validated_data["email"], s.validated_data["name"])
        return Response({"message": "Το μήνυμά σας εστάλη"})


class FeedbackView(APIView):
    """POST /api/support/feedback (row 129)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=FeedbackSerializer)
    def post(self, request):
        s = FeedbackSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        # Persist as a Contact row (kind=feedback) so admins see it on the same dashboard
        Contact.objects.create(
            name=request.user.display_name or request.user.email,
            email=request.user.email,
            message=f"[{s.validated_data['issueType']}] {s.validated_data['description']}\n\n"
                    f"page: {s.validated_data.get('pageUrl', '')}",
            subject=f"Feedback: {s.validated_data['issueType']}",
        )
        from apps.messaging.tasks import send_contact_admin_email
        send_contact_admin_email.delay(
            request.user.display_name or request.user.email,
            request.user.email,
            f"Feedback: {s.validated_data['issueType']}",
            f"{s.validated_data['description']}\n\npage: {s.validated_data.get('pageUrl', '')}",
        )
        return Response({"message": "Ευχαριστούμε για την αναφορά"})
