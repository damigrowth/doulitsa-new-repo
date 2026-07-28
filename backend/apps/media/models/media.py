"""Media model — Cloudinary asset registry. Mirrors Prisma `media` table."""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class Media(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)

    public_id = models.CharField(max_length=255, unique=True, db_column="publicId")
    secure_url = models.URLField(max_length=2048, db_column="secureUrl")
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    format = models.CharField(max_length=32, null=True, blank=True)
    bytes = models.BigIntegerField(null=True, blank=True)
    resource_type = models.CharField(max_length=32, db_column="resourceType")  # 'image' | 'video' | 'raw'
    folder = models.CharField(max_length=255, null=True, blank=True)
    original_name = models.CharField(max_length=512, null=True, blank=True, db_column="originalName")

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        db_column="userId",
        db_constraint=False,
        related_name="media",
        related_query_name="media",
    )

    is_temporary = models.BooleanField(default=True, db_column="isTemporary")
    usage_context = models.CharField(
        max_length=64, null=True, blank=True, db_column="usageContext",
    )  # 'profile_avatar' | 'profile_portfolio' | 'service_image'
    usage_id = models.CharField(max_length=64, null=True, blank=True, db_column="usageId")

    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "media"
        managed = True
        indexes = [
            models.Index(fields=["public_id"]),
            models.Index(fields=["is_temporary"]),
            models.Index(fields=["usage_context", "usage_id"]),
        ]

    def __str__(self) -> str:
        return self.public_id
