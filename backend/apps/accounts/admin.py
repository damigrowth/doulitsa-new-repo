from django.contrib import admin

from .models.account import Account
from .models.jwks import Jwks
from .models.pending_registration import PendingRegistration
from .models.session import Session
from .models.user import User
from .models.verification import Verification


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "username", "role", "type", "step", "confirmed", "blocked", "banned", "created_at")
    list_filter = ("role", "type", "step", "confirmed", "blocked", "banned", "test_user", "provider")
    search_fields = ("email", "username", "display_name", "first_name", "last_name")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "expires_at", "ip_address", "created_at")
    search_fields = ("user__email", "token", "ip_address")
    list_filter = ("expires_at",)
    raw_id_fields = ("user",)
    ordering = ("-created_at",)


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "provider_id", "account_id", "created_at")
    search_fields = ("user__email", "account_id", "provider_id")
    list_filter = ("provider_id",)
    raw_id_fields = ("user",)
    ordering = ("-created_at",)


@admin.register(Verification)
class VerificationAdmin(admin.ModelAdmin):
    list_display = ("id", "identifier", "expires_at", "created_at")
    search_fields = ("identifier",)
    ordering = ("-created_at",)


@admin.register(PendingRegistration)
class PendingRegistrationAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "auth_type", "role", "expires_at", "created_at")
    search_fields = ("email", "username", "display_name")
    list_filter = ("auth_type", "role")
    ordering = ("-created_at",)


@admin.register(Jwks)
class JwksAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at")
    ordering = ("-created_at",)
