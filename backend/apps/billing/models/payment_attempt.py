"""SubscriptionPaymentAttempt — mirrors Prisma `subscription_payment_attempts`.

Per-charge financial audit trail for the Worldline/Cardlink integration.
Written best-effort from 6 payment write sites (see services/record_attempt.py):
initial success/fail, recurring-child success/fail, cron renewal/retry success/fail/exception.

The live DB already contains this table + enums + indexes (built by Prisma), so the
matching Django migration is state-only (SeparateDatabaseAndState) — it never runs DDL.
"""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class PaymentAttemptStatus(models.TextChoices):
    CAPTURED = "CAPTURED", "CAPTURED"
    AUTHORIZED = "AUTHORIZED", "AUTHORIZED"
    REFUSED = "REFUSED", "REFUSED"
    REFUSEDRISK = "REFUSEDRISK", "REFUSEDRISK"
    CANCELED = "CANCELED", "CANCELED"
    ERROR = "ERROR", "ERROR"


class PaymentAttemptSource(models.TextChoices):
    INITIAL = "initial", "initial"
    RECURRING_CHILD = "recurring_child", "recurring_child"
    CRON_RENEWAL = "cron_renewal", "cron_renewal"
    CRON_RETRY = "cron_retry", "cron_retry"
    MANUAL = "manual", "manual"


class SubscriptionPaymentAttempt(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)

    subscription = models.ForeignKey(
        "billing.Subscription",
        on_delete=models.CASCADE,
        db_column="subscriptionId",
        db_constraint=False,
        related_name="payment_attempts",
    )

    status = models.CharField(max_length=16, choices=PaymentAttemptStatus.choices)
    source = models.CharField(max_length=16, choices=PaymentAttemptSource.choices)
    amount = models.IntegerField()  # cents
    currency = models.CharField(max_length=8, default="eur")

    # Worldline/Cardlink-specific (nullable so other providers / manual entries work)
    sequence = models.IntegerField(null=True, blank=True)  # Cardlink Sequence (1, 2, 3, …)
    tx_id = models.CharField(max_length=255, null=True, blank=True, db_column="txId")
    payment_ref = models.CharField(max_length=255, null=True, blank=True, db_column="paymentRef")
    order_id = models.CharField(max_length=255, null=True, blank=True, db_column="orderId")
    message = models.TextField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True, db_column="errorMessage")

    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")

    class Meta:
        db_table = "subscription_payment_attempts"
        managed = True
        indexes = [
            models.Index(fields=["subscription", "created_at"],
                         name="sub_payatt_subid_created_idx"),
            models.Index(fields=["status", "created_at"],
                         name="sub_payatt_status_created_idx"),
            models.Index(fields=["tx_id"], name="sub_payatt_txid_idx"),
        ]
