"""Location (county/area) slug → id resolution.

Ports OLD `src/lib/taxonomies/index.ts:resolveToCountyId`. Coverage JSON on
profiles/services stores location **IDs** (`county`, `counties[]`, `area`,
`areas[]`), but the frontend filters by a **slug**. We resolve the slug to the
owning county id (and the slug's own id) so coverage filtering actually matches.

Source data: the prebuilt taxonomy maps shipped for seeding
(`apps/core/management/commands/_taxonomy_maps.json` → `location.bySlug`), which
carry the full county→area→postcode tree. Loaded once and cached in-process.
"""
from __future__ import annotations

import functools
import json
from pathlib import Path

_MAPS_PATH = Path(__file__).resolve().parent / "management" / "commands" / "_taxonomy_maps.json"

# "Πανελλαδικά / nationwide" sentinels seen in coverage.counties across the data:
# the Next.js taxonomy used "_all"; the legacy prefecture list used "54".
NATIONWIDE_IDS = ("_all", "54")


@functools.lru_cache(maxsize=1)
def _id_to_name() -> dict[str, str]:
    """Map every location id → its display name, from the prebuilt `byId` index.

    Ports OLD `getLocationName` (datasets.ts:817-850), which searched counties,
    areas, and zipcodes by id and returned the node's `name`. The shipped
    `_taxonomy_maps.json -> location.byId` already flattens the whole
    county→area→postcode tree keyed by id. Sourced from the DB (Location table);
    falls back to the shipped JSON only when the table isn't seeded yet.
    """
    try:
        from apps.taxonomy.models import Location

        out = {str(i): str(n) for i, n in Location.objects.values_list("id", "name") if n}
        if out:
            return out
    except Exception:
        pass
    try:
        data = json.loads(_MAPS_PATH.read_text(encoding="utf-8")).get("location", {})
    except (OSError, ValueError):
        return {}
    by_id: dict = data.get("byId", {}) or {}
    return {
        str(nid): str(node["name"])
        for nid, node in by_id.items()
        if isinstance(node, dict) and node.get("name") is not None
    }


def location_name_for_id(location_id) -> str | None:
    """Resolve a location id → its name (county/area/zipcode). Mirrors OLD
    `getLocationName` (datasets.ts:817-850): returns None for falsy ids or
    unknown ids."""
    if not location_id:
        return None
    return _id_to_name().get(str(location_id))


@functools.lru_cache(maxsize=1)
def _maps() -> tuple[dict, dict]:
    """Return (slug_to_id, id_to_parent). Built once per process.

    `id_to_parent` maps each location id → its immediate parent id. Sourced from
    the DB (Location.slugs / .parent_id, which were seeded from the same walk),
    falling back to the JSON walk only when the table isn't seeded yet.
    """
    try:
        from apps.taxonomy.models import Location

        slug_to_id: dict[str, str] = {}
        id_to_parent: dict[str, str] = {}
        for lid, pid, slugs in Location.objects.values_list("id", "parent_id", "slugs"):
            sid = str(lid)
            if pid:
                id_to_parent[sid] = str(pid)
            for s in slugs or []:
                slug_to_id[s] = sid
        if slug_to_id or id_to_parent:
            return slug_to_id, id_to_parent
    except Exception:
        pass

    # JSON fallback (original tree walk).
    try:
        data = json.loads(_MAPS_PATH.read_text(encoding="utf-8")).get("location", {})
    except (OSError, ValueError):
        return {}, {}
    by_slug: dict = data.get("bySlug", {}) or {}
    slug_to_id = {}
    id_to_parent = {}

    def _walk(node: dict) -> None:
        nid = str(node.get("id"))
        for ch in node.get("children") or []:
            cid = str(ch.get("id"))
            id_to_parent.setdefault(cid, nid)
            _walk(ch)

    for slug, node in by_slug.items():
        slug_to_id[slug] = str(node.get("id"))
        _walk(node)

    return slug_to_id, id_to_parent


def location_id_for_slug(slug_or_id: str | None) -> str | None:
    """The location's own id (county OR area). Accepts a slug or an id."""
    if not slug_or_id:
        return None
    s = str(slug_or_id)
    slug_to_id, id_to_parent = _maps()
    if s in slug_to_id:
        return slug_to_id[s]
    # Already an id (numeric or a known node) or a nationwide sentinel.
    if s.isdigit() or s in NATIONWIDE_IDS or s in id_to_parent:
        return s
    return None


def resolve_to_county_id(slug_or_id: str | None) -> str | None:
    """Resolve a county/area slug (or id) to a coverage-matchable location id.

    The directory filters by **county**, and coverage stores county ids — so for
    a county slug this returns the county id (the primary, correct case). For an
    area slug it returns the area's own id (matched against coverage.area/areas).
    We intentionally do NOT walk the parent tree to the county: the prebuilt
    location map flattens regions/super-nodes, making upward walks unreliable
    (they collapse to a single ancestor). Own-id matching is correct for county
    filters and precise for area filters; the only gap is "filter by area →
    also include whole-county pros", an uncommon directory case.
    """
    return location_id_for_slug(slug_or_id)
