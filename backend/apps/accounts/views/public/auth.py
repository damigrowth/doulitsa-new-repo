"""Public auth endpoints: login, register, password reset/change, verification.

Tracker rows: 15 (login), 16 (register), 17 (change password), 21 (forgot
password), 22 (resend verification), 23 (reset password), 3 (verify-email
GET redirect).
"""
from __future__ import annotations

import logging
import math
import time
from urllib.parse import quote

from django.conf import settings
from django.core.cache import cache
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
from common.exceptions import RateLimited
from common.throttling import (
    LoginThrottle,
    PasswordResetThrottle,
    RegisterThrottle,
    VerificationResendThrottle,
)

logger = logging.getLogger(__name__)


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
            logger.exception("register.brevo_enqueue_failed", extra={"user_id": result.user_id})
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
    email is registered (avoid leaking the user list). Limited to 1 request /
    10 min per email (OLD parity) on top of the global anon/user throttles.
    """

    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetThrottle]

    @extend_schema(request=ForgotPasswordSerializer)
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        _enforce_forgot_password_limit(serializer.validated_data["email"])
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


# OLD forgot-password.ts:9-40: 1 request per 10 minutes PER EMAIL (checked
# before the account lookup, so unknown emails are limited too).
FORGOT_PASSWORD_LIMIT_SECONDS = 10 * 60


def _enforce_forgot_password_limit(email: str) -> None:
    key = f"ratelimit:forgot:{email.strip().lower()}"
    now = time.time()
    try:
        if cache.add(key, now + FORGOT_PASSWORD_LIMIT_SECONDS, FORGOT_PASSWORD_LIMIT_SECONDS):
            return
        reset_at = cache.get(key) or now + FORGOT_PASSWORD_LIMIT_SECONDS
    except Exception:  # cache down: fail open, like OLD's per-instance limiter
        logger.exception("forgot_password_limit.cache_failed")
        return
    minutes = max(1, math.ceil((float(reset_at) - now) / 60))
    raise RateLimited(
        "Μπορείς να ζητήσεις επαναφορά κωδικού 1 φορά κάθε 10 λεπτά. "
        f"Δοκίμασε ξανά σε {minutes} {'λεπτό' if minutes == 1 else 'λεπτά'}.",
        details={"retryAfterMinutes": minutes},
    )


class ResendVerificationView(APIView):
    """POST /api/auth/verification/resend (tracker row 22).

    OLD parity (A-D15): always the same success copy, whether the email is
    unknown, already verified or pending — no 409, no error envelope.
    """

    permission_classes = [AllowAny]
    throttle_classes = [VerificationResendThrottle]

    @extend_schema(request=ResendVerificationSerializer)
    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = registration_service.resend_verification_email(
            serializer.validated_data["email"]
        )
        body = {"message": registration_service.RESEND_SUCCESS_MESSAGE}
        if result is not None:
            user, token = result
            # Actually send the email — resend_verification_email only mints the
            # token (its docstring says "Caller emails it via Brevo").
            from apps.messaging.tasks import send_verification_email
            send_verification_email.delay(
                user.email, token, getattr(user, "display_name", None), user.username or None,
            )
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

    Browser-driven (proxied by the Next route `/api/verify-email`, which
    forwards our Set-Cookie headers). OLD parity (P1-5 / A-D1):
      - success → the user is signed in (better-auth autoSignInAfterVerification):
        we set the `dj_access` / `dj_refresh` cookies on the redirect;
      - failure → `/register/failure?email=<token email>` (the resend form).
    """

    permission_classes = [AllowAny]

    @extend_schema(parameters=[VerifyEmailQuerySerializer])
    def get(self, request):
        token = request.query_params.get("token", "")
        try:
            user = registration_service.verify_email_token(token)
        except registration_service.VerificationFailed as exc:
            target = f"{settings.FRONTEND_BASE_URL}/register/failure"
            if exc.email:
                target += f"?email={quote(exc.email)}"
            return redirect(target)
        target = registration_service.determine_post_verification_redirect(user)
        response = redirect(f"{settings.FRONTEND_BASE_URL}{target}")
        # A blocked / banned user is verified but gets no session.
        if user.is_active:
            set_auth_cookies(response, auth_service.issue_tokens(user))
        return response


# Must match frontend/src/lib/auth/cookies.ts (names, flags and lifetimes).
_ACCESS_COOKIE = "dj_access"
_REFRESH_COOKIE = "dj_refresh"
_REFRESH_COOKIE_MAX_AGE = 3 * 24 * 60 * 60  # REFRESH_MAX_AGE (3 days)


def set_auth_cookies(response, tokens: dict[str, str]) -> None:
    access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_max_age = min(
        _REFRESH_COOKIE_MAX_AGE,
        int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
    )
    # The browser only ever sees the frontend origin (the Next proxy relays
    # this header), so `secure` follows the deployment, not this hop's scheme.
    secure = not settings.DEBUG
    for name, value, max_age in (
        (_ACCESS_COOKIE, tokens["access"], access_max_age),
        (_REFRESH_COOKIE, tokens["refresh"], refresh_max_age),
    ):
        response.set_cookie(
            name, value, max_age=max_age, path="/", httponly=True,
            secure=secure, samesite="Lax",
        )
