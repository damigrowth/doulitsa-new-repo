from django.contrib import admin

from .models.review import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "profile", "author", "rating", "type", "status", "published", "visibility", "service_id", "created_at")
    list_filter = ("status", "type", "published", "visibility", "rating")
    search_fields = ("profile__username", "author__email", "comment")
    raw_id_fields = ("profile", "author")
    ordering = ("-created_at",)
