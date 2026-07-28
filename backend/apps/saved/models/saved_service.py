"""SavedService — user ↔ service many-to-many. Mirrors Prisma `saved_services`."""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class SavedService(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        db_column="userId",
        db_constraint=False,
        related_name="saved_services",
    )
    service_id = models.IntegerField(db_column="serviceId")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")

    class Meta:
        db_table = "saved_services"
        managed = True
        unique_together = (("user", "service_id"),)
