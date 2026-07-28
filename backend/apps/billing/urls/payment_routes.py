"""Payment-flow URL routes (rows 5, 6, 7)."""
from __future__ import annotations

from django.urls import path

from apps.billing.views.public.billing import (
    PaymentsCheckAccessView,
    WorldlineAdviceWebhookView,
    WorldlineRedirectView,
    WorldlineWebhookView,
)

app_name = "billing_payment_routes"

# Mounted at /api/payments/ + /api/payment/ + /api/webhooks/
check_access_urls = [
    path("check-access", PaymentsCheckAccessView.as_view(), name="check-access"),  # 5
]

redirect_urls = [
    path("worldline/redirect", WorldlineRedirectView.as_view(), name="worldline-redirect"),  # 6
]

webhook_urls = [
    path("worldline", WorldlineWebhookView.as_view(), name="worldline-webhook"),  # 7
    # SCRUM-63: Cardlink XML "Advice Messages" (recurring children) receiver.
    path("worldline/advice", WorldlineAdviceWebhookView.as_view(), name="worldline-advice-webhook"),
]
