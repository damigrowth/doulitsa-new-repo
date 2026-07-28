"""Contact model — mirrors Prisma `contacts`."""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class Contact(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    name = models.CharField(max_length=255)
    email = models.EmailField()
    message = models.TextField()
    subject = models.CharField(max_length=512, null=True, blank=True)
    status = models.CharField(max_length=32, default="new")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "contacts"
        managed = True
