"""Billing admin URL routes (rows 178-183)."""
from __future__ import annotations

from django.urls import path

from apps.billing.views.admin.billing import (
    AdminManualSubscriptionView,
    AdminSubscriptionDetailView,
    AdminSubscriptionListView,
    AdminSubscriptionPaymentsView,
    AdminSubscriptionStatsView,
    AdminSubscriptionStatusView,
)

app_name = "billing_admin"

urlpatterns = [
    path("", AdminSubscriptionListView.as_view(), name="list"),                                # 178
    path("stats", AdminSubscriptionStatsView.as_view(), name="stats"),                          # 182
    path("manual", AdminManualSubscriptionView.as_view(), name="manual"),                       # 183
    path("<str:sub_id>", AdminSubscriptionDetailView.as_view(), name="detail"),                 # 179 + 181
    path("<str:sub_id>/payments", AdminSubscriptionPaymentsView.as_view(), name="payments"),
    path("<str:sub_id>/status", AdminSubscriptionStatusView.as_view(), name="status"),          # 180
]
