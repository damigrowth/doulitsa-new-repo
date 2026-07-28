"""Admin moderation of taxonomy submissions.

Mirrors OLD `src/actions/admin/taxonomy-submission.ts`.

Approval orchestrates (OLD :242-360):
1. read the live dataset, generate a unique numeric id + slug
2. seed the collision set with ids already assigned to other approved-but-
   unpublished submissions of the same type (OLD :277-287)
3. update submission status → APPROVED + reviewer/reviewedAt/assignedId
4. array_replace the `pending_<id>` placeholder with the real id across
   profiles.skills[] / services.tags[] (OLD :320 / :182-202)
5. revalidate caches (best-effort) (OLD :327-341)
6. return `{success, assignedId, draft:{taxonomyType, item}}` — the client saves
   the draft to localStorage and publishes it later via /admin/git (OLD :345-349)

Rejection (OLD :366-421):
1. update status → REJECTED + reviewer/reviewedAt/rejectReason
2. array_remove the `pending_<id>` from profiles/services (OLD :396 / :207-226)
3. revalidate caches (OLD :399-408)
4. return `{success}` (OLD :410)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from django.core.cache import cache
from django.db import connection
from django.db.models import Q

from apps.accounts.models import User
from apps.taxonomy.models import (
    Skill,
    Tag,
    TaxonomySubmission,
    TaxonomySubmissionStatus,
    TaxonomySubmissionType,
)
from apps.taxonomy.services import taxonomy_data
from apps.taxonomy.services.submission_ids import create_submission_id
from common.utils.normalize import normalize_term
from common.utils.slug import create_slug, find_next_slug_variant


# ============================================================================
# LIST & STATS
# ============================================================================

# OLD sortBy whitelist (lib/validations/admin.ts:546): createdAt|status|label|type.
_SORT_COLS = {
    "createdAt": "created_at",
    "status": "status",
    "label": "label",
    "type": "type",
}


def list_submissions(*, filters: dict[str, Any]) -> dict[str, Any]:
    qs = TaxonomySubmission.objects.all()
    if (s := filters.get("status")) and s != "all":
        qs = qs.filter(status=s)
    if (t := filters.get("type")) and t != "all":
        qs = qs.filter(type=t)
    # OLD search matches label only (admin/taxonomy-submission.ts:45-47).
    if q := filters.get("searchQuery"):
        qs = qs.filter(Q(label__icontains=q))

    sort = filters.get("sortBy", "createdAt")
    direction = filters.get("sortDirection", "desc")
    sort_col = _SORT_COLS.get(sort, "created_at")
    if direction == "desc":
        sort_col = f"-{sort_col}"
    qs = qs.order_by(sort_col)

    # OLD default limit 10 (lib/validations/admin.ts:548).
    limit = max(1, min(100, int(filters.get("limit", 10))))
    offset = max(0, int(filters.get("offset", 0)))
    total = qs.count()
    rows = list(qs[offset:offset + limit])

    # Enrich each row with categoryLabel + submitterProfile (OLD :69-95).
    submitter_ids = {r.submitted_by for r in rows}
    profile_map = _load_submitter_profiles(submitter_ids)

    return {
        # OLD response key is `items` (admin/taxonomy-submission.ts:80).
        "items": [_row(r, profile_map) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def stats() -> dict[str, int]:
    qs = TaxonomySubmission.objects.all()
    return {
        "total": qs.count(),
        "pending": qs.filter(status=TaxonomySubmissionStatus.PENDING).count(),
        "approved": qs.filter(status=TaxonomySubmissionStatus.APPROVED).count(),
        "rejected": qs.filter(status=TaxonomySubmissionStatus.REJECTED).count(),
    }


# ============================================================================
# APPROVE
# ============================================================================


def approve(*, reviewer: User, submission_id: str) -> dict[str, Any]:
    sub = TaxonomySubmission.objects.filter(id=submission_id).first()
    if sub is None:
        return {"success": False, "error": "Record not found"}
    if sub.status != TaxonomySubmissionStatus.PENDING:
        return {"success": False, "error": "Record is not pending"}

    is_skill = sub.type == TaxonomySubmissionType.SKILL
    taxonomy_type = "skills" if is_skill else "tags"
    Model = Skill if is_skill else Tag

    # Generate a unique numeric id + slug FROM THE DB (the live source of truth),
    # not the static dataset file — so the next approval sees this one too.
    existing_ids = set(Model.objects.values_list("id", flat=True))
    # Defensive: also avoid any approved-but-not-yet-created assigned ids.
    for assigned in TaxonomySubmission.objects.filter(
        status=TaxonomySubmissionStatus.APPROVED,
        assigned_id__isnull=False,
        type=sub.type,
    ).values_list("assigned_id", flat=True):
        if assigned:
            existing_ids.add(assigned)

    new_id = _generate_unique_numeric_id(existing_ids)
    existing_slugs = set(Model.objects.values_list("slug", flat=True))
    slug = find_next_slug_variant(create_slug(sub.label), existing_slugs)

    new_item: dict[str, Any] = {"id": new_id, "label": sub.label, "slug": slug}
    if is_skill and sub.category:
        new_item["category"] = sub.category

    # WRITE the new taxonomy item straight into the DB → it's live immediately.
    # The Tag/Skill post_save signal invalidates the maps cache (+ bumps the ETag),
    # so the frontend picks it up on its next poll. NO git commit, NO redeploy.
    fields: dict[str, Any] = {
        "id": new_id,
        "slug": slug,
        "label": sub.label,
        "label_normalized": normalize_term(sub.label),
        "order": 0,
        "active": True,
        "raw": new_item,
    }
    if is_skill:
        fields["category_id"] = sub.category or None
    Model.objects.create(**fields)

    # Update the submission record (OLD :309-317).
    sub.status = TaxonomySubmissionStatus.APPROVED
    sub.assigned_id = new_id
    sub.reviewed_by = reviewer.id
    sub.reviewed_at = datetime.now(timezone.utc)
    sub.save(update_fields=["status", "assigned_id", "reviewed_by", "reviewed_at", "updated_at"])

    # Replace pending_<id> with the real id in profiles/services (OLD :320).
    _replace_submission_id_in_records(sub.id, new_id, sub.type)

    # Revalidate profile/service caches (the taxonomy cache is handled by the signal).
    _revalidate_caches()

    # `published: True` tells the client it's already live (no Git step needed).
    # `draft` is kept for backward-compat with the old localStorage flow.
    return {
        "success": True,
        "assignedId": new_id,
        "published": True,
        "draft": {"taxonomyType": taxonomy_type, "item": new_item},
    }


# ============================================================================
# REJECT
# ============================================================================


def reject(*, reviewer: User, submission_id: str, reason: str | None = None) -> dict[str, Any]:
    sub = TaxonomySubmission.objects.filter(id=submission_id).first()
    if sub is None:
        return {"success": False, "error": "Record not found"}
    if sub.status != TaxonomySubmissionStatus.PENDING:
        return {"success": False, "error": "Record is not pending"}

    # OLD: reason optional, null when blank (:387-389).
    sub.status = TaxonomySubmissionStatus.REJECTED
    sub.reject_reason = reason or None
    sub.reviewed_by = reviewer.id
    sub.reviewed_at = datetime.now(timezone.utc)
    sub.save(update_fields=["status", "reject_reason", "reviewed_by", "reviewed_at", "updated_at"])

    # Remove pending_<id> from profiles/services (OLD :396).
    _remove_submission_id_from_records(sub.id, sub.type)

    # Revalidate caches (OLD :399-408).
    _revalidate_caches()

    return {"success": True}


# ============================================================================
# BULK OPERATIONS
# ============================================================================


def bulk_approve(*, reviewer: User, ids: list[str]) -> dict[str, Any]:
    # Mirror OLD bulkApproveTaxonomySubmissions (:427-443).
    approved = 0
    for sid in ids:
        result = approve(reviewer=reviewer, submission_id=sid)
        if result.get("success"):
            approved += 1
    return {
        "success": approved > 0,
        "approved": approved,
        "error": None if approved == len(ids) else f"Approved {approved} of {len(ids)} items",
    }


def bulk_reject(*, reviewer: User, ids: list[str], reason: str | None = None) -> dict[str, Any]:
    # Mirror OLD bulkRejectTaxonomySubmissions (:445-462). Reason is optional.
    rejected = 0
    for sid in ids:
        result = reject(reviewer=reviewer, submission_id=sid, reason=reason)
        if result.get("success"):
            rejected += 1
    return {
        "success": rejected > 0,
        "rejected": rejected,
        "error": None if rejected == len(ids) else f"Rejected {rejected} of {len(ids)} items",
    }


# ============================================================================
# HELPERS
# ============================================================================


def _generate_unique_numeric_id(existing_ids: set[str]) -> str:
    """Mirror OLD generateUniqueNumericId (admin/taxonomy-submission.ts:168-177)."""
    max_id = 0
    for raw in existing_ids:
        try:
            n = int(raw)
        except (TypeError, ValueError):
            continue
        if n > max_id:
            max_id = n
    return str(max_id + 1)


def _replace_submission_id_in_records(submission_id: str, real_id: str, type_: str) -> None:
    """Mirror OLD replaceSubmissionIdInRecords (admin/taxonomy-submission.ts:182-202)."""
    prefixed_id = create_submission_id(submission_id)
    table, column = ("profiles", "skills") if type_ == TaxonomySubmissionType.SKILL else ("services", "tags")
    with connection.cursor() as cur:
        cur.execute(
            f'UPDATE "{table}" '
            f'SET "{column}" = array_replace("{column}", %s, %s) '
            f'WHERE %s = ANY("{column}")',
            [prefixed_id, real_id, prefixed_id],
        )


def _remove_submission_id_from_records(submission_id: str, type_: str) -> None:
    """Mirror OLD removeSubmissionIdFromRecords (admin/taxonomy-submission.ts:207-226)."""
    prefixed_id = create_submission_id(submission_id)
    table, column = ("profiles", "skills") if type_ == TaxonomySubmissionType.SKILL else ("services", "tags")
    with connection.cursor() as cur:
        cur.execute(
            f'UPDATE "{table}" '
            f'SET "{column}" = array_remove("{column}", %s) '
            f'WHERE %s = ANY("{column}")',
            [prefixed_id, prefixed_id],
        )


def _revalidate_caches() -> None:
    """Best-effort equivalent of OLD revalidateTag/revalidatePath calls.

    The OLD cache primitives are Next.js-specific; this backend invalidates the
    profile/service caches via the same prefixes used by
    AdminRevalidateTaxonomyCachesView (views/admin/dataset.py:138-142).
    """
    prefixes = (
        "profiles:directory:",
        "profiles:count:",
        "profile:page:",
        "services:archive:",
        "services:collection:",
    )
    try:
        cache.delete_many([f"{p}*" for p in prefixes])
    except Exception:  # pragma: no cover - cache backend best-effort
        pass


def _load_submitter_profiles(submitter_ids: set[str]) -> dict[str, dict[str, Any]]:
    """Join submitter profiles by uid (OLD :69-75). Returns {uid: {id, displayName, image}}."""
    if not submitter_ids:
        return {}
    from apps.profiles.models import Profile

    out: dict[str, dict[str, Any]] = {}
    # Profile links to the submitting user via user_id (there is no `uid` field).
    for p in Profile.objects.filter(user_id__in=submitter_ids).only("id", "user_id", "display_name", "image"):
        out[p.user_id] = {
            "id": p.id,
            "displayName": p.display_name,
            "image": p.image,
        }
    return out


def _row(s: TaxonomySubmission, profile_map: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    profile_map = profile_map or {}
    return {
        "id": s.id,
        "label": s.label,
        "type": s.type,
        "status": s.status,
        "category": s.category,
        # categoryLabel resolved via the pro taxonomy map (OLD :84-86).
        "categoryLabel": (
            (taxonomy_data.find_pro_by_id(s.category) or {}).get("label", s.category)
            if s.category
            else None
        ),
        "submittedBy": s.submitted_by,
        "submitterProfile": profile_map.get(s.submitted_by),
        "reviewedBy": s.reviewed_by,
        "reviewedAt": s.reviewed_at.isoformat() if s.reviewed_at else None,
        "assignedId": s.assigned_id,
        "rejectReason": s.reject_reason,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
        "updatedAt": s.updated_at.isoformat() if s.updated_at else None,
    }
