from django.contrib import admin

from .models.api_key import ApiKey


@admin.register(ApiKey)
class ApiKeyAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "user", "enabled", "prefix", "rate_limit_enabled", "expires_at", "created_at")
    list_filter = ("enabled", "rate_limit_enabled")
    search_fields = ("name", "key", "user__email", "prefix")
    raw_id_fields = ("user",)
    readonly_fields = ("key", "created_at", "updated_at")
    ordering = ("-created_at",)
