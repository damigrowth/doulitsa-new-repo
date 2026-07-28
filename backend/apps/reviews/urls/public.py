"""Reviews public URL routes (rows 75-89). Mounted at /api/reviews/."""
from __future__ import annotations

from django.urls import path

from apps.reviews.views.public import reviews as v

app_name = "reviews_public"

urlpatterns = [
    path("", v.CreateReviewView.as_view(), name="create"),                                       # 75
    path("can-review", v.CanUserReviewView.as_view(), name="can-review"),                        # 76

    # Per-profile / per-service reads
    path("profile/<str:profile_id>/stats", v.ProfileReviewStatsView.as_view(), name="profile-stats"),       # 77
    path("service/<int:service_id>/stats", v.ServiceReviewStatsView.as_view(), name="service-stats"),       # 78
    path("profile/<str:profile_id>", v.ProfileReviewsView.as_view(), name="profile-list"),                  # 79
    path("service/<int:service_id>", v.ServiceReviewsView.as_view(), name="service-list"),                  # 80
    path("profile/<str:profile_id>/other-services", v.ProfileOtherServiceReviewsView.as_view(),
         name="profile-other-services"),                                                                     # 81

    # My dashboard
    path("me/received/total", v.MeReceivedTotalView.as_view(), name="me-received-total"),        # 82
    path("me/given", v.MeGivenView.as_view(), name="me-given"),                                  # 83
    path("me/received/stats", v.MeReceivedStatsView.as_view(), name="me-received-stats"),        # 84
    path("me/received/with-comments", v.MeReceivedWithCommentsView.as_view(),
         name="me-received-with-comments"),                                                       # 85
    path("me/given/stats", v.MeGivenStatsView.as_view(), name="me-given-stats"),                  # 86
    path("me/given/with-comments", v.MeGivenWithCommentsView.as_view(),
         name="me-given-with-comments"),                                                          # 87
    path("me/received", v.MeReceivedView.as_view(), name="me-received"),                          # 88

    path("<str:review_id>/visibility/toggle", v.ToggleVisibilityView.as_view(),
         name="toggle-visibility"),                                                               # 89
]
