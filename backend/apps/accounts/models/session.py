"""Session model — mirrors Prisma `sessions` (Better Auth session table).

Kept read/writeable so server-side session lookups (and admin impersonation
tracking) continue to work even after JWT becomes the primary auth mechanism.
Better Auth tokens remain valid until they expire.
"""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class Session(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        db_column="userId",
        db_constraint=False,
        related_name="sessions",
        related_query_name="session",
    )
    expires_at = models.DateTimeField(db_column="expiresAt")
    token = models.CharField(max_length=512, unique=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")
    ip_address = models.CharField(max_length=64, null=True, blank=True, db_column="ipAddress")
    user_agent = models.TextField(null=True, blank=True, db_column="userAgent")
    impersonated_by = models.CharField(
        max_length=64, null=True, blank=True, db_column="impersonatedBy",
    )

    class Meta:
        db_table = "sessions"
        managed = True

    def __str__(self) -> str:
        return f"session<{self.id}>"
