"""ApiKey model — mirrors Prisma `api_keys` (Better Auth API key plugin)."""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class ApiKey(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    name = models.CharField(max_length=255, null=True, blank=True)
    key = models.CharField(max_length=512, unique=True)

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        db_column="userId",
        db_constraint=False,
        related_name="api_keys",
        related_query_name="api_key",
    )

    enabled = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_column="expiresAt")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    start = models.CharField(max_length=32, null=True, blank=True)        # first chars of key
    prefix = models.CharField(max_length=32, null=True, blank=True)
    remaining = models.IntegerField(null=True, blank=True)
    refill_interval = models.IntegerField(null=True, blank=True, db_column="refillInterval")
    rate_limit_enabled = models.BooleanField(default=False, db_column="rateLimitEnabled")
    permissions = models.JSONField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "api_keys"
        managed = True

    def __str__(self) -> str:
        return self.name or f"key<{self.start or self.id[:8]}>"
