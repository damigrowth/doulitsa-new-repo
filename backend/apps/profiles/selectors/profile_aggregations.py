"""Profile aggregations: search, count, directory, archive, page bundle.

Mirrors `actions/profiles/{get-profiles,get-directory,get-profile}.ts`.

Search uses the pre-computed *_normalized columns (taglineNormalized,
bioNormalized, displayNameNormalized, coverageNormalized) for accent-
insensitive matching — these are populated by the update services using
`common.utils.normalize.normalize_term`.

Coverage JSON filtering uses Postgres JSONB path operators via Django's
JSONField lookups. The Prisma JSON column maps to JSONField transparently
because the underlying PG type is jsonb.
"""
from __future__ import annotations

import random
from typing import Any

from django.core.cache import cache
from django.db.models import Count, Q, QuerySet

from apps.core.taxonomy import (
    matching_pro_subcategory_slugs,
    taxonomy_node_ids,
    taxonomy_value_candidates,
)
from apps.profiles.models import Profile
from apps.profiles.selectors.profile_reads import serialize_profile_card, serialize_profile_summary
from common.utils.normalize import normalize_term

# Sentinel coverage ID meaning "all of Greece" in the Next.js taxonomy.
NATIONWIDE_COUNTY_ID = "_all"


# ----- Filter helpers -----------------------------------------------------


def _apply_user_join_filters(qs: QuerySet[Profile], role: str | None) -> QuerySet[Profile]:
    """Replicate the Prisma `user: { role, blocked, confirmed }` join filter."""
    qs = qs.filter(user__blocked=False, user__confirmed=True)
    if role:
        qs = qs.filter(user__role=role)
    return qs


def _apply_taxonomy_filters(
    qs: QuerySet[Profile],
    *,
    category: str | None,
    subcategory: str | list[str] | None,
) -> QuerySet[Profile]:
    # Normalized FK filtering (PRO space) — row-for-row identical to the legacy
    # candidates path (proven by parity_taxonomy_fks).
    if category:
        qs = qs.filter(category_node_id__in=_pro_node_ids("category", category))
    if subcategory:
        qs = qs.filter(subcategory_node_id__in=_pro_node_ids("subcategory", subcategory))
    return qs


def _pro_node_ids(level: str, value: Any) -> list[str]:
    """PRO-space TaxonomyNode ids matching a taxonomy value (or list), at
    `level`. FK equivalent of the legacy candidates path."""
    values = value if isinstance(value, list) else [value]
    out: list[str] = []
    for v in values:
        out.extend(taxonomy_node_ids("pro", level, v))
    return out


def _county_coverage_q(county: str) -> Q:
    """Match a profile whose coverage references `county` (a slug, county id, or
    area slug). The frontend sends a *slug*; coverage stores *ids*, so resolve
    first. Matches county/counties/area/areas + nationwide sentinels.
    """
    from apps.core.locations import NATIONWIDE_IDS, resolve_to_county_id

    loc_id = resolve_to_county_id(county) or str(county)
    cond = (
        Q(coverage__county=loc_id)
        | Q(coverage__counties__contains=[loc_id])
        | Q(coverage__area=loc_id)
        | Q(coverage__areas__contains=[loc_id])
    )
    for nw in NATIONWIDE_IDS:
        cond |= Q(coverage__counties__contains=[nw]) | Q(coverage__county=nw)
    return cond


def _apply_coverage_filters(
    qs: QuerySet[Profile],
    *,
    county_id: str | None,
    online: bool | None,
) -> QuerySet[Profile]:
    """Coverage matching mirrors the TS code (get-profiles.ts:122-206):

    OLD distinguishes `online === undefined` (no filter) from an explicit
    boolean. When `online` is set, it filters `coverage.online === online`
    (so `online=false` actively selects non-online profiles).

    - online set + county → online (truthy) profiles OR county-based profiles;
      when county resolution fails, fall back to `coverage.online == online`
    - online set, no county → `coverage.online == online`
    - county only → coverage references the county (or nationwide)
    """
    online_set = online is not None
    if online_set and county_id:
        # OLD only ORs the *truthy* online branch with the county branch
        # (get-profiles.ts:128-162); the false fallback only applies when the
        # county can't be resolved, which _county_coverage_q handles by always
        # producing a condition. Match the truthy-OR semantics here.
        if online:
            return qs.filter(Q(coverage__online=True) | _county_coverage_q(county_id))
        # online=false + county: OLD's OR uses `equals: true` for the online
        # branch regardless, so a false `online` only matters in the no-county
        # path. With a county present we still match county-based profiles.
        return qs.filter(Q(coverage__online=True) | _county_coverage_q(county_id))
    if online_set:
        return qs.filter(coverage__online=bool(online))
    if county_id:
        return qs.filter(_county_coverage_q(county_id))
    return qs


