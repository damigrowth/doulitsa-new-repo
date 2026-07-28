"""Taxonomy label/slug resolution for service search & cards.

Ports the parts of OLD `src/lib/taxonomies/index.ts` that the services + search
domains depend on. Unlike OLD (where the DB stored taxonomy **ids** and these
helpers returned ids for `in` filters), the NEW backend stores taxonomy **slugs**
in `services.category/subcategory/subdivision`, so the label-fuzzy helpers here
return the matching **slugs** (the DB column values) instead of ids. Same intent,
adapted column space.

Source data: the prebuilt taxonomy maps shipped for seeding
(`apps/core/management/commands/_taxonomy_maps.json`). Loaded once, cached.
"""
from __future__ import annotations

import functools
import json
from pathlib import Path
from typing import Any

from common.utils.normalize import normalize_term

_MAPS_PATH = Path(__file__).resolve().parent / "management" / "commands" / "_taxonomy_maps.json"


@functools.lru_cache(maxsize=1)
def _maps() -> dict[str, Any]:
    # Single source of truth = the DB (service/pro rebuilt byte-exact via
    # `slug_primary`; see maps_builder + docs/TAXONOMY-DB-MIGRATION.md). Fall back
    # to the shipped JSON only when the tables aren't seeded yet (fresh DB).
    try:
        from apps.taxonomy.services.maps_builder import build_maps

        m = build_maps()
        if (m.get("service") or {}).get("byId"):
            return m
    except Exception:
        pass
    try:
        return json.loads(_MAPS_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


@functools.lru_cache(maxsize=1)
def _service_indexes() -> dict[str, Any]:
    """Build flat slug→node indexes for service categories / subcategories /
    subdivisions by walking the bySlug tree.

    OLD `getServiceTaxonomies()` is the list of categories; each has `children`
    (subcategories), each of which has `children` (subdivisions). Here we flatten
    that tree so callers can do O(1) lookups and label-fuzzy scans.
    """
    svc = (_maps().get("service") or {}).get("bySlug") or {}
    categories: list[dict[str, Any]] = []
    subcategories: list[dict[str, Any]] = []
    subdivisions: list[dict[str, Any]] = []
    by_slug: dict[str, dict[str, Any]] = {}

    # bySlug contains nodes at every level keyed by slug; the category nodes are
    # the ones whose children are subcategories. Walk the category nodes (those
    # present in byCategory) to assign levels deterministically.
    by_category = (_maps().get("service") or {}).get("byCategory") or {}
    category_ids = set(by_category.keys())

    for slug, node in svc.items():
        by_slug[slug] = node

    for slug, node in svc.items():
        if node.get("id") in category_ids:
            categories.append(node)
            for sub in node.get("children") or []:
                subcategories.append(sub)
                for div in sub.get("children") or []:
                    subdivisions.append(div)

    return {
        "by_slug": by_slug,
        "categories": categories,
        "subcategories": subcategories,
        "subdivisions": subdivisions,
    }


# ----- slug ↔ id resolution (taxonomy filters) ----------------------------
#
# The live (production-like) dataset stores taxonomy **ids** (cuids) in
# `services.category/subcategory/subdivision`, while the URL/router sends
# **slugs**. The demo seed stores slugs. To match either, resolve a slug/id to
# the set of equivalent values present across both spaces and filter with
# `__in`. Ports the spirit of OLD `findById`/`findBySlug` slug↔id resolution.


@functools.lru_cache(maxsize=1)
def _slug_to_ids() -> dict[str, list[str]]:
    """slug -> ALL ids that carry that slug.

    Built from `byId` (which holds every node), NOT `bySlug` (which is keyed by
    slug and therefore collapses collisions to a single node). The live taxonomy
    has genuine slug collisions — e.g. a subcategory (`LJFkDj`) and a subdivision
    (`I4GuUq`) both slugged `sxolika-mathimata` — and services are stored against
    either id. A slug must resolve to BOTH so an `__in` filter (archive page)
    matches every service, instead of silently dropping the ones stored against
    the id that lost the `bySlug` race (→ a "no results" page on a non-empty
    subcategory).
    """
    out: dict[str, list[str]] = {}
    for space in ("service", "pro"):
        by_id = (_maps().get(space) or {}).get("byId") or {}
        for nid, node in by_id.items():
            slug = node.get("slug")
            if slug:
                ids = out.setdefault(slug, [])
                if nid not in ids:
                    ids.append(nid)
    return out


@functools.lru_cache(maxsize=1)
def _id_to_slug() -> dict[str, str]:
    out: dict[str, str] = {}
    for space in ("service", "pro"):
        by_id = (_maps().get(space) or {}).get("byId") or {}
        for nid, node in by_id.items():
            slug = node.get("slug")
            if slug:
                out.setdefault(nid, slug)
    return out


def taxonomy_value_candidates(value: str | None) -> list[str]:
    """Every stored form of a taxonomy value, for `__in` filtering.

    Accepts a slug or an id and returns the value plus all equivalent forms
    (deduped): a slug expands to *all* ids that share it (slug collisions), and
    an id expands to its slug. So a query matches rows regardless of whether the
    DB stored slugs or ids — and regardless of which colliding node a row used.
    """
    if not value:
        return []
    out = [value]
    for nid in _slug_to_ids().get(value, []):  # value-as-slug -> all its ids
        if nid not in out:
            out.append(nid)
    i2s = _id_to_slug()
    if value in i2s and i2s[value] not in out:  # value-as-id -> its slug
        out.append(i2s[value])
    return out


def taxonomy_node_ids(space: str, level: str, value: str | None) -> list[str]:
    """FK candidate set: the TaxonomyNode ids at (space, level) matching `value`
    (a slug — or an id). The DB equivalent of `taxonomy_value_candidates`, used
    to filter the Service/Profile `*_node` FKs. Proven row-for-row identical to
    the legacy `__in=taxonomy_value_candidates(...)` path by
    `parity_taxonomy_fks` across all 936 slugs.
    """
    if not value:
        return []
    from django.db.models import Q

    from apps.taxonomy.models import TaxonomyNode

    return list(
        TaxonomyNode.objects.filter(Q(slug=value) | Q(id=value), space=space, level=level)
        .values_list("id", flat=True)
    )


# ----- category label resolution (for card `category` label) --------------


def service_category_label(slug_or_id: str | None) -> str | None:
    """Resolve a service category slug (or id) to its Greek label.

    Mirrors OLD `findServiceById(category)?.label` used by
    `transformServiceForComponent`. Accepts a slug (NEW data) or id (legacy).
    """
    if not slug_or_id:
        return None
    by_slug = _service_indexes()["by_slug"]
    node = by_slug.get(slug_or_id)
    if node:
        return node.get("label")
    by_id = (_maps().get("service") or {}).get("byId") or {}
    node = by_id.get(slug_or_id)
    return node.get("label") if node else None


def tag_label(slug_or_id: str | None) -> str | None:
    """Resolve a tag slug or id to its label.

    Mirrors OLD `findTagById(name) || findTagBySlug(name)` used by
    `getServiceStats` topTag resolution (admin/services.ts:1606-1611). Services
    store tag slugs (NEW) or ids (legacy); try byId first, then bySlug.
    """
    if not slug_or_id:
        return None
    tags = _maps().get("tags") or {}
    by_id = tags.get("byId") or {}
    node = by_id.get(str(slug_or_id))
    if node:
        return node.get("label")
    by_slug = tags.get("bySlug") or {}
    node = by_slug.get(str(slug_or_id))
    return node.get("label") if node else None


# ----- label-fuzzy slug matching (search) ---------------------------------


def matching_service_subcategory_slugs(search_term: str) -> list[str]:
    """Subcategory slugs whose label contains the (normalized) search term.

    Ports OLD `findMatchingServiceSubcategoryIds` but returns slugs (the NEW DB
    column). Used so typing a Greek subcategory label surfaces its services.
    """
    if not search_term:
        return []
    needle = normalize_term(search_term)
    out: list[str] = []
    for sub in _service_indexes()["subcategories"]:
        label = sub.get("label")
        if label and needle in normalize_term(label):
            out.append(sub["slug"])
    return out


def matching_service_subdivision_slugs(search_term: str) -> list[str]:
    """Subdivision slugs whose label contains the (normalized) search term.

    Ports OLD `findMatchingSubdivisionIds` (returns slugs in NEW column space).
    """
    if not search_term:
        return []
    needle = normalize_term(search_term)
    out: list[str] = []
    for div in _service_indexes()["subdivisions"]:
        label = div.get("label")
        if label and needle in normalize_term(label):
            out.append(div["slug"])
    return out


def matching_tag_slugs(search_term: str) -> list[str]:
    """Tag slugs whose label contains the (normalized) search term.

    Ports OLD `findMatchingTagIds` (build-search-conditions.ts:19) but returns
    tag slugs, since NEW `services.tags` is a slug/text array.
    """
    if not search_term:
        return []
    needle = normalize_term(search_term)
    tags = (_maps().get("tags") or {}).get("bySlug") or {}
    out: list[str] = []
    for slug, node in tags.items():
        label = node.get("label")
        if label and needle in normalize_term(label):
            out.append(slug)
    return out


# ----- pro subcategory label matching (search-conditions parity) ----------


@functools.lru_cache(maxsize=1)
def _pro_subcategories() -> list[dict[str, Any]]:
    pro = (_maps().get("pro") or {}).get("bySlug") or {}
    by_category = (_maps().get("pro") or {}).get("byCategory") or {}
    category_ids = set(by_category.keys())
    subs: list[dict[str, Any]] = []
    for slug, node in pro.items():
        if node.get("id") in category_ids:
            for sub in node.get("children") or []:
                subs.append(sub)
    return subs


def matching_pro_subcategory_slugs(search_term: str) -> list[str]:
    """Pro subcategory slugs matching the label OR plural form.

    Ports OLD `findMatchingProSubcategoryIds` (singular label + plural form).
    Returns slugs (NEW `profiles.subcategory` column).
    """
    if not search_term:
        return []
    needle = normalize_term(search_term)
    out: list[str] = []
    for sub in _pro_subcategories():
        label = sub.get("label")
        if label and needle in normalize_term(label):
            out.append(sub["slug"])
            continue
        plural = sub.get("plural")
        if plural and needle in normalize_term(plural):
            out.append(sub["slug"])
    return out


# ----- coverage → matched location name (search location label) -----------


@functools.lru_cache(maxsize=1)
def _location_id_to_name() -> dict[str, str]:
    """id → Greek name, matching the OLD app's `getLocationName` priority:
    **top-level COUNTY first, then AREA** — so collision ids resolve like the
    live site (e.g. id 54 = county "Πανελλαδικά" AND area "Άθυρα" → "Πανελλαδικά").

    We walk the `location.tree` (the curated counties→areas→zipcodes structure,
    same as the FE `locationOptions`) by LEVEL: register every county (level 0)
    first, then every area (level 1); first-occurrence wins so a county always
    beats a colliding area/postcode id. Postcodes (level 2) are skipped — coverage
    only references county/area ids. Falls back to the bySlug walk if no tree.
    """
    loc = _maps().get("location") or {}
    out: dict[str, str] = {}

    tree = loc.get("tree") or []
    if tree:
        def _collect(nodes: list, level: int, want: int) -> None:
            for n in nodes:
                if level == want:
                    nid = str(n.get("id"))
                    name = n.get("name") or n.get("label")
                    if name and nid not in out:
                        out[nid] = name
                elif level < want:
                    _collect(n.get("children") or [], level + 1, want)

        _collect(tree, 0, 0)  # counties first (top-level)
        _collect(tree, 0, 1)  # then areas
        return out

    # Fallback (no tree available): the original bySlug walk.
    by_slug = loc.get("bySlug") or {}

    def _walk(node: dict[str, Any], depth: int) -> None:
        nid = str(node.get("id"))
        name = node.get("name") or node.get("label")
        if name and depth <= 1 and nid not in out:
            out[nid] = name
        if depth <= 1:
            for ch in node.get("children") or []:
                _walk(ch, depth + 1)

    for node in by_slug.values():
        _walk(node, 0)
    return out


def _location_name(loc_id: str | None) -> str | None:
    if not loc_id:
        return None
    return _location_id_to_name().get(str(loc_id))


def matching_location_in_coverage(coverage: Any, search_term: str) -> str | None:
    """Greek location name from `coverage.areas`/`counties` matching the term.

    Ports OLD `findMatchingLocationInCoverage` — areas first (more specific),
    then counties. `search_term` must already be normalized.
    """
    if not isinstance(coverage, dict) or not search_term:
        return None
    for area_id in coverage.get("areas") or []:
        name = _location_name(area_id)
        if name and search_term in normalize_term(name):
            return name
    for county_id in coverage.get("counties") or []:
        name = _location_name(county_id)
        if name and search_term in normalize_term(name):
            return name
    return None


def transform_coverage_location_names(coverage: Any) -> dict[str, Any] | None:
    """Resolve coverage id arrays into a display object with location names.

    A lightweight port of OLD `transformCoverageWithLocationNames` enough for the
    archive card: produces `countyAreasMap` = [{county, areas:[...]}] using Greek
    names, plus echoes the raw flags. The frontend card reads
    `profile.coverage` + `profile.groupedCoverage` (= countyAreasMap).
    """
    if not isinstance(coverage, dict):
        return None
    counties = coverage.get("counties") or ([coverage["county"]] if coverage.get("county") else [])
    areas = coverage.get("areas") or ([coverage["area"]] if coverage.get("area") else [])
    area_names = [n for n in (_location_name(a) for a in areas) if n]
    county_names = [n for n in (_location_name(c) for c in counties) if n]
    county_areas_map = [
        {"county": cn, "areas": area_names} for cn in county_names
    ]
    return {
        "online": coverage.get("online", False),
        "onbase": coverage.get("onbase", False),
        "onsite": coverage.get("onsite", False),
        "counties": county_names,
        "areas": area_names,
        "countyAreasMap": county_areas_map,
    }
