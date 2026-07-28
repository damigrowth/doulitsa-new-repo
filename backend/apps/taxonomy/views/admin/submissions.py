"""Admin moderation endpoints for taxonomy submissions.

These endpoints are an addendum to the original tracker (which only had
the public submit + list-mine routes). The Next.js admin UI calls these
to clear the moderation queue.
"""
from __future__ import annotations

from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.admin import AdminResource, HasResourcePermission
from apps.taxonomy.services import admin_submissions as svc

_VIEW = HasResourcePermission(AdminResource.TAXONOMIES, "view")
_EDIT = HasResourcePermission(AdminResource.TAXONOMIES, "edit")


class _RejectSerializer(serializers.Serializer):
    # OLD reject reason is optional (admin/taxonomy-submission.ts:366-368).
    reason = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=2000)


class _BulkSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.CharField(max_length=64), min_length=1)
    reason = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=2000)


class AdminSubmissionListView(APIView):
    permission_classes = [IsAuthenticated, _VIEW]

    def get(self, request):
        return Response(svc.list_submissions(filters=request.query_params.dict()))


class AdminSubmissionStatsView(APIView):
    permission_classes = [IsAuthenticated, _VIEW]

    def get(self, request):
        return Response(svc.stats())


class AdminSubmissionApproveView(APIView):
    permission_classes = [IsAuthenticated, _EDIT]

    def post(self, request, submission_id):
        return Response(svc.approve(reviewer=request.user, submission_id=submission_id))


class AdminSubmissionRejectView(APIView):
    permission_classes = [IsAuthenticated, _EDIT]

    def post(self, request, submission_id):
        s = _RejectSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(svc.reject(
            reviewer=request.user,
            submission_id=submission_id,
            reason=s.validated_data.get("reason") or None,
        ))


class AdminSubmissionBulkApproveView(APIView):
    permission_classes = [IsAuthenticated, _EDIT]

    def post(self, request):
        s = _BulkSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(svc.bulk_approve(reviewer=request.user, ids=s.validated_data["ids"]))


class AdminSubmissionBulkRejectView(APIView):
    permission_classes = [IsAuthenticated, _EDIT]

    def post(self, request):
        # OLD bulk reject takes an optional reason (admin/taxonomy-submission.ts:445-448).
        s = _BulkSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(svc.bulk_reject(
            reviewer=request.user,
            ids=s.validated_data["ids"],
            reason=s.validated_data.get("reason") or None,
        ))
