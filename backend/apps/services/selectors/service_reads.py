"""Read queries for service endpoints (rows 56-67, 68-69, 74)."""
from __future__ import annotations

import random
from typing import Any

from django.core.cache import cache
from django.db.models import Count, F, Q, QuerySet, Window

from apps.accounts.models import User
from apps.core import taxonomy
from apps.core.locations import NATIONWIDE_IDS, resolve_to_county_id
from apps.services.models import Service, ServiceStatus
from common.utils.normalize import normalize_term

_SORT_MAP = {
    "recent": ("-sort_date",),
    "oldest": ("sort_date",),
    "price_asc": ("price",),
    "price_desc": ("-price",),
    "rating_high": ("-rating", "-review_count"),
    "rating_low": ("rating", "review_count"),
    "popular": ("-review_count", "-rating"),
}


def _public_qs(status: str = ServiceStatus.PUBLISHED) -> QuerySet[Service]:
    return Service.objects.select_related("profile").filter(status=status)


def _county_coverage_q(county_id: str) -> Q:
    """Match a service whose profile coverage references `county_id`.

    Literal port of OLD `buildCountyCoverageFilter` (get-services.ts:73-103):
    coverage.county == id OR coverage.counties ∋ id OR coverage.counties ∋
    nationwide. CG-3: no area/areas clauses and no `county == nationwide`
    (OLD had neither; the extra clauses broadened the result set).
    """
    cond = (
        Q(profile__coverage__county=county_id)
        | Q(profile__coverage__counties__contains=[county_id])
    )
    for nw in NATIONWIDE_IDS:
        cond |= Q(profile__coverage__counties__contains=[nw])
    return cond


def _onbase_or_onsite_q() -> Q:
    """Service.type.onbase OR Service.type.onsite (get-services.ts:496-510)."""
    return Q(type__onbase=True) | Q(type__onsite=True)


def _build_search_conditions(word: str, original: str | None = None) -> Q:
    """Port of OLD `buildServiceSearchConditions` (build-search-conditions.ts:41).

    Builds an OR over: titleNormalized, descriptionNormalized,
    profile.coverageNormalized, profile.displayNameNormalized, profile.username,
    matching tag slugs, matching service subcategory slugs, matching subdivision
    slugs, and matching pro-subcategory slugs. When `original` (accented term) is
    given, also matches raw title/description/displayName as a fallback.
    """
    cond = (
        Q(title_normalized__icontains=word)
        | Q(description_normalized__icontains=word)
        | Q(profile__coverage_normalized__icontains=word)
        | Q(profile__display_name_normalized__icontains=word)
        | Q(profile__username__icontains=word)
    )
    if original:
        cond |= (
            Q(title__icontains=original)
            | Q(description__icontains=original)
            | Q(profile__display_name__icontains=original)
        )
    # Expand each label-matched slug into slug+id candidates so the filter hits
    # rows whether the DB stored slugs (demo) or cuid ids (live data).
    def _expand(slugs: list[str]) -> list[str]:
        out: list[str] = []
        for s in slugs:
            out.extend(taxonomy.taxonomy_value_candidates(s))
        return out

    # CG-2: tags are stored as tag IDS ('23'); OLD matched label → id
    # (findMatchingTagIds). Slug candidates never matched the stored ids.
    tag_cands = taxonomy.matching_tag_ids(word)
    if tag_cands:
        cond |= Q(tags__overlap=tag_cands)
    sub_cands = _expand(taxonomy.matching_service_subcategory_slugs(word))
    if sub_cands:
        cond |= Q(subcategory__in=sub_cands)
    div_cands = _expand(taxonomy.matching_service_subdivision_slugs(word))
    if div_cands:
        cond |= Q(subdivision__in=div_cands)
    pro_sub_cands = _expand(taxonomy.matching_pro_subcategory_slugs(word))
    if pro_sub_cands:
        cond |= Q(profile__subcategory__in=pro_sub_cands)
    return cond


def _taxonomy_candidates(value: Any) -> list[str]:
    """Slug+id candidates for one or many taxonomy values."""
    if isinstance(value, list):
        out: list[str] = []
        for v in value:
            out.extend(taxonomy.taxonomy_value_candidates(v))
        return out
    return taxonomy.taxonomy_value_candidates(value)


def _node_ids(level: str, value: Any) -> list[str]:
    """Service-space TaxonomyNode ids matching a taxonomy value (or list), at
    `level`. FK equivalent of `_taxonomy_candidates` (proven identical by
    `parity_taxonomy_fks`)."""
    values = value if isinstance(value, list) else [value]
    out: list[str] = []
    for v in values:
        out.extend(taxonomy.taxonomy_node_ids("service", level, v))
    return out


