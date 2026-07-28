"""Skill / tag / service-&-pro taxonomy CRUD — writes straight to the DB.

Previously these operations committed JSON edits to the Next.js repo via GitHub
(Infrastructure-as-Code on a `datasets` branch), which required GitHub
credentials and a redeploy for every change. Now the taxonomy lives in the DB
(`taxonomy_nodes` / `taxonomy_skills` / `taxonomy_tags`), so each operation is a
plain DB write. The models' `post_save`/`post_delete` signals invalidate the
maps cache (and bump the ETag), so the frontend picks the change up on its next
poll — **live, no git, no redeploy.**

Function signatures and return shapes are unchanged so the admin views and the
frontend keep working; `commitSha` is now always `None` (there is no commit).
"""
from __future__ import annotations

import logging
from typing import Any

from django.db import transaction
from django.db.models import Max

from apps.taxonomy.models import Skill, Tag, TaxonomyNode
from common.exceptions import ApiError, FieldErrors
from common.utils.normalize import normalize_term
from common.utils.slug import create_slug, find_next_slug_variant

logger = logging.getLogger(__name__)


# ----- id / slug helpers --------------------------------------------------


def _next_numeric_id(model) -> str:
    """Next sequential numeric id as a string (mirrors the old dataset behaviour)."""
    max_n = 0
    for raw in model.objects.values_list("id", flat=True):
        try:
            n = int(raw)
        except (TypeError, ValueError):
            continue
        if n > max_n:
            max_n = n
    return str(max_n + 1)


def _unique_flat_slug(model, desired: str, *, exclude_id: str | None = None) -> str:
    qs = model.objects.all()
    if exclude_id is not None:
        qs = qs.exclude(id=exclude_id)
    return find_next_slug_variant(desired, set(qs.values_list("slug", flat=True)))


def _unique_node_slug(space: str, desired: str, *, exclude_id: str | None = None) -> str:
    qs = TaxonomyNode.objects.filter(space=space)
    if exclude_id is not None:
        qs = qs.exclude(id=exclude_id)
    return find_next_slug_variant(desired, set(qs.values_list("slug", flat=True)))


def _unique_node_id(slug: str) -> str:
    """Slug-based unique id for new taxonomy nodes (mirrors the old `_next_id_str`)."""
    base = slug or "item"
    candidate, n = base, 2
    while TaxonomyNode.objects.filter(id=candidate).exists():
        candidate = f"{base}-{n}"
        n += 1
    return candidate


def _infer_level(space: str, parent_id: str | None) -> str:
    if not parent_id:
        return "category"
    parent = TaxonomyNode.objects.filter(id=parent_id).first()
    if parent is None or parent.level == "category":
        return "subcategory"
    return "subdivision"


# ----- Skills -------------------------------------------------------------


def create_skill(*, label: str, slug: str | None = None, category: str | None = None) -> dict[str, Any]:
    label = (label or "").strip()
    new_slug = _unique_flat_slug(Skill, slug or create_slug(label))
    new_id = _next_numeric_id(Skill)
    raw = {"id": new_id, "label": label, "slug": new_slug, "category": category}
    Skill.objects.create(
        id=new_id, slug=new_slug, label=label, label_normalized=normalize_term(label),
        category_id=category or None, order=0, active=True, raw=raw,
    )
    return {"id": new_id, "slug": new_slug, "commitSha": None, "mocked": False}


def update_skill(*, id: str, label: str | None = None, slug: str | None = None,
                 category: str | None = None) -> dict[str, Any]:
    s = Skill.objects.filter(id=id).first()
    if s is None:
        raise ApiError("Skill not found", code="skill_not_found", status_code=404)
    if slug and slug != s.slug:
        if Skill.objects.exclude(id=id).filter(slug=slug).exists():
            raise ApiError("Slug already used", code="slug_taken", status_code=409)
        s.slug = slug
    if label is not None:
        s.label = label.strip()
        s.label_normalized = normalize_term(s.label)
    if category is not None:
        s.category_id = category or None
    s.raw = {**(s.raw or {}), "label": s.label, "slug": s.slug, "category": s.category_id}
    s.save()
    return {"id": id, "slug": s.slug, "commitSha": None, "mocked": False}


