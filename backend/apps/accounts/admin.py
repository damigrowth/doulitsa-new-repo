from django import forms
from django.contrib import admin

from .models.account import Account
from .models.jwks import Jwks
from .models.pending_registration import PendingRegistration
from .models.session import Session
from .models.user import User
from .models.verification import Verification


class UserAdminForm(forms.ModelForm):
    """Edit a user without touching their password.

    The raw `password` hash field is hidden (it was required, so every save
    demanded one, and whatever was typed got stored unhashed on User.password —
    which login never reads). Login checks the credential Account row, so a
    new password goes through admin_users.set_user_password instead. Existing
    passwords are hashed and can't be shown — only replaced.
    """

    new_password = forms.CharField(
        label="New password",
        required=False,
        min_length=6,
        strip=False,
        widget=forms.TextInput(attrs={"autocomplete": "new-password"}),
        help_text="Leave empty to keep the current password. "
        "Current passwords are stored hashed and cannot be displayed.",
    )

    class Meta:
        model = User
        exclude = ("password",)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    form = UserAdminForm
    list_display = ("email", "username", "role", "type", "step", "confirmed", "blocked", "banned", "created_at")
    list_filter = ("role", "type", "step", "confirmed", "blocked", "banned", "test_user", "provider")
    search_fields = ("email", "username", "display_name", "first_name", "last_name")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        new_password = form.cleaned_data.get("new_password")
        if new_password:
            from .services.admin_users import set_user_password

            set_user_password(target_user=obj, new_password=new_password)
            # Keep Django's own hash in sync (used for staff logins to this admin).
            obj.set_password(new_password)
            obj.save(update_fields=["password"])


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
