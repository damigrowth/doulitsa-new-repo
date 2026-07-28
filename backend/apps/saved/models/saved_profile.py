"""SavedProfile — user ↔ profile many-to-many. Mirrors Prisma `saved_profiles`."""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class SavedProfile(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        db_column="userId",
        db_constraint=False,
        related_name="saved_profiles",
    )
    profile_id = models.CharField(max_length=64, db_column="profileId")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")

    class Meta:
        db_table = "saved_profiles"
        managed = True
        unique_together = (("user", "profile_id"),)
