"""Location (county/area) resolution: id → name and slug/name → county id.

Coverage JSON on profiles/services stores location **IDs** (`county`,
`counties[]`, `area`, `areas[]`); the frontend filters by a **slug**.

Both helpers port the OLD algorithms LITERALLY over the hierarchical location
dataset (`locationOptions`: counties → areas → zipcodes). Location ids are NOT
unique across levels (e.g. id `2` is the county "Αττικής" AND the zipcode
"12351"; id `23` is the county "Μαγνησίας" AND the area "Άγιος Βλάσιος"), so a
flat id-keyed map (last-write-wins `byId`) resolves hundreds of ids differently
from OLD. The search order is what makes the result exact:

- `location_name_for_id` = OLD `getLocationName` (utils/datasets.ts:817-850):
  all counties first; then, county by county, that county's areas and then
  that county's zipcodes.
- `resolve_to_county_id` = OLD `resolveToCountyId` (taxonomies/index.ts:
  359-376): slug (bySlug) or Greek name → node; a county id is returned as-is,
  an area resolves to its PARENT county; anything else → None (= no filter).

Source data: the DB-owned display tree (`LocationTree` id=1, byte-identical to
`locationOptions`) + `Location` slugs. Falls back to the shipped
`_taxonomy_maps.json` (flat `byId` / `bySlug`) only when the tables are empty.
Cached in-process; `apps.taxonomy.services.cache` clears `_id_to_name` and
`_maps` on taxonomy writes.
"""
from __future__ import annotations

import functools
import json
from pathlib import Path
from typing import Any

_MAPS_PATH = Path(__file__).resolve().parent / "management" / "commands" / "_taxonomy_maps.json"

# "Πανελλαδικά / nationwide" sentinels seen in coverage.counties across the data:
# the Next.js taxonomy used "_all"; the legacy prefecture list used "54".
NATIONWIDE_IDS = ("_all", "54")


def _json_location() -> dict[str, Any]:
    try:
        return json.loads(_MAPS_PATH.read_text(encoding="utf-8")).get("location", {}) or {}
    except (OSError, ValueError):
        return {}


def _load_tree() -> list[dict[str, Any]]:
    """The hierarchical `locationOptions` tree (counties → areas → zipcodes)."""
    try:
        from apps.taxonomy.models import LocationTree

        row = LocationTree.objects.filter(id=1).values_list("tree", flat=True).first()
        if isinstance(row, list) and row:
            return row
    except Exception:
        pass
    tree = _json_location().get("tree")
    return tree if isinstance(tree, list) else []


@functools.lru_cache(maxsize=1)
def _id_to_name() -> dict[str, str]:
    """id → name in OLD `getLocationName` priority (see module docstring).

    Without a tree (unseeded DB + no tree in the shipped JSON) falls back to the
    flat `Location` / `byId` names (not exact for colliding ids).
    """
    tree = _load_tree()
    out: dict[str, str] = {}
    if tree:
        # 1. Counties (top level) — `locationOptions.find(c => c.id === id)`.
        for county in tree:
            cid = county.get("id")
            if cid is not None and county.get("name") is not None:
                out.setdefault(str(cid), str(county["name"]))
        # 2. Per county: its areas, then its zipcodes (first match wins).
        for county in tree:
            areas = county.get("children") or []
            for area in areas:
                aid = area.get("id")
                if aid is not None and area.get("name") is not None:
                    out.setdefault(str(aid), str(area["name"]))
            for area in areas:
                for z in area.get("children") or []:
                    zid = z.get("id")
                    if zid is not None and z.get("name") is not None:
                        out.setdefault(str(zid), str(z["name"]))
        return out

    try:
        from apps.taxonomy.models import Location

        out = {str(i): str(n) for i, n in Location.objects.values_list("id", "name") if n}
        if out:
            return out
    except Exception:
        pass
    by_id: dict = _json_location().get("byId", {}) or {}
    return {
        str(nid): str(node["name"])
        for nid, node in by_id.items()
        if isinstance(node, dict) and node.get("name") is not None
    }


def location_name_for_id(location_id) -> str | None:
    """Resolve a location id → its name (county/area/zipcode). Literal port of
    OLD `getLocationName` (datasets.ts:817-850): None for falsy/unknown ids."""
    if not location_id:
        return None
    return _id_to_name().get(str(location_id))


@functools.lru_cache(maxsize=1)
def _maps() -> dict[str, Any]:
    """Resolution indexes, built once per process:

    - `slug_to_node`: location slug → (id, name) — OLD `location.bySlug`
    - `county_ids`: ids of the top-level counties
    - `area_parent`: area id → its county id (first county listing it, like
      OLD's `locations.find(county => county.children.some(...))`)
    - `county_names` / `area_names`: OLD's slow-path name lookup, in tree order
    """
    tree = _load_tree()
    county_ids: list[str] = []
    area_parent: dict[str, str] = {}
    name_to_id: dict[str, str] = {}
    for county in tree:
        cid = str(county.get("id"))
        county_ids.append(cid)
        if county.get("name") is not None:
            name_to_id.setdefault(str(county["name"]), cid)
        for area in county.get("children") or []:
            aid = str(area.get("id"))
            area_parent.setdefault(aid, cid)
            if area.get("name") is not None:
                # OLD checks a county's own name before its areas, county by
                # county — setdefault in tree order reproduces "first wins".
                name_to_id.setdefault(str(area["name"]), aid)

    slug_to_id: dict[str, str] = {}
    try:
        from apps.taxonomy.models import Location

        for lid, slugs in Location.objects.values_list("id", "slugs"):
            for s in slugs or []:
                slug_to_id[s] = str(lid)
    except Exception:
        pass
    if not slug_to_id:
        for slug, node in (_json_location().get("bySlug") or {}).items():
            if isinstance(node, dict) and node.get("id") is not None:
                slug_to_id[slug] = str(node["id"])
    if not tree:
        # No hierarchical tree available: derive counties/areas from the flat
        # JSON bySlug children so slug filters still work (degraded fallback).
        for node in (_json_location().get("bySlug") or {}).values():
            if not isinstance(node, dict):
                continue
            kids = node.get("children") or []
            if kids and node.get("id") is not None:
                cid = str(node["id"])
                if cid not in county_ids:
                    county_ids.append(cid)
                for ch in kids:
                    if isinstance(ch, dict) and ch.get("id") is not None:
                        area_parent.setdefault(str(ch["id"]), cid)

    return {
        "slug_to_id": slug_to_id,
        "county_ids": set(county_ids),
        "area_parent": area_parent,
        "name_to_id": name_to_id,
    }


def location_id_for_slug(slug_or_name: str | None) -> str | None:
    """The matched node's own id for a location slug or exact Greek name
    (OLD `findLocationBySlugOrName(...).id`), else None."""
    if not slug_or_name:
        return None
    s = str(slug_or_name)
    m = _maps()
    if s in m["slug_to_id"]:
        return m["slug_to_id"][s]
    return m["name_to_id"].get(s)


def resolve_to_county_id(slug_or_name: str | None) -> str | None:
    """CG-3: literal port of OLD `resolveToCountyId` (taxonomies/index.ts:359-376).

    slug/name → node; a top-level county id is returned as-is; an area id
    resolves to its PARENT county; an unresolvable value returns None, and the
    callers then apply NO location filter (OLD `if (countyId)`).
    """
    loc_id = location_id_for_slug(slug_or_name)
    if not loc_id:
        return None
    m = _maps()
    if loc_id in m["county_ids"]:
        return loc_id
    return m["area_parent"].get(loc_id)
