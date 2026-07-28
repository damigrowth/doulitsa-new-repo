"""Reconcile EmailBatch.message_ids to the real column type (Postgres text[]).

The live DB column `email_batches.messageIds` was created by Prisma as `text[]`
(String[]). The model wrongly declared it as JSONField (jsonb), so digest writes
would fail. This is a STATE-ONLY change — the DB already has the correct type, so
no DDL runs against the populated table.
"""
from django.contrib.postgres.fields import ArrayField
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="emailbatch",
                    name="message_ids",
                    field=ArrayField(
                        base_field=models.TextField(),
                        default=list,
                        db_column="messageIds",
                        size=None,
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
