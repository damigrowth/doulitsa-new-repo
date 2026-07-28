"""Service model — mirrors Prisma `services` table.

Notes:
- `id` is auto-increment integer (the only non-cuid PK in the schema).
- `media`, `addons`, `faq`, `type` are JSON columns.
- `sortDate` is always max(refreshedAt, createdAt) — the source maintains it
  in application code; we update it in the refresh service.
"""
from __future__ import annotations

from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils import timezone


class ServiceStatus(models.TextChoices):
    DRAFT = "draft", "draft"
    PENDING = "pending", "pending"
    PUBLISHED = "published", "published"
    REJECTED = "rejected", "rejected"
    APPROVED = "approved", "approved"
    INACTIVE = "inactive", "inactive"


class ServiceSubscriptionType(models.TextChoices):
    MONTH = "month", "month"
    YEAR = "year", "year"
    PER_CASE = "per_case", "per_case"
    PER_HOUR = "per_hour", "per_hour"
    PER_SESSION = "per_session", "per_session"


class Service(models.Model):
    id = models.BigAutoField(primary_key=True)
    profile = models.ForeignKey(
        "profiles.Profile",
        on_delete=models.CASCADE,
        db_column="pid",
        db_constraint=False,
        related_name="services",
    )
    slug = models.CharField(max_length=255, unique=True, null=True, blank=True)
    title = models.CharField(max_length=512)
    description = models.TextField()
    title_normalized = models.TextField(null=True, blank=True, db_column="titleNormalized")
    description_normalized = models.TextField(null=True, blank=True, db_column="descriptionNormalized")

    # Taxonomy
    category = models.CharField(max_length=64)
    subcategory = models.CharField(max_length=64)
    subdivision = models.CharField(max_length=64)
    tags = ArrayField(models.TextField(), default=list, blank=True)
    # Normalized taxonomy FKs (Phase B, add-alongside). The CharFields above
    # stay as the source/fallback until parity is proven. db_constraint=False
    # tolerates stray values in the restored production dump.
    category_node = models.ForeignKey(
        "taxonomy.TaxonomyNode", null=True, blank=True, on_delete=models.SET_NULL,
        db_constraint=False, related_name="services_as_category",
    )
    subcategory_node = models.ForeignKey(
        "taxonomy.TaxonomyNode", null=True, blank=True, on_delete=models.SET_NULL,
        db_constraint=False, related_name="services_as_subcategory",
    )
    subdivision_node = models.ForeignKey(
        "taxonomy.TaxonomyNode", null=True, blank=True, on_delete=models.SET_NULL,
        db_constraint=False, related_name="services_as_subdivision",
    )

    # Pricing
    fixed = models.BooleanField()
    price = models.IntegerField(default=0, null=True, blank=True)  # cents
    type = models.JSONField()  # {online, presence, oneoff, onbase, subscription, onsite}
    subscription_type = models.CharField(
        max_length=16, null=True, blank=True,
        choices=ServiceSubscriptionType.choices, db_column="subscriptionType",
    )
    duration = models.IntegerField(default=0, null=True, blank=True)

    # Features
    addons = ArrayField(models.JSONField(), default=list, blank=True)  # jsonb[]
    faq = ArrayField(models.JSONField(), default=list, blank=True)     # jsonb[]
    media = models.JSONField(null=True, blank=True)

    # Misc
    featured = models.BooleanField(default=False)
    rating = models.FloatField(default=0)
    review_count = models.IntegerField(default=0, db_column="reviewCount")

    status = models.CharField(max_length=16, choices=ServiceStatus.choices, default=ServiceStatus.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")
    refreshed_at = models.DateTimeField(null=True, blank=True, db_column="refreshedAt")
    sort_date = models.DateTimeField(default=timezone.now, db_column="sortDate")

    class Meta:
        db_table = "services"
        managed = True

    def __str__(self) -> str:
        return self.title