def delete_skill(*, id: str) -> dict[str, Any]:
    deleted, _ = Skill.objects.filter(id=id).delete()
    if not deleted:
        raise ApiError("Skill not found", code="skill_not_found", status_code=404)
    return {"id": id, "deleted": True, "commitSha": None, "mocked": False}


# ----- Tags ---------------------------------------------------------------


def create_tag(*, label: str, slug: str | None = None) -> dict[str, Any]:
    label = (label or "").strip()
    new_slug = _unique_flat_slug(Tag, slug or create_slug(label))
    new_id = _next_numeric_id(Tag)
    raw = {"id": new_id, "label": label, "slug": new_slug}
    Tag.objects.create(
        id=new_id, slug=new_slug, label=label, label_normalized=normalize_term(label),
        order=0, active=True, raw=raw,
    )
    return {"id": new_id, "slug": new_slug, "commitSha": None, "mocked": False}


def update_tag(*, id: str, label: str | None = None, slug: str | None = None) -> dict[str, Any]:
    t = Tag.objects.filter(id=id).first()
    if t is None:
        raise ApiError("Tag not found", code="tag_not_found", status_code=404)
    if slug and slug != t.slug:
        if Tag.objects.exclude(id=id).filter(slug=slug).exists():
            raise ApiError("Slug already used", code="slug_taken", status_code=409)
        t.slug = slug
    if label is not None:
        t.label = label.strip()
        t.label_normalized = normalize_term(t.label)
    t.raw = {**(t.raw or {}), "label": t.label, "slug": t.slug}
    t.save()
    return {"id": id, "slug": t.slug, "commitSha": None, "mocked": False}


def delete_tag(*, id: str) -> dict[str, Any]:
    deleted, _ = Tag.objects.filter(id=id).delete()
    if not deleted:
        raise ApiError("Tag not found", code="tag_not_found", status_code=404)
    return {"id": id, "deleted": True, "commitSha": None, "mocked": False}


# ----- Service / Pro taxonomies (hierarchical TaxonomyNode) ---------------

_NODE_TEXT_FIELDS = ("label", "description", "plural", "icon")


def delete_taxonomy_item(*, kind: str, id: str) -> dict[str, Any]:
    """Delete a service/pro taxonomy node + all descendants (OLD
    deleteItemRecursively, taxonomies-shared.ts:311). Refuses when live
    services/profiles still reference any node in the subtree — the git-era
    OLD had no such data, but deleting a referenced node here would orphan
    published rows."""
    space = "service" if kind == "service" else "pro"
    node = TaxonomyNode.objects.filter(id=id, space=space).first()
    if node is None:
        raise ApiError("Taxonomy item not found", code="taxonomy_item_not_found", status_code=404)

    # Collect the subtree ids (category -> subcategories -> subdivisions).
    subtree = [node.id]
    frontier = [node.id]
    while frontier:
        children = list(
            TaxonomyNode.objects.filter(parent_id__in=frontier).values_list("id", flat=True)
        )
        subtree.extend(children)
        frontier = children

    from django.db.models import Q
    refs = 0
    if space == "service":
        from apps.services.models import Service
        refs = Service.objects.filter(
            Q(category__in=subtree) | Q(subcategory__in=subtree) | Q(subdivision__in=subtree)
            | Q(category_node_id__in=subtree) | Q(subcategory_node_id__in=subtree)
            | Q(subdivision_node_id__in=subtree)
        ).count()
    else:
        from apps.profiles.models import Profile
        refs = Profile.objects.filter(
            Q(category__in=subtree) | Q(subcategory__in=subtree)
            | Q(category_node_id__in=subtree) | Q(subcategory_node_id__in=subtree)
        ).count()
    if refs:
        raise ApiError(
            f"Δεν είναι δυνατή η διαγραφή: {refs} καταχωρήσεις χρησιμοποιούν αυτή την κατηγορία.",
            code="taxonomy_in_use", status_code=409, details={"references": refs},
        )

    # Delete leaves-first so the self-FK PROTECT never trips.
    for nid in reversed(subtree):
        TaxonomyNode.objects.filter(id=nid).delete()
    return {"deleted": True, "id": id, "removed": len(subtree)}


