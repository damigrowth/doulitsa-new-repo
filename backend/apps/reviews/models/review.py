"""Review — mirrors Prisma `reviews` table.

Two distinct flags worth noting:
- status (pending|approved|rejected) — admin moderation workflow
- published (bool) — admin override on top of status, syncs with status for
  backward compatibility
- visibility (bool) — *professional's* control to hide the comment publicly
  while keeping the rating visible. Two independent toggles, both required
  to be True for the comment to render publicly.

`pid` is required for ALL reviews (every review targets a profile).
`sid` is optional and present only for SERVICE-type reviews.
"""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class ReviewType(models.TextChoices):
    SERVICE = "SERVICE", "SERVICE"
    PROFILE = "PROFILE", "PROFILE"


class ReviewStatus(models.TextChoices):
    PENDING = "pending", "pending"
    APPROVED = "approved", "approved"
    REJECTED = "rejected", "rejected"
    DRAFT = "draft", "draft"
    PUBLISHED = "published", "published"
    INACTIVE = "inactive", "inactive"


class Review(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    rating = models.IntegerField()
    comment = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=ReviewStatus.choices, default=ReviewStatus.PENDING)
    type = models.CharField(max_length=16, choices=ReviewType.choices, default=ReviewType.PROFILE)
    published = models.BooleanField(default=False)
    visibility = models.BooleanField(default=False)

    service_id = models.IntegerField(null=True, blank=True, db_column="sid")
    profile = models.ForeignKey(
        "profiles.Profile",
        on_delete=models.CASCADE,
        db_column="pid",
        db_constraint=False,
        related_name="reviews_received",
    )
    author = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        db_column="authorId",
        db_constraint=False,
        related_name="reviews_given",
    )

    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "reviews"
        managed = True

    def __str__(self) -> str:
        return f"review<{self.id}>"
