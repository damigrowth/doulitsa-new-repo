"""TaxonomySubmission — community-submitted skills/tags pending admin review.

Mirrors Prisma `taxonomy_submissions` table. On approval, an admin assigns a
real numeric ID and the entry is committed to the file-based dataset via the
GitHub workflow (see apps/taxonomy/services/github_dataset.py).
"""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class TaxonomySubmissionType(models.TextChoices):
    SKILL = "skill", "skill"
    TAG = "tag", "tag"


class TaxonomySubmissionStatus(models.TextChoices):
    PENDING = "pending", "pending"
    APPROVED = "approved", "approved"
    REJECTED = "rejected", "rejected"


class TaxonomySubmission(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    label = models.CharField(max_length=255)
    type = models.CharField(max_length=8, choices=TaxonomySubmissionType.choices)
    status = models.CharField(
        max_length=16,
        choices=TaxonomySubmissionStatus.choices,
        default=TaxonomySubmissionStatus.PENDING,
    )
    category = models.CharField(max_length=64, null=True, blank=True)  # skills only
    submitted_by = models.CharField(max_length=64, db_column="submittedBy")
    reviewed_by = models.CharField(max_length=64, null=True, blank=True, db_column="reviewedBy")
    reviewed_at = models.DateTimeField(null=True, blank=True, db_column="reviewedAt")
    assigned_id = models.CharField(max_length=64, null=True, blank=True, db_column="assignedId")
    reject_reason = models.TextField(null=True, blank=True, db_column="rejectReason")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "taxonomy_submissions"
        managed = True
