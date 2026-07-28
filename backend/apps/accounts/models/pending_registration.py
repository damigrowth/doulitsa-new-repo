"""PendingRegistration — temporary OAuth registration intent (24h expiry).

Bridges Google OAuth's redirect-back flow with the user's pre-OAuth choice
of account type (simple vs pro) and role (freelancer vs company). We keep
the existing table so in-flight registrations survive the cutover.
"""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class PendingRegistration(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    email = models.EmailField(unique=True)
    auth_type = models.IntegerField(db_column="authType")  # 1=simple, 2=professional
    role = models.IntegerField(null=True, blank=True)       # 2=freelancer, 3=company
    username = models.CharField(max_length=255, null=True, blank=True)
    display_name = models.CharField(max_length=255, null=True, blank=True, db_column="displayName")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    expires_at = models.DateTimeField(db_column="expiresAt")

    class Meta:
        db_table = "pending_registrations"
        managed = True
