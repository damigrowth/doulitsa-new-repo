"""LocationTree — the canonical counties→areas→zipcodes DISPLAY tree.

The frontend's `locationOptions` is a hand-curated nested structure where the
same node id can appear under several parents (a zipcode belongs to multiple
areas), so it's a DAG that a per-node `parent_id` can't represent. We store the
whole structure verbatim in one row and overlay LIVE names from the `Location`
table at build time — so renaming a location reflects in coverage display with
no redeploy, while the structure stays byte-identical to `locationOptions`.

This is separate from `Location.parent_id` (the filtering/county-resolution
structure, which is verified against `_taxonomy_maps.json` and untouched).
"""
from __future__ import annotations

from django.db import models


class LocationTree(models.Model):
    # Singleton (always id=1).
    id = models.IntegerField(primary_key=True, default=1)
    tree = models.JSONField(default=list)

    class Meta:
        db_table = "taxonomy_location_tree"
        managed = True

    def __str__(self) -> str:
        return f"LocationTree(roots={len(self.tree or [])})"
