"""Verification model — Better Auth's generic verification-token table.

Holds tokens for email verification, password reset, OAuth state, etc.
`identifier` is typically the email address; `value` is the token (or hash).
We keep the existing table so any in-flight Better Auth flows continue
working during cutover. New tokens (issued by Django) are written here too.
"""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class Verification(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    identifier = models.CharField(max_length=255)
    value = models.TextField()
    expires_at = models.DateTimeField(db_column="expiresAt")
    created_at = models.DateTimeField(null=True, blank=True, auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(null=True, blank=True, auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "verification"
        managed = True
        indexes = [
            models.Index(fields=["identifier"]),
            models.Index(fields=["expires_at"]),
        ]
