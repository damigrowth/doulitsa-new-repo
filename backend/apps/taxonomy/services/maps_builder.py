"""Rebuild the `_taxonomy_maps.json` structure FROM the DB tables.

The `raw` column holds each node verbatim, so `byId`/`bySlug` reconstruct exactly;
`byCategory` comes from each node's ordered `raw.children`, and `hierarchy` from
the FK parent chain. Cached in-process. This is what lets the backend (and, via
the tree API, the frontend) source taxonomy from the DB instead of the static
file — the prerequisite for the no-redeploy goal.
"""
from __future__ import annotations

from typing import Any


def build_maps() -> dict[str, Any]:
    from apps.taxonomy.models import Location, LocationTree, Skill, Tag, TaxonomyNode

    out: dict[str, Any] = {}

    def merge(raw, **overrides):
        # Overlay the CURRENT typed columns onto the frozen `raw`, but only for
        # keys raw already has — so unedited data stays byte-exact while admin
        # edits to label/slug/etc. go live.
        d = dict(raw or {})
        for k, v in overrides.items():
            if k in d:
                d[k] = v
        return d

    for space in ("service", "pro"):
        nodes = list(TaxonomyNode.objects.filter(space=space).order_by("order", "id"))
        node_dict = {
            n.id: merge(
                n.raw, label=n.label, slug=n.slug, description=n.description,
                plural=n.plural, icon=n.icon, featured=n.featured, image=n.image,
            )
            for n in nodes
        }
        by_id: dict[str, Any] = dict(node_dict)
        by_slug: dict[str, Any] = {}
        by_category: dict[str, list[str]] = {}
        parent_of: dict[str, str | None] = {}
        level_of: dict[str, str] = {}
        for n in nodes:
            parent_of[n.id] = n.parent_id
            level_of[n.id] = n.level
            if n.slug and n.slug_primary:  # collision tie-break -> byte-exact bySlug
                by_slug[n.slug] = node_dict[n.id]
            children = (n.raw or {}).get("children") or []
            if children:
                by_category[n.id] = [str(c["id"]) for c in children if isinstance(c, dict) and c.get("id")]
        space_map: dict[str, Any] = {"byId": by_id, "bySlug": by_slug, "byCategory": by_category}
        if space == "service":
            hierarchy: dict[str, Any] = {}
            for n in nodes:
                if n.level == "category":
                    hierarchy[n.id] = {"category": n.id}
                elif n.level == "subcategory":
                    hierarchy[n.id] = {"category": parent_of.get(n.id), "subcategory": n.id}
                else:  # subdivision
                    p = parent_of.get(n.id)
                    hierarchy[n.id] = {"category": parent_of.get(p), "subcategory": p, "subdivision": n.id}
            space_map["hierarchy"] = hierarchy

        # Nested tree (categories -> subcategories -> subdivisions), reconstructed
        # from the FK relations in display order, with the typed-column overlay —
        # so it reflects admin edits AND structural adds (the FE getServiceTaxonomies
        # reads this instead of the static dataset, completing the no-redeploy).
        children_of: dict[str | None, list] = {}
        for n in nodes:  # already ordered by `order`
            children_of.setdefault(n.parent_id, []).append(n)

        def _subtree(node):
            d = dict(node_dict[node.id])
            kids = children_of.get(node.id)
            if kids:
                d["children"] = [_subtree(k) for k in kids]
            return d

        space_map["tree"] = [_subtree(c) for c in children_of.get(None, [])]
        out[space] = space_map

    locs = list(Location.objects.all())
    loc_dict = {l.id: merge(l.raw, name=l.name, slug=l.slug) for l in locs}
    out["location"] = {
        "byId": dict(loc_dict),
        "bySlug": {l.slug: loc_dict[l.id] for l in locs if l.slug and l.slug_primary},
    }

    # Display tree (FE `locationOptions` shape), served verbatim from the DB.
    # We deliberately DON'T overlay names by id: locationOptions reuses the same
    # id for different nodes at different positions (e.g. id 23 is both the
    # county "Μαγνησίας" and an area "Άγιος Βλάσιος"), so an id-keyed overlay
    # would collapse them. The structure is now DB-owned (editable without a
    # redeploy) and byte-identical to the source. Per-id location names used by
    # filtering / backend coverage labels live in the `Location` table.
    ldt = LocationTree.objects.filter(id=1).first()
    if ldt and ldt.tree:
        out["location"]["tree"] = ldt.tree

    skills = list(Skill.objects.order_by("order", "id"))  # FE dataset order
    sk_dict = {s.id: merge(s.raw, label=s.label, slug=s.slug) for s in skills}
    sk_by_cat: dict[str, list[str]] = {}
    for s in skills:
        if s.category_id:
            sk_by_cat.setdefault(s.category_id, []).append(s.id)
    out["skills"] = {
        "byId": dict(sk_dict),
        "bySlug": {(s.raw or {}).get("slug") or s.id: sk_dict[s.id] for s in skills},
        "byCategory": sk_by_cat,
    }

    tags = list(Tag.objects.order_by("order", "id"))  # FE dataset order
    tag_dict = {t.id: merge(t.raw, label=t.label, slug=t.slug) for t in tags}
    out["tags"] = {
        "byId": dict(tag_dict),
        "bySlug": {(t.raw or {}).get("slug") or t.id: tag_dict[t.id] for t in tags},
    }
    return out