def create_taxonomy_item(*, kind: str, payload: dict[str, Any]) -> dict[str, Any]:
    """`kind` = 'service' or 'pro'."""
    space = "service" if kind == "service" else "pro"
    label = (payload.get("label") or "").strip()
    parent_id = payload.get("parentId") or None
    if parent_id and not TaxonomyNode.objects.filter(id=parent_id, space=space).exists():
        raise ApiError(f"Parent taxonomy '{parent_id}' not found", code="parent_not_found", status_code=404)

    new_slug = _unique_node_slug(space, payload.get("slug") or create_slug(label))
    new_id = _unique_node_id(new_slug)
    level = payload.get("level") or _infer_level(space, parent_id)
    order = (TaxonomyNode.objects.filter(space=space).aggregate(m=Max("order"))["m"] or 0) + 1

    raw = {k: v for k, v in payload.items() if k != "parentId"}
    raw.update({"id": new_id, "slug": new_slug})

    TaxonomyNode.objects.create(
        id=new_id, space=space, level=level, parent_id=parent_id, slug=new_slug,
        label=label, label_normalized=normalize_term(label),
        plural=payload.get("plural") or "", description=payload.get("description") or "",
        icon=payload.get("icon") or "", featured=bool(payload.get("featured")),
        image=payload.get("image"), order=order, active=True, slug_primary=True, raw=raw,
    )
    return {"id": new_id, "slug": new_slug, "commitSha": None, "mocked": False}


def update_taxonomy_item(*, kind: str, id: str, payload: dict[str, Any]) -> dict[str, Any]:
    space = "service" if kind == "service" else "pro"
    node = TaxonomyNode.objects.filter(id=id, space=space).first()
    if node is None:
        raise ApiError("Taxonomy item not found", code="taxonomy_item_not_found", status_code=404)

    if payload.get("slug") and payload["slug"] != node.slug:
        if TaxonomyNode.objects.filter(space=space, slug=payload["slug"]).exclude(id=id).exists():
            raise ApiError("Slug already used", code="slug_taken", status_code=409)
        node.slug = payload["slug"]
    for field in _NODE_TEXT_FIELDS:
        if field in payload and payload[field] is not None:
            setattr(node, field, payload[field])
    if "featured" in payload:
        node.featured = bool(payload["featured"])
    if "image" in payload:
        node.image = payload["image"]
    if payload.get("level"):
        node.level = payload["level"]
    node.label_normalized = normalize_term(node.label)

    merged = {**(node.raw or {})}
    for k in ("label", "description", "level", "featured", "icon", "image", "plural", "type", "slug"):
        if k in payload:
            merged[k] = payload[k]
    node.raw = merged
    node.save()
    return {"id": id, "slug": node.slug, "commitSha": None, "mocked": False}


# ----- Multi-change (single "commit") -------------------------------------


def commit_multiple_changes(*, changes: list[dict[str, Any]], overall_message: str) -> dict[str, Any]:
    """Apply several changes atomically (one DB transaction). No git commit."""
    applied = 0
    with transaction.atomic():
        for change in changes:
            _apply_change(change.get("type", ""), change.get("data", {}) or {})
            applied += 1
    return {
        "commitSha": None, "commitUrl": None, "prNumber": None, "prUrl": None,
        "applied": applied, "mocked": False,
    }


def _apply_change(ctype: str, data: dict[str, Any]) -> None:
    if ctype == "skill.create":
        create_skill(label=data.get("label"), slug=data.get("slug"), category=data.get("category"))
    elif ctype == "skill.update":
        update_skill(id=data.get("id"), label=data.get("label"), slug=data.get("slug"), category=data.get("category"))
    elif ctype == "skill.delete":
        delete_skill(id=data.get("id"))
    elif ctype == "tag.create":
        create_tag(label=data.get("label"), slug=data.get("slug"))
    elif ctype == "tag.update":
        update_tag(id=data.get("id"), label=data.get("label"), slug=data.get("slug"))
    elif ctype == "tag.delete":
        delete_tag(id=data.get("id"))
    elif ctype == "service-taxonomy.create":
        create_taxonomy_item(kind="service", payload=data)
    elif ctype == "service-taxonomy.update":
        update_taxonomy_item(kind="service", id=data.get("id"), payload=data)
    elif ctype == "pro-taxonomy.create":
        create_taxonomy_item(kind="pro", payload=data)
    elif ctype == "pro-taxonomy.update":
        update_taxonomy_item(kind="pro", id=data.get("id"), payload=data)
    else:
        raise FieldErrors(details={"type": [f"Unknown change type: {ctype}"]})
