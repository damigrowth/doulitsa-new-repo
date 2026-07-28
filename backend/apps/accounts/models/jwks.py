"""JWKS model — JWT key set used by Better Auth's JWT plugin.

Once SimpleJWT is the source of truth for tokens this table becomes vestigial.
Keep it managed=False for compatibility; we won't write to it from Django.
"""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class Jwks(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    public_key = models.TextField(db_column="publicKey")
    private_key = models.TextField(db_column="privateKey")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")

    class Meta:
        db_table = "jwks"
        managed = True
