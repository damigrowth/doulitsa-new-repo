"""Taxonomy submission ID utilities.

Server-side mirror of OLD `src/lib/utils/taxonomy-submission.ts:9-32`.

Pending skills/tags are stored in `profiles.skills[]` / `services.tags[]` as
`"pending_<cuid>"`. The `pending_` prefix is the contract that lets the frontend
(`isTaxonomySubmissionId`) recognise a pending entry and lets approve/reject
reconcile it back to a real numeric dataset id.
"""
from __future__ import annotations

PENDING_PREFIX = "pending_"


def is_taxonomy_submission_id(value: str) -> bool:
    """Mirror OLD `isTaxonomySubmissionId` (taxonomy-submission.ts:14-16)."""
    return value.startswith(PENDING_PREFIX)


def create_submission_id(record_id: str) -> str:
    """Mirror OLD `createSubmissionId` (taxonomy-submission.ts:30-32).

    e.g. "cm1abc" -> "pending_cm1abc"
    """
    return f"{PENDING_PREFIX}{record_id}"


def get_submission_record_id(submission_id: str) -> str:
    """Mirror OLD `getSubmissionRecordId` (taxonomy-submission.ts:22-24).

    OLD uses String.replace which removes only the first occurrence of the
    prefix. e.g. "pending_cm1abc" -> "cm1abc"
    """
    return submission_id.replace(PENDING_PREFIX, "", 1)
