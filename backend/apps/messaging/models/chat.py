"""Chat / ChatMember / Message / BlockedUser / EmailBatch — mirror Prisma."""
from __future__ import annotations

from django.contrib.postgres.fields import ArrayField
from django.db import models

from common.utils.cuid import cuid


class Chat(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    cid = models.CharField(max_length=255, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")
    creator = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        db_column="creatorUid",
        db_constraint=False,
        related_name="chats_created",
    )
    last_message_id = models.CharField(
        max_length=64, unique=True, null=True, blank=True, db_column="lastMessageId",
    )
    last_activity = models.DateTimeField(db_column="lastActivity", auto_now_add=True)

    class Meta:
        db_table = "chats"
        managed = True


class ChatMember(models.Model):
    chat = models.ForeignKey(
        Chat, on_delete=models.CASCADE, db_column="chatId",
        db_constraint=False, related_name="members",
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, db_column="uid",
        db_constraint=False, related_name="chat_memberships",
    )
    joined_at = models.DateTimeField(auto_now_add=True, db_column="joinedAt")
    last_seen = models.DateTimeField(auto_now_add=True, db_column="lastSeen")
    muted = models.BooleanField(default=False)
    online = models.BooleanField(default=False)

    class Meta:
        db_table = "chat_members"
        managed = True
        unique_together = (("chat", "user"),)


class Message(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    content = models.TextField()
    read = models.BooleanField(default=False)
    published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")
    author = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE,
        db_column="authorUid", db_constraint=False, related_name="messages_authored",
    )
    chat = models.ForeignKey(
        Chat, on_delete=models.CASCADE,
        db_column="chatId", db_constraint=False, related_name="messages",
    )
    deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True, db_column="deletedAt")
    deleted_by = models.CharField(max_length=64, null=True, blank=True, db_column="deletedBy")
    edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True, db_column="editedAt")
    reply_to_id = models.CharField(max_length=64, null=True, blank=True, db_column="replyToId")
    reactions = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "messages"
        managed = True


class BlockedUser(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    blocker = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE,
        db_column="blockerId", db_constraint=False, related_name="users_blocked",
    )
    blocked = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE,
        db_column="blockedId", db_constraint=False, related_name="blocked_by_users",
    )
    reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "blocked_users"
        managed = True
        unique_together = (("blocker", "blocked"),)


class EmailBatch(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE,
        db_column="userId", db_constraint=False, related_name="email_batches",
    )
    # DB column is Postgres text[] (Prisma String[]) — must be ArrayField, not
    # jsonb, or digest writes fail against the array column.
    message_ids = ArrayField(models.TextField(), default=list, db_column="messageIds")
    message_count = models.IntegerField(db_column="messageCount")
    sent_at = models.DateTimeField(auto_now_add=True, db_column="sentAt")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "email_batches"
        managed = True
