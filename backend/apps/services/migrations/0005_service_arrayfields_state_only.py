"""Reconcile Service array columns to their real Postgres types.

The live DB columns `tags` (text[]), `addons` (jsonb[]) and `faq` (jsonb[])
were created by Prisma as arrays. The frozen 0001 state wrongly declared them
as JSONField (jsonb), so `makemigrations --check` reported drift against the
current ArrayField model. This is a STATE-ONLY change — the DB already has the
correct types, so no DDL runs against the populated table. Mirrors
apps/messaging/migrations/0002.
"""
from django.contrib.postgres.fields import ArrayField
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0004_timestamptz_prisma_columns"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="service",
                    name="tags",
                    field=ArrayField(
                        base_field=models.TextField(),
                        blank=True,
                        default=list,
                        size=None,
                    ),
                ),
                migrations.AlterField(
                    model_name="service",
                    name="addons",
                    field=ArrayField(
                        base_field=models.JSONField(),
                        blank=True,
                        default=list,
                        size=None,
                    ),
                ),
                migrations.AlterField(
                    model_name="service",
                    name="faq",
                    field=ArrayField(
                        base_field=models.JSONField(),
                        blank=True,
                        default=list,
                        size=None,
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
