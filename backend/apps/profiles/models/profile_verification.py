"""ProfileVerification — Greek AFM/business verification request.

Mirrors Prisma `verifications` table (note: distinct from Better Auth's
`verification` table for email tokens — different name, different shape).
Status values: 'PENDING' | 'APPROVED' | 'REJECTED' (uppercase strings).
"""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class ProfileVerification(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    status = models.CharField(max_length=16, default="PENDING")  # PENDING|APPROVED|REJECTED
    afm = models.CharField(max_length=16, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    address = models.CharField(max_length=512, null=True, blank=True)
    phone = models.CharField(max_length=64, null=True, blank=True)

    uid = models.CharField(max_length=64)  # raw User ID reference (Prisma column name)
    profile = models.OneToOneField(
        "profiles.Profile",
        on_delete=models.CASCADE,
        db_column="pid",
        db_constraint=False,
        related_name="verification",
        related_query_name="verification",
    )

    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "verifications"
        managed = True
