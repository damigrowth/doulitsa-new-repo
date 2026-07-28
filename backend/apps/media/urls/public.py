"""Public media URL routes. Mounted at /api/media/ from config/urls.py."""
from __future__ import annotations

from django.urls import path

from apps.media.views.public.sign import SignCloudinaryParamsView

app_name = "media_public"

# No server-side upload endpoint: uploads go client-side straight to Cloudinary
# (unsigned presets). Only the signing surface remains here for compatibility.
urlpatterns = [
    path("sign-cloudinary-params", SignCloudinaryParamsView.as_view(), name="sign-params"),  # row 4
]
