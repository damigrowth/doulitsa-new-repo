# Go-Production Checklist

Everything still pending before (and during) the cutover of doulitsa.gr to the
new stack, collected from the QA/testing rounds up to 2026-10-06. Companion
docs: `DEPLOY-doulitsa-test.md` (full env-var reference — use it as the
template for the production apps), `AFTER-TESTING-CHECKLIST.md` (Worldline
test-mode revert details), `DATABASE-RESTORE-RUNBOOK.md` (dump restore).

---

## 1) Pending RIGHT NOW on test.doulitsa.gr

One-time commands in the Dokploy **backend** terminal:

```bash
# Fill the taxonomy FK columns on profiles created BEFORE the 2026-10-06
# deploy. Until this runs, old profiles (e.g. damiprofs) are missing from the
# /dir archives — new profiles and any profile re-saved are fine already.
python manage.py backfill_taxonomy_fks

# Sync the denormalized payment columns on subscriptions migrated from the
# old DB, so the admin shows "Τελευταία πληρωμή" like the user dashboard does.
python manage.py backfill_payment_columns
```

Both are idempotent — safe to run twice. **They must also be run on
production right after the final dump restore (step 4), for the same
reasons.**

## 2) Payments — revert test-mode leftovers (details in AFTER-TESTING-CHECKLIST.md)

- [ ] Dokploy backend env: remove `WORLDLINE_RECURRING_OVERRIDE_DAYS` (or set
      `0`) → real cadence 30d/365d. Local docker-compose.yml is already `"0"`.
- [ ] Cancel the daily test recurring order **at Cardlink** (test panel or
      Ακύρωση συνδρομής in the app) — Cardlink keeps charging on its own
      schedule regardless of our DB. Then clean the test subscription rows.
- [ ] After the revert + redeploy: one fresh test payment must show
      Επόμενη χρέωση +30 days.
- [ ] Production payments: `PAYMENTS_TEST_MODE=false` on backend **and**
      frontend (values must match), live `WORLDLINE_LIVE_MID` /
      `WORLDLINE_LIVE_SHARED_SECRET` in backend/.env.
- [ ] LIVE MID's Cardlink panel URLs must point at the production domains
      (confirmation/cancel → `https://doulitsa.gr/api/webhooks/worldline`,
      advice → production API host). No reference to the old Vercel URL.
- [ ] Keep `billing-process-worldline-renewals` cron DISABLED (renewals come
      from Cardlink's advice webhook; re-enabling double-drives and the XML
      channel rejects PAYMENT anyway — Cardlink error O1).

## 3) Production environment (Dokploy) — use DEPLOY-doulitsa-test.md as template

- [ ] Generate FRESH secrets for prod (never reuse test values):
      `DJANGO_SECRET_KEY`, `SIMPLE_JWT_SIGNING_KEY`, `INTERNAL_PROXY_SECRET`,
      `CRON_SECRET`, `ADMIN_API_KEY`.
- [ ] Backend env: `DJANGO_ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS` /
      `FRONTEND_BASE_URL` for `doulitsa.gr`; real credentials in backend/.env
      (Cloudinary, Google OAuth, Brevo, Worldline live, reCAPTCHA).
- [ ] celery-worker + celery-beat services running (same backend image).
- [ ] Frontend BUILD-time vars: `NEXT_PUBLIC_API_URL` must point at the
      production backend **and be reachable during the build** — the build
      runs `yarn build:taxonomies`, which snapshots the taxonomy fallback
      (`maps.generated.json`) from Django.
- [ ] Frontend runtime vars: canonical/SEO/sitemap base URL set to
      `https://doulitsa.gr` (otherwise links fall back wrong).
- [ ] GTM container: real one on prod (loads only after cookie consent —
      docs/COOKIE-CONSENT.md).
- [ ] Postgres + media volume backups scheduled in Dokploy.

## 4) Cutover day

1. [ ] Freeze writes on the old app; take the FINAL production dump.
2. [ ] Restore into the production Postgres (DATABASE-RESTORE-RUNBOOK.md).
3. [ ] Run the one-time commands on the prod backend:
       `python manage.py backfill_taxonomy_fks` and
       `python manage.py backfill_payment_columns`.
4. [ ] Deploy backend + frontend; check `/api/health`.
5. [ ] Point DNS `doulitsa.gr` → Dokploy. Leave the Vercel app running but
       idle until the cutover is confirmed, then pause it. (Never touch the
       `damigrowth/nextjs` repo itself.)
6. [ ] Google OAuth console: add `https://doulitsa.gr` redirect URIs.
7. [ ] Brevo: sender domain/webhooks OK for prod.
8. [ ] Cardlink live panel URLs (step 2) verified once more.

## 5) Post-cutover smoke test

- [ ] Signup (email + Google OAuth, pro & simple), email verification,
      onboarding → new pro appears in /dir immediately.
- [ ] Profile edits (ALL dashboard tabs) visible on the public page instantly
      — this is the Redis purge fix from 2026-10-06; if anything looks stale
      longer than a refresh, something is wrong.
- [ ] /dir + /ipiresies archives: filters populated, breadcrumbs clickable,
      counts sane; profile & service pages render with reviews.
- [ ] Service create/edit/delete, featured/home sections update.
- [ ] Chat (Channels/websocket), header name/avatar opens the pro's profile.
- [ ] Reviews: create + admin moderation, appears on profile/service page.
- [ ] One real (small) live payment end-to-end + admin shows it; renewal date
      +30 days; admin payment email arrives.
- [ ] Admin panel actions work and reflect on the public site immediately.
- [ ] Celery beat jobs firing (check Dokploy logs); webhooks reachable.

## 6) Cache behavior worth remembering

- Django caches public payloads in Redis (profile page 30 min, directory 2 h,
  home 5 min, service page 30 min). Since 2026-10-06, EVERY save/delete of a
  profile/service/review purges the related keys automatically (signals).
- Right after any backend deploy, entries cached BEFORE it drain out over
  their TTL — or instantly on the next relevant save. The admin cache-clear
  endpoint (`apps/core/views/admin/cache.py`) wipes the known keys at once if
  needed.
- Next.js keeps its own 5-min tagged data cache; server actions already
  revalidate it on every mutation (`frontend/src/lib/cache/revalidation.ts`).

## 7) Standing rules (unchanged)

- Old production repo `damigrowth/nextjs` (Vercel) — read-only reference,
  never pushed to, never modified.
- Pushing to ANY remote is done by hand, never by tooling.
- Parity rule: the old app's behavior is the source of truth until cutover is
  complete.
