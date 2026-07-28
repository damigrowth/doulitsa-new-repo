from django.contrib import admin

from .models.chat import BlockedUser, Chat, ChatMember, EmailBatch, Message


class ChatMemberInline(admin.TabularInline):
    model = ChatMember
    extra = 0
    raw_id_fields = ("user",)


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ("id", "cid", "name", "creator", "published", "last_activity", "created_at")
    list_filter = ("published",)
    search_fields = ("cid", "name", "creator__email")
    raw_id_fields = ("creator",)
    inlines = (ChatMemberInline,)
    ordering = ("-last_activity",)


@admin.register(ChatMember)
class ChatMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "chat", "user", "online", "muted", "joined_at", "last_seen")
    list_filter = ("online", "muted")
    search_fields = ("chat__cid", "user__email")
    raw_id_fields = ("chat", "user")
    ordering = ("-joined_at",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "chat", "author", "read", "published", "deleted", "created_at")
    list_filter = ("read", "published", "deleted")
    search_fields = ("chat__cid", "author__email", "content")
    raw_id_fields = ("chat", "author")
    ordering = ("-created_at",)


@admin.register(BlockedUser)
class BlockedUserAdmin(admin.ModelAdmin):
    list_display = ("id", "blocker", "blocked", "created_at")
    search_fields = ("blocker__email", "blocked__email")
    raw_id_fields = ("blocker", "blocked")
    ordering = ("-created_at",)


@admin.register(EmailBatch)
class EmailBatchAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "message_count", "sent_at", "created_at")
    search_fields = ("user__email",)
    raw_id_fields = ("user",)
    ordering = ("-created_at",)
