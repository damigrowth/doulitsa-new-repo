"""Admin media URL routes. Mounted at /api/admin/media/ from config/urls.py."""
from __future__ import annotations

from django.urls import path

from apps.media.views.public.sign import MediaLibraryTokenView

app_name = "media_admin"

urlpatterns = [
    path("cloudinary/media-library-token", MediaLibraryTokenView.as_view(), name="media-library-token"),  # row 127
]
