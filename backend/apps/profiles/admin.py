from django.contrib import admin

from .models.profile import Profile
from .models.profile_verification import ProfileVerification


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id", "user", "type", "username", "display_name",
        "category", "subcategory", "verified", "featured", "published", "is_active",
        "rating", "review_count", "created_at",
    )
    list_filter = ("type", "verified", "featured", "published", "is_active", "top", "category", "subcategory")
    search_fields = ("user__email", "username", "display_name", "first_name", "last_name", "email", "phone")
    raw_id_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(ProfileVerification)
class ProfileVerificationAdmin(admin.ModelAdmin):
    list_display = ("id", "profile", "status", "name", "afm", "phone", "created_at")
    list_filter = ("status",)
    search_fields = ("profile__username", "name", "afm", "phone", "uid")
    raw_id_fields = ("profile",)
    ordering = ("-created_at",)
