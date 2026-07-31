"""Admin billing endpoints (rows 178-183)."""
from __future__ import annotations

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.admin import AdminResource, HasResourcePermission
from apps.billing.services import subscription_ops as svc
from common.exceptions import NotFound

_VIEW = HasResourcePermission(AdminResource.SUBSCRIPTIONS, "view")
_EDIT = HasResourcePermission(AdminResource.SUBSCRIPTIONS, "edit")
_FULL = HasResourcePermission(AdminResource.SUBSCRIPTIONS, "full")


class StatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=("active", "past_due", "canceled", "incomplete", "trialing", "unpaid"),
    )


class ManualSubSerializer(serializers.Serializer):
    profileId = serializers.CharField()
    endDate = serializers.DateTimeField()


class AdminSubscriptionListView(APIView):
    permission_classes = [IsAuthenticated, _VIEW]

    def get(self, request):
        return Response(svc.admin_list(request.query_params.dict()))


class AdminSubscriptionDetailView(APIView):
    permission_classes = [IsAuthenticated, _VIEW]

    def get(self, request, sub_id):
        payload = svc.admin_get(sub_id)
        if payload is None:
            raise NotFound("Subscription not found")
        return Response(payload)

    def delete(self, request, sub_id):
        self.permission_classes = [IsAuthenticated, _FULL]
        self.check_permissions(request)
        svc.admin_delete(sub_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminSubscriptionPaymentsView(APIView):
    """GET /api/admin/billing/subscriptions/{id}/payments?page=N — full payment
    history for any subscription (OLD admin/subscriptions/[id]/page.tsx:127-141)."""

    permission_classes = [IsAuthenticated, _VIEW]

    def get(self, request, sub_id):
        try:
            page = int(request.query_params.get("page", 1))
        except (TypeError, ValueError):
            page = 1
        return Response(svc.list_payment_attempts(subscription_id=sub_id, page=page))


class AdminSubscriptionStatusView(APIView):
    permission_classes = [IsAuthenticated, _EDIT]

    def patch(self, request, sub_id):
        s = StatusSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        sub = svc.admin_update_status(sub_id=sub_id, status=s.validated_data["status"])
        return Response(svc.admin_get(sub.id))


class AdminSubscriptionStatsView(APIView):
    permission_classes = [IsAuthenticated, _VIEW]

    def get(self, request):
        return Response(svc.admin_stats())


class AdminManualSubscriptionView(APIView):
    permission_classes = [IsAuthenticated, _EDIT]

    def post(self, request):
        s = ManualSubSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        sub = svc.admin_create_manual(
            profile_id=s.validated_data["profileId"],
            end_date=s.validated_data["endDate"],
        )
        return Response({"id": sub.id}, status=status.HTTP_201_CREATED)
