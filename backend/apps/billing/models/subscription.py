"""Subscription — mirrors Prisma `subscriptions` (multi-provider)."""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class SubscriptionProvider(models.TextChoices):
    STRIPE = "stripe", "stripe"
    PAYPAL = "paypal", "paypal"
    EUROBANK = "eurobank", "eurobank"
    WORLDLINE = "worldline", "worldline"
    MANUAL = "manual", "manual"


class SubscriptionPlan(models.TextChoices):
    FREE = "free", "free"
    PROMOTED = "promoted", "promoted"


class SubscriptionStatus(models.TextChoices):
    ACTIVE = "active", "active"
    PAST_DUE = "past_due", "past_due"
    CANCELED = "canceled", "canceled"
    INCOMPLETE = "incomplete", "incomplete"
    TRIALING = "trialing", "trialing"
    UNPAID = "unpaid", "unpaid"


class BillingInterval(models.TextChoices):
    MONTH = "month", "month"
    YEAR = "year", "year"


class Subscription(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)

    profile = models.OneToOneField(
        "profiles.Profile", on_delete=models.CASCADE,
        db_column="pid", db_constraint=False, related_name="subscription",
    )

    provider = models.CharField(
        max_length=16, choices=SubscriptionProvider.choices, default=SubscriptionProvider.STRIPE,
    )
    provider_customer_id = models.CharField(
        max_length=255, unique=True, null=True, blank=True, db_column="providerCustomerId",
    )
    provider_subscription_id = models.CharField(
        max_length=255, unique=True, null=True, blank=True, db_column="providerSubscriptionId",
    )

    # Legacy Stripe fields (kept for backward-compat per Prisma schema)
    stripe_customer_id = models.CharField(
        max_length=255, unique=True, null=True, blank=True, db_column="stripeCustomerId",
    )
    stripe_subscription_id = models.CharField(
        max_length=255, unique=True, null=True, blank=True, db_column="stripeSubscriptionId",
    )
    stripe_price_id = models.CharField(
        max_length=255, null=True, blank=True, db_column="stripePriceId",
    )

    # Worldline / Cardlink
    worldline_token = models.CharField(max_length=255, null=True, blank=True, db_column="worldlineToken")
    worldline_token_exp = models.CharField(max_length=16, null=True, blank=True, db_column="worldlineTokenExp")
    worldline_master_order_id = models.CharField(
        max_length=255, null=True, blank=True, db_column="worldlineMasterOrderId",
    )

    plan = models.CharField(max_length=16, choices=SubscriptionPlan.choices, default=SubscriptionPlan.FREE)
    status = models.CharField(
        max_length=16, choices=SubscriptionStatus.choices, default=SubscriptionStatus.INCOMPLETE,
    )
    billing_interval = models.CharField(
        max_length=8, choices=BillingInterval.choices, null=True, blank=True, db_column="billingInterval",
    )

    billing = models.JSONField(null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True, db_column="currentPeriodStart")
    current_period_end = models.DateTimeField(null=True, blank=True, db_column="currentPeriodEnd")
    cancel_at_period_end = models.BooleanField(default=False, db_column="cancelAtPeriodEnd")
    canceled_at = models.DateTimeField(null=True, blank=True, db_column="canceledAt")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    amount = models.IntegerField(null=True, blank=True)  # cents
    currency = models.CharField(max_length=8, default="eur", null=True, blank=True)
    payment_method_type = models.CharField(
        max_length=32, null=True, blank=True, db_column="paymentMethodType",
    )
    payment_method_last4 = models.CharField(
        max_length=4, null=True, blank=True, db_column="paymentMethodLast4",
    )
    payment_method_brand = models.CharField(
        max_length=32, null=True, blank=True, db_column="paymentMethodBrand",
    )

    total_paid_lifetime = models.IntegerField(default=0, db_column="totalPaidLifetime")
    payment_count = models.IntegerField(default=0, db_column="paymentCount")
    first_payment_at = models.DateTimeField(null=True, blank=True, db_column="firstPaymentAt")
    last_payment_at = models.DateTimeField(null=True, blank=True, db_column="lastPaymentAt")

    discount_code = models.CharField(max_length=64, null=True, blank=True, db_column="discountCode")
    discount_percent_off = models.IntegerField(null=True, blank=True, db_column="discountPercentOff")
    discount_amount_off = models.IntegerField(null=True, blank=True, db_column="discountAmountOff")

    class Meta:
        db_table = "subscriptions"
        managed = True

    def is_active(self) -> bool:
        return self.status == SubscriptionStatus.ACTIVE and self.plan == SubscriptionPlan.PROMOTED
