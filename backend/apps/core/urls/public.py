"""Core public URL routes (rows 24, 130, 131). Mounted at /api/ from config/urls.py."""
from __future__ import annotations

from django.urls import path

from apps.core.views.public.health import HealthCheckView, MaintenanceStatusView
from apps.core.views.public.home import HomePageView
from apps.core.views.public.sitemaps import SitemapEntriesView

app_name = "core_public"

# Mounted as /api/home, /api/health, /api/auth/maintenance
urlpatterns = [
    path("home", HomePageView.as_view(), name="home"),                                # row 130
    path("health", HealthCheckView.as_view(), name="health"),                          # row 131
    path("auth/maintenance", MaintenanceStatusView.as_view(), name="maintenance"),    # row 24
    # Slug/updated_at feed for the Next.js entity sitemaps (SEO, no PII).
    path("seo/sitemap-entries", SitemapEntriesView.as_view(), name="sitemap-entries"),
]
