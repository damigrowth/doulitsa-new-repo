from django.contrib import admin

from .models.contact import Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "email", "subject", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "email", "subject", "message")
    ordering = ("-created_at",)
