"""Account model — mirrors Prisma `accounts` (Better Auth provider linkage).

For email/password users, `password` holds the bcrypt(12) hash. For OAuth
users, `password` is null and `provider_id` + `account_id` hold the provider
linkage. We keep this table compatible with Better Auth so existing logins
continue to work.
"""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class Account(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        db_column="userId",
        db_constraint=False,
        related_name="accounts",
        related_query_name="account",
    )

    refresh_token = models.TextField(null=True, blank=True, db_column="refresh_token")
    access_token = models.TextField(null=True, blank=True, db_column="access_token")
    scope = models.TextField(null=True, blank=True)
    id_token = models.TextField(null=True, blank=True, db_column="id_token")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")
    access_token_expires_at = models.DateTimeField(
        null=True, blank=True, db_column="access_token_expires_at",
    )
    account_id = models.CharField(max_length=255, unique=True, db_column="accountId")
    password = models.TextField(null=True, blank=True)  # bcrypt(12) hash for email/password users
    provider_id = models.CharField(max_length=64, db_column="providerId")
    refresh_token_expires_at = models.DateTimeField(
        null=True, blank=True, db_column="refresh_token_expires_at",
    )

    class Meta:
        db_table = "accounts"
        managed = True

    def __str__(self) -> str:
        return f"account<{self.provider_id}:{self.account_id}>"
