"""Location — the county → area → postcode tree.

Replaces `_taxonomy_maps.json` (location space). Coverage JSON on Service/Profile
keeps storing location *ids*; `resolve_to_county_id` / label lookups read this
table instead of the static map, so adding an area/county becomes a runtime DB
edit (no redeploy). `raw` keeps the complete original node verbatim.
"""
from __future__ import annotations

from django.contrib.postgres.fields import ArrayField
from django.db import models


class LocationType(models.TextChoices):
    # Phase A uses the coarse postcode/place split; county/area are refined in
    # Phase D's tree API from the clean nested source.
    PLACE = "place", "place"
    POSTCODE = "postcode", "postcode"
    COUNTY = "county", "county"
    AREA = "area", "area"


class Location(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        db_constraint=False,
        related_name="children",
    )
    slug = models.CharField(max_length=255, blank=True, default="")
    # ALL slugs the source bySlug maps to this node (a location can be reached via
    # several name-slugs). Lets resolve_to_county_id rebuild slug->id exactly.
    slugs = ArrayField(models.TextField(), default=list, blank=True)
    name = models.CharField(max_length=255)
    name_normalized = models.CharField(max_length=255, blank=True, default="")
    # Derived from depth: root=county, mid=area, leaf-with-numeric-name=postcode.
    type = models.CharField(max_length=16, choices=LocationType.choices, blank=True, default="")
    order = models.IntegerField(default=0)
    active = models.BooleanField(default=True)
    # See TaxonomyNode.slug_primary — byte-exact bySlug rebuild for collisions.
    slug_primary = models.BooleanField(default=True)
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "taxonomy_locations"
        managed = True
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["parent"]),
            models.Index(fields=["name_normalized"]),
            models.Index(fields=["type"]),
        ]

    def __str__(self) -> str:
        return f"{self.type or 'loc'}:{self.name}"
