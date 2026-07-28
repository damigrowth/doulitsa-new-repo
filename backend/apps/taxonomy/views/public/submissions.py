"""Taxonomy submission endpoints (rows 125, 126)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.roles import IsProfessional
from apps.taxonomy.serializers.taxonomy import SubmitTaxonomySerializer
from apps.taxonomy.services import submissions
from apps.taxonomy.services.submission_ids import create_submission_id
from common.throttling import TaxonomySubmissionThrottle


class SubmitTaxonomyView(APIView):
    """POST /api/taxonomy/submissions (row 125)."""

    permission_classes = [IsAuthenticated, IsProfessional]
    throttle_classes = [TaxonomySubmissionThrottle]

    @extend_schema(request=SubmitTaxonomySerializer)
    def post(self, request):
        s = SubmitTaxonomySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        submission = submissions.submit_taxonomy(
            user=request.user,
            label=s.validated_data["label"],
            type=s.validated_data["type"],
            category=s.validated_data.get("category"),
        )
        # OLD returns `pending_<cuid>` (taxonomy-submission.ts:116); the FE
        # stores this exact value in profiles.skills[]/services.tags[].
        return Response({"pendingId": create_submission_id(submission.id)})


class MyTaxonomySubmissionsView(APIView):
    """GET /api/taxonomy/submissions/me (row 126)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(submissions.list_my_submissions(
            user=request.user,
            type=request.query_params.get("type"),
        ))
