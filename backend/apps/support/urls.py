"""Support URL routes (rows 128, 129). Mounted at /api/support/."""
from __future__ import annotations

from django.urls import path

from apps.support.views.public.support import ContactView, FeedbackView

app_name = "support"

urlpatterns = [
    path("contact", ContactView.as_view(), name="contact"),     # 128
    path("feedback", FeedbackView.as_view(), name="feedback"),  # 129
]
