"""Billing public URL routes (rows 115-121)."""
from __future__ import annotations

from django.urls import path

from apps.billing.views.public.billing import (
    CancelSubscriptionView,
    CheckoutSessionView,
    GetSubscriptionView,
    MyPaymentAttemptsView,
    RestoreSubscriptionView,
    SyncBillingView,
    ToggleFeaturedServiceView,
    ValidateCouponView,
)

app_name = "billing_public"

urlpatterns = [
    path("checkout", CheckoutSessionView.as_view(), name="checkout"),                          # 115
    path("services/<int:service_id>/featured/toggle",
         ToggleFeaturedServiceView.as_view(), name="toggle-featured"),                          # 116
    path("sync", SyncBillingView.as_view(), name="sync"),                                       # 117
    path("coupons/validate", ValidateCouponView.as_view(), name="validate-coupon"),             # 118
    path("subscription/restore", RestoreSubscriptionView.as_view(), name="restore"),            # 119
    path("subscription/cancel", CancelSubscriptionView.as_view(), name="cancel"),               # 120
    path("subscription/payments", MyPaymentAttemptsView.as_view(), name="subscription-payments"),
    path("subscription", GetSubscriptionView.as_view(), name="subscription"),                   # 121
]
