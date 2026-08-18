# Dokploy deploy — doulitsa-test.ncmulti.dev

Tailored for the **test** environment. Values you must paste are below. No code
changes needed — everything is env/build-arg config.

| App           | Context     | Dockerfile            | Port | Domain                              |
| ------------- | ----------- | --------------------- | ---- | ----------------------------------- |
| Backend (web) | `backend/`  | `backend/Dockerfile`  | 8000 | `api-doulitsa-test.ncmulti.dev`     |
| Frontend      | `frontend/` | `frontend/Dockerfile` | 3000 | `doulitsa-test.ncmulti.dev`         |
| celery-worker | `backend/`  | `backend/Dockerfile`  | —    | (no domain)                         |
| celery-beat   | `backend/`  | `backend/Dockerfile`  | —    | (no domain)                         |

Plus a **Postgres** and a **Redis** (Dokploy databases or your own).

**Deploy order:** Postgres + Redis → restore the DB dump → **backend** → frontend.
The frontend bakes `NEXT_PUBLIC_API_URL` into the bundle and `next build`
fetches the API for static pages, so the API must be live first.

---

## 0) Generate secrets (run locally, paste the output)

```bash
openssl rand -hex 32   # DJANGO_SECRET_KEY
openssl rand -hex 32   # SIMPLE_JWT_SIGNING_KEY
openssl rand -hex 16   # CRON_SECRET
openssl rand -hex 16   # ADMIN_API_KEY
```

## 1) Restore the database (before the first backend boot)

```bash
# from the Postgres host / a psql client with access:
pg_restore --no-owner --no-privileges -d "$DATABASE_URL" \
  backend/dumps/doulitsa-full-backup-20260613-1209.dump
```
The backend entrypoint runs `migrate --fake-initial`, which marks the
already-present tables as migrated (it won't recreate them).

---

## 2) Backend (web) — Environment Variables

```
DJANGO_SETTINGS_MODULE=config.settings.prod
DJANGO_SECRET_KEY=<paste openssl #1>
DJANGO_ALLOWED_HOSTS=api-doulitsa-test.ncmulti.dev
# (prod.py auto-adds 127.0.0.1/localhost for the Docker health check)
DJANGO_TIME_ZONE=Europe/Athens

# If OAuth/admin login needs both hosts, list both (scheme included):
DJANGO_CSRF_TRUSTED_ORIGINS=https://api-doulitsa-test.ncmulti.dev,https://doulitsa-test.ncmulti.dev

DATABASE_URL=postgres://USER:PASS@<postgres-host>:5432/<db>
DIRECT_URL=postgres://USER:PASS@<postgres-host>:5432/<db>

REDIS_URL=redis://<redis-host>:6379/0
CELERY_BROKER_URL=redis://<redis-host>:6379/1
CELERY_RESULT_BACKEND=django-db
CHANNELS_REDIS_URL=redis://<redis-host>:6379/3

CORS_ALLOWED_ORIGINS=https://doulitsa-test.ncmulti.dev
FRONTEND_BASE_URL=https://doulitsa-test.ncmulti.dev

SIMPLE_JWT_SIGNING_KEY=<paste openssl #2>
SIMPLE_JWT_REFRESH_LIFETIME_DAYS=3

CRON_SECRET=<paste openssl #3>
ADMIN_API_KEY=<paste openssl #4>

# Payments OFF for the test env unless you have sandbox creds:
PAYMENTS_ENABLED=false
PAYMENTS_TEST_MODE=true
```

Integration creds you actually use (full list in `backend/.env.example`):
`CLOUDINARY_*`, `BREVO_*`, `GOOGLE_OAUTH_*`, `WORLDLINE_*`, `AADE_*`,
`RECAPTCHA_SECRET_KEY`. Anything left blank degrades gracefully (email is
best-effort, payments off).

Enable the domain with **HTTPS (Let's Encrypt)**; Traefik terminates TLS and
forwards plain HTTP to port 8000.

---

## 3) celery-worker + celery-beat (same backend image, no domain)

Same env as the backend **plus**:
```
RUN_MIGRATIONS=0
```
Override the start command:
- worker: `celery -A config worker -l INFO`
- beat:   `celery -A config beat -l INFO -S django`

---

## 4) Frontend — Build-time Variables (inlined into the browser bundle)

```
NEXT_PUBLIC_API_URL=https://api-doulitsa-test.ncmulti.dev
NEXT_PUBLIC_APP_URL=https://doulitsa-test.ncmulti.dev
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=ddejhvzbf
# Google Tag Manager — loaded only after cookie consent (docs/COOKIE-CONSENT.md).
# Use the real container to test the GTM flow on the test env, or leave empty
# to keep test traffic out of GA4/Meta.
NEXT_PUBLIC_GTM_ID=GTM-KR7N94L4
```

## 5) Frontend — Runtime Environment Variables (server-side only)

```
DJANGO_INTERNAL_URL=https://api-doulitsa-test.ncmulti.dev
# Canonical / SEO / sitemap base url — set this or those links fall back to doulitsa.gr.
# (NEXT_PUBLIC_APP_URL from the build args is also used as a fallback.)
LIVE_URL=https://doulitsa-test.ncmulti.dev
```
> `DJANGO_INTERNAL_URL` can instead be a private hostname (e.g.
> `http://backend:8000`) if you put both containers on one Dokploy network —
> faster and avoids a public round-trip during SSR.

Enable the domain with **HTTPS (Let's Encrypt)**, forwarding to port 3000.

---

## 6) After deploy — manual checks

1. **Google OAuth:** in Google Cloud Console add the redirect URI for the new
   domain (e.g. `https://api-doulitsa-test.ncmulti.dev/...oauth callback` /
   `https://doulitsa-test.ncmulti.dev/oauth-callback`) — OAuth fails silently
   otherwise. (Same for any other provider console.)
2. Backend health: `https://api-doulitsa-test.ncmulti.dev/api/health` → 200.
3. Frontend loads, login works, a profile/service page renders with data.
4. (Test env) consider `noindex` so the test domain isn't crawled.

## Gotchas

- **Order:** backend before frontend (build-time API fetch).
- **`DJANGO_ALLOWED_HOSTS` must list the API host exactly**, or Django returns
  `400 Bad Request` on every request.
- **`CORS_ALLOWED_ORIGINS` must be the frontend origin** (with `https://`), or
  the browser blocks every API call.
- Build args (`NEXT_PUBLIC_*`) are **baked at build time** — changing them needs
  a frontend **rebuild**, not just a restart.
