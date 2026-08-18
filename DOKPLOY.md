# Dokploy deployment — Doulitsa

Two Dockerfile apps from this monorepo, plus Postgres + Redis.

| App      | Build context | Dockerfile          | Internal port | Domain                        |
| -------- | ------------- | ------------------- | ------------- | ----------------------------- |
| Backend  | `backend/`    | `backend/Dockerfile`  | `8000`        | `api-doulitsa.ncmulti.com`    |
| Frontend | `frontend/`   | `frontend/Dockerfile` | `3000`        | `doulitsa.ncmulti.com`        |

In each Dokploy **Application** set the *Build Type* to **Dockerfile**, point the
*Build Path / Context* at the folder above, and add the domain with HTTPS
(Let's Encrypt) enabled. Traefik terminates TLS and forwards plain HTTP to the
container port.

> **Order matters:** deploy the **backend first**. The frontend bakes the API
> URL into its client bundle at build time, and `next build` may fetch the API
> for statically generated pages — both need the API live.

You also need a **Postgres** and a **Redis** service (Dokploy databases or your
own). Restore `backend/dumps/doulitsa-full-backup-*.dump` into Postgres before
the first backend boot; the backend entrypoint runs `migrate --fake-initial`,
which marks the already-present tables as migrated instead of recreating them.

---

## Backend — environment variables

Required:

```
DJANGO_SETTINGS_MODULE=config.settings.prod
DJANGO_SECRET_KEY=<50+ random chars>
DJANGO_ALLOWED_HOSTS=api-doulitsa.ncmulti.com
DJANGO_TIME_ZONE=Europe/Athens

DATABASE_URL=postgres://USER:PASS@postgres-host:5432/DB
DIRECT_URL=postgres://USER:PASS@postgres-host:5432/DB

REDIS_URL=redis://redis-host:6379/0
CELERY_BROKER_URL=redis://redis-host:6379/1
CELERY_RESULT_BACKEND=django-db
CHANNELS_REDIS_URL=redis://redis-host:6379/3

CORS_ALLOWED_ORIGINS=https://doulitsa.ncmulti.com
FRONTEND_BASE_URL=https://doulitsa.ncmulti.com

SIMPLE_JWT_SIGNING_KEY=<50+ random chars>
SIMPLE_JWT_REFRESH_LIFETIME_DAYS=3
```

`CSRF_TRUSTED_ORIGINS` defaults to `https://<DJANGO_ALLOWED_HOSTS>`, so the admin
works without extra config. Override with `DJANGO_CSRF_TRUSTED_ORIGINS` if you
serve from more hosts.

Fill in the integration creds you actually use (see `backend/.env.example` for
the full list): `CLOUDINARY_*`, `BREVO_*`, `WORLDLINE_*`, `GOOGLE_OAUTH_*`,
`AADE_*`, `RECAPTCHA_SECRET_KEY`, `CRON_SECRET`, `ADMIN_API_KEY`,
`PAYMENTS_ENABLED`, `PAYMENTS_TEST_MODE`.

### Celery (optional, same image)

Create two more apps from `backend/Dockerfile` with the same env **plus
`RUN_MIGRATIONS=0`** (so they skip migrate/collectstatic) and override the
command:

- Worker: `celery -A config worker -l INFO`
- Beat:   `celery -A config beat -l INFO -S django`

---

## Frontend — build args vs. env vars

**Build-time Variables** (Dokploy build args — these are inlined into the
browser bundle; the Dockerfile already defaults them to the values below):

```
NEXT_PUBLIC_API_URL=https://api-doulitsa.ncmulti.com
NEXT_PUBLIC_APP_URL=https://doulitsa.ncmulti.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=ddejhvzbf
# Google Tag Manager (GA4 + Meta Pixel). Loaded only after cookie consent —
# see docs/COOKIE-CONSENT.md. Leave empty to disable tracking entirely.
NEXT_PUBLIC_GTM_ID=GTM-KR7N94L4
```

**Runtime Environment Variables** (server-side rendering only):

```
DJANGO_INTERNAL_URL=https://api-doulitsa.ncmulti.com
```

`DJANGO_INTERNAL_URL` is the URL the Next.js server uses for its own fetches.
Use the public API URL, or a private/internal hostname if you put both
containers on a shared Dokploy network.