def _pro_subcategory_value_candidates(word: str) -> list[str]:
    """Stored `profiles.subcategory` values for pro-subcategory nodes whose
    label/plural matches `word`. Expands each matching slug to slug+id forms so
    the filter hits whether the column stored a slug (demo) or a cuid id (live).

    FK equivalent of OLD `findMatchingProSubcategoryIds(word)` —
    build-search-conditions.ts:80-85 ORs `profile.subcategory IN (ids)`.
    """
    out: list[str] = []
    for slug in matching_pro_subcategory_slugs(word):
        for cand in taxonomy_value_candidates(slug):
            if cand not in out:
                out.append(cand)
    return out


def _profile_search_conditions(word: str, original: str | None = None) -> Q:
    """Port of OLD `buildProfileSearchConditions` (build-search-conditions.ts:100).

    OR over: displayNameNormalized, taglineNormalized, bioNormalized, username,
    and pro-subcategory matches (singular + plural label). When `original` (the
    accented term) is given — single-word path only — also OR the raw accented
    display_name/tagline/bio for profiles whose normalized columns are empty.
    """
    cond = (
        Q(display_name_normalized__icontains=word)
        | Q(tagline_normalized__icontains=word)
        | Q(bio_normalized__icontains=word)
        | Q(username__icontains=word)
    )
    if original:
        cond |= (
            Q(display_name__icontains=original)
            | Q(tagline__icontains=original)
            | Q(bio__icontains=original)
        )
    sub_cands = _pro_subcategory_value_candidates(word)
    if sub_cands:
        cond |= Q(subcategory__in=sub_cands)
    return cond


def _apply_search_filter(qs: QuerySet[Profile], search: str | None) -> QuerySet[Profile]:
    """Multi-word AND search (accent-insensitive), mirroring OLD `buildSearchFilter`
    + `buildProfileSearchConditions`.

    - terms shorter than 2 chars are ignored (build-search-filter.ts:27,32);
    - single word: one OR group incl. the raw accented fallback fields;
    - multi-word: each word is its own OR group (AND'd), no accented fallback.
    Pro-subcategory ids are resolved once per word (not per row).
    """
    if not search or len(search.strip()) < 2:
        return qs
    words = [w for w in normalize_term(search.strip()).split() if len(w) >= 2]
    if not words:
        return qs
    if len(words) == 1:
        # Single word: pass the raw trimmed term so the accented fallback applies.
        return qs.filter(_profile_search_conditions(words[0], original=search.strip()))
    for word in words:
        qs = qs.filter(_profile_search_conditions(word))
    return qs


# ----- Sort options -------------------------------------------------------


_SORT_MAP = {
    "recent": ("-updated_at",),
    "oldest": ("updated_at",),
    "price_asc": ("rate",),
    "price_desc": ("-rate",),
    "rating_high": ("-rating", "-review_count"),
    "rating_low": ("rating", "review_count"),
}


def _apply_sort(qs: QuerySet[Profile], sort_by: str | None) -> QuerySet[Profile]:
    if sort_by in _SORT_MAP:
        return qs.order_by(*_SORT_MAP[sort_by])
    # Default: featured first, then most recent
    return qs.order_by("-featured", "-updated_at")


# ----- Public API ---------------------------------------------------------


def list_profiles_by_filters(filters: dict[str, Any]) -> dict[str, Any]:
    """Mirrors `getProfilesByFilters` (tracker row 44)."""
    qs = Profile.objects.select_related("user").filter(
        published=filters.get("published", True),
        is_active=True,
    )
    qs = _apply_user_join_filters(qs, filters.get("role"))
    qs = _apply_taxonomy_filters(qs, category=filters.get("category"), subcategory=filters.get("subcategory"))
    qs = _apply_coverage_filters(
        qs,
        county_id=filters.get("county"),
        online=filters.get("online"),
    )
    qs = _apply_search_filter(qs, filters.get("search"))
    qs = _apply_sort(qs, filters.get("sortBy"))

    page = max(1, int(filters.get("page") or 1))
    limit = max(1, min(100, int(filters.get("limit") or 20)))
    offset = (page - 1) * limit

    total = qs.count()
    rows = list(qs[offset:offset + limit])

    # Default-sort variant: shuffle featured profiles within their bucket so
    # the front page rotates. Mirrors the random-shuffle tweak in the TS code.
    if filters.get("sortBy") in (None, "", "default"):
        featured = [p for p in rows if p.featured]
        non_featured = [p for p in rows if not p.featured]
        random.shuffle(featured)
        rows = featured + non_featured

    return {
        "profiles": [serialize_profile_card(p) for p in rows],
        "total": total,
        "hasMore": offset + len(rows) < total,
    }


