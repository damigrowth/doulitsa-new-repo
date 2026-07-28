"""Public auth endpoints: login, register, password reset/change, verification.

Tracker rows: 15 (login), 16 (register), 17 (change password), 21 (forgot
password), 22 (resend verification), 23 (reset password), 3 (verify-email
GET redirect).
"""
from __future__ import annotations

from django.conf import settings
from django.shortcuts import redirect
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers.auth import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    ResetPasswordSerializer,
    VerifyEmailQuerySerializer,
)
from apps.accounts.services import auth as auth_service
from apps.accounts.services import password as password_service
from apps.accounts.services import registration as registration_service
from common.exceptions import ApiError
from common.throttling import (
    LoginThrottle,
    PasswordResetThrottle,
    RegisterThrottle,
    VerificationResendThrottle,
)


class LoginView(APIView):
    """POST /api/auth/login (tracker row 15)."""

    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    @extend_schema(request=LoginSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = auth_service.login_by_identifier(
            serializer.validated_data["identifier"],
            serializer.validated_data["password"],
        )
        body = {
            "user": result.user,
            "redirectPath": result.redirect_path,
        }
        if result.access:
            body["access"] = result.access
            body["refresh"] = result.refresh
        return Response(body, status=status.HTTP_200_OK)


class RegisterView(APIView):
    """POST /api/auth/register (tracker row 16)."""

    permission_classes = [AllowAny]
    throttle_classes = [RegisterThrottle]

    @extend_schema(request=RegisterSerializer)
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = registration_service.register(
            email=data["email"],
            password=data["password"],
            auth_type=data["authType"],
            role=data.get("role"),
            username=data.get("username") or None,
            display_name=data.get("displayName"),
            consent=data.get("consent"),
        )
        # Send the verification email (async, best-effort). In DEBUG we also
        # return the token below so local dev can complete the flow without email.
        if result.verification_token:
            from apps.messaging.tasks import send_verification_email
            send_verification_email.delay(
                result.email,
                result.verification_token,
                data.get("displayName"),
                data.get("username") or None,
            )
        # Brevo list sync at registration (OLD register.ts:154
        # handleUserRegistration). Fire-and-forget.
        try:
            from apps.messaging.tasks import brevo_state_change
            brevo_state_change.delay(result.user_id, "registration")
        except Exception:
            pass
        body = {
            "message": "Επιτυχής εγγραφή. Έλεγξε το email σου για επαλήθευση.",
            "userId": result.user_id,
            "email": result.email,
        }
        if settings.DEBUG:
            body["devVerificationToken"] = result.verification_token
        return Response(body, status=status.HTTP_201_CREATED)


class ChangePasswordView(APIView):
    """POST /api/auth/password/change (tracker row 17)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=ChangePasswordSerializer)
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        password_service.change_password(
            request.user,
            serializer.validated_data["currentPassword"],
            serializer.validated_data["newPassword"],
        )
        return Response({"message": "Ο κωδικός άλλαξε επιτυχώς"})


class ForgotPasswordView(APIView):
    """POST /api/auth/password/forgot (tracker row 21).

    Always returns the same generic success message regardless of whether the
    email is registered (avoid leaking the user list). Throttled.
    """

    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetThrottle]

    @extend_schema(request=ForgotPasswordSerializer)
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = password_service.initiate_password_reset(serializer.validated_data["email"])
        # Send the reset email only when the account exists (result is a (user, token)
        # tuple); the response stays generic either way to avoid leaking the user list.
        if result:
            from apps.messaging.tasks import send_password_reset_email
            send_password_reset_email.delay(serializer.validated_data["email"], result[1])
        body = {
            "message": "Αν υπάρχει λογαριασμός, στάλθηκε email επαναφοράς κωδικού",
        }
        if settings.DEBUG and result:
            body["devResetToken"] = result[1]
        return Response(body)


class ResendVerificationView(APIView):
    """POST /api/auth/verification/resend (tracker row 22)."""

    permission_classes = [AllowAny]
    throttle_classes = [VerificationResendThrottle]

    @extend_schema(request=ResendVerificationSerializer)
    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user, token = registration_service.resend_verification_email(
                serializer.validated_data["email"]
            )
        except ApiError as exc:
            # 'ok_silent' / 'already_verified' propagate as their own HTTP shape
            if exc.default_code == "ok_silent":
                return Response({"message": str(exc.detail)})
            raise
        # Actually send the email — resend_verification_email only mints the
        # token (its docstring says "Caller emails it via Brevo"). Without this
        # the endpoint claimed "email sent" but never sent anything.
        from apps.messaging.tasks import send_verification_email
        send_verification_email.delay(
            user.email, token, getattr(user, "display_name", None), user.username or None,
        )
        body = {"message": "Στάλθηκε email επαλήθευσης"}
        if settings.DEBUG:
            body["devVerificationToken"] = token
        return Response(body)


class ResetPasswordView(APIView):
    """POST /api/auth/password/reset (tracker row 23)."""

    permission_classes = [AllowAny]

    @extend_schema(request=ResetPasswordSerializer)
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        password_service.reset_password(
            serializer.validated_data["token"],
            serializer.validated_data["newPassword"],
        )
        return Response({"message": "Ο κωδικός επαναφέρθηκε"})


class VerifyEmailRedirectView(APIView):
    """GET /api/auth/verify-email?token=... (tracker rows 3, 22→consume).

    Browser-driven: consumes the token and 302-redirects to the frontend.
    Failure also redirects (with `?verified=false&reason=...`).
    """

    permission_classes = [AllowAny]

    @extend_schema(parameters=[VerifyEmailQuerySerializer])
    def get(self, request):
        token = request.query_params.get("token", "")
        try:
            user = registration_service.verify_email_token(token)
        except ApiError as exc:
            return redirect(
                f"{settings.FRONTEND_BASE_URL}/register/success?verified=false"
                f"&reason={exc.default_code}"
            )
        target = registration_service.determine_post_verification_redirect(user)
        return redirect(f"{settings.FRONTEND_BASE_URL}{target}")
