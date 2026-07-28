"""Public billing endpoints (rows 5, 6, 7, 115-121)."""
from __future__ import annotations

import logging

from django.conf import settings
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.roles import HasAnyRole
from apps.accounts.models.user import UserRole
from apps.billing.services import providers as providers_module
from apps.billing.services import subscription_ops as svc
from apps.billing.services import worldline as wl
from apps.billing.services.pricing import calculate_discounted_pricing, find_coupon
from common.exceptions import ApiError

logger = logging.getLogger(__name__)


class IsProOrAdmin(HasAnyRole):
    required_roles = (UserRole.FREELANCER, UserRole.COMPANY, UserRole.ADMIN)


# ----- Serializers --------------------------------------------------------


class CheckoutSerializer(serializers.Serializer):
    billingInterval = serializers.ChoiceField(choices=("month", "year"))
    couponCode = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class ValidateCouponSerializer(serializers.Serializer):
    code = serializers.CharField()
    billingInterval = serializers.ChoiceField(choices=("month", "year"))


class CancelSerializer(serializers.Serializer):
    cancelAtPeriodEnd = serializers.BooleanField(required=False, default=True)


class ToggleFeaturedSerializer(serializers.Serializer):
    serviceId = serializers.IntegerField()


# ----- Endpoints ---------------------------------------------------------


class CheckoutSessionView(APIView):
    """POST /api/billing/checkout (row 115)."""

    permission_classes = [IsAuthenticated, IsProOrAdmin]

    @extend_schema(request=CheckoutSerializer)
    def post(self, request):
        s = CheckoutSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(svc.create_checkout(
            user=request.user,
            billing_interval=s.validated_data["billingInterval"],
            coupon_code=s.validated_data.get("couponCode"),
        ))


class ToggleFeaturedServiceView(APIView):
    """POST /api/billing/services/{id}/featured/toggle (row 116)."""

    permission_classes = [IsAuthenticated, IsProOrAdmin]

    def post(self, request, service_id):
        return Response(svc.toggle_featured_service(user=request.user, service_id=service_id))


