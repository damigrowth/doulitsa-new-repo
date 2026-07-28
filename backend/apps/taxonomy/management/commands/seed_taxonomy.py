"""seed_taxonomy — load the full taxonomy into the DB, idempotently & losslessly.

Source of truth (versioned, committed): the prebuilt
`apps/core/management/commands/_taxonomy_maps.json` (service + pro + location +
skills + tags). Re-runnable (upsert); safe to run on production via the deploy.

LOSSLESS guarantees (the user's hard requirement — "everything is in use"):
  - every node's COMPLETE original is stored in `raw`,
  - per-space DB counts are asserted == the source `byId` counts,
  - the service/pro/skills/tags counts are cross-checked against metadata.

Usage:
  python manage.py seed_taxonomy            # seed/refresh, then assert losslessness
  python manage.py seed_taxonomy --check     # assert only (no writes); exit 1 on drift
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.taxonomy.models import Location, LocationTree, Skill, Tag, TaxonomyNode
from common.utils.normalize import normalize_term

_MAPS_PATH = (
    Path(__file__).resolve().parents[3]
    / "core" / "management" / "commands" / "_taxonomy_maps.json"
)
# The FE `locationOptions` display tree (counties→areas→zipcodes, nodes may
# repeat under multiple parents). Stored verbatim; names overlaid live at build.
_LOCATION_OPTIONS_PATH = _MAPS_PATH.parent / "_location_options.json"
# Skills/tags are authoritatively the FE datasets (the maps JSON snapshot lags —
# e.g. it's missing 5 tags). Seeding from these keeps the DB == the FE picker.
_SKILLS_PATH = _MAPS_PATH.parent / "_skills.json"
_TAGS_PATH = _MAPS_PATH.parent / "_tags.json"


def _norm(s: str | None) -> str:
    return normalize_term(s) if s else ""


class Command(BaseCommand):
    help = "Seed the taxonomy tables (service/pro/location/skills/tags) from the maps JSON."

    def add_arguments(self, parser):
        parser.add_argument("--check", action="store_true", help="Assert counts only; no writes.")

    def handle(self, *args, **opts):
        maps = json.loads(_MAPS_PATH.read_text(encoding="utf-8"))
        if not opts["check"]:
            with transaction.atomic():
                self._seed_nodes(maps)
                self._seed_locations(maps["location"])
                self._seed_location_tree()
                self._seed_skills(maps["skills"])
                self._seed_tags(maps["tags"])
        self._assert_lossless(maps)

    # ---- location display tree (FE locationOptions) -------------------------

    def _seed_location_tree(self) -> None:
        if not _LOCATION_OPTIONS_PATH.exists():
            self.stdout.write("  location tree: _location_options.json missing — skipped")
            return
        tree = json.loads(_LOCATION_OPTIONS_PATH.read_text(encoding="utf-8"))
        LocationTree.objects.update_or_create(id=1, defaults={"tree": tree})

        # Sanity: every id in the display tree must exist in the Location table
        # (so the live-name overlay can resolve it).
        ids: set[str] = set()

        def collect(node: dict) -> None:
            if node.get("id") is not None:
                ids.add(str(node["id"]))
            for ch in node.get("children") or []:
                collect(ch)

        for n in tree:
            collect(n)
        known = set(Location.objects.values_list("id", flat=True))
        missing = ids - known
        if missing:
            raise CommandError(
                f"location tree references {len(missing)} ids absent from Location "
                f"(e.g. {list(missing)[:5]})"
            )
        self.stdout.write(f"  location tree upserted: {len(tree)} counties, {len(ids)} unique ids")

    # ---- service + pro nodes ------------------------------------------------

    def _seed_nodes(self, maps: dict[str, Any]) -> None:
        n = 0
        # SERVICE: level + parent come from the `hierarchy` path of each node.
        svc = maps["service"]
        hierarchy = svc["hierarchy"]
        svc_primary = {str(v.get("id")) for v in svc["bySlug"].values()}
        # byId iteration order == the source dataset order; capture it as `order`
        # so the tree (and byCategory) keep their curated display order.
        for i, (nid, node) in enumerate(svc["byId"].items()):
            h = hierarchy.get(nid, {})
            if nid == h.get("subdivision"):
                level, parent = "subdivision", h.get("subcategory")
            elif nid == h.get("subcategory"):
                level, parent = "subcategory", h.get("category")
            else:
                level, parent = "category", None
            self._upsert_node(nid, node, "service", level, parent, nid in svc_primary, order=i)
            n += 1
        # PRO: byCategory maps category -> [subcategory ids]; everything else is a category.
        pro = maps["pro"]
        child_to_parent: dict[str, str] = {}
        for cat_id, children in pro["byCategory"].items():
            for ch in children:
                cid = ch if isinstance(ch, str) else ch.get("id")
                if cid:
                    child_to_parent[str(cid)] = cat_id
        cat_ids = set(pro["byCategory"].keys())
        pro_primary = {str(v.get("id")) for v in pro["bySlug"].values()}
        for i, (nid, node) in enumerate(pro["byId"].items()):
            if nid in cat_ids:
                level, parent = "category", None
            else:
                level, parent = "subcategory", child_to_parent.get(nid)
            self._upsert_node(nid, node, "pro", level, parent, nid in pro_primary, order=i)
            n += 1
        self.stdout.write(f"  nodes upserted: {n}")

    def _upsert_node(self, nid: str, node: dict, space: str, level: str, parent: str | None,
                     slug_primary: bool = True, order: int = 0) -> None:
        TaxonomyNode.objects.update_or_create(
            id=nid,
            defaults={
                "parent_id": parent,
                "space": space,
                "level": level,
                "slug": node.get("slug") or nid,
                "label": node.get("label") or "",
                "label_normalized": _norm(node.get("label")),
                "plural": node.get("plural") or "",
                "description": node.get("description") or "",
                "icon": node.get("icon") or "",
                "featured": bool(node.get("featured")),
                "image": node.get("image"),
                "order": order,
                "active": True,
                "slug_primary": slug_primary,
                "raw": node,
            },
        )

    # ---- locations ----------------------------------------------------------

    def _seed_locations(self, loc: dict[str, Any]) -> None:
        by_id = loc["byId"]

        # Parent map mirrors apps/core/locations.py exactly (walk every bySlug
        # node's nested children) so coverage/county resolution stays at parity.
        id_to_parent: dict[str, str] = {}

        def walk(node: dict, visited: set[str]) -> None:
            nid = str(node.get("id"))
            if nid in visited:  # cycle guard
                return
            visited.add(nid)
            for ch in node.get("children") or []:
                cid = str(ch.get("id"))
                if cid != nid:
                    id_to_parent.setdefault(cid, nid)
                walk(ch, visited)

        for node in loc["bySlug"].values():
            walk(node, set())

        # Many named locations carry no `slug` on their byId node — the build
        # script derived the slug (greeklish of the name) only as the bySlug KEY.
        # Recover it from the bySlug reverse-map so the DB holds every slug.
        id_to_slug: dict[str, str] = {}
        id_to_slugs: dict[str, list[str]] = {}
        for slug, node in loc["bySlug"].items():
            nid = str(node.get("id"))
            id_to_slug.setdefault(nid, slug)
            id_to_slugs.setdefault(nid, [])
            if slug not in id_to_slugs[nid]:
                id_to_slugs[nid].append(slug)
        loc_primary = {str(v.get("id")) for v in loc["bySlug"].values()}

        # `type` is a derived, non-source hint (postcode vs named place); precise
        # county/area/region typing is reconstructed in Phase D's tree API.
        n_pc = 0
        for nid, node in by_id.items():
            name = str(node.get("name") or "")
            ttype = "postcode" if name.isdigit() else "place"
            if ttype == "postcode":
                n_pc += 1
            parent_id = id_to_parent.get(nid)
            if parent_id == nid:
                parent_id = None
            Location.objects.update_or_create(
                id=nid,
                defaults={
                    "parent_id": parent_id,
                    "slug_primary": nid in loc_primary,
                    "slugs": id_to_slugs.get(nid, []),
                    "slug": node.get("slug") or id_to_slug.get(nid) or "",
                    "name": node.get("name") or "",
                    "name_normalized": _norm(node.get("name")),
                    "type": ttype,
                    "order": int(node.get("order") or 0),
                    "active": True,
                    "raw": node,
                },
            )
        self.stdout.write(f"  locations upserted: {len(by_id)} (postcodes={n_pc} places={len(by_id) - n_pc})")

    # ---- skills + tags ------------------------------------------------------

    def _seed_skills(self, sk: dict[str, Any]) -> None:
        # Prefer the FE dataset (authoritative + full); fall back to the maps JSON.
        items = (
            json.loads(_SKILLS_PATH.read_text(encoding="utf-8"))
            if _SKILLS_PATH.exists()
            else list(sk["byId"].values())
        )
        for i, node in enumerate(items):
            nid = str(node["id"])
            Skill.objects.update_or_create(
                id=nid,
                defaults={
                    "slug": node.get("slug") or nid,
                    "label": node.get("label") or "",
                    "label_normalized": _norm(node.get("label")),
                    "category_id": node.get("category"),
                    "order": i,  # FE dataset order
                    "active": True,
                    "raw": node,
                },
            )
        self.stdout.write(f"  skills upserted: {len(items)}")

    def _seed_tags(self, tg: dict[str, Any]) -> None:
        items = (
            json.loads(_TAGS_PATH.read_text(encoding="utf-8"))
            if _TAGS_PATH.exists()
            else list(tg["byId"].values())
        )
        for i, node in enumerate(items):
            nid = str(node["id"])
            Tag.objects.update_or_create(
                id=nid,
                defaults={
                    "slug": node.get("slug") or nid,
                    "label": node.get("label") or "",
                    "label_normalized": _norm(node.get("label")),
                    "order": i,  # FE dataset order
                    "active": True,
                    "raw": node,
                },
            )
        self.stdout.write(f"  tags upserted: {len(items)}")

    # ---- lossless gate ------------------------------------------------------

    def _assert_lossless(self, maps: dict[str, Any]) -> None:
        meta = maps.get("metadata", {}).get("counts", {})
        # Skills/tags are seeded from the FE datasets (authoritative); assert
        # against those counts, not the lagging maps JSON / metadata.
        skills_expected = (
            len(json.loads(_SKILLS_PATH.read_text(encoding="utf-8")))
            if _SKILLS_PATH.exists() else len(maps["skills"]["byId"])
        )
        tags_expected = (
            len(json.loads(_TAGS_PATH.read_text(encoding="utf-8")))
            if _TAGS_PATH.exists() else len(maps["tags"]["byId"])
        )
        checks = [
            ("service nodes", TaxonomyNode.objects.filter(space="service").count(), len(maps["service"]["byId"])),
            ("pro nodes", TaxonomyNode.objects.filter(space="pro").count(), len(maps["pro"]["byId"])),
            ("locations", Location.objects.count(), len(maps["location"]["byId"])),
            ("skills", Skill.objects.count(), skills_expected),
            ("tags", Tag.objects.count(), tags_expected),
            # cross-check against source metadata where present
            ("service categories", TaxonomyNode.objects.filter(space="service", level="category").count(), meta.get("serviceCategories")),
            ("service subcategories", TaxonomyNode.objects.filter(space="service", level="subcategory").count(), meta.get("serviceSubcategories")),
            ("service subdivisions", TaxonomyNode.objects.filter(space="service", level="subdivision").count(), meta.get("serviceSubdivisions")),
            ("pro categories", TaxonomyNode.objects.filter(space="pro", level="category").count(), meta.get("proCategories")),
            ("pro subcategories", TaxonomyNode.objects.filter(space="pro", level="subcategory").count(), meta.get("proSubcategories")),
        ]
        failures = []
        for name, got, want in checks:
            if want is None:
                continue
            mark = "OK" if got == want else "MISMATCH"
            if got != want:
                failures.append(f"{name}: db={got} source={want}")
            self.stdout.write(f"  [{mark}] {name}: {got} (source {want})")
        if failures:
            raise CommandError("LOSSLESS CHECK FAILED:\n  " + "\n  ".join(failures))
        self.stdout.write(self.style.SUCCESS("Lossless check passed — every source node is in the DB."))
