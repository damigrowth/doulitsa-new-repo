"""Reviews admin URL routes (rows 171-177). Mounted at /api/admin/reviews/."""
from __future__ import annotations

from django.urls import path

from apps.reviews.views.admin import reviews as v

app_name = "reviews_admin"

urlpatterns = [
    path("", v.AdminReviewListView.as_view(), name="list"),                                       # 171
    path("stats", v.AdminReviewStatsView.as_view(), name="stats"),                                # 175
    path("pending", v.AdminReviewPendingQueueView.as_view(), name="pending"),                     # 177
    path("<str:review_id>", v.AdminReviewDetailView.as_view(), name="detail"),                    # 172, 174
    path("<str:review_id>/status", v.AdminReviewStatusView.as_view(), name="status"),             # 173
    path("<str:review_id>/visibility/toggle", v.AdminReviewVisibilityToggleView.as_view(),
         name="visibility-toggle"),                                                                # 176
]
