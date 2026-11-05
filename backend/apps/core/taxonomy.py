"""Taxonomy label/slug resolution for service search & cards.

Ports the parts of OLD `src/lib/taxonomies/index.ts` that the services + search
domains depend on. Unlike OLD (where the DB stored taxonomy **ids** and these
helpers returned ids for `in` filters), the NEW backend stores taxonomy **slugs**
in `services.category/subcategory/subdivision`, so the label-fuzzy helpers here
return the matching **slugs** (the DB column values) instead of ids. Same intent,
adapted column space.

Source data: the DATABASE, via apps.taxonomy.services.store (version-keyed,
cross-process invalidation). The static seed snapshot is NEVER read at
runtime (user decision 2026-11-05): if the tables are empty, the maps are
empty — fix with `seed_taxonomy`, not with a stale file.
"""
from __future__ import annotations

import functools
from typing import Any

from common.utils.normalize import normalize_term


def _versioned(fn):
    """Memoize per taxonomy VERSION (Redis), not per process-lifetime.

    Replaces lru_cache(maxsize=1): a taxonomy write anywhere (web, celery, a
    management command) bumps the shared version, and every process rebuilds
    on its next call — no cache_clear fan-out needed. Empty results are not
    kept, so an unseeded/briefly-down DB heals without a restart.
    """
    memo: dict[str, Any] = {}

    @functools.wraps(fn)
    def wrapper():
        from apps.taxonomy.services import store

        v = store.current_version()
        if memo.get("v") != v or not memo.get("val"):
            memo["v"] = v
            memo["val"] = fn()
        return memo["val"]

    wrapper.cache_clear = memo.clear  # compat with cache.py's guarded clears
    return wrapper


def _maps() -> dict[str, Any]:
    # DB only — the store memoizes per version; no static fallback (see header).
    from apps.taxonomy.services import store

    return store.get_maps_dict()


def _level_tree(space: str) -> list[dict[str, Any]]:
    """Level-aware category tree for `space` (categories → subcategories →
    subdivisions), in taxonomy display order — the equivalent of OLD
    `getServiceTaxonomies()` / `getProTaxonomies()`.

    CG-1: never derive levels from `bySlug`. That map is keyed by slug, so the
    21 service slug collisions (20 subcategory↔subdivision + `marketing`
    category↔subcategory) collapse onto ONE node and a bySlug walk mis-levels
    them (it yielded 73/437/448 instead of 8/88/490 and dropped the whole
    Μάρκετινγκ category). Sources, in order:
    1. `tree` — present in the DB-built maps (maps_builder), FK-reconstructed.
    2. `hierarchy` + `byId` — the shipped JSON fallback (service space only).
    3. `byId` nodes that are nobody's child (raw nested `children`).
    """
    space_map = _maps().get(space) or {}
    tree = space_map.get("tree")
    if tree:
        return tree

    by_id = space_map.get("byId") or {}
    hierarchy = space_map.get("hierarchy") or {}
    if hierarchy and by_id:
        cats: dict[str, dict[str, Any]] = {}
        subs: dict[str, dict[str, Any]] = {}
        # byId preserves the dataset order; group by the hierarchy levels.
        for nid in by_id:
            h = hierarchy.get(nid) or {}
            if h.get("subdivision") or h.get("subcategory") or not h.get("category"):
                continue
            cats[nid] = {**by_id[nid], "children": []}
        for nid in by_id:
            h = hierarchy.get(nid) or {}
            if h.get("subcategory") == nid and not h.get("subdivision") and h.get("category") in cats:
                node = {**by_id[nid], "children": []}
                subs[nid] = node
                cats[h["category"]]["children"].append(node)
        for nid in by_id:
            h = hierarchy.get(nid) or {}
            if h.get("subdivision") == nid and h.get("subcategory") in subs:
                subs[h["subcategory"]]["children"].append(dict(by_id[nid]))
        return list(cats.values())

    child_ids: set[str] = set()
    for node in by_id.values():
        for ch in node.get("children") or []:
            if isinstance(ch, dict) and ch.get("id") is not None:
                child_ids.add(str(ch["id"]))
    return [n for nid, n in by_id.items() if str(nid) not in child_ids]


@_versioned
def _service_indexes() -> dict[str, Any]:
    """Flat indexes over the LEVEL-AWARE service tree (see `_level_tree`).

    `categories` are the top-level nodes (each carrying `children` =
    subcategories, each carrying `children` = subdivisions), `subcategories` /
    `subdivisions` the flattened lower levels, all in taxonomy order. Expected
    on the live dataset: 8 / 88 / 490.

    `by_slug` stays the flat `bySlug` map (slug → primary node) for the
    label lookups that accept a slug-or-id.
    """
    by_slug: dict[str, dict[str, Any]] = dict(
        (_maps().get("service") or {}).get("bySlug") or {}
    )
    categories: list[dict[str, Any]] = list(_level_tree("service"))
    subcategories: list[dict[str, Any]] = []
    subdivisions: list[dict[str, Any]] = []
    for cat in categories:
        for sub in cat.get("children") or []:
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


@_versioned
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


@_versioned
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


def matching_tag_ids(search_term: str) -> list[str]:
    """Stored tag values whose label contains the (normalized) search term.

    CG-2: exact port of OLD `findMatchingTagIds` (build-search-conditions.ts:
    19-27) — iterates EVERY tag (byId, not the slug-collapsed bySlug) and
    returns the tag **ids**, which is what `services.tags` stores (the create
    form saves `tag.id`, e.g. '23'). The slug is appended too so rows stored
    with slugs (demo seed) still match; it can never collide with a numeric id.
    Used by the archive search + suggestions (`tags__overlap`).
    """
    if not search_term:
        return []
    needle = normalize_term(search_term)
    by_id = (_maps().get("tags") or {}).get("byId") or {}
    out: list[str] = []
    for tid, node in by_id.items():
        label = node.get("label")
        if label and needle in normalize_term(label):
            for v in (str(node.get("id") or tid), node.get("slug")):
                if v and v not in out:
                    out.append(v)
    return out


# ----- pro subcategory label matching (search-conditions parity) ----------


@_versioned
def _pro_subcategories() -> list[dict[str, Any]]:
    # Level-aware (CG-1): walk the pro category tree, never the slug-collapsed
    # bySlug map (13 pro slugs are shared by gender-variant siblings).
    subs: list[dict[str, Any]] = []
    for cat in _level_tree("pro"):
        for sub in cat.get("children") or []:
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


@_versioned
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
