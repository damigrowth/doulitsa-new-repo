"""Home page bundle endpoint (row 130). Aggregates featured services,
profiles, popular subcategories, categories."""
from __future__ import annotations

from django.core.cache import cache
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HomePageView(APIView):
    """GET /api/home (row 130)."""

    permission_classes = [AllowAny]

    def get(self, request):
        cache_key = "core:home"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        payload = {
            "services": _featured_services(),
            "profiles": _featured_profiles(),
            "popularSubcategories": _popular_subcategories(),
            "categoriesWithSubcategories": _categories_with_subcategories(),
            "proCategoriesWithSubcategories": _pro_categories_with_subcategories(),
        }
        cache.set(cache_key, payload, timeout=60 * 5)
        return Response(payload)


def _featured_services():
    try:
        from apps.services.selectors.service_reads import get_featured_services
        return get_featured_services()
    except ImportError:
        return {"mainCategories": [], "servicesByCategory": {}, "allServices": []}


def _featured_profiles():
    """Port of OLD `get-home-data.ts:200-249`.

    16 profiles, gated: published + active + featured + image NOT null + user
    role ∈ {freelancer, company} + confirmed + not blocked, ordered updatedAt
    desc. Falls back to the same gating *without* featured (top by updatedAt)
    when no featured profiles exist.
    """
    try:
        from apps.profiles.models import Profile
        from apps.profiles.selectors.profile_reads import serialize_profile_summary
    except ImportError:
        return []

    base = (
        Profile.objects.select_related("user")
        .filter(
            published=True,
            is_active=True,
            user__role__in=["freelancer", "company"],
            user__confirmed=True,
            user__blocked=False,
        )
        .exclude(image__isnull=True)
        .exclude(image="")
    )
    featured = list(base.filter(featured=True).order_by("-updated_at")[:16])
    if not featured:
        featured = list(base.filter(rating__gte=0).order_by("-updated_at")[:16])
    return [serialize_profile_summary(p) for p in featured]


def _popular_subcategories():
    """Port of OLD `get-home-data.ts:258-349`: top-8 SERVICE subcategories by
    published-service count (not the PRO directory vocabulary)."""
    try:
        from apps.services.selectors.service_reads import get_popular_service_subcategories
        return get_popular_service_subcategories(limit=8)
    except ImportError:
        return []


def _categories_with_subcategories():
    try:
        from apps.services.selectors.service_reads import get_categories_page
        return get_categories_page()["categories"]
    except ImportError:
        return []


def _pro_categories_with_subcategories():
    try:
        from apps.profiles.selectors.profile_aggregations import directory_data
        return directory_data(limit=200)["categories"]
    except ImportError:
        return []
