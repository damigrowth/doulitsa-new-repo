"""Sitemap endpoints (rows 12-14).

Uses Django's `django.contrib.sitemaps` framework for the dynamic pieces and
hand-rolled XML for the index and static fallback.
"""
from __future__ import annotations

from datetime import datetime, timezone

from django.conf import settings
from django.http import HttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

_ENTRIES_MAX_LIMIT = 50_000  # sitemap spec: max 50k URLs per file


def _serve_xml(body: str) -> HttpResponse:
    return HttpResponse(body, content_type="application/xml; charset=utf-8")


class SitemapTopLevelView(APIView):
    """GET /sitemap.xml (row 12) — top-level reference pointing at the index."""

    permission_classes = [AllowAny]

    def get(self, request):
        base = settings.FRONTEND_BASE_URL.rstrip("/")
        body = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            f'<sitemap><loc>{base}/sitemap_index.xml</loc></sitemap>'
            f'<sitemap><loc>{base}/sitemap_static.xml</loc></sitemap>'
            '</sitemapindex>'
        )
        return _serve_xml(body)


class SitemapIndexView(APIView):
    """GET /sitemap_index.xml (row 13) — content-type sitemaps by section.

    The per-entity sitemaps are rendered by the Next.js frontend (which fetches
    slug/updated_at data from /api/seo/sitemap-entries), so the index points at
    those real routes instead of advertising backend-generated shard URLs that
    do not exist on the frontend.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        base = settings.FRONTEND_BASE_URL.rstrip("/")
        shards = [
            f"{base}/s/sitemap.xml",
            f"{base}/profile/sitemap.xml",
            f"{base}/articles/sitemap.xml",
        ]
        body = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            + "".join(f'<sitemap><loc>{u}</loc></sitemap>' for u in shards)
            + '</sitemapindex>'
        )
        return _serve_xml(body)


class SitemapStaticView(APIView):
    """GET /sitemap_static.xml (row 14) — about/contact/etc."""

    permission_classes = [AllowAny]

    def get(self, request):
        base = settings.FRONTEND_BASE_URL.rstrip("/")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        # Keep in sync with frontend/src/app/sitemap_static.xml/route.ts
        urls = [
            "/", "/about", "/contact", "/faq", "/articles",
            "/privacy", "/terms", "/login", "/register", "/for-pros",
            "/categories", "/ipiresies", "/directory", "/dir",
        ]
        body = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            + "".join(
                f"<url><loc>{base}{p}</loc><lastmod>{today}</lastmod></url>"
                for p in urls
            )
            + "</urlset>"
        )
        return _serve_xml(body)


class SitemapEntriesView(APIView):
    """GET /api/seo/sitemap-entries?kind=services|profiles|articles[&page=N&limit=M]

    Lightweight JSON feed consumed server-side by the Next.js sitemap handlers
    (frontend/src/app/(service)/s/sitemap.ts etc.). Returns only slug +
    updated_at — no PII. Eligibility filters mirror the legacy Prisma sitemaps:
      - services: status=published, slug not null
      - profiles: published, is_active, username not null, user not blocked and confirmed
      - articles: status=published
    """

    permission_classes = [AllowAny]

    def get(self, request):
        kind = request.query_params.get("kind", "")

        def _int_param(name: str, default: int, maximum: int) -> int:
            try:
                value = int(request.query_params.get(name, default))
            except (TypeError, ValueError):
                value = default
            return max(1, min(value, maximum))

        page = _int_param("page", 1, 1_000)
        limit = _int_param("limit", 5_000, _ENTRIES_MAX_LIMIT)

        if kind == "services":
            from apps.services.models import Service, ServiceStatus

            qs = (
                Service.objects.filter(status=ServiceStatus.PUBLISHED, slug__isnull=False)
                .order_by("-updated_at")
                .values_list("slug", "updated_at")
            )
        elif kind == "profiles":
            from apps.profiles.models import Profile

            qs = (
                Profile.objects.filter(
                    published=True,
                    is_active=True,
                    username__isnull=False,
                    user__blocked=False,
                    user__confirmed=True,
                )
                .order_by("-updated_at")
                .values_list("username", "updated_at")
            )
        elif kind == "articles":
            from apps.blog.models import BlogArticle, BlogStatus

            qs = (
                BlogArticle.objects.filter(status=BlogStatus.PUBLISHED)
                .order_by("-updated_at")
                .values_list("slug", "updated_at")
            )
        else:
            return Response(
                {"detail": "kind must be one of: services, profiles, articles"},
                status=400,
            )

        total = qs.count()
        offset = (page - 1) * limit
        entries = [
            {"slug": slug, "updated_at": updated_at.isoformat() if updated_at else None}
            for slug, updated_at in qs[offset : offset + limit]
            if slug
        ]
        return Response({"kind": kind, "page": page, "count": total, "entries": entries})
