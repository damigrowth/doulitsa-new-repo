from django.contrib import admin

from .models.saved_profile import SavedProfile
from .models.saved_service import SavedService


@admin.register(SavedProfile)
class SavedProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "profile_id", "created_at")
    search_fields = ("user__email", "profile_id")
    raw_id_fields = ("user",)
    ordering = ("-created_at",)


@admin.register(SavedService)
class SavedServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "service_id", "created_at")
    search_fields = ("user__email", "service_id")
    raw_id_fields = ("user",)
    ordering = ("-created_at",)