class SyncBillingView(APIView):
    """POST /api/billing/sync (row 117)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response(svc.sync_billing_from_profile(user=request.user))


class ValidateCouponView(APIView):
    """POST /api/billing/coupons/validate (row 118).

    Mirrors validate-coupon.ts: returns the full VAT-aware DiscountedPricing for the
    promoted annual plan (the only interval the WELCOME50 coupon applies to).
    """

    permission_classes = [AllowAny]

    @extend_schema(request=ValidateCouponSerializer)
    def post(self, request):
        s = ValidateCouponSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        code = (s.validated_data["code"] or "").strip()
        if not code:
            raise ApiError("Εισάγετε κωδικό κουπονιού", code="missing_code", status_code=400)
        coupon = find_coupon(code)
        if coupon is None:
            raise ApiError("Μη έγκυρο κουπόνι", code="invalid_coupon", status_code=400)
        # Coupon only applies to annual (validate-coupon.ts:27-31).
        pricing = calculate_discounted_pricing(coupon, "promoted", "year")
        if pricing is None:
            raise ApiError(
                "Το κουπόνι δεν μπορεί να εφαρμοστεί",
                code="coupon_inapplicable", status_code=400,
            )
        return Response({
            "code": coupon["code"],
            "percentOff": coupon["percentOff"],
            "pricing": pricing,
        })


class RestoreSubscriptionView(APIView):
    """POST /api/billing/subscription/restore (row 119)."""

    permission_classes = [IsAuthenticated, IsProOrAdmin]

    def post(self, request):
        return Response(svc.restore(user=request.user))


class CancelSubscriptionView(APIView):
    """POST /api/billing/subscription/cancel (row 120)."""

    permission_classes = [IsAuthenticated, IsProOrAdmin]

    @extend_schema(request=CancelSerializer)
    def post(self, request):
        s = CancelSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(svc.cancel(
            user=request.user,
            at_period_end=s.validated_data["cancelAtPeriodEnd"],
        ))


class GetSubscriptionView(APIView):
    """GET /api/billing/subscription (row 121)."""

    permission_classes = [IsAuthenticated, IsProOrAdmin]

    def get(self, request):
        sub = svc.get_for_user(request.user)
        return Response({"subscription": sub})


# ----- Payment-flow routes (rows 5, 6, 7) --------------------------------


# OLD test-mode.ts:getTestModeBanner — shown only to admins/test users in test mode.
_TEST_MODE_BANNER = (
    "🧪 ΔΟΚΙΜΑΣΤΙΚΗ ΛΕΙΤΟΥΡΓΙΑ: Χρησιμοποιείτε δοκιμαστικές κάρτες. "
    "Οι πληρωμές δεν είναι πραγματικές."
)


class PaymentsCheckAccessView(APIView):
    """GET /api/payments/check-access (row 5).

    Mirrors OLD canAccessPayments + getTestModeBanner (lib/payment/test-mode.ts)
    on top of the Django-only PAYMENTS_ENABLED kill-switch. AllowAny because the
    OLD route had no auth: outside test mode anonymous users get allowed=true.
    Response shape: {allowed, reason, testModeBanner} (use-payments-access.ts).
    """

    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else None
        is_admin_or_test = bool(
            user and (user.role == UserRole.ADMIN or getattr(user, "test_user", False))
        )

        allowed = True
        reason: str | None = None
        if not settings.PAYMENTS_ENABLED:
            allowed = False
            reason = "Payments are temporarily disabled"
        elif settings.PAYMENTS_TEST_MODE:
            if user is None:
                allowed = False
                reason = "Πρέπει να συνδεθείτε για να δείτε αυτή τη σελίδα"
            elif not is_admin_or_test:
                allowed = False
                reason = (
                    "Το σύστημα πληρωμών βρίσκεται σε δοκιμαστική λειτουργία. "
                    "Μόνο διαχειριστές έχουν πρόσβαση αυτή τη στιγμή."
                )

        banner = (
            _TEST_MODE_BANNER
            if settings.PAYMENTS_TEST_MODE and is_admin_or_test
            else None
        )
        return Response({"allowed": allowed, "reason": reason, "testModeBanner": banner})


def _escape_html(value: str) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


class WorldlineRedirectView(APIView):
    """GET /api/payment/worldline/redirect (row 6).

    Ports app/api/payment/worldline/redirect/route.ts: decodes the base64url session
    (the signed form fields), then renders an auto-submitting HTML form POSTing ALL
    fields to Cardlink's shophandlermpi (Cardlink requires a form POST, not GET).

    NOTE: in the cutover topology the Next.js frontend serves this same route and is
    where checkout URLs actually point; this Django view is the equivalent fallback.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        import base64 as _b64
        import json as _json

        encoded = request.query_params.get("session")
        if not encoded:
            return Response({"error": "Missing session parameter"}, status=400)
        try:
            padded = encoded + "=" * (-len(encoded) % 4)
            params = _json.loads(_b64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
        except Exception:  # noqa: BLE001
            return Response({"error": "Invalid session parameter"}, status=400)

        action_url = wl.get_worldline_config()["redirect_url"]
        fields = "\n      ".join(
            f'<input type="hidden" name="{_escape_html(name)}" value="{_escape_html(value)}" />'
            for name, value in params.items()
        )
        html = (
            '<!DOCTYPE html><html lang="el"><head><meta charset="UTF-8" />'
            '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
            "<title>Ανακατεύθυνση στην πληρωμή...</title></head><body>"
            "<p>Ανακατεύθυνση στη σελίδα πληρωμής...</p>"
            "<noscript>"
            f'<form method="POST" action="{_escape_html(action_url)}" accept-charset="UTF-8">'
            f"{fields}<button type=\"submit\">Συνέχεια στην πληρωμή</button></form></noscript>"
            f'<form id="paymentForm" method="POST" action="{_escape_html(action_url)}" '
            'accept-charset="UTF-8" style="display:none;">'
            f"{fields}</form>"
            "<script>document.getElementById('paymentForm').submit();</script>"
            "</body></html>"
        )
        return HttpResponse(html, content_type="text/html; charset=utf-8")


class WorldlineWebhookView(APIView):
    """POST /api/webhooks/worldline (row 7).

    Full port of webhooks/worldline/route.ts. Handles browser redirect, S2S recurring
    child (Sequence>=2) and Modirum background confirmation. Reads the raw POST body so
    field INSERTION ORDER is preserved for the response-digest check (digest.ts:40-58).
    """

    permission_classes = [AllowAny]

    def post(self, request):
        from urllib.parse import parse_qsl

        # Cardlink's production XML-advice profile points Payment/Recurring advice
        # URLs at THIS endpoint (not /advice). Advice messages are XML — detect and
        # delegate to the advice handler; everything below expects form-encoded data.
        # (SCRUM-63, OLD route.ts bodyProbe.)
        raw_body = request.body.decode("utf-8", errors="replace")
        if raw_body.lstrip().startswith("<"):
            from apps.billing.services.advice import handle_worldline_advice
            result = handle_worldline_advice(raw_body)
            return Response(result["body"], status=result["status_code"])

        user_agent = request.META.get("HTTP_USER_AGENT", "") or ""
        is_s2s = "Modirum" in user_agent
        content_type = (request.content_type or "").lower()
        is_form_ct = (
            "application/x-www-form-urlencoded" in content_type
            or "multipart/form-data" in content_type
        )

        # Build ordered (key, value) items preserving POST-body insertion order.
        items: list[tuple[str, str]]
        if is_form_ct and "multipart/form-data" not in content_type:
            # url-encoded: parse the raw body so order is exactly what Cardlink sent.
            try:
                items = parse_qsl(request.body.decode("utf-8"), keep_blank_values=True)
            except Exception:  # noqa: BLE001
                if is_s2s:
                    return Response({"status": "ok", "message": "parse failed, acknowledged"})
                return self._redirect("error=payment")
        elif is_form_ct:
            # multipart — fall back to Django's parsed QueryDict order.
            items = list(request.POST.items())
        elif is_s2s:
            # Non-standard Content-Type from Modirum — parse body as url-encoded text.
            try:
                items = parse_qsl(request.body.decode("utf-8"), keep_blank_values=True)
            except Exception:  # noqa: BLE001
                return Response({"status": "ok", "message": "unknown format, acknowledged"})
        else:
            logger.error("[Worldline Webhook] Unexpected Content-Type: %s", content_type)
            return self._redirect("error=payment")

        params = {k: v for k, v in items}

        # Digest verification — insertion order (route.ts:117).
        if not providers_module.worldline_verify_webhook(items):
            order_id = params.get("orderid") or ""
            if is_s2s and order_id:
                from apps.billing.models import Subscription, SubscriptionStatus
                if Subscription.objects.filter(
                    provider_subscription_id=order_id, status=SubscriptionStatus.ACTIVE,
                ).exists():
                    return Response({"status": "ok", "message": "already processed"})
            logger.error("[Worldline Webhook] Digest validation failed for order: %s", order_id)
            if is_s2s:
                return Response({"status": "error", "message": "digest validation failed"}, status=400)
            return self._redirect("error=security")

        result = svc.handle_worldline_webhook(params, is_server_to_server=is_s2s)

        if result.get("kind") == "redirect":
            return self._redirect(result["query"])
        # JSON ack for S2S / recurring child.
        body = {k: v for k, v in result.items() if k not in ("kind", "status_code")}
        return Response(body, status=result.get("status_code", 200))

    @staticmethod
    def _redirect(query: str) -> HttpResponse:
        from django.http import HttpResponseRedirect
        base = settings.FRONTEND_BASE_URL.rstrip("/")
        return HttpResponseRedirect(f"{base}/payment/callback?{query}")


class WorldlineAdviceWebhookView(APIView):
    """POST /api/webhooks/worldline/advice (SCRUM-63).

    Cardlink/Worldline "XML Webhooks (Advice Messages)" receiver — VPOS XML API
    2.1. Recurring children are delivered ONLY through this service (activated by
    Cardlink support per MID with this URL as "Recurring advice URL"). Digest is
    validated in services/advice.py; GET is a health check confirming the
    endpoint is deployed/reachable without exposing anything.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        from apps.billing.services.advice import handle_worldline_advice

        try:
            body = request.body.decode("utf-8", errors="replace")
        except Exception:  # noqa: BLE001
            logger.error("[Worldline Advice] Failed to read request body")
            return Response({"status": "error", "message": "unreadable body"}, status=400)
        result = handle_worldline_advice(body)
        return Response(result["body"], status=result["status_code"])

    def get(self, request):
        return Response({
            "status": "ok",
            "endpoint": "worldline-advice",
            "accepts": "POST (VPOS XML API 2.1 advice messages)",
        })


class WorldlineRenewalsCronView(APIView):
    """POST/GET /api/cron/worldline-renewals (row 11 — cron entrypoint).

    Ports cron/worldline-renewals/route.ts auth + dispatch: requires
    `Authorization: Bearer <CRON_SECRET>`, then runs the full renewal/retry state
    machine (services/renewals.run_worldline_renewals) and returns its results dict.
    The Vercel cron forwards here via the Next.js proxy with the Authorization header.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        return self._run(request)

    def get(self, request):
        return self._run(request)

    @staticmethod
    def _run(request):
        from apps.billing.services.renewals import run_worldline_renewals

        cron_secret = settings.CRON_SECRET
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not cron_secret or auth_header != f"Bearer {cron_secret}":
            return Response({"error": "Unauthorized"}, status=401)
        try:
            results = run_worldline_renewals()
        except Exception:  # noqa: BLE001
            logger.exception("[Worldline Renewals] Cron job failed")
            return Response({"error": "Cron job failed"}, status=500)
        logger.info("[Worldline Renewals] %s", results)
        return Response(results)