def _apply_filters(qs: QuerySet[Service], filters: dict[str, Any]) -> QuerySet[Service]:
    # Taxonomy filters use the normalized FK; row-for-row identical to the legacy
    # `__in=_taxonomy_candidates(...)` path (proven by parity_taxonomy_fks).
    if filters.get("category"):
        qs = qs.filter(category_node_id__in=_node_ids("category", filters["category"]))
    if filters.get("subcategory"):
        qs = qs.filter(subcategory_node_id__in=_node_ids("subcategory", filters["subcategory"]))
    if filters.get("subdivision"):
        qs = qs.filter(subdivision_node_id__in=_node_ids("subdivision", filters["subdivision"]))

    online = filters.get("online")
    # OLD get-services.ts:922: a bare `?online` (empty value) counts as TRUE —
    # the archive UI appends a valueless ?online for the toggle.
    online_set = online is not None
    online_bool = online in (True, "true", "1", 1, "")
    county = filters.get("county")
    # CG-3: area → parent county; unresolvable → None (OLD resolveToCountyId).
    county_id = resolve_to_county_id(county) if county else None

    # Coverage / online combination — literal port of getServicesByFiltersInternal
    # (get-services.ts:444-514). onbase/onsite gating lives on Service.type.
    # OLD branches on the RAW `filters.county` and then applies the filter only
    # `if (countyId)`: an unresolvable county means NO location/online filter at
    # all (not a filter on the raw string, which matched nothing).
    if online_set and county:
        if county_id:
            # online services OR (county coverage AND (onbase OR onsite))
            qs = qs.filter(
                Q(type__online=True)
                | (_county_coverage_q(county_id) & _onbase_or_onsite_q())
            )
    elif online_set:
        # match both online=true and online=false (OLD `equals: filters.online`)
        qs = qs.filter(type__online=online_bool)
    elif county:
        if county_id:
            qs = qs.filter(_county_coverage_q(county_id) & _onbase_or_onsite_q())

    # Auto location-from-search when no explicit county filter is set
    # (get-services.ts:406-441): OLD looks up the NORMALIZED term only
    # (`findLocationBySlugOrName(normalizeTerm(term))`) → county / parent county.
    if filters.get("search") and not county:
        term = (filters["search"] or "").strip()
        if len(term) >= 2:
            auto_county_id = resolve_to_county_id(normalize_term(term))
            if auto_county_id:
                qs = qs.filter(_county_coverage_q(auto_county_id))

    if filters.get("search"):
        words = [w for w in normalize_term(filters["search"]).split() if w]
        for word in words:
            qs = qs.filter(_build_search_conditions(word, original=filters["search"].strip()))
    if filters.get("excludeFeatured"):
        qs = qs.filter(featured=False)
    return qs


def _apply_sort(qs: QuerySet[Service], sort_by: Any) -> QuerySet[Service]:
    # A repeated ?sortBy= arrives as a list (unhashable → TypeError 500 in
    # `.get`). OLD `isValidArchiveSortBy` fell back to the default sort.
    key = sort_by if isinstance(sort_by, str) else None
    return qs.order_by(*_SORT_MAP.get(key, ("-featured", "-sort_date")))


def _safe_int(value: Any, default: int, *, minimum: int = 1) -> int:
    """Parse an int query/body param; invalid/missing/below-minimum → default
    (OLD `parseInt(x || default)` semantics, never a 500)."""
    try:
        parsed = int(value)
    except (TypeError, ValueError, OverflowError):
        return default
    return parsed if parsed >= minimum else default


def _card(s: Service) -> dict[str, Any]:
    profile = getattr(s, "profile", None)
    profile_payload = None
    if profile:
        # Ship RAW coverage (ids + address) — the frontend's `enrichCoverage`
        # (transformCoverageWithLocationNames) is the single resolver, exactly
        # like the OLD app. Pre-resolving here dropped the address/zipcode and
        # mis-ranked collision ids (county 54 "Πανελλαδικά" vs area "Άθυρα").
        # `groupedCoverage` is recomputed by the FE's enrichProfileCard.
        profile_payload = {
            "id": profile.id,
            "uid": profile.user_id,
            "username": profile.username,
            "displayName": profile.display_name,
            "image": profile.image,
            "portfolio": profile.portfolio,
            "coverage": profile.coverage,
            "groupedCoverage": [],
            "verified": profile.verified,
            "top": profile.top,
            "rating": profile.rating,
            "reviewCount": profile.review_count,
        }
    return {
        "id": s.id,
        "slug": s.slug,
        "title": s.title,
        "description": s.description,
        # Resolved category label (OLD `transformServiceForComponent` set
        # `category` to the taxonomy label, not the slug). Frontend cards read
        # this for the badge. taxonomyLabels carried for parity with OLD.
        "category": taxonomy.service_category_label(s.category) or s.category,
        "subcategory": s.subcategory,
        "subdivision": s.subdivision,
        "taxonomyLabels": {
            "category": taxonomy.service_category_label(s.category),
            "subcategory": taxonomy.service_category_label(s.subcategory),
            "subdivision": taxonomy.service_category_label(s.subdivision),
        },
        "tags": s.tags or [],
        "fixed": s.fixed,
        "price": s.price,
        "type": s.type,
        "subscriptionType": s.subscription_type,
        "duration": s.duration,
        "media": s.media,
        "addons": s.addons or [],
        "faq": s.faq or [],
        "featured": s.featured,
        "rating": s.rating,
        "reviewCount": s.review_count,
        "status": s.status,
        "refreshedAt": s.refreshed_at.isoformat() if s.refreshed_at else None,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
        # Present only on archive-search rows (window annotation): the
        # profile's total matching services in the full filtered set.
        "profileMatchCount": getattr(s, "profile_match_count", None),
        "profile": profile_payload,
    }


def _edit_card(s: Service) -> dict[str, Any]:
    """Edit-form payload — the RAW service row, with `category` left as the
    STORED id (NOT the resolved Greek label). Mirrors OLD `getServiceForEdit`
    (get-service.ts:513), which returns the raw Prisma row. `_card` overwrites
    `category` with the taxonomy label for the public card badge; the edit form
    reads `service.category` and POSTs it straight back, so feeding it a label
    would write the label into `services.category` and break that service's
    filtering. Keep every field the edit form consumes
    (form-service-edit.tsx:155-181)."""
    card = _card(s)
    # Restore the raw stored taxonomy ids (subcategory/subdivision are already
    # raw in `_card`; only `category` is label-resolved there).
    card["category"] = s.category
    return card


