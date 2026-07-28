"""Reconcile Profile array columns to their real Postgres type (text[]).

The live DB columns `skills`, `contactMethods`, `paymentMethods` and
`settlementMethods` were created by Prisma as `text[]` (String[]). The frozen
0001 state wrongly declared them as JSONField (jsonb), so
`makemigrations --check` reported drift against the current ArrayField model.
This is a STATE-ONLY change — the DB already has the correct type, so no DDL
runs against the populated table. Mirrors apps/messaging/migrations/0002.
"""
from django.contrib.postgres.fields import ArrayField
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0003_timestamptz_prisma_columns"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="profile",
                    name="skills",
                    field=ArrayField(
                        base_field=models.TextField(),
                        blank=True,
                        default=list,
                        size=None,
                    ),
                ),
                migrations.AlterField(
                    model_name="profile",
                    name="contact_methods",
                    field=ArrayField(
                        base_field=models.TextField(),
                        blank=True,
                        default=list,
                        db_column="contactMethods",
                        size=None,
                    ),
                ),
                migrations.AlterField(
                    model_name="profile",
                    name="payment_methods",
                    field=ArrayField(
                        base_field=models.TextField(),
                        blank=True,
                        default=list,
                        db_column="paymentMethods",
                        size=None,
                    ),
                ),
                migrations.AlterField(
                    model_name="profile",
                    name="settlement_methods",
                    field=ArrayField(
                        base_field=models.TextField(),
                        blank=True,
                        default=list,
                        db_column="settlementMethods",
                        size=None,
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
