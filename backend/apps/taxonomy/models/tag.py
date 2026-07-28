"""Tag — service tags (flat list).

Replaces `_taxonomy_maps.json` (tags space). Service.tags keeps its id array;
labels resolve from this table. `raw` keeps the complete original node verbatim.
"""
from __future__ import annotations

from django.db import models


class Tag(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    slug = models.CharField(max_length=255)
    label = models.CharField(max_length=255)
    label_normalized = models.CharField(max_length=255, blank=True, default="")
    order = models.IntegerField(default=0)
    active = models.BooleanField(default=True)
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "taxonomy_tags"
        managed = True
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["label_normalized"]),
        ]

    def __str__(self) -> str:
        return self.label