# ----- single-record reads (rows 59-61) -----------------------------------


def get_by_slug(slug: str) -> Service | None:
    return _public_qs().filter(slug=slug).first()


def get_for_edit(user: User, service_id: int) -> Service | None:
    """Owner-only read for the edit form."""
    return Service.objects.select_related("profile").filter(
        id=service_id, profile__user_id=user.id
    ).first()


def _is_promoted_subscriber(profile) -> bool:
    """Active promoted subscription for the profile (get-service.ts:381)."""
    try:
        from apps.billing.models import Subscription, SubscriptionPlan, SubscriptionStatus
    except ImportError:
        return False
    return Subscription.objects.filter(
        profile=profile, plan=SubscriptionPlan.PROMOTED, status=SubscriptionStatus.ACTIVE
    ).exists()


def get_service_page_bundle(service_id: int) -> dict[str, Any] | None:
    """Port of OLD `_getServicePageData` (get-service.ts:196).

    Profile-published gate enforced; relatedServices same CATEGORY (featured
    first), take 5, then randomised; additionalServices = profile's other
    published services when the profile has an active promoted subscription;
    breadcrumbs + resolved taxonomy slugs + full profile data for the About
    section. Taxonomy/tag *labels* are resolved on the frontend (enrichment).
    """
    cache_key = f"service:page:{service_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    service = _public_qs().filter(id=service_id).first()
    if service is None:
        return None
    profile = service.profile
    # Profile-published gate (get-service.ts:215).
    if profile is None or not profile.published:
        return None

    cat, sub, div = service.category, service.subcategory, service.subdivision

    # Related: same CATEGORY, exclude self, featured-first then rating/reviews,
    # take 5, then random shuffle (get-service.ts:296-335).
    related_qs = list(
        _public_qs()
        .filter(category=cat)
        .exclude(id=service.id)
        .order_by("-featured", "-rating", "-review_count", "-updated_at")[:5]
    )
    random.shuffle(related_qs)

    # Additional services: only when profile has an active promoted subscription
    # (get-service.ts:378-446); the profile's other published services, take 5.
    additional_services: list[dict[str, Any]] = []
    if _is_promoted_subscriber(profile):
        additional_services = [
            _card(s)
            for s in _public_qs()
            .filter(profile=profile)
            .exclude(id=service.id)
            .order_by("-featured", "-rating")[:5]
        ]

    coverage = profile.coverage  # RAW — the FE resolves it (single resolver, like OLD app)

    # No "Αρχική"/"Υπηρεσίες" base — OLD prod service breadcrumb starts at the category.
    breadcrumb_segments = []
    if cat:
        breadcrumb_segments.append({"label": cat, "href": f"/categories/{cat}"})
    if sub:
        breadcrumb_segments.append({"label": sub, "href": f"/ipiresies/{sub}"})
    if div:
        breadcrumb_segments.append({"label": div, "href": f"/ipiresies/{sub}/{div}"})

    # The page's contact card + About section need the FULL provider profile
    # (tagline, rate, experience, type, speciality, names) — OLD returned it
    # (get-service.ts docstring). `_card`'s thin profile is fine for the
    # related/additional cards but not the main service shown on the page.
    from apps.profiles.selectors.profile_reads import serialize_profile_summary

    service_card = _card(service)
    full_profile = serialize_profile_summary(profile)
    # Raw coverage (ids + address) flows to the FE, which is the single resolver
    # (transformCoverageWithLocationNames), exactly like the OLD app.
    # `groupedCoverage` is recomputed there by enrichProfileCard.
    full_profile["coverage"] = profile.coverage
    full_profile["groupedCoverage"] = []
    service_card["profile"] = full_profile

    payload = {
        "service": service_card,
        # Raw taxonomy slugs — the frontend resolves the {id,label,slug} objects.
        "category": {"slug": cat} if cat else None,
        "subcategory": {"slug": sub} if sub else None,
        # DB-resolved labels — the frontend falls back to these when its bundled
        # taxonomy map is older than the DB (prevents raw-id leaks like "q5F8Ns").
        "taxonomyLabels": {
            "category": taxonomy.service_category_label(cat),
            "subcategory": taxonomy.service_category_label(sub),
            "subdivision": taxonomy.service_category_label(div),
        },
        "subdivision": {"slug": div} if div else None,
        "profileSubcategory": {"slug": profile.subcategory} if profile.subcategory else None,
        "coverage": coverage,
        "breadcrumbSegments": breadcrumb_segments,
        "breadcrumbButtons": {
            "subjectTitle": service.title,
            "id": service.id,
            "saveType": "service",
            "ownerId": profile.user_id,
        },
        # About-section source data (resolved to labels on the frontend).
        "budget": profile.budget,
        "size": profile.size,
        "contactMethods": profile.contact_methods or [],
        "paymentMethods": profile.payment_methods or [],
        "settlementMethods": profile.settlement_methods or [],
        "tags": service.tags or [],
        "relatedServices": [_card(s) for s in related_qs],
        "additionalServices": additional_services,
    }
    try:
        from apps.reviews.selectors.review_reads import (
            get_service_review_stats,
            list_service_reviews,
        )
        payload["serviceReviews"] = list_service_reviews(service.id, page=1, limit=10)
        # Other reviews from the same profile's services (get-service.ts:329).
        try:
            from apps.reviews.selectors.review_reads import list_profile_other_service_reviews
            payload["profileOtherReviews"] = list_profile_other_service_reviews(
                profile.id, exclude_service_id=service.id, limit=5
            )
        except (ImportError, AttributeError):
            payload["profileOtherReviews"] = {"reviews": [], "total": 0}
        payload["reviewStats"] = get_service_review_stats(service.id)
    except ImportError:
        payload["serviceReviews"] = {"reviews": [], "total": 0}
        payload["profileOtherReviews"] = {"reviews": [], "total": 0}
        payload["reviewStats"] = {"totalReviews": 0, "averageRating": 0}

    cache.set(cache_key, payload, timeout=60 * 30)
    return payload


