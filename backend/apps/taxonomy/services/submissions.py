"""Public submission flow (rows 125, 126).

Mirrors OLD `src/actions/taxonomy-submission.ts`. Submission rules from the source:
- type ∈ {skill, tag}
- pro-only (freelancer or company)                       (taxonomy-submission.ts:30-33)
- rate-limit 5 per 24h per user                          (taxonomy-submission.ts:47-61)
- duplicate detection against the static dataset         (taxonomy-submission.ts:63-86)
- duplicate detection against pending submissions (any user, label iexact)
                                                         (taxonomy-submission.ts:88-102)
- returns `pendingId = "pending_<cuid>"`                 (taxonomy-submission.ts:116)

The frontend stores that exact `pending_<cuid>` value into
`profiles.skills[]` / `services.tags[]`; the `pending_` prefix is the contract
that lets `isTaxonomySubmissionId` style it and lets approve/reject reconcile it.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from apps.accounts.models import User
from apps.taxonomy.models import (
    TaxonomySubmission,
    TaxonomySubmissionStatus,
    TaxonomySubmissionType,
)
from apps.taxonomy.services import taxonomy_data
from apps.taxonomy.services.submission_ids import create_submission_id
from common.exceptions import ApiError, FieldErrors

RATE_LIMIT_WINDOW = timedelta(hours=24)
RATE_LIMIT_MAX = 5


def submit_taxonomy(
    *,
    user: User,
    label: str,
    type: str,
    category: str | None = None,
) -> TaxonomySubmission:
    # 1. AuthZ — pro-only (taxonomy-submission.ts:30-33)
    if not user.is_professional():
        raise ApiError(
            "Δεν έχετε δικαίωμα υποβολής",
            code="not_professional",
            status_code=403,
        )

    # 2. Validate (taxonomy-submission.ts:35-42) — label trimmed by serializer
    label = label.strip()
    if type not in {TaxonomySubmissionType.SKILL, TaxonomySubmissionType.TAG}:
        raise FieldErrors(details={"type": ["Πρέπει να είναι 'skill' ή 'tag'"]})
    if not label or len(label) < 2:
        raise FieldErrors(details={"label": ["Λείπει η ετικέτα"]})
    if type == TaxonomySubmissionType.SKILL and not category:
        # OLD message (lib/validations/taxonomy-submission.ts:21)
        raise FieldErrors(details={"category": ["Η κατηγορία είναι υποχρεωτική για δεξιότητες"]})

    normalized_label = taxonomy_data.normalize_term(label)

    # 3. Rate limit: max 5 submissions per user per 24h (taxonomy-submission.ts:47-61)
    since = datetime.now(timezone.utc) - RATE_LIMIT_WINDOW
    recent_count = TaxonomySubmission.objects.filter(
        submitted_by=user.id, created_at__gte=since
    ).count()
    if recent_count >= RATE_LIMIT_MAX:
        raise ApiError(
            "Έχετε φτάσει το μέγιστο όριο υποβολών (5) για σήμερα",
            code="rate_limited",
            status_code=429,
        )

    # 4. Duplicate detection — static dataset (taxonomy-submission.ts:63-86)
    if type == TaxonomySubmissionType.SKILL and category:
        for skill in taxonomy_data.get_skills_by_category(category):
            sl = skill.get("label")
            if sl and taxonomy_data.normalize_term(sl) == normalized_label:
                raise ApiError(
                    f'Η δεξιότητα "{label}" υπάρχει ήδη',
                    code="duplicate_dataset",
                    status_code=409,
                )
    elif type == TaxonomySubmissionType.TAG:
        for tag in taxonomy_data.get_tags():
            tl = tag.get("label")
            if tl and taxonomy_data.normalize_term(tl) == normalized_label:
                raise ApiError(
                    f'Το tag "{label}" υπάρχει ήδη',
                    code="duplicate_dataset",
                    status_code=409,
                )

    # 5. Duplicate detection — pending submission records, GLOBAL across all
    #    users (taxonomy-submission.ts:88-102)
    if TaxonomySubmission.objects.filter(
        type=type,
        status=TaxonomySubmissionStatus.PENDING,
        label__iexact=label,
    ).exists():
        raise ApiError(
            f'Η υποβολή "{label}" εκκρεμεί ήδη για έγκριση',
            code="duplicate_submission",
            status_code=409,
        )

    # 6. Create record (taxonomy-submission.ts:104-112)
    return TaxonomySubmission.objects.create(
        label=label,
        type=type,
        category=category if type == TaxonomySubmissionType.SKILL else None,
        submitted_by=user.id,
        status=TaxonomySubmissionStatus.PENDING,
    )


def list_my_submissions(*, user: User, type: str | None = None) -> list[dict]:
    """Mirror OLD `getUserTaxonomySubmissions` (taxonomy-submission.ts:128-165).

    Returns pending submissions ordered newest-first, each with
    `pendingId = "pending_<cuid>"`. NEW additionally exposes `type`/`createdAt`
    (additive — does not break the OLD consumer).
    """
    qs = TaxonomySubmission.objects.filter(
        submitted_by=user.id, status=TaxonomySubmissionStatus.PENDING
    )
    if type:
        qs = qs.filter(type=type)
    return [
        {
            "pendingId": create_submission_id(s.id),
            "label": s.label,
            "category": s.category,
            "type": s.type,
            "createdAt": s.created_at.isoformat() if s.created_at else None,
        }
        for s in qs.order_by("-created_at")
    ]
