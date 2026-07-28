from django.contrib import admin

from .models.subscription import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "id", "profile", "provider", "plan", "status", "billing_interval",
        "cancel_at_period_end", "current_period_end", "created_at",
    )
    list_filter = ("provider", "plan", "status", "billing_interval", "cancel_at_period_end")
    search_fields = (
        "profile__username", "profile__user__email",
        "stripe_customer_id", "stripe_subscription_id",
        "provider_customer_id", "provider_subscription_id",
        "worldline_token", "worldline_master_order_id",
    )
    raw_id_fields = ("profile",)
    ordering = ("-created_at",)