# ----- list-style reads (rows 56-58, 62-69, 74) ---------------------------


def get_categories_page(
    *,
    category_slug: str | None = None,
    subcategory_slug: str | None = None,
    limit: int = 15,
) -> dict[str, Any]:
    qs = _public_qs()
    # Services store category/subcategory as cuid ids (live data) or slugs
    # (demo). Filtering by the raw slug matches nothing on live data, leaving the
    # subdivision counts empty (so the frontend can't hide empty subdivisions).
    # Resolve to slug+id candidates like the archive does.
    if category_slug:
        qs = qs.filter(category_node_id__in=_node_ids("category", category_slug))
    if subcategory_slug:
        qs = qs.filter(subcategory_node_id__in=_node_ids("subcategory", subcategory_slug))
    # All-service counts per subdivision — the frontend uses these to hide
    # empty subcategories/subdivisions in the "Κατηγορίες" navigation cards.
    # NOT sliced: the cards need to know about *every* subdivision that has
    # services, not just the top N.
    grouped = (
        qs.exclude(subdivision="")
        .values("subdivision", "subcategory", "category")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    subdivisions = [
        {
            "slug": row["subdivision"],
            "categorySlug": row["category"],
            "subcategorySlug": row["subcategory"],
            "count": row["count"],
        }
        for row in grouped
    ]
    # "Πιο δημοφιλείς εργασίες" carousel = subdivisions that contain FEATURED
    # services (admin-curated, or promoted by a subscriber starring their own
    # service from the dashboard) — this is what the live site shows, NOT a
    # raw service-count ranking. Ordered by how many featured services each
    # subdivision has.
    featured_grouped = (
        qs.filter(featured=True)
        .exclude(subdivision="")
        .values("subdivision", "subcategory", "category")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    featured_subdivisions = [
        {
            "slug": row["subdivision"],
            "categorySlug": row["category"],
            "subcategorySlug": row["subcategory"],
            "count": row["count"],
        }
        for row in featured_grouped
    ]
    return {
        "subdivisions": subdivisions,
        "categories": _categories_with_counts(qs),
        "popularSubdivisions": featured_subdivisions[:limit],
    }


def _categories_with_counts(qs):
    cats: dict[str, dict[str, Any]] = {}
    for row in qs.values("category", "subcategory").annotate(count=Count("id")).order_by("-count"):
        cat = row["category"] or "_uncategorized"
        cats.setdefault(cat, {"slug": cat, "subcategories": []})
        cats[cat]["subcategories"].append({"slug": row["subcategory"], "count": row["count"]})
    return list(cats.values())


def get_popular_service_subcategories(*, limit: int = 8) -> list[dict[str, Any]]:
    """Top SERVICE subcategories by published-service count.

    Port of OLD `get-home-data.ts:258-349`: groupBy subcategory on published
    services (non-empty), count, take top `limit`. Returns thin `{slug, count}`
    refs (+ categorySlug) — the frontend enriches label/href from taxonomy.
    """
    grouped = (
        _public_qs()
        .exclude(subcategory__isnull=True)
        .exclude(subcategory="")
        .values("subcategory", "category")
        .annotate(count=Count("id"))
        .order_by("-count")[:limit]
    )
    return [
        {
            "id": row["subcategory"],
            "slug": row["subcategory"],
            "categorySlug": row["category"],
            "count": row["count"],
        }
        for row in grouped
    ]


def get_navigation_menu_data() -> list[dict[str, Any]]:
    """Mega-menu shape with service counts at each taxonomy level."""
    grouped = (
        _public_qs().values("category", "subcategory", "subdivision")
        .annotate(count=Count("id"))
    )
    out: dict[str, dict[str, Any]] = {}
    for row in grouped:
        cat = row["category"] or "_uncategorized"
        out.setdefault(cat, {"slug": cat, "count": 0, "subcategories": {}})
        out[cat]["count"] += row["count"]
        subs = out[cat]["subcategories"]
        sub = row["subcategory"] or "_"
        subs.setdefault(sub, {"slug": sub, "count": 0, "subdivisions": []})
        subs[sub]["count"] += row["count"]
        if row["subdivision"]:
            subs[sub]["subdivisions"].append({"slug": row["subdivision"], "count": row["count"]})

    return [
        {**cat, "subcategories": list(cat["subcategories"].values())}
        for cat in out.values()
    ]


def get_recent_services_for_user(user: User, *, limit: int = 5) -> dict[str, Any]:
    # Profile's FK to User is named `user` (db_column="uid"). `profile__uid`
    # tried to traverse the FK as a relation, which Django rejects with
    # FieldError. The right lookup is the FK field itself.
    # OLD `get-recent-services.ts` orders by sortDate desc.
    qs = Service.objects.filter(profile__user=user).order_by("-sort_date")[:limit]
    return {"services": [{"id": s.id, "title": s.title} for s in qs]}


def get_featured_services() -> dict[str, Any]:
    """Featured services for the homepage tabs.

    Ports OLD home `get-home-data.ts:171-197`: for each service category fetch
    up to 8 services that are `featured=true` AND have media (`media != null`),
    ordered by `updatedAt desc`. `mainCategories` is the flat list of category
    slugs (the frontend prepends an "all" pill and resolves labels);
    `servicesByCategory` is keyed by category slug; `allServices` is the union.
    """
    categories = taxonomy._service_indexes()["categories"]
    category_slugs = [c["slug"] for c in categories]

    all_services: list[Service] = []
    by_category: dict[str, list] = {}
    for cat in categories:
        # Normalized FK (proven identical to the legacy candidates path).
        cat_services = list(
            _public_qs()
            .filter(category_node_id__in=_node_ids("category", cat["slug"]), featured=True)
            .exclude(media__isnull=True)
            .order_by("-updated_at")[:8]
        )
        # Key by slug — the frontend tabs use the resolved slug as the key.
        by_category[cat["slug"]] = [_card(s) for s in cat_services]
        all_services.extend(cat_services)

    return {
        "mainCategories": category_slugs,
        "servicesByCategory": by_category,
        "allServices": [_card(s) for s in all_services],
    }


def get_services_paginated(*, page: int, limit: int, category: str | None, exclude_featured: bool) -> dict[str, Any]:
    # OLD `getServicesWithPagination` (get-services.ts:291) order:
    # [featured desc, rating desc, reviewCount desc, updatedAt desc].
    qs = _public_qs().order_by("-featured", "-rating", "-review_count", "-updated_at")
    if category and category != "all":
        qs = qs.filter(category=category)
    if exclude_featured:
        qs = qs.filter(featured=False)
    total = qs.count()
    offset = (page - 1) * limit
    rows = list(qs[offset:offset + limit])
    return {"services": [_card(s) for s in rows], "total": total, "hasMore": offset + len(rows) < total}


def search_services(filters: dict[str, Any]) -> dict[str, Any]:
    # P1-2 / CG-5: PUBLISHED is forced. OLD's status override (get-services.ts:
    # 392) was only reachable server-side; this selector backs an AllowAny
    # endpoint, so honouring a caller `status` listed drafts to anyone.
    qs = _public_qs(ServiceStatus.PUBLISHED)
    qs = _apply_filters(qs, filters)
    qs = _apply_sort(qs, filters.get("sortBy"))
    page = _safe_int(filters.get("page"), 1)
    limit = min(100, _safe_int(filters.get("limit"), 20))
    offset = (page - 1) * limit
    total = qs.count()
    # How many services of the SAME profile exist in the WHOLE filtered set
    # (window over the full query, before LIMIT). The archive groups a pro's
    # services into one card; this lets it say «+N ακόμα» for the ones that
    # fall on other pages (user decision 2026-11-06).
    qs = qs.annotate(
        profile_match_count=Window(expression=Count("id"), partition_by=[F("profile_id")]),
    )
    rows = list(qs[offset:offset + limit])
    # OLD always ran shuffleFeatured(services) on the page slice, regardless of
    # sortBy (get-services.ts:583): featured rows are pulled to the front in
    # random order, the rest keep their order.
    featured = [s for s in rows if s.featured]
    rest = [s for s in rows if not s.featured]
    random.shuffle(featured)
    rows = featured + rest
    return {"services": [_card(s) for s in rows], "total": total, "hasMore": offset + len(rows) < total}


def count_services(filters: dict[str, Any]) -> int:
    # OLD `getServicesCount` (get-services.ts:668) counts using ONLY the taxonomy
    # fields (category/subcategory/subdivision) and ignores search/county/online.
    # The key carries every input the count depends on: the (forced) status and
    # all three taxonomy levels. Keying on category|subcategory only let a
    # subdivision-scoped count — or (before the status override was removed) an
    # anonymous {"status":"draft"} call — poison the shared published count for
    # 30 min (pass-4 / pass-6 repro).
    cache_key = "services:count:" + "|".join(
        [ServiceStatus.PUBLISHED]
        + [str(filters.get(k) or "") for k in ("category", "subcategory", "subdivision")]
    )
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    qs = _public_qs(ServiceStatus.PUBLISHED)
    if filters.get("category"):
        qs = qs.filter(category__in=_taxonomy_candidates(filters["category"]))
    if filters.get("subcategory"):
        qs = qs.filter(subcategory__in=_taxonomy_candidates(filters["subcategory"]))
    if filters.get("subdivision"):
        qs = qs.filter(subdivision__in=_taxonomy_candidates(filters["subdivision"]))
    total = qs.count()
    cache.set(cache_key, total, timeout=60 * 30)
    return total


def get_taxonomy_paths() -> list[dict[str, Any]]:
    """Distinct (category, subcategory, subdivision) slug paths used by published
    services, sorted by count desc. Port of OLD `getServiceTaxonomyPaths`
    (get-services.ts:721): convert ids→slugs and sort by count desc.
    """
    grouped = (
        _public_qs().values("category", "subcategory", "subdivision")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    def _slug(value: str | None) -> str | None:
        if not value:
            return None
        # id → slug (live data); pass-through when already a slug.
        return taxonomy._id_to_slug().get(value, value)

    return [
        {
            "category": _slug(row["category"]),
            "subcategory": _slug(row["subcategory"]),
            "subdivision": _slug(row["subdivision"]),
            "count": row["count"],
        }
        for row in grouped
    ]


def get_archive_bundle(
    *,
    category_slug: str | None,
    subcategory_slug: str | None,
    subdivision_slug: str | None,
    limit: int,
    search_params: dict[str, Any],
) -> dict[str, Any]:
    sp = search_params or {}
    filters = {
        "category": category_slug,
        "subcategory": subcategory_slug,
        "subdivision": subdivision_slug,
        "county": sp.get("county"),
        "online": sp.get("online"),
        "search": sp.get("search"),
        "sortBy": sp.get("sortBy"),
        "page": _safe_page(sp.get("page")),
        "limit": limit,
    }
    listing = search_services(filters)

    # Subdivision carousel under the active filters
    sub_qs = _apply_filters(_public_qs(), {**filters, "subdivision": None})
    sub_grouped = (
        sub_qs.exclude(subdivision__isnull=True).exclude(subdivision="")
        .values("subdivision").annotate(count=Count("id"))
        .order_by("-count")[:8]
    )

    breadcrumbs = [{"label": "Αρχική", "href": "/"}, {"label": "Υπηρεσίες", "href": "/s"}]
    if category_slug:
        breadcrumbs.append({"label": category_slug, "href": f"/s/{category_slug}"})
    if subcategory_slug:
        breadcrumbs.append({"label": subcategory_slug, "href": f"/s/{category_slug}/{subcategory_slug}"})
    if subdivision_slug:
        breadcrumbs.append({"label": subdivision_slug, "href": None})

    filter_tax = _archive_filter_taxonomies(subcategory_slug)

    return {
        **listing,
        "taxonomyData": {
            "categories": filter_tax["categories"],
            "currentCategory": {"slug": category_slug} if category_slug else None,
            "currentSubcategory": {"slug": subcategory_slug} if subcategory_slug else None,
            "currentSubdivision": {"slug": subdivision_slug} if subdivision_slug else None,
            # DROP-1 (OLD get-services.ts:1120-1190): the sidebar/drawer lists.
            "subcategories": filter_tax["subcategories"],
            "subdivisions": filter_tax["subdivisions"],
        },
        "breadcrumbs": breadcrumbs,
        "counties": [],
        # Carousel pills (unchanged semantics: top 8 under the active filters).
        "availableSubdivisions": [
            {"slug": row["subdivision"], "count": row["count"]} for row in sub_grouped
        ],
        # DROP-1 / P2-22: the sidebar subcategory list = OLD
        # `filteredSubcategories`: EVERY subcategory that has a published
        # service, in taxonomy order (not filtered, not count-ordered).
        "availableSubcategories": filter_tax["subcategories"],
    }


def _archive_filter_taxonomies(subcategory_slug: str | None) -> dict[str, list[dict[str, Any]]]:
    """Port of OLD get-services.ts:1120-1214 (taxonomyData lists).

    Built from `getServiceTaxonomyPaths()` (ALL published services, global —
    OLD did not scope it to the route or the active filters):
    - subcategories: every subcategory with ≥1 published service, in taxonomy
      order, each carrying only its populated subdivisions as `children`;
    - subdivisions: the populated children of the CURRENT subcategory, in
      taxonomy order ([] when there is no subcategory, e.g. root /ipiresies);
    - categories: categories with services, taxonomy order, first 10.
    """
    paths = get_taxonomy_paths()
    used_subcats = {p["subcategory"] for p in paths if p.get("subcategory")}
    used_cats = {p["category"] for p in paths if p.get("category")}
    divs_by_sub: dict[str, set[str]] = {}
    for p in paths:
        if p.get("subcategory") and p.get("subdivision"):
            divs_by_sub.setdefault(p["subcategory"], set()).add(p["subdivision"])

    def _slim(node: dict[str, Any]) -> dict[str, Any]:
        return {k: v for k, v in node.items() if k != "children"}

    tree = taxonomy._service_indexes()["categories"]
    subcategories: list[dict[str, Any]] = []
    current_sub: dict[str, Any] | None = None
    for cat in tree:
        for sub in cat.get("children") or []:
            if subcategory_slug and current_sub is None and sub.get("slug") == subcategory_slug:
                current_sub = sub
            if sub.get("slug") not in used_subcats:
                continue
            item = _slim(sub)
            kids = sub.get("children") or []
            if kids:
                populated = divs_by_sub.get(sub.get("slug"), set())
                item["children"] = [_slim(d) for d in kids if d.get("slug") in populated]
            subcategories.append(item)

    subdivisions: list[dict[str, Any]] = []
    if current_sub is not None:
        populated = divs_by_sub.get(current_sub.get("slug"), set())
        subdivisions = [_slim(d) for d in current_sub.get("children") or [] if d.get("slug") in populated]

    categories = [_slim(c) for c in tree if c.get("slug") in used_cats][:10]
    return {"categories": categories, "subcategories": subcategories, "subdivisions": subdivisions}


# ----- user dashboard (rows 68-69) ----------------------------------------


def get_user_services_dashboard(user: User, *, query: dict[str, Any]) -> dict[str, Any]:
    qs = Service.objects.filter(profile__user_id=user.id)
    if query.get("status") and query["status"] != "all":
        # P2-38: `services.status` is a PG ENUM — an unknown value raised
        # DataError 22P02 (HTTP 500). Reject it as a 400 instead.
        if query["status"] not in ServiceStatus.values:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"status": ["Μη έγκυρη κατάσταση υπηρεσίας"]})
        qs = qs.filter(status=query["status"])
    if query.get("category"):
        qs = qs.filter(category=query["category"])
    if query.get("subcategory"):
        qs = qs.filter(subcategory=query["subcategory"])
    if query.get("search"):
        # OLD `getUserServices` (get-user-services.ts:104) ORs title +
        # description + matching tag slugs.
        term = query["search"].strip()
        words = [w for w in normalize_term(term).split() if w]
        for w in words:
            cond = Q(title_normalized__icontains=w) | Q(description_normalized__icontains=w)
            tag_slugs = taxonomy.matching_tag_slugs(w)
            if tag_slugs:
                cond |= Q(tags__overlap=tag_slugs)
            qs = qs.filter(cond)
    # OLD sort options include status/category; default → sortDate (desc).
    sort_col = {
        "createdAt": "created_at",
        "updatedAt": "sort_date",
        "rating": "rating",
        "title": "title",
        "status": "status",
        "category": "category",
        "sortDate": "sort_date",
    }.get(query.get("sortBy", "updatedAt"), "sort_date")
    if query.get("sortOrder", "desc") == "desc":
        sort_col = f"-{sort_col}"
    qs = qs.order_by(sort_col)

    # Bare int() 500'd on ?page=x (P3-14); OLD parseInt fallbacks → defaults.
    page = _safe_int(query.get("page"), 1)
    # OLD `getUserServices` default limit is 12 (get-user-services.ts:74).
    limit = min(100, _safe_int(query.get("limit"), 12))
    offset = (page - 1) * limit
    total = qs.count()
    rows = list(qs[offset:offset + limit])

    return {
        "services": [_dashboard_card(s) for s in rows],
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": -(-total // limit),
        "canFeatureMore": _can_feature_more(user),
        "canCreateMore": _can_create_more(user),
        # PR #488: distinguishes "reached limit" from "no subscription" in the UI.
        "hasPromotedPlan": _PLAN_LIMITS[_active_plan(user)]["maxFeaturedServices"] > 0,
        "maxFeaturedServices": _PLAN_LIMITS[_active_plan(user)]["maxFeaturedServices"],
    }


def _safe_page(value: Any) -> int:
    """Coerce ?page= to a sane int — OLD parseInt(searchParams.page || '1')."""
    try:
        return max(1, int(value or 1))
    except (TypeError, ValueError):
        return 1


def _dashboard_card(s: Service) -> dict[str, Any]:
    return {
        "id": s.id,
        "slug": s.slug,
        "title": s.title,
        "status": s.status,
        "category": s.category,
        "subcategory": s.subcategory,
        "featured": s.featured,
        "rating": s.rating,
        "reviewCount": s.review_count,
        "refreshedAt": s.refreshed_at.isoformat() if s.refreshed_at else None,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
        "updatedAt": s.updated_at.isoformat() if s.updated_at else None,
        # OLD get-user-services.ts:30-45 dashboard card extras the services
        # table renders (thumbnail + category labels + sort date).
        "media": getattr(s, "media", None) or [],
        "sortDate": s.sort_date.isoformat() if s.sort_date else None,
        "taxonomyLabels": {
            "category": taxonomy.service_category_label(s.category),
            "subcategory": taxonomy.service_category_label(s.subcategory),
            "subdivision": taxonomy.service_category_label(s.subdivision),
        },
    }


# Plan limits — port of SUBSCRIPTION_PLANS (src/lib/payment/pricing.ts:20).
_PLAN_LIMITS = {
    "free": {"maxServices": 3, "maxFeaturedServices": 0},
    "promoted": {"maxServices": 15, "maxFeaturedServices": 3},
}


def _active_plan(user: User) -> str:
    """promoted if an active promoted subscription exists, else free
    (feature-gate.ts:9 `getActivePlan`)."""
    try:
        from apps.billing.selectors.subscription_selectors import has_active_subscription
        return "promoted" if has_active_subscription(user) else "free"
    except ImportError:
        return "free"


def _can_create_more(user: User) -> bool:
    """Port of `canCreateService` (feature-gate.ts:34): active (published OR
    pending) services count < plan maxServices."""
    limits = _PLAN_LIMITS[_active_plan(user)]
    active_count = Service.objects.filter(
        profile__user_id=user.id, status__in=[ServiceStatus.PUBLISHED, ServiceStatus.PENDING]
    ).count()
    return active_count < limits["maxServices"]


def _can_feature_more(user: User) -> bool:
    """Port of `canFeatureService` (feature-gate.ts:48): featured count < plan
    maxFeaturedServices (free plan = 0 → always False)."""
    limits = _PLAN_LIMITS[_active_plan(user)]
    if limits["maxFeaturedServices"] == 0:
        return False
    current = Service.objects.filter(profile__user_id=user.id, featured=True).count()
    return current < limits["maxFeaturedServices"]


def get_user_services_stats(user: User) -> dict[str, int]:
    qs = Service.objects.filter(profile__user_id=user.id)
    return {
        "total": qs.count(),
        "draft": qs.filter(status=ServiceStatus.DRAFT).count(),
        "pending": qs.filter(status=ServiceStatus.PENDING).count(),
        "published": qs.filter(status=ServiceStatus.PUBLISHED).count(),
        "rejected": qs.filter(status=ServiceStatus.REJECTED).count(),
    }


# ----- search suggestions (row 74) ----------------------------------------


def search_suggestions(query: str) -> dict[str, Any]:
    """Autocomplete: taxonomy + service suggestions.

    Full port of OLD `searchServiceSuggestions` / `performSearch`
    (search-services.ts): min-length guard, normalized term, taxonomy label
    matching gated on "used by a published service", 6-tier service relevance
    ranking, coverage-location extraction, and the exact suggestion object
    shapes the dropdown consumes (`{type,id,label,category,subcategory,
    subdivision,url}` and `{type,id,title,category,slug,url,location,matchType}`).
    """
    if not query or len(query.strip()) < 2:
        return {"taxonomies": [], "services": [], "hasResults": False}

    cache_key = "services:suggest:" + normalize_term(query.strip())
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    search_term = normalize_term(query.strip())

    result = {
        "taxonomies": _suggest_taxonomies(search_term),
        "services": _suggest_services(search_term),
    }
    result["hasResults"] = bool(result["taxonomies"] or result["services"])
    cache.set(cache_key, result, timeout=60 * 5)
    return result


def _suggest_taxonomies(search_term: str) -> list[dict[str, Any]]:
    """Taxonomy suggestions, gated on subcategory/subdivision slugs actually used
    by a published service (search-services.ts:28-146). Subdivisions before
    subcategories; startsWith-first; limit 5."""
    used = (
        _public_qs().values_list("subcategory", "subdivision")
    )
    used_subcats: set[str] = set()
    used_subdivs: set[str] = set()
    # DB values may be slugs or cuid ids; index both forms so the slug-keyed
    # taxonomy walk below matches either.
    for sub, div in used:
        if sub:
            used_subcats.update(taxonomy.taxonomy_value_candidates(sub) or [sub])
        if div:
            used_subdivs.update(taxonomy.taxonomy_value_candidates(div) or [div])

    subdivision_matches: list[dict[str, Any]] = []
    subcategory_matches: list[dict[str, Any]] = []

    for category in taxonomy._service_indexes()["categories"]:
        cat_label = category.get("label")
        for sub in category.get("children") or []:
            sub_slug = sub["slug"]
            children = sub.get("children") or []
            has_used_subdiv = any(c["slug"] in used_subdivs for c in children)
            is_sub_used = sub_slug in used_subcats or has_used_subdiv
            sub_label = sub.get("label") or ""
            if sub_label and search_term in normalize_term(sub_label) and is_sub_used:
                subcategory_matches.append({
                    "type": "taxonomy",
                    "id": sub.get("id") or sub_slug,
                    "label": sub_label,
                    "category": cat_label,
                    "subcategory": sub_slug,
                    "subdivision": "",
                    "url": f"/ipiresies/{sub_slug}",
                })
            for div in children:
                div_label = div.get("label") or ""
                if div_label and search_term in normalize_term(div_label) and div["slug"] in used_subdivs:
                    subdivision_matches.append({
                        "type": "taxonomy",
                        "id": div.get("id") or div["slug"],
                        "label": div_label,
                        "category": cat_label,
                        "subcategory": sub_slug,
                        "subdivision": div["slug"],
                        "url": f"/ipiresies/{sub_slug}/{div['slug']}",
                    })

    def starts_first(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        # Stable sort: items whose label starts with the term come first.
        return sorted(items, key=lambda i: 0 if normalize_term(i["label"]).startswith(search_term) else 1)

    return (starts_first(subdivision_matches) + starts_first(subcategory_matches))[:5]


def _suggest_services(search_term: str) -> list[dict[str, Any]]:
    """Service suggestions with the OLD multi-word search conditions, coverage
    location extraction, and 6-tier relevance ranking (search-services.ts:148-298)."""
    words = [w for w in search_term.split() if len(w) >= 2]
    qs = _public_qs()
    if not words:
        return []
    # AND of per-word ORs (single word collapses to one OR).
    for word in words:
        qs = qs.filter(_build_search_conditions(word))

    rows = list(qs.order_by("-rating", "-review_count")[:100])

    previews: list[dict[str, Any]] = []
    for s in rows:
        profile = s.profile
        coverage = profile.coverage if profile else None
        coverage_norm = (profile.coverage_normalized or "") if profile else ""
        title_norm = s.title_normalized or ""
        desc_norm = s.description_normalized or ""

        matched_location = taxonomy.matching_location_in_coverage(coverage, search_term)

        coverage_match = search_term in coverage_norm
        title_match = search_term in title_norm
        description_match = (not coverage_match and not title_match and search_term in desc_norm)
        tag_match = (
            not coverage_match and not title_match and not description_match
            and bool(s.tags)
        )
        if coverage_match:
            match_type = "coverage"
        elif title_match:
            match_type = "title"
        elif description_match:
            match_type = "description"
        else:
            match_type = "tags"

        previews.append({
            "type": "service",
            "id": s.id,
            "title": s.title,
            "category": taxonomy.service_category_label(s.category) or "Υπηρεσία",
            "slug": s.slug,
            "url": f"/s/{s.slug}" if s.slug else f"/s/{s.id}",
            "location": matched_location,
            "matchType": match_type,
            # ranking helpers (stripped before returning)
            "_titleNorm": title_norm,
            "_tagMatch": tag_match,
        })

    def rank_key(p: dict[str, Any]):
        title_norm = p["_titleNorm"]
        title_starts = title_norm.startswith(search_term)
        word_starts = any(w.startswith(search_term) for w in title_norm.split())
        has_location = bool(p["location"])
        # Lower tuple sorts first. Mirrors the OLD comparator priority order.
        return (
            0 if title_starts else 1,
            0 if word_starts else 1,
            # location boost only when there's no title/word match
            (0 if has_location else 1) if not (title_starts or word_starts) else 0,
            0 if p["matchType"] == "coverage" else 1,
            0 if p["matchType"] == "description" else 1,
            1 if p["matchType"] == "tags" else 0,
        )

    previews.sort(key=rank_key)
    out = previews[:5]
    for p in out:
        p.pop("_titleNorm", None)
        p.pop("_tagMatch", None)
    return out
