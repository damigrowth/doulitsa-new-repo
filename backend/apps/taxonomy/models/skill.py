"""Skill — pro/profile skills, grouped by pro category.

Replaces `_taxonomy_maps.json` (skills space). Profile.skills keeps its id array;
labels resolve from this table. `category` points at the owning pro-category
TaxonomyNode. `raw` keeps the complete original node verbatim.
"""
from __future__ import annotations

from django.db import models


class Skill(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    slug = models.CharField(max_length=255)
    label = models.CharField(max_length=255)
    label_normalized = models.CharField(max_length=255, blank=True, default="")
    category = models.ForeignKey(
        "taxonomy.TaxonomyNode",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_constraint=False,
        related_name="skills",
    )
    order = models.IntegerField(default=0)
    active = models.BooleanField(default=True)
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "taxonomy_skills"
        managed = True
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["category"]),
            models.Index(fields=["label_normalized"]),
        ]

    def __str__(self) -> str:
        return self.label
