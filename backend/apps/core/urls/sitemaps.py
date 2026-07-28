"""Sitemap URL routes (rows 12-14). Mounted at the project root."""
from __future__ import annotations

from django.urls import path

from apps.core.views.public.sitemaps import (
    SitemapIndexView,
    SitemapStaticView,
    SitemapTopLevelView,
)

app_name = "core_sitemaps"

urlpatterns = [
    path("sitemap.xml", SitemapTopLevelView.as_view(), name="sitemap"),                   # row 12
    path("sitemap_index.xml", SitemapIndexView.as_view(), name="sitemap-index"),          # row 13
    path("sitemap_static.xml", SitemapStaticView.as_view(), name="sitemap-static"),       # row 14
]
