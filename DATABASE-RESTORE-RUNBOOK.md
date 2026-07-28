# Database restore runbook (Doulitsa → Dokploy)

How the production database was seeded, and **exactly how to repeat it for the
real production**. Written after seeding the `doulitsa-test` environment.

---

## TL;DR — the one rule

**Do NOT restore the raw Supabase backup (`doulitsa-full-backup-*.dump`) into a
fresh production DB.** It is the *pre-Django-migration* dump, so the backend's
`migrate --fake-initial` crashes on first boot (missing `users.password`/
`last_login`, allauth `account` migration collision).

**Instead, seed from a database that already has the Django migrations applied
+ the column fixes** — i.e. a working local/staging DB. That seed boots clean
because its `django_migrations` table is already populated and the schema is
correct.

---

## What the two dump files are

| File | What it is | Use it to seed prod? |
| ---- | ---------- | -------------------- |
| `doulitsa-full-backup-20260613-1209.dump` | Raw Supabase backup, 66 tables, **pre-Django-migration**, has `auth`/`storage`/`supabase_auth_admin` schemas | ❌ No — crashes on backend boot |
| `doulitsa-prod-seed.dump` | `public`-schema-only snapshot of the **working, migrated** DB (97 migrations applied) | ✅ Yes — boots clean |

Both contain the same business data; the seed just also carries the correct
migration state + schema fixes.

---

## Step 1 — Create the seed from a working DB

Run against a DB where the app already works (local dev or current staging).
Local dev here = compose service `postgres`, db/user/pass all `django`:

```bash
# from the host, dumping the running local postgres container:
docker exec django-backend-postgres-1 \
  pg_dump -U django -d django -Fc --no-owner --no-privileges -n public \
  > doulitsa-prod-seed.dump
```

Flags explained:
- `-Fc` — custom format (restore with `pg_restore`, supports `--clean`).
- `--no-owner --no-privileges` — strip ownership/grants so it restores under the
  target's user without role errors.
- `-n public` — **only the `public` schema** (what Django uses). Excludes the
  legacy Supabase `auth`/`storage` schemas so the restore isn't noisy.

Verify the seed before shipping it:
```bash
pg_restore -l doulitsa-prod-seed.dump | grep -c "TABLE DATA"   # ~50 tables
```

> For the **real production move**, regenerate this seed from the most current
> working DB right before cutover (data changes over time). Don't reuse an old
> seed.

---

## Step 2 — Make the target Postgres reachable

In Dokploy: the Postgres service → **General → External Credentials** → set an
**External Port** (e.g. `5432`) → **Save**. This exposes it at
`<server-public-ip>:5432`.

Target used for `doulitsa-test`: PostgreSQL **18.4** (restoring a PG17 dump into
PG18 is fine — pg_restore is forward-compatible).

> ⚠️ Exposing Postgres to the internet is only acceptable for a one-time restore
> on a throwaway/test DB with a strong random password. **Close the external
> port immediately after** (clear the field → Save).

---

## Step 3 — Restore

```bash
# external URL = same user/pass/db as the internal one, but the SERVER IP as host
URL="postgresql://USER:PASS@SERVER-IP:5432/DBNAME"

# sanity check first:
psql "$URL" -tAc "select version();"
psql "$URL" -tAc "select count(*) from information_schema.tables where table_schema='public';"  # expect 0 on a fresh DB

# restore (use --clean --if-exists only when re-running into a non-empty DB):
pg_restore --no-owner --no-privileges -d "$URL" doulitsa-prod-seed.dump
```

### Expected: ~271 "schema \"auth\" does not exist" errors — **HARMLESS**

These are Supabase **Row-Level-Security policies** (`CREATE POLICY … USING
(auth.jwt() …)`) on the public tables. Django does NOT use Postgres RLS (it
enforces access in the app layer), and the backend connects as the table
**owner** (which bypasses RLS anyway), so they are correctly skipped. The
tables and all rows restore fine. `pg_restore` exits non-zero only because of
these skipped policies — that is OK.

---

## Step 4 — Verify

```bash
psql "$URL" -tAc "
  select 'users='||count(*) from users
  union all select 'profiles='||count(*) from profiles
  union all select 'services='||count(*) from services
  union all select 'django_migrations='||count(*) from django_migrations;"
```

For the `2026-06-13` dataset the numbers were:
`users=616  profiles=444  services=728  django_migrations=97`.

The `django_migrations=97` row is the important one — it means the backend's
`migrate --fake-initial` will find everything already applied and boot clean.

---

## Step 5 — Close external access (security)

Dokploy Postgres → External Credentials → **clear the External Port → Save.**
The backend reaches the DB over the internal Docker network, so it never needs
the public port.

---

## Step 6 — Point the backend at it (internal URL)

The backend env uses the **internal** connection string (not the server IP):

```
DATABASE_URL=postgresql://USER:PASS@<internal-host>:5432/DBNAME
```
`doulitsa-test` value (for reference):
`postgresql://post:…@doulitsa-post-2j2pnz:5432/post`

`DIRECT_URL` is **not needed** — it was a Prisma-only var; Django reads only
`DATABASE_URL`. Full backend env block: see `DEPLOY-doulitsa-test.md`.

On first deploy the entrypoint runs `migrate --fake-initial`; logs should show
**"No migrations to apply"** (because the seed already has the migration state).

---

## Checklist for the REAL production cutover

1. [ ] Regenerate `doulitsa-prod-seed.dump` from the **current** working DB.
2. [ ] Create the prod Postgres in Dokploy (match a recent PG major, e.g. 17/18).
3. [ ] Temporarily open its external port.
4. [ ] `pg_restore` the fresh seed (ignore the `auth` RLS errors).
5. [ ] Verify row counts + `django_migrations`.
6. [ ] **Close the external port.**
7. [ ] Set backend `DATABASE_URL` to the **internal** host; deploy.
8. [ ] Confirm logs show "No migrations to apply" and `/api/health` = 200.
9. [ ] Rotate any secrets that were generated for the test env (don't reuse).
