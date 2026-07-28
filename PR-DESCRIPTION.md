# fix: full OLD→NEW migration parity — payments, auth, archives, messaging, SEO, timezone layer

## Summary

Complete parity pass against the old Next.js/Prisma app (`app_before_migrations/`), driven by a 7-domain audit (`parity-audit/AUDIT-2026-07-26-full-parity.md`). Fixes every critical/high finding: broken checkout, registration failures, the timezone-naive database layer, empty sitemaps, unusable archive filters, a PII leak, chat duplication/latency, and the "Social Media" taxonomy drift. Also includes the visual rebranding port, the SCRUM-63 Cardlink XML advice webhook, and the subscription-payment admin email.

## Database (14 migrations — applied automatically on deploy via startup `migrate`)

- **All 67 Prisma-era timestamp columns converted `timestamp` → `timestamptz`** (`USING "col" AT TIME ZONE 'UTC'`, idempotent + reversible). Fixes every API timestamp being mislabeled +2/+3h and two live crashes (service refresh cooldown 500, unread-digest task).
- Each conversion migration **drops the dead Supabase-era RLS policies** (`auth.jwt()` — nonexistent outside Supabase) that blocked the ALTERs.
- State-only migrations reconcile the ArrayField drift — `makemigrations --check` exits 0 again.

## Payments / billing

- **Checkout works again**: `/api/payment/worldline/redirect` frontend proxy added (was a 404 dead-end for every "Subscribe" click).
- SCRUM-63: Cardlink **XML "Advice Messages" webhook** ported to Django (`apps/billing/services/advice.py`) — digest validation, recurring-child renewals, TxId idempotency; classic webhook probes XML bodies so both URLs accept advices.
- **Subscription-payment admin email** on every charge (initial, webhook child, cron renewal, advice).
- Worldline TEST/LIVE credential split restored (was silently shipping sandbox creds when test mode turned off).
- Featured-service limit unified at **3** (UI advertised 3, Django enforced 5).
- `check-access` is now a thin proxy to Django (single source of truth, honors `PAYMENTS_ENABLED`).
- Beat schedules moved to `crontab` (renewals 06:00, auto-refresh 00:00, digests */15); `/api/cron/auto-refresh` + `/api/cron/process-email-batches` Django endpoints added (Bearer `CRON_SECRET`).

## Auth / registration

- Change-password verifies **legacy better-auth bcrypt** hashes (was permanently broken for every pre-migration user).
- Username collisions auto-resolve for simple + pro users (was IntegrityError 500); `confirmed=True` at signup.
- Successful signup navigates to `/register/success` (resend-verification UI reachable again).
- "Sign up with Google as Pro" intent survives: frontend-domain cookie → OAuth callback → Django exchange (applied to new users only).
- Brevo lifecycle sync restored at register/verify/upgrade/oauth-setup/onboarding; welcome email at email-verification for all users; onboarding preconditions + admin new-profile email.
- Throttle errors expose `rate_limited` (Greek UI copy shows again); `lastUsernameChangeAt` in session payload; banned users rejected at login.

## Archives / discovery

- County dropdown populated on `/ipiresies` + `/dir` (was empty everywhere — filter unreachable).
- Bare `?online` counts as **true** like OLD (selector + serializer — DRF `BooleanField` coerced `''`→`None`).
- Subdivision chips link `/ipiresies/{subcat}/{div}` (were all 0-result dead links on the root archive).
- Breadcrumbs render again (generated FE-side like OLD); `?page=`/`?page=abc` no longer 500; invalid slugs → 404.
- Directory landing icons/images/descriptions restored; nav mega-menu count-sorted; dashboard services table thumbnails + category labels back.

## Security / privacy

- **Public card endpoints no longer expose PII** (`phone`/`viber`/`whatsapp`/`firstName`/`lastName`/`terms` stripped from search/archive/by-username via a card-scoped serializer; profile-page bundle unchanged).
- Cache-purge webhook fails closed without its secret; media-upload signing proxy fixed (Cloudinary-only media — Django just signs).

## Messaging / chat

- DM lookup falls back to the 2-member set — no duplicate threads with legacy-cid chats (21/23 prod chats).
- Message cards ship `author` + `replyTo` (batched — reply quotes survive reload).
- **Presence refcount** wired into the WS consumers (online on first socket, offline on last) + crash-proof sends — kills the connect/crash/reconnect loop that starved threads of message events.
- Optimistic send state moved to a shared zustand store — sent messages render instantly (latent bug inherited from OLD: input and container each had a private, useless state instance).
- Unread digests use OLD's per-message `EmailBatch` dedupe (no more permanently-skipped messages); admin chat views: participant search, author names/avatars instead of raw cuids.
- Timestamp parsing handles the new aware ISO strings (the `Z`-append hack produced Invalid Dates → chat page crash).

## SEO

- Sitemaps went from **0 → 704 services / 394 profiles / 15 articles** via new `GET /api/seo/sitemap-entries`; Django sitemap index points at the real Next routes; static page sets aligned.

## Taxonomy

- "Social Media" drift fixed: FE map synced as the backend seed snapshot, node seeded + 4 subdivisions reparented, FKs backfilled — 16 published services reachable again (archive 0→16).
- Admin taxonomy node delete restored (recursive; refuses while services/profiles reference the subtree).

## Admin

- Publish toggle fires the owner email + Brevo transition; admin service edits regenerate slug + normalized fields and sanitize rich text (closes a stored-XSS surface); admin user edits sync displayName/image to the Profile; sort whitelists match the tables; blog list cache purged on mutations.

## Rebranding (visual port from the old repo)

Navy/emerald palette, Open Sans, self-hosted brand assets in `public/`, redesigned home/header/footer/cards/archives/service/profile/dashboard/admin/auth surfaces, `presentation`→`contact-details` and `subscription`→`promote` route renames, plan limits 3/15/3, backend email templates recolored.

## Verification

- `manage.py check` ✅ · `makemigrations --check` ✅ · full backend `py_compile` ✅
- `tsc --noEmit` ✅ (only the pre-existing tiptap lockfile error remains) · `next build` (compile) ✅
- Live smoke on the Docker stack: checkout redirect 200, `?online` → 301/704, `/dir?page=` 200, PII absent from search rows, sitemaps populated, cron endpoints 401 unauthenticated, advice webhook full lifecycle (signed CAPTURED advice → period advance → idempotent redelivery), support feedback accepts all three dialog issue types.

## Deploy notes

- Migrations run automatically via the container's startup `migrate` — they are idempotent and guarded.
- New env keys documented in `backend/.env.example` (`WORLDLINE_TEST_*/LIVE_*`, `MAINTENANCE_MESSAGE`, `ADMIN_EMAIL`, `INTERNAL_PROXY_SECRET`) and compose (`NEXT_PUBLIC_CLOUDINARY_API_KEY`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, `PAYMENTS_TEST_MODE` for the frontend, `REVALIDATE_CACHE_WEBHOOK_SECRET` — the webhook now rejects when unset).
- Cardlink must activate "XML Webhooks (Advice Messages)" per MID with `https://doulitsa.gr/api/webhooks/worldline/advice` as the Recurring advice URL.
- Deferred by decision: taxonomy tags count mismatch (full reseed happens at production cutover); payment-history cards (need a `SubscriptionPaymentAttempt` history endpoint); pre-existing tiptap type error.

Full session changelog: `SESSION-CHANGES-2026-07-26.md` · Audit: `parity-audit/AUDIT-2026-07-26-full-parity.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
