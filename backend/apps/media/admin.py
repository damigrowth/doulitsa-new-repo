from django.contrib import admin

from .models.media import Media


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = (
        "id", "public_id", "resource_type", "format", "bytes",
        "user", "usage_context", "is_temporary", "created_at",
    )
    list_filter = ("resource_type", "usage_context", "is_temporary", "format")
    search_fields = ("public_id", "original_name", "user__email")
    raw_id_fields = ("user",)
    ordering = ("-created_at",)
