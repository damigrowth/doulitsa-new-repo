"""Public review endpoints (rows 75-89)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reviews.selectors import review_reads
from apps.reviews.serializers.review import CreateReviewSerializer
from apps.reviews.services import review_ops


def _page_limit(request, default_page=1, default_limit=10):
    # OLD default page-size for profile/service/me lists is 10
    # (get-reviews.ts:84,184; get-user-reviews.ts:49,206,371,473).
    return int(request.query_params.get("page", default_page)), int(
        request.query_params.get("limit", default_limit)
    )


class CreateReviewView(APIView):
    """POST /api/reviews (row 75)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=CreateReviewSerializer)
    def post(self, request):
        s = CreateReviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        review = review_ops.create_review(
            author=request.user,
            profile_id=s.validated_data["profileId"],
            service_id=s.validated_data.get("serviceId"),
            rating=s.validated_data["rating"],
            comment=s.validated_data.get("comment"),
        )
        # OLD create-review.ts:214 — exact success wording.
        return Response({"id": review.id, "message": "Η αξιολόγησή σας υποβλήθηκε με επιτυχία!"})


class CanUserReviewView(APIView):
    """GET /api/reviews/can-review (row 76).

    AllowAny so anonymous callers get the graceful
    `{canReview:false, reason:'Απαιτείται σύνδεση'}` (OLD create-review.ts:236-242)
    instead of a 401.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        profile_id = request.query_params.get("profileId")
        service_id = request.query_params.get("serviceId")
        return Response(review_ops.can_user_review(
            user=request.user,
            profile_id=profile_id,
            service_id=int(service_id) if service_id else None,
        ))


class ProfileReviewStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, profile_id):
        return Response(review_reads.get_profile_review_stats(profile_id))


class ServiceReviewStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, service_id):
        return Response(review_reads.get_service_review_stats(int(service_id)))


class ProfileReviewsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, profile_id):
        page, limit = _page_limit(request)
        return Response(review_reads.list_profile_reviews(profile_id, page=page, limit=limit))


class ServiceReviewsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, service_id):
        page, limit = _page_limit(request)
        return Response(review_reads.list_service_reviews(int(service_id), page=page, limit=limit))


class ProfileOtherServiceReviewsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, profile_id):
        exclude = request.query_params.get("excludeServiceId")
        # OLD getProfileOtherServiceReviews default limit 5 (get-reviews.ts:285).
        return Response(review_reads.list_profile_other_service_reviews(
            profile_id,
            exclude_service_id=int(exclude) if exclude else None,
            limit=int(request.query_params.get("limit", 5)),
        ))


# ----- /api/reviews/me/* (dashboard) --------------------------------------


class MeReceivedTotalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(review_reads.user_total_received(request.user))


class MeReceivedStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(review_reads.user_received_stats(request.user))


class MeReceivedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page, limit = _page_limit(request)
        return Response(review_reads.user_received(request.user, page=page, limit=limit))


class MeReceivedWithCommentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page, limit = _page_limit(request)
        return Response(review_reads.user_received_with_comments(request.user, page=page, limit=limit))


class MeGivenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page, limit = _page_limit(request)
        return Response(review_reads.user_given(request.user, page=page, limit=limit))


class MeGivenStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(review_reads.user_given_stats(request.user))


class MeGivenWithCommentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page, limit = _page_limit(request)
        return Response(review_reads.user_given_with_comments(request.user, page=page, limit=limit))


class ToggleVisibilityView(APIView):
    """POST /api/reviews/{id}/visibility/toggle (row 89)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, review_id):
        visibility = review_ops.toggle_visibility(user=request.user, review_id=review_id)
        return Response({"visibility": visibility})
