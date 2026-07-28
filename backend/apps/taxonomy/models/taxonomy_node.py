"""TaxonomyNode — the service + pro category/subcategory/subdivision tree.

Replaces the static `_taxonomy_maps.json` (service + pro spaces) as the source of
truth. Self-referential adjacency list: a category has no parent, a subcategory's
parent is its category, a subdivision's parent is its subcategory.

The primary key is the EXISTING node id (cuid for service/pro), so Service/Profile
rows that already store that id map to the FK with zero translation.

`raw` keeps the complete original node verbatim so no source field is ever lost —
typed columns cover what we query/render; `raw` preserves everything else.
"""
from __future__ import annotations

from django.db import models


class TaxonomySpace(models.TextChoices):
    SERVICE = "service", "service"
    PRO = "pro", "pro"


class TaxonomyLevel(models.TextChoices):
    CATEGORY = "category", "category"
    SUBCATEGORY = "subcategory", "subcategory"
    SUBDIVISION = "subdivision", "subdivision"


class TaxonomyNode(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        db_constraint=False,
        related_name="children",
    )
    space = models.CharField(max_length=16, choices=TaxonomySpace.choices)
    level = models.CharField(max_length=16, choices=TaxonomyLevel.choices)
    slug = models.CharField(max_length=255)
    label = models.CharField(max_length=255)
    # Accent-insensitive label for search (normalize_term).
    label_normalized = models.CharField(max_length=255, blank=True, default="")
    plural = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=255, blank=True, default="")
    featured = models.BooleanField(default=False)
    image = models.JSONField(null=True, blank=True)
    order = models.IntegerField(default=0)
    active = models.BooleanField(default=True)
    # True iff this node is the one the source `bySlug` index resolves its slug
    # to (collision tie-break). Lets the DB rebuild bySlug byte-exactly, since
    # colliding slugs can name genuinely different concepts.
    slug_primary = models.BooleanField(default=True)
    # Complete original node, byte-for-byte — lossless guarantee.
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "taxonomy_nodes"
        managed = True
        indexes = [
            models.Index(fields=["space", "level"]),
            models.Index(fields=["space", "level", "slug"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["parent"]),
            models.Index(fields=["label_normalized"]),
        ]
        # NOTE: no unique constraint on (space, level, parent, slug). The source
        # data genuinely has distinct nodes sharing a slug under one parent (e.g.
        # two pro subcategories slugged "ekfonites" under q20QDs). The `id` PK is
        # the unique key; slug lookups resolve to one node (as the old bySlug map
        # did), and FKs reference the exact node id, so filtering stays precise.

    def __str__(self) -> str:
        return f"{self.space}/{self.level}/{self.slug}"
