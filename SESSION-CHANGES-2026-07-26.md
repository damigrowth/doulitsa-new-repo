# Session Changes — 2026-07-26

Everything changed in the big migration-repair session, in order. Currently
**84 files uncommitted** in the working tree (earlier waves were committed by
the repo owner along the way). Nothing was ever pushed.

## 1. Rebranding port (OLD `app_before_migrations/` → `frontend/` + backend)
- Navy/emerald palette (`globals.css`, `critical.css`), Open Sans (`lib/fonts.ts`,
  tailwind `fontFamily`, `layout.tsx`), full `frontend/public/` brand asset set
  (favicons `-v1`, logo, OG image, 16 category icons) — un-gitignored `public`.
- Deleted 27.9k-line `old.css`, `home-hero-gallery`, `taxonomy-tabs-skeleton`,
  app-dir favicon.
- Redesigns ported preserving the Django data layer: home (hero/search/categories/
  taxonomies-tabs), header (+ new `header-search`), footer, nav, service/profile
  cards, archives, service page, profile page, dashboard, admin copy pass,
  auth/onboarding forms, plan-comparison/subscription UI, About/For-Pros/FAQ.
- New components: `category-icon`, `cta-banner`, `auth-required-dialog`,
  `register-auth-state-sync`, `counter-stats`, `cancel-subscription-button`.
- Route renames: `dashboard/profile/presentation` → `contact-details`,
  `dashboard/subscription` → `promote`.
- Plan limits 3/15/3 + free 3 refreshes/day (promoted unlimited):
  `lib/payment/pricing.ts`, `feature-gate.ts`, backend `_PLAN_LIMITS` +
  plan-aware `_refresh_daily_limit()` in `service_writes.py`.
- Backend transactional-email colors → navy (`apps/messaging/emails.py`).
- KEPT (deviation): payments test-mode gate (`check-access`,
  `use-payments-access`) — env-controlled safety, wired to Django.

## 2. SCRUM-63 Worldline advice webhook (Django + proxies)
- `backend/apps/billing/services/advice.py` — VPOS 2.1 XML "Advice Messages"
  handler (digest validation, recurring child success/failure, idempotency by
  TxId, period advance, featured toggle, audit rows).
- `WorldlineAdviceWebhookView` at `/api/webhooks/worldline/advice` (+ GET
  health); classic webhook view probes XML bodies and delegates.
- `send_subscription_payment_email` (emails.py + Celery task) fired from all 4
  charge sites: initial master, classic-webhook child, renewals cron, advice.
- Frontend advice proxy route; all webhook/cron proxies prefer
  `DJANGO_INTERNAL_URL`.

## 3. Home page taxonomy grids
- Bottom grids now mirror OLD exactly: services = live SUBDIVISIONS top-100 by
  count (from categories-page data), pros = directory popular subcategories
  top-100 — id-or-slug resolved, counts aggregated (was 0, then 70/79, now
  100/100 matching production).

## 4. Full parity audit
- 7 parallel domain audits → `parity-audit/AUDIT-2026-07-26-full-parity.md`
  (C1-C10 critical, H1-H7 high, mediums; old parity docs ~80% stale).

## 5. Taxonomy drift repair
- FE `maps.generated.json` synced as backend seed snapshot; `seed_taxonomy`
  re-run (inserted "Social Media" `q5F8Ns` under Μάρκετινγκ, reparented 4
  subdivisions); `backfill_taxonomy_fks` → 0 unresolved; social-media archive
  0 → 16 services. (tags 1303 vs 1298 check mismatch accepted — full reseed at
  production cutover.)

## 6. Parity fix wave (everything from the audit)
**Database:** 14 migrations — all 67 naive timestamp columns → `timestamptz`
(`USING ... AT TIME ZONE 'UTC'`, idempotent, reversible), each dropping the
dead Supabase RLS policies that blocked ALTER (0 remain); ArrayField
state-only migrations → `makemigrations --check` exits 0. Applied to dev DB.

**Payments/billing:** checkout redirect proxy (was 404 — payments work again);
Worldline TEST/LIVE credential env keys defined + documented; featured limit
unified at 3 (from `_PLAN_LIMITS`); check-access = thin proxy to Django
(single source of truth incl. `PAYMENTS_ENABLED`); admin subscriptions search
(displayName/email) + sort whitelist (default `lastPaymentAt`) + limit 12;
status-change featured logic matches OLD (promoted-only, active/canceled).

