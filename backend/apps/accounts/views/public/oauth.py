"""OAuth helper endpoints: intent storage cookies.

Tracker rows: 25 (POST intent), 26 (GET intent).

OAuth completion (row 27) requires the profiles app to create the user's
Profile row — deferred to the profiles-app migration.
"""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers.auth import OAuthIntentSerializer
from apps.accounts.services import account as account_service
from common.exceptions import FieldErrors

OAUTH_INTENT_COOKIE = account_service.OAUTH_INTENT_COOKIE
OAUTH_INTENT_TTL = account_service.OAUTH_INTENT_TTL


class OAuthIntentView(APIView):
    """POST /api/auth/oauth/intent — store intent in a 10-min httpOnly cookie.
    GET — read & clear the cookie.
    """

    permission_classes = [AllowAny]

    @extend_schema(request=OAuthIntentSerializer)
    def post(self, request):
        serializer = OAuthIntentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = account_service.serialize_intent(
            type=serializer.validated_data["type"],
            role=serializer.validated_data.get("role"),
        )
        response = Response({"success": True})
        response.set_cookie(
            OAUTH_INTENT_COOKIE,
            payload,
            max_age=int(OAUTH_INTENT_TTL.total_seconds()),
            httponly=True,
            secure=not request.scheme == "http",
            samesite="Lax",
            path="/",
        )
        return response

    def get(self, request):
        raw = request.COOKIES.get(OAUTH_INTENT_COOKIE)
        intent = account_service.parse_intent_cookie(raw)
        response = Response({"intent": intent})
        if raw:
            response.delete_cookie(OAUTH_INTENT_COOKIE, path="/")
        return response


class GoogleOAuthExchangeView(APIView):
    """POST /api/auth/oauth/google/exchange — server-side Google code exchange.

    Called by the Next.js callback route (NOT the browser), so the client
    secret never leaves the backend and the browser never sees this URL. Returns
    {access, refresh, user, isNew}; the frontend sets the dj_access / dj_refresh
    cookies and routes by `user['step']`.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        from apps.accounts.services.google_oauth import exchange_code

        code = request.data.get("code")
        redirect_uri = request.data.get("redirectUri") or request.data.get("redirect_uri")
        if not code or not redirect_uri:
            raise FieldErrors(details={"code": ["code and redirectUri are required"]})
        # Optional oauth_intent payload (register-with-Google as user/pro),
        # relayed by the Next.js callback from the frontend-domain cookie.
        intent = request.data.get("intent")
        return Response(exchange_code(code=code, redirect_uri=redirect_uri, intent=intent))
