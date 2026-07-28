"""Add the SubscriptionPaymentAttempt model.

NON-DESTRUCTIVE / STATE-ONLY.

The `subscription_payment_attempts` table — together with its two PG enum types
(`PaymentAttemptStatus`, `PaymentAttemptSource`), its FK to `subscriptions`, and its
three indexes — already exists in the live production database (it was originally
created by Prisma and contains real data).

This migration therefore uses `SeparateDatabaseAndState`:
  - `state_operations`  : the `CreateModel` so Django's migration state / ORM knows
                          about the model and can read & write the existing table.
  - `database_operations`: EMPTY — so NO `CREATE TABLE` / `CREATE INDEX` / enum DDL
                          is ever emitted against the populated table.

`python manage.py sqlmigrate billing 0002` will therefore print only:
    BEGIN; ... COMMIT;
with no DDL between, confirming nothing destructive runs.

The model's `Meta.indexes` carry Django-local names (`sub_payatt_*`) that differ from
the live Prisma index names; because index creation lives only in state (not database),
the divergence is purely cosmetic and never touches the DB.
"""
import common.utils.cuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            # No SQL — the table/enums/FK/indexes already exist in the live DB.
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name="SubscriptionPaymentAttempt",
                    fields=[
                        ("id", models.CharField(default=common.utils.cuid.cuid, editable=False, max_length=64, primary_key=True, serialize=False)),
                        ("status", models.CharField(choices=[("CAPTURED", "CAPTURED"), ("AUTHORIZED", "AUTHORIZED"), ("REFUSED", "REFUSED"), ("REFUSEDRISK", "REFUSEDRISK"), ("CANCELED", "CANCELED"), ("ERROR", "ERROR")], max_length=16)),
                        ("source", models.CharField(choices=[("initial", "initial"), ("recurring_child", "recurring_child"), ("cron_renewal", "cron_renewal"), ("cron_retry", "cron_retry"), ("manual", "manual")], max_length=16)),
                        ("amount", models.IntegerField()),
                        ("currency", models.CharField(default="eur", max_length=8)),
                        ("sequence", models.IntegerField(blank=True, null=True)),
                        ("tx_id", models.CharField(blank=True, db_column="txId", max_length=255, null=True)),
                        ("payment_ref", models.CharField(blank=True, db_column="paymentRef", max_length=255, null=True)),
                        ("order_id", models.CharField(blank=True, db_column="orderId", max_length=255, null=True)),
                        ("message", models.TextField(blank=True, null=True)),
                        ("error_message", models.TextField(blank=True, db_column="errorMessage", null=True)),
                        ("created_at", models.DateTimeField(auto_now_add=True, db_column="createdAt")),
                        ("subscription", models.ForeignKey(db_column="subscriptionId", db_constraint=False, on_delete=django.db.models.deletion.CASCADE, related_name="payment_attempts", to="billing.subscription")),
                    ],
                    options={
                        "db_table": "subscription_payment_attempts",
                        "managed": True,
                    },
                ),
                migrations.AddIndex(
                    model_name="subscriptionpaymentattempt",
                    index=models.Index(fields=["subscription", "created_at"], name="sub_payatt_subid_created_idx"),
                ),
                migrations.AddIndex(
                    model_name="subscriptionpaymentattempt",
                    index=models.Index(fields=["status", "created_at"], name="sub_payatt_status_created_idx"),
                ),
                migrations.AddIndex(
                    model_name="subscriptionpaymentattempt",
                    index=models.Index(fields=["tx_id"], name="sub_payatt_txid_idx"),
                ),
            ],
        ),
    ]
