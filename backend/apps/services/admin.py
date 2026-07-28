from django.contrib import admin

from .models.service import Service


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = (
        "id", "title", "profile", "category", "subcategory",
        "status", "featured", "fixed", "price", "rating", "review_count", "created_at",
    )
    list_filter = ("status", "featured", "fixed", "category", "subcategory", "subdivision")
    search_fields = ("title", "slug", "description", "profile__username")
    raw_id_fields = ("profile",)
    ordering = ("-created_at",)
