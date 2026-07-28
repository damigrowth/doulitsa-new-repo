# django-backend

Migration of the Next.js project's backend to Django REST Framework. Source of truth is [MIGRATION_TRACKER.md](./MIGRATION_TRACKER.md) — never delete or reorder rows.

## Stack

- Python 3.12+, Django 5.1, DRF 3.15, Channels 4 (Daphne ASGI)
- PostgreSQL (same database the Next.js app uses)
- Redis for cache + Channels layer + Celery broker
- Celery + celery-beat for async tasks (replaces Vercel cron)
- `djangorestframework-simplejwt` + `django-allauth` for auth (replaces Better Auth)
- `drf-spectacular` for OpenAPI / Swagger

## Local setup

```bash
# 1. Python deps
uv sync           # or:  python -m venv .venv && pip install -e .[dev]

# 2. Local infra
docker compose up -d postgres redis

# 3. Env
cp .env.example .env   # fill in secrets

# 4. DB — point DATABASE_URL at the SAME Postgres the Next.js app uses
# Existing tables are kept; Django manages new ones only.
./manage.py migrate --fake-initial

# 5. Run (one process for HTTP + WebSocket via Daphne)
daphne -p 8000 config.asgi:application
# or split:
./manage.py runserver       # HTTP only (no WebSocket)
daphne -p 8001 config.asgi:application

# 6. Background workers
celery -A config worker -l INFO
celery -A config beat   -l INFO
```

## Restoring a Supabase dump into local Postgres

Drop a custom-format dump (`*.dump`) into `backend/dumps/` (gitignored). The
recipe assumes the whole stack is up (`docker compose up -d`):

```bash
# 1. Wipe the local django db so we restore into a clean slate.
docker compose exec postgres psql -U django -d postgres \
  -c 'DROP DATABASE IF EXISTS django' -c 'CREATE DATABASE django OWNER django'

# 2. Required extensions (the Supabase dump references these by name).
docker compose exec postgres psql -U django -d django <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SQL

# 3. Copy the dump into the container and restore ONLY the public schema.
#    --no-owner / --no-acl skips Supabase role grants; the RLS policies at
#    the tail will fail because they reference auth.jwt() — that's expected
#    and harmless for our setup.
docker cp backend/dumps/<your-dump>.dump django-backend-postgres-1:/tmp/db.dump
docker compose exec postgres pg_restore \
  --dbname=django --username=django \
  --schema=public --no-owner --no-acl /tmp/db.dump

# 4. Patch users table for Django auth (the Prisma schema has no password column).
docker compose exec postgres psql -U django -d django <<'SQL'
ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamp(3) without time zone;
SQL

# 5. Apply Django migrations on top.
#    Most are faked since the tables already exist; account/socialaccount
#    are faked too because their email-lowercase data migration conflicts
#    with real (dirty) data.
docker compose exec backend python manage.py shell <<'PY'
from django.core.management import call_command
for app in ("auth", "contenttypes", "admin", "sessions", "sites",
            "token_blacklist", "django_celery_beat", "django_celery_results"):
    call_command("migrate", app, "--fake-initial", "--noinput")
for app in ("account", "socialaccount"):
    call_command("migrate", app, "--fake", "--noinput")
for app in ("accounts", "profiles", "services", "reviews", "billing",
            "messaging", "saved", "blog", "taxonomy", "media", "support", "admin_api"):
    call_command("migrate", app, "--fake-initial", "--noinput")
call_command("migrate", "--noinput")
PY

# 6. Create a known admin so /django-admin/ is reachable.
docker compose exec backend python manage.py shell <<'PY'
from django.contrib.auth import get_user_model
U = get_user_model()
u, _ = U.objects.update_or_create(email="admin@doulitsa.gr", defaults={
    "name": "Admin", "step": "DASHBOARD", "email_verified": True,
    "confirmed": True, "role": "admin", "type": "user", "provider": "email",
})
u.set_password("admin1234")
u.save()
PY
```

The `docker-compose.yml` boot command already includes `migrate --fake-initial`,
so restarts after a restore stay no-op.

## Schema reference

Open Swagger at `http://localhost:8000/api/docs/` once the server is up.
Raw OpenAPI at `/api/schema/`.

## Tests

```bash
pytest                          # all tests
pytest apps/accounts/           # per app
pytest -m "not integration"     # skip tests needing live Postgres/Redis
```

## Tracker discipline

After every endpoint migration:
1. Update its row in [MIGRATION_TRACKER.md](./MIGRATION_TRACKER.md) (`🟡 → ✅ → 🧪 → 📘`).
2. Add a Notes entry if behavior diverged from Next.js.
3. Re-read the tracker at the start of each session and report counts.

The migration is only "complete" when every endpoint row is at `📘 Documented`.

## Layout

```
config/           Django settings, URLs, ASGI/WSGI, Celery
common/           Shared utilities (pagination, exceptions, hashers, …)
apps/<name>/      One Django app per bounded context, with:
  models/         One model per file
  serializers/    One per file
  views/public/   User-facing viewsets/views
  views/admin/    Admin counterparts
  permissions/    Custom permission classes
  filters.py      django-filter FilterSets
  pagination.py   App-specific pagination (if needed)
  services/       Business logic — fat services, thin views
  selectors/      Read queries — keep views thin
  tasks.py        Celery tasks
  consumers.py    Channels consumers (messaging only)
  urls.py         URL conf
  tests/          pytest tests
```

See `.claudeinstractions` in the original Next.js repo for the full migration playbook.