def count_profiles_by_filters(filters: dict[str, Any]) -> int:
    """Mirrors `getProfilesCount` (tracker row 45). Cached 30 min.

    OLD's count where-clause is deliberately MINIMAL: only published +
    isActive + user(role/blocked/confirmed) + category + subcategory. It does
    NOT apply coverage/online/search (get-profiles.ts:375-402). Replicate that
    — counting with the location/search filters would yield different totals.
    """
    cache_key = _profile_count_cache_key(filters)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    qs = Profile.objects.select_related("user").filter(
        published=filters.get("published", True),
        is_active=True,
    )
    qs = _apply_user_join_filters(qs, filters.get("role"))
    qs = _apply_taxonomy_filters(qs, category=filters.get("category"), subcategory=filters.get("subcategory"))
    # NOTE: intentionally no coverage/online/search filters — matches OLD.
    total = qs.count()

    cache.set(cache_key, total, timeout=60 * 30)
    return total


def _profile_count_cache_key(filters: dict[str, Any]) -> str:
    # Cache key mirrors OLD `ProfileCacheKeys.counts` which keys only on
    # category + subcategory (get-profiles.ts:404-407).
    subcategory = filters.get("subcategory")
    if isinstance(subcategory, list):
        subcategory = subcategory[0] if subcategory else ""
    parts = [
        filters.get("category", "") or "",
        subcategory or "",
        filters.get("role", "") or "",
    ]
    return "profiles:count:" + "|".join(parts)


# ----- Directory (row 40) -------------------------------------------------


def directory_data(
    *,
    limit: int = 15,
    category_slug: str | None = None,
    subcategory_slug: str | None = None,
) -> dict[str, Any]:
    """Mirrors `getDirectoryPageData`. Cached 2h.

    Note: category/subcategory taxonomy resolution requires the taxonomy app's
    dataset (categories/subcategories with labels + slugs). Until that lands
    we return raw subcategory IDs + counts. The frontend falls back gracefully
    because the same shape is used by the existing Next.js pages.
    """
    cache_key = f"profiles:directory:{category_slug or '_'}:{subcategory_slug or '_'}:{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    qs = (
        Profile.objects
        .filter(published=True, is_active=True)
        .exclude(subcategory__isnull=True)
        .exclude(subcategory="")
    )
    grouped = (
        qs.values("subcategory", "category")
          .annotate(count=Count("id"))
          .order_by("-count")
    )

    popular_subcategories = [
        {
            "id": row["subcategory"],
            "label": row["subcategory"],
            "slug": row["subcategory"],
            "categorySlug": row["category"],
            "subcategorySlug": row["subcategory"],
            "count": row["count"],
            "href": f"/dir/{row['category']}/{row['subcategory']}" if row["category"] else f"/dir/{row['subcategory']}",
            "type": None,
        }
        for row in grouped[:limit]
    ]

    # Group by category for the categories list (similar to the TS code).
    cats: dict[str, dict[str, Any]] = {}
    for row in grouped:
        cat = row["category"] or "_uncategorized"
        cats.setdefault(cat, {
            "id": cat, "label": cat, "slug": cat,
            "description": None, "icon": None, "image": None,
            "href": f"/dir/{cat}",
            "subcategories": [],
        })
        cats[cat]["subcategories"].append({
            "id": row["subcategory"],
            "label": row["subcategory"],
            "slug": row["subcategory"],
            "count": row["count"],
            "href": f"/dir/{cat}/{row['subcategory']}",
            "type": None,
            "image": None,
        })

    payload = {
        "popularSubcategories": popular_subcategories,
        "categories": [
            {**c, "subcategories": c["subcategories"][:10]}
            for c in cats.values()
            if c["subcategories"]
        ],
    }
    cache.set(cache_key, payload, timeout=60 * 60 * 2)
    return payload


# ----- Archive (row 46) ---------------------------------------------------


