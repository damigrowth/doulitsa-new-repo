"""Profile model — mirrors Prisma `profiles` table 1:1.

Profile is a 1:1 sibling to User (via `uid`). The Next.js code stored several
denormalised fields here (username, displayName, email, firstName, lastName)
in addition to all the professional fields. We mirror the schema exactly so
the live Prisma writes don't drift from the Django reads.

JSONFields:
- coverage           — { online, onbase, onsite, address?, area?, county?, ... }
- portfolio          — CloudinaryResource[]
- visibility         — { email, phone, address }
- socials            — { facebook, instagram, linkedin, x, youtube, github, ... }
- billing            — { receipt, invoice, afm, doy, name, profession, address }
- stars              — { 1: int, 2: int, ..., 5: int } star-breakdown for ratings

Normalised search fields (taglineNormalized, bioNormalized, displayNameNormalized,
coverageNormalized) are populated by services using `common.utils.normalize`.
"""
from __future__ import annotations

from django.contrib.postgres.fields import ArrayField

from django.db import models

from common.utils.cuid import cuid


class Profile(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)

    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        db_column="uid",
        db_constraint=False,
        related_name="profile",
        related_query_name="profile",
    )

    type = models.CharField(max_length=16, null=True, blank=True)
    tagline = models.TextField(null=True, blank=True)
    tagline_normalized = models.TextField(null=True, blank=True, db_column="taglineNormalized")
    bio = models.TextField(null=True, blank=True)
    bio_normalized = models.TextField(null=True, blank=True, db_column="bioNormalized")
    website = models.URLField(max_length=2048, null=True, blank=True)
    size = models.CharField(max_length=64, null=True, blank=True)

    # Skills / category taxonomy
    skills = ArrayField(models.TextField(), default=list, blank=True)  # Postgres text[]
    speciality = models.CharField(max_length=64, null=True, blank=True)
    category = models.CharField(max_length=64, null=True, blank=True)
    subcategory = models.CharField(max_length=64, null=True, blank=True)
    # Normalized taxonomy FKs (Phase B, add-alongside) — PRO space. CharFields
    # above stay as source/fallback until parity is proven. db_constraint=False
    # tolerates stray values in the restored production dump.
    category_node = models.ForeignKey(
        "taxonomy.TaxonomyNode", null=True, blank=True, on_delete=models.SET_NULL,
        db_constraint=False, related_name="profiles_as_category",
    )
    subcategory_node = models.ForeignKey(
        "taxonomy.TaxonomyNode", null=True, blank=True, on_delete=models.SET_NULL,
        db_constraint=False, related_name="profiles_as_subcategory",
    )

    # Denormalised User fields
    username = models.CharField(max_length=255, null=True, blank=True)
    display_name = models.CharField(max_length=255, null=True, blank=True, db_column="displayName")
    display_name_normalized = models.CharField(
        max_length=255, null=True, blank=True, db_column="displayNameNormalized",
    )
    first_name = models.CharField(max_length=255, null=True, blank=True, db_column="firstName")
    last_name = models.CharField(max_length=255, null=True, blank=True, db_column="lastName")
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=64, null=True, blank=True)

    # Coverage & location
    coverage = models.JSONField(null=True, blank=True)
    coverage_normalized = models.TextField(null=True, blank=True, db_column="coverageNormalized")

    # Media
    image = models.URLField(max_length=2048, null=True, blank=True)
    portfolio = models.JSONField(null=True, blank=True)

    # Presentation
    visibility = models.JSONField(null=True, blank=True)
    socials = models.JSONField(null=True, blank=True)
    viber = models.CharField(max_length=64, null=True, blank=True)
    whatsapp = models.CharField(max_length=64, null=True, blank=True)

    # Additional / commercial fields
    rate = models.IntegerField(null=True, blank=True)
    commencement = models.CharField(max_length=64, null=True, blank=True)
    experience = models.IntegerField(null=True, blank=True)
    contact_methods = ArrayField(models.TextField(), default=list, blank=True, db_column="contactMethods")
    payment_methods = ArrayField(models.TextField(), default=list, blank=True, db_column="paymentMethods")
    settlement_methods = ArrayField(models.TextField(), default=list, blank=True, db_column="settlementMethods")
    budget = models.CharField(max_length=64, null=True, blank=True)
    terms = models.TextField(null=True, blank=True)
    billing = models.JSONField(null=True, blank=True)

    # Rate-limit fields (mirrors Prisma)
    last_service_draft = models.DateTimeField(null=True, blank=True, db_column="lastServiceDraft")
    last_service_refresh_date = models.DateTimeField(
        null=True, blank=True, db_column="lastServiceRefreshDate",
    )
    daily_service_refresh_count = models.IntegerField(default=0, db_column="dailyServiceRefreshCount")

    # Blog
    author_bio = models.TextField(null=True, blank=True, db_column="authorBio")

    # Status flags
    verified = models.BooleanField(default=False)
    featured = models.BooleanField(default=False)
    rating = models.FloatField(default=0)
    review_count = models.IntegerField(default=0, db_column="reviewCount")
    stars = models.JSONField(null=True, blank=True)
    top = models.BooleanField(default=False)
    published = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False, db_column="isActive")

    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "profiles"
        managed = True
        # Indexes mirror the optimised composite set in the Prisma schema.
        # We don't recreate them with managed=False; they exist already.

    def __str__(self) -> str:
        return self.username or self.display_name or self.id
