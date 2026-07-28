"""Admin review endpoints (rows 171-177)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from django.db.models import Q
from rest_framework import status as drf_status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.admin import AdminResource, HasResourcePermission
from apps.reviews.models import Review, ReviewStatus
from apps.reviews.selectors.review_reads import admin_card, admin_cards
from apps.reviews.serializers.review import ModerateReviewSerializer
from apps.reviews.services import review_ops

_PERM_VIEW = HasResourcePermission(AdminResource.REVIEWS, "view")
_PERM_EDIT = HasResourcePermission(AdminResource.REVIEWS, "edit")
_PERM_FULL = HasResourcePermission(AdminResource.REVIEWS, "full")


def _query_int(request, key, default):
    try:
        return int(request.query_params.get(key, default))
    except (TypeError, ValueError):
        return default


class AdminReviewListView(APIView):
    """GET /api/admin/reviews (row 171)."""

    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        qs = Review.objects.select_related("author", "author__profile", "profile").all()
        # OLD admin/reviews.ts:45-58 — search comment OR author name/email/displayName.
        q = request.query_params.get("searchQuery")
        if q:
            qs = qs.filter(
                Q(comment__icontains=q)
                | Q(author__name__icontains=q)
                | Q(author__email__icontains=q)
                | Q(author__display_name__icontains=q)
            )
        status_filter = request.query_params.get("status")
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)
        rating = request.query_params.get("rating")
        if rating and rating != "all":
            qs = qs.filter(rating=int(rating))
        type_ = request.query_params.get("type")
        if type_ and type_ != "all":
            qs = qs.filter(type=type_)

        sort = request.query_params.get("sortBy", "createdAt")
        direction = request.query_params.get("sortDirection", "desc")
        sort_col = {"createdAt": "created_at", "updatedAt": "updated_at", "rating": "rating"}.get(sort, "created_at")
        if direction == "desc":
            sort_col = f"-{sort_col}"
        qs = qs.order_by(sort_col)

        limit = max(1, min(100, _query_int(request, "limit", 10)))
        offset = max(0, _query_int(request, "offset", 0))
        total = qs.count()
        rows = list(qs[offset:offset + limit])
        return Response({
            "reviews": admin_cards(rows),
            "total": total,
            "limit": limit,
            "offset": offset,
        })


class AdminReviewDetailView(APIView):
    """GET /api/admin/reviews/{id} (row 172) + DELETE (row 174)."""

    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request, review_id):
        r = Review.objects.select_related("author", "author__profile", "profile").filter(id=review_id).first()
        if r is None:
            return Response({"error": "not_found"}, status=drf_status.HTTP_404_NOT_FOUND)
        return Response(admin_card(r))

    def delete(self, request, review_id):
        self.permission_classes = [IsAuthenticated, _PERM_FULL]
        self.check_permissions(request)
        review_ops.admin_delete_review(review_id=review_id)
        return Response({"id": review_id})


class AdminReviewStatusView(APIView):
    """PATCH /api/admin/reviews/{id}/status (row 173)."""

    permission_classes = [IsAuthenticated, _PERM_EDIT]

    @extend_schema(request=ModerateReviewSerializer)
    def patch(self, request, review_id):
        s = ModerateReviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        review = review_ops.moderate_review(
            review_id=review_id,
            status=s.validated_data["status"],
            reason=s.validated_data.get("notes"),
        )
        return Response(admin_card(review))


class AdminReviewStatsView(APIView):
    """GET /api/admin/reviews/stats (row 175)."""

    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        return Response({
            "total": Review.objects.count(),
            "pending": Review.objects.filter(status=ReviewStatus.PENDING).count(),
            "approved": Review.objects.filter(status=ReviewStatus.APPROVED).count(),
            "rejected": Review.objects.filter(status=ReviewStatus.REJECTED).count(),
        })


class AdminReviewVisibilityToggleView(APIView):
    """POST /api/admin/reviews/{id}/visibility/toggle (row 176)."""

    permission_classes = [IsAuthenticated, _PERM_EDIT]

    def post(self, request, review_id):
        visibility = review_ops.admin_toggle_visibility(review_id=review_id)
        return Response({"visibility": visibility})


class AdminReviewPendingQueueView(APIView):
    """GET /api/admin/reviews/pending (row 177)."""

    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        page = max(1, _query_int(request, "page", 1))
        # OLD getPendingReviews default limit 20 (moderate-review.ts:181).
        limit = max(1, min(100, _query_int(request, "limit", 20)))
        qs = (
            Review.objects
            .select_related("author", "author__profile", "profile")
            .filter(status=ReviewStatus.PENDING)
            .order_by("-created_at")
        )
        total = qs.count()
        offset = (page - 1) * limit
        rows = list(qs[offset:offset + limit])
        return Response({
            "reviews": admin_cards(rows),
            "total": total,
        })
