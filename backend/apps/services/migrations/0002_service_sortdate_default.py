"""Give Service.sort_date a model default (mirrors Prisma @default(now())).

The DB column `services.sortDate` already has a `CURRENT_TIMESTAMP` default, but
the model had none, so ORM `.create()` omitting it raised IntegrityError. Adding a
Python-level default needs no DDL — state-only.
"""
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="service",
                    name="sort_date",
                    field=models.DateTimeField(
                        default=django.utils.timezone.now, db_column="sortDate"
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
