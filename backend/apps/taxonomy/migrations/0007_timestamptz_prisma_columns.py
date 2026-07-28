"""Convert Prisma-era naive `timestamp` columns to `timestamptz` (DB-only).

The restored production dump created these columns as `timestamp without time
zone` holding UTC wall-times, while Django runs USE_TZ=True — values came back
naive, DRF mislabelled them as +02/+03 local times and naive-vs-aware
comparisons raised TypeError. `USING "col" AT TIME ZONE 'UTC'` reinterprets
the stored wall-time as UTC, preserving the instant.

Each ALTER is guarded via information_schema so the migration is idempotent:
re-running the bare USING cast on an already-timestamptz column would shift
values through the session time zone.

No Django state change — the model state already declares DateTimeField.
"""
from django.db import migrations

# {table: [columns]} — enumerated from information_schema.columns
# (data_type = 'timestamp without time zone', schema public) on the live DB.
COLUMNS = {
    "taxonomy_submissions": ["reviewedAt", "createdAt", "updatedAt"],
}


def _drop_policies_sql() -> str:
    """The restored Supabase-era dump ships RLS policies referencing auth.jwt()
    (a Supabase-only function) — dead in this stack (Supabase realtime was
    replaced by Django Channels; Django connects as table owner so RLS never
    applied) — and they block ALTER COLUMN TYPE. Drop them and disable RLS on
    the tables this migration touches. Intentionally NOT recreated on reverse."""
    tables = "', '".join(COLUMNS.keys())
    drops = (
        "DO $$\n"
        "DECLARE pol record;\n"
        "BEGIN\n"
        "  FOR pol IN\n"
        "    SELECT policyname, tablename FROM pg_policies\n"
        "    WHERE schemaname = 'public' AND tablename IN ('%s')\n"
        "  LOOP\n"
        "    EXECUTE format('DROP POLICY IF EXISTS %%I ON public.%%I', pol.policyname, pol.tablename);\n"
        "  END LOOP;\n"
        "END\n"
        "$$;" % tables
    )
    disable = "\n".join(
        'ALTER TABLE "%s" DISABLE ROW LEVEL SECURITY;' % t for t in COLUMNS
    )
    return drops + "\n" + disable


def _alter(table: str, col: str, from_type: str, to_type: str) -> str:
    """Guarded ALTER: only convert when the column is still `from_type`."""
    inner = (
        'ALTER TABLE "%s" ALTER COLUMN "%s" TYPE %s USING "%s" AT TIME ZONE \'UTC\''
        % (table, col, to_type, col)
    ).replace("'", "''")
    return (
        "DO $$\n"
        "BEGIN\n"
        "  IF EXISTS (\n"
        "    SELECT 1 FROM information_schema.columns\n"
        "    WHERE table_schema = 'public'\n"
        "      AND table_name = '%s'\n"
        "      AND column_name = '%s'\n"
        "      AND data_type = '%s'\n"
        "  ) THEN\n"
        "    EXECUTE '%s';\n"
        "  END IF;\n"
        "END\n"
        "$$;" % (table, col, from_type, inner)
    )


def _sql(from_type: str, to_type: str) -> str:
    return "\n".join(
        _alter(table, col, from_type, to_type)
        for table, cols in COLUMNS.items()
        for col in cols
    )


class Migration(migrations.Migration):

    dependencies = [
        ("taxonomy", "0006_locationtree"),
    ]

    operations = [
        migrations.RunSQL(
            sql=_drop_policies_sql() + "\n" + _sql("timestamp without time zone", "timestamptz"),
            reverse_sql=_sql("timestamp with time zone", "timestamp"),
            state_operations=[],
        ),
    ]