def archive_data(
    *,
    archive_type: str = "pros",
    category_slug: str | None = None,
    subcategory_slug: str | None = None,
    limit: int = 20,
    search_params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Mirrors `getProfileArchivePageData`. Combines list + taxonomy + counts.

    archive_type ∈ {pros, companies, directory}. For 'directory' the type
    comes from search_params['type'] (pros|companies).
    """
    sp = search_params or {}
    role = None
    if archive_type == "pros":
        role = "freelancer"
    elif archive_type == "companies":
        role = "company"
    elif archive_type == "directory":
        sp_type = sp.get("type")
        if sp_type == "pros":
            role = "freelancer"
        elif sp_type == "companies":
            role = "company"

    # OLD maps `online === 'true' || online === '' → true : undefined`
    # (get-profiles.ts:596-599). Anything else (incl. 'false') becomes
    # undefined → no online filter.
    online_param = sp.get("online")
    online = True if online_param in ("true", "", True) else None

    filters = {
        "category": category_slug,
        "subcategory": subcategory_slug,
        "role": role,
        "published": True,
        "county": sp.get("county") or sp.get("περιοχή"),
        "online": online,
        "search": sp.get("search"),
        "sortBy": sp.get("sortBy"),
        "page": _safe_page(sp.get("page")),
        "limit": limit,
    }
    listing = list_profiles_by_filters(filters)

    # Available subcategory carousel: count profiles by subcategory under the
    # active filters, exclude current subcategory, take top 5.
    sub_qs = Profile.objects.filter(
        published=True, is_active=True, user__blocked=False, user__confirmed=True,
    )
    if role:
        sub_qs = sub_qs.filter(user__role=role)
    if category_slug:
        sub_qs = sub_qs.filter(category_node_id__in=_pro_node_ids("category", category_slug))
    # Match OLD: when location/online/search filters are active, the carousel
    # reflects them too, so it only offers subcategories that still have results
    # under the current filters (no-ops when those filters are empty).
    sub_qs = _apply_coverage_filters(sub_qs, county_id=filters["county"], online=filters["online"])
    sub_qs = _apply_search_filter(sub_qs, filters["search"])
    if subcategory_slug:
        sub_qs = sub_qs.exclude(subcategory_node_id__in=_pro_node_ids("subcategory", subcategory_slug))
    sub_grouped = (
        sub_qs.exclude(subcategory__isnull=True)
              .exclude(subcategory="")
              .values("subcategory")
              .annotate(count=Count("id"))
              .order_by("-count")[:5]
    )
    available_subcategories = [
        {
            "id": row["subcategory"],
            "label": row["subcategory"],
            "slug": row["subcategory"],
            "count": row["count"],
            "categorySlug": category_slug,
            "subcategorySlug": row["subcategory"],
            "href": f"/dir/{category_slug}/{row['subcategory']}" if category_slug else f"/dir/{row['subcategory']}",
        }
        for row in sub_grouped
    ]

    # Breadcrumbs (raw slugs — taxonomy app will enrich labels later).
    breadcrumbs = [{"label": "Αρχική", "href": "/"}, {"label": _archive_label(archive_type), "href": "/dir" if archive_type == "directory" else f"/dir?type={archive_type}"}]
    if category_slug:
        breadcrumbs.append({"label": category_slug, "href": f"/{archive_type}/{category_slug}"})
    if subcategory_slug:
        breadcrumbs.append({"label": subcategory_slug, "href": None})

    return {
        **listing,
        "taxonomyData": {
            "categories": [],  # taxonomy app populates this
            "currentCategory": {"slug": category_slug} if category_slug else None,
            "currentSubcategory": {"slug": subcategory_slug} if subcategory_slug else None,
            "subcategories": [],
        },
        "breadcrumbData": {"segments": breadcrumbs},
        "counties": [],  # taxonomy app populates this
        "filters": {
            "county": filters["county"],
            "online": filters["online"],
            "search": filters["search"],
            "sortBy": filters["sortBy"],
            "type": sp.get("type"),
        },
        "availableSubcategories": available_subcategories,
    }


def _safe_page(value) -> int:
    """Coerce ?page= to a sane int — OLD parseInt(searchParams.page || '1')."""
    try:
        return max(1, int(value or 1))
    except (TypeError, ValueError):
        return 1


def _archive_label(archive_type: str) -> str:
    # OLD get-profiles.ts:744-751 breadcrumb labels.
    return {
        "pros": "Επαγγελματίες",
        "companies": "Επιχειρήσεις",
        "directory": "Επαγγελματικός Κατάλογος",
    }.get(archive_type, archive_type)


# ----- Profile page bundle (row 43) ---------------------------------------


def profile_page_bundle(username: str) -> dict[str, Any] | None:
    """Mirrors `getProfilePageData`. Returns the heavy detail-page bundle.

    Includes: profile, services list, review summary stats. Skill/category
    label resolution comes from the taxonomy app once it lands.
    """
    # OLD keys the page on the EXACT username (get-profile.ts:195 uses an exact
    # `username` match, not case-insensitive). Keep the raw username in the key.
    cache_key = f"profile:page:{username}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    profile = (
        Profile.objects
        .select_related("user")
        .filter(
            username=username,
            published=True,
            is_active=True,
            user__blocked=False,
            user__confirmed=True,
        )
        .first()
    )
    if profile is None:
        return None

    # OLD rejects profiles whose user.role isn't a pro role
    # (get-profile.ts:239-244: 'Invalid profile type').
    if profile.user.role not in ("freelancer", "company"):
        return None

    services_payload: list[dict[str, Any]] = []
    services_count = 0
    try:
        from apps.services.models import Service  # type: ignore

        # OLD returns ALL published services (no cap), ordered by sortDate desc
        # (get-profile.ts:331-348).
        services_qs = Service.objects.filter(profile=profile, status="published").order_by("-sort_date")
        services_count = services_qs.count()
        services_payload = [_brief_service(s) for s in services_qs]
    except ImportError:
        # services app not migrated yet — return empty list, frontend tolerates
        pass

    reviews_payload: dict[str, Any] = {"reviews": [], "total": 0}
    review_stats: dict[str, Any] = {"totalReviews": 0, "averageRating": 0}
    try:
        from apps.reviews.selectors.review_reads import (  # type: ignore
            get_profile_review_stats,
            list_profile_reviews,
        )

        reviews_payload = list_profile_reviews(profile.id, page=1, limit=10)
        review_stats = get_profile_review_stats(profile.id)
    except ImportError:
        pass

    payload = {
        # The public profile page shows a (visibility-gated) contact email.
        # OLD selected the linked `user.email` (get-profile.ts:208) and the
        # frontend reveals it only when `visibility.email === true`. Attach it
        # here on the page bundle only — NOT in the shared card serializer — so
        # archive/search cards never carry the email.
        "profile": {
            **serialize_profile_summary(profile),
            "email": profile.email,
            "user": {"email": profile.user.email} if profile.user_id else None,
        },
        "category": {"slug": profile.category} if profile.category else None,
        "subcategory": {"slug": profile.subcategory} if profile.subcategory else None,
        "skillsData": [{"id": s, "slug": s, "label": s} for s in (profile.skills or [])],
        "specialityData": {"id": profile.speciality, "slug": profile.speciality, "label": profile.speciality} if profile.speciality else None,
        "coverage": profile.coverage,
        "visibility": profile.visibility or {},
        "socials": profile.socials or {},
        # OLD: getYearsOfExperience(commencement, experience) || 0
        # (get-profile.ts:303): prefer stored experience, else
        # currentYear - parseInt(commencement), else 0.
        "calculatedExperience": _calculated_experience(profile),
        "services": services_payload,
        "servicesCount": services_count,
        # Subdivisions the pro offers — distinct slugs pulled from their
        # published services. Labels are resolved frontend-side from the
        # taxonomy dataset (this selector doesn't carry the label map).
        "serviceSubdivisionsData": [
            {"id": s, "slug": s}
            for s in {
                row.get("subdivision") for row in services_payload
                if row.get("subdivision")
            }
        ],
        "breadcrumbSegments": [
            {"label": "Αρχική", "href": "/"},
            {"label": "Επαγγελματικός Κατάλογος", "href": "/directory"},
            *([{"label": profile.category, "href": f"/dir/{profile.category}"}] if profile.category else []),
            *([{"label": profile.subcategory, "href": None}] if profile.subcategory else []),
        ],
        "breadcrumbButtons": {
            "subjectTitle": profile.display_name or profile.username,
            "id": profile.id,
            "saveType": "profile",
            "ownerId": profile.user_id,
        },
        "reviews": reviews_payload,
        "reviewStats": review_stats,
    }
    cache.set(cache_key, payload, timeout=60 * 30)
    return payload


def _calculated_experience(profile: Profile) -> int:
    """Mirror OLD `getYearsOfExperience(commencement, experience) || 0`.

    Prefer the stored `experience`; otherwise compute
    `currentYear - parseInt(commencement)`; fall back to 0.
    """
    if profile.experience is not None:
        return profile.experience
    if profile.commencement:
        import re
        from datetime import date

        m = re.match(r"\s*([+-]?\d+)", str(profile.commencement))
        if m:
            return date.today().year - int(m.group(1))
    return 0


def _brief_service(service: Any) -> dict[str, Any]:
    return {
        "id": service.id,
        "slug": service.slug,
        "title": service.title,
        "category": service.category,
        "subcategory": service.subcategory,
        "subdivision": getattr(service, "subdivision", None),
        "rating": service.rating,
        "reviewCount": service.review_count,
        "price": service.price,
        "media": service.media,
    }