**Auth/registration:** change-password verifies legacy bcrypt; username
collisions auto-resolve (simple + pro `display_username`); `confirmed=True`
at signup; register form navigates to `/register/success`; OAuth intent via
frontend-domain cookie → callback → Django exchange (new users only); OAuth
simple users get generated usernames; Throttled → code `rate_limited`;
`lastUsernameChangeAt` in session payload; `requireOnboardingComplete`
restores oauth-step + incomplete-pro redirects; banned check at login; Brevo
lifecycle sync at register/verify/upgrade/oauth-setup/onboarding; welcome
email at email-verification (all users); onboarding preconditions + admin
new-profile email.

**Archives/profiles:** counties dropdown filled FE-side (OLD pattern) on
/ipiresies + /dir; subdivision chips carry parent-subcategory hrefs; bare
`?online` = true (selector + serializer — DRF BooleanField coerced ''→None,
now JSONField); breadcrumbs generated FE-side (labels/hrefs match OLD);
`?page=` coerced safely (was 500); invalid slugs → notFound(); directory
category art restored; nav mega-menu count-sorted; dashboard service cards
carry media/taxonomyLabels/sortDate; PII stripped from public card rows
(`serialize_profile_card` — no phone/viber/whatsapp/names/terms).

**Messaging:** DM lookup falls back to 2-member set (legacy nanoid cids —
no duplicate threads); message cards ship `author` + `replyTo` (batched, no
N+1); digest task = OLD per-message EmailBatch dedupe (no cooldown/window;
send-then-record); admin chats: participant-name search, author objects +
isCreator, real usernames + avatars, `sort` param, limit 50; edit-deleted
guard; dead WS stack removed (`lib/api/websocket.ts`, `use-django-channel`).

**SEO:** real sitemaps fed by new `GET /api/seo/sitemap-entries` — 704
services / 394 profiles / 15 articles; Django sitemap index points at the
Next routes; static page sets aligned.

**Admin:** publish toggle fires owner email + Brevo; admin service edits
regen slug + normalized fields + sanitize rich text; admin user edit syncs
Profile; users/profiles sort whitelists (+annotations); stats `active`
includes email_verified; profile picker searches account email; blog cache
purge on mutations (`delete_pattern`); taxonomy node delete restored
(recursive, refuses while referenced); revalidate-cache endpoint actually
purges (was no-op); nav blog href fixed.

**Env/config:** compose gets frontend `PAYMENTS_TEST_MODE`,
`REVALIDATE_CACHE_WEBHOOK_SECRET` (webhook now fails closed),
`NEXT_PUBLIC_CLOUDINARY_API_KEY` + `UPLOAD_PRESET` (signed uploads work —
media is Cloudinary-only, Django just signs); beat schedules use `crontab`
(renewals 06:00, auto-refresh 00:00, digests */15); cron endpoints exist in
Django (401-guarded); `.env.example` cleaned (dead GITHUB_* out, WORLDLINE
TEST/LIVE + INTERNAL_PROXY_SECRET + ADMIN_EMAIL + MAINTENANCE_MESSAGE in).

## 7. Post-fix bugfixes (found live)
- Chat crash `getFullYear of null`: `toDate` appended `Z` to now-aware
  timestamps → Invalid Date. Fixed both parsers (append only for naive
  strings); `formatChatDateDivider` null-safe.
- Message send latency: optimistic hook state was per-component `useState`
  (input wrote, container read a different empty instance — OLD had the same
  bug). Now a zustand store keyed by chatId → bubble renders instantly.
- Presence crash-loop: refcount helpers existed but were never wired into the
  consumers; wired (online on 0→1, offline on last close) + safe-send mixin
  (no more "send on closed protocol" tracebacks).

## Known remaining
- `seed_taxonomy --check` tags mismatch — deferred to production reseed.
- `rich-text-editor.tsx` tiptap type error — pre-existing lockfile version
  mismatch (`@tiptap/core` 3.20.2 vs nested 3.27.1).
- Payment-attempt history cards (promote page + admin) not ported — need a
  Django endpoint for `SubscriptionPaymentAttempt` history.
- Cardlink must activate XML advice webhooks per MID for production renewals.
