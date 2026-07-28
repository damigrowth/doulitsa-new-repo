# Full Migration Parity Audit — 2026-07-26

Seven parallel domain audits (auth, profiles/saved/support, services/taxonomy/home,
reviews/messaging, admin/blog, api-routes/billing/cron/seo/env, DB schema/data) comparing
`app_before_migrations/` (behavioral reference) against `frontend/` + `backend/` (Django),
including live GET-only probes of the running Docker stack and read-only DB inspection.

**Overall verdict:** the migration is far more complete than the June-era docs claim —
the majority of gaps flagged in `MIGRATION_PARITY.md` / `parity-audit/domain-*.md` are
FIXED in current code (those docs are systematically stale; see §5). Security posture is
good: all 36 unauthenticated `/api/admin/*` probes returned 401 and the RBAC matrix is a
1:1 port. All 24 Prisma models map with zero missing/extra columns and sampled JSON
payloads are 100% shape-clean. However the audit surfaced **real, currently-broken
behavior** listed below.

---

## 1. CRITICAL — broken user-visible flows (fix first)

| # | Finding | Where | Failure |
|---|---|---|---|
| C1 | **Worldline checkout redirect 404s — no payment can complete.** `providers.py` builds `{FRONTEND_BASE_URL}/api/payment/worldline/redirect?session=…` but no Next route/rewrite exists (Django serves it on its own origin only). | `backend/apps/billing/services/providers.py:93`, missing `frontend/src/app/api/payment/worldline/redirect/` | Click "Subscribe" → 404. Ship-blocker. |
| C2 | **Support feedback rejects 2 of 3 issue types.** Dialog sends `problem\|option\|feature`; DRF accepts `bug\|feature\|question\|other`. | `backend/apps/support/views/public/support.py:29` vs `components/dashboard/support-feedback-dialog.tsx:202-218` | "Πρόβλημα"/"Επιλογή" reports are lost with a 400. |
| C3 | **Three server-side proxies still use `NEXT_PUBLIC_API_URL`** (ECONNREFUSED in Docker; reproduced live: `GET /api/auth/session` → 500). | `frontend/src/app/api/auth/[...all]/route.ts:13`, `api/sign-cloudinary-params/route.ts:11`, `api/cron/auto-refresh/route.ts:14` | Auth fall-through 500s; **all media-upload signing dead**. Fix = same `DJANGO_INTERNAL_URL` pattern already applied to webhooks. |
| C4 | **Naive-datetime layer.** All 67 Prisma-era timestamp columns are `timestamp without time zone` under `USE_TZ=True`: every DRF timestamp is mislabeled +2/+3h, and two **live-reproduced crashes**: refresh cooldown `TypeError` → 500 (72 services with `refreshed_at`), unread-digest task crash (5 users). Two other sites already hand-patched with `.replace(tzinfo=utc)` — fix systemically. | `apps/services/services/service_writes.py:463`, `apps/messaging/tasks.py:65`; also `apps/admin_api/services/api_keys.py:40`, `common/authentication.py:75` | Refresh button 500s; digests crash; all rendered dates shifted. |
| C5 | **Registration hard failures.** (a) simple-user username collisions → IntegrityError 500 (no collision loop, unlike OLD); (b) pro `display_username` stored unresolved → unique-violation 500; (c) successful signup never navigates to `/register/success` (server redirect dropped, form has no success navigation) so the resend-verification UI is unreachable; (d) change-password broken for every pre-migration user (raw bcrypt not recognized by `check_password`; `services/auth.py:118` has the working verifier, `password.py:44` doesn't use it). | `backend/apps/accounts/services/registration.py:63,71`, `services/password.py:44`, `components/forms/auth/form-auth-register.tsx` | Second "john@…" 500s; legacy users can never change password; signups dead-end on /register. |
| C6 | **Sitemaps emit zero services/profiles/articles.** Next handlers `return []`; robots.txt points only at the (empty) Next sitemap; Django `sitemap_index.xml` points at frontend shard URLs (`/sitemap_services_1.xml`…) that 404. 704 services, 448 profiles, 15 articles — none indexed. | `frontend/src/app/(service)/s/sitemap.ts`, `(profile)/profile/sitemap.ts`, `(blog)/articles/sitemap.ts`, `backend/apps/core/views/public/sitemaps.py:44-57`, `frontend/src/app/robots.txt` | Full SEO blackout for entity pages. |
| C7 | **"Social Media" taxonomy drift orphans 16 published services.** Frontend map has subcategory `q5F8Ns`; backend `_taxonomy_maps.json`/DB doesn't → `subcategory_node_id NULL` on all 16 → FK-filtered archive returns 0 while menus advertise "(16)". Also `seed_taxonomy --check` can never pass (seeds 1298 tags, asserts against 1293). | `backend/apps/core/management/commands/_taxonomy_maps.json`, `apps/core/taxonomy.py:150-166`, `seed_taxonomy.py` | Every "Social Media" link is a dead end. |
| C8 | **Service-archive UI filters broken.** (a) `availableSubdivisions` lack `subcategorySlug` → every chip on `/ipiresies` links to `/ipiresies/{div}` = 0 results; (b) UI writes valueless `?online` which backend treats as unset (OLD treated `''` as true) → Online toggle no-ops; (c) `counties: []` in both service and pro archive bundles → "Νομοί" dropdown empty everywhere; (d) backend key `breadcrumbs` vs FE `breadcrumbData` → archive breadcrumbs never render (and backend hrefs malformed `/s/None/...`); (e) pro archive `?page=`/`?page=abc` → **500** (`int()` unguarded). | `backend/apps/services/selectors/service_reads.py:130,684-711`, `backend/apps/profiles/selectors/profile_aggregations.py:414,462-469`, `frontend/src/actions/services/get-services.ts:217-260` | Core discovery filters unusable; crawler-triggerable 500s. |
| C9 | **Public REST bulk-exposes contact PII.** `serialize_profile_summary` puts `phone/viber/whatsapp/firstName/lastName/terms` on AllowAny `/profiles/by-username`, `/profiles/search`, `/profiles/archive` (verified live). OLD's archive select had none; server actions weren't publicly enumerable. | `backend/apps/profiles/selectors/profile_reads.py:80-131` | Whole directory's phone numbers scrapeable unauthenticated, ignoring `visibility`. |
| C10 | **Duplicate DM chats (latent, triggers on first re-contact).** New lookup only matches `cid = a::b`; 21/23 production chats have legacy nanoid cids → "Message" on an existing contact creates a second thread. | `backend/apps/messaging/services/chat_ops.py:249-286` | Conversation history splits. Fix: fall back to 2-member-set lookup. |

## 2. HIGH

- **H1 — OAuth registration intent is a dead path**: cookie set on the wrong domain inside a server-action fetch; `getOAuthIntent` has no callers; `PendingRegistration` unused → "sign up with Google as Pro" silently loses the choice (`accounts/views/public/oauth.py:23`, `services/google_oauth.py:41`).
- **H2 — Worldline test/live credential split collapsed**: `worldline.py:60-64` reads `TEST_MID/LIVE_MID/...` keys that `settings.WORLDLINE` never defines → flipping `PAYMENTS_TEST_MODE=false` sends **sandbox credentials to the production gateway** (`config/settings/base.py:383-391`).
- **H3 — Featured-limit drift**: UI/pricing say 3, Django enforces 5 (`subscription_ops.py:181-187` "Max 5"); FE `canFeatureService` lost the count check entirely (`lib/subscription/feature-gate.ts:55-58`).
- **H4 — Admin mutations lost side effects**: `toggle_published` fires no owner email/Brevo (sibling `update_status` does — inconsistent, `admin_services.py:236-240`); admin service edits skip slug regen + normalized fields + rich-text sanitization (stale URLs, search-invisible, stored-XSS surface, `admin_services.py:149-169`); admin user edit doesn't sync displayName/image to Profile (`accounts/views/admin/users.py:232-255`).
- **H5 — `makemigrations --check` fails on committed code**: ArrayField state drift in `profiles/0001` + `services/0001` (7 pending AlterFields). Needs the `SeparateDatabaseAndState` treatment used in `messaging/0002`. Also: initial migrations were faked → fresh `migrate` on an empty DB does NOT reproduce production schema (missing Prisma indexes, differently-named Django indexes).
- **H6 — Cron layer half-wired**: `/api/cron/auto-refresh` + `/api/cron/process-email-batches` have **no Django URL** (404) while Next proxies + `vercel.json` still point at them; beat uses `timedelta` not `crontab` (renewals drift from 06:00; both daily tasks show `last_run_at=None` here); Vercel would GET the POST-only auto-refresh proxy (405).
- **H7 — Registration/verification Brevo lifecycle sync entirely absent** (register/verify/upgrade/oauth-setup/onboarding); welcome email only at pro onboarding, simple users never get one.

## 3. MEDIUM (selected — full detail in the domain sections of the seven reports)

- Server-write cache invalidation missing: service edits/refreshes and blog publishes stay stale up to 30 min (`service:page:*`, `core:home`, `blog:list:*`); admin mutations purge nothing (`apps/core/views/admin/cache.py` clears 2 hardcoded keys).
- Message cards omit `author` + `replyTo` → reply-quotes vanish on reload, "Unknown User" in replies (`chat_ops.py:400-418`).
- Presence flaps offline on any socket close (no refcount; FE holds 2-3 sockets) (`consumers.py:70-76,165-188`).
- Unread digests: 24h-cooldown + 24h-window can permanently skip messages; batch committed before send (`messaging/tasks.py:39-121`).
- Admin: subscriptions search matches neither name nor email + default sort silently ignored; chat search can't match participants; chat message rows show raw cuids; profile picker can't find pros by account email; taxonomy delete removed from UI.
- Directory landing (`/directory`) lost category icons/images/descriptions — one-line FE fix: spread resolved node fields in `actions/profiles/get-directory.ts`.
- `getDirectoryPageData(categorySlug/subcategorySlug)` accepted, cached, never applied (backend).
- Verification/report/support admin emails wired but data-thin (no requester identity, no deep links, generic contact template/tag).
- Subscription status change un-features on every non-active status (OLD only on canceled/active, promoted-only).
- Onboarding completion: image optional, no step precondition, no admin new-profile email (still-open doc gap G7).
- `requireOnboardingComplete` no longer bounces `TYPE_SELECTION`/`OAUTH_SETUP` users or incomplete pro profiles out of `/dashboard`.
- Nav mega-menu subcategories/subdivisions unsorted/unsliced vs OLD's count-desc top-6/top-3.
- Dashboard services table lost `media` thumbnails + `taxonomyLabels`.
- No plan gate on draft creation (at-limit users can stack drafts).
- Env gaps: `REVALIDATE_CACHE_WEBHOOK_SECRET` unset ⇒ signature check skipped (anyone can purge caches); frontend `PAYMENTS_TEST_MODE` unset ⇒ UI gate always open while Django thinks test-mode on; `NEXT_PUBLIC_CLOUDINARY_*` missing from compose; `check-access` has two divergent implementations (Next computes locally, never calls Django, misses `PAYMENTS_ENABLED`).
- Throttle error code `throttled` vs frontend's `rate_limited` branch → English DRF copy shown.
- Prisma relations flattened to scalar fields (`Review.sid`, `Chat.lastMessageId`, `Message.replyToId`, saved items) — no ORM joins, N+1s, integrity rests on leftover Prisma FK constraints.
- 6 `pending_*` tag ids embedded in live `services.tags` resolve to nothing; 2 profiles have raw `category` but NULL `category_node`.
- `/dir` invalid slugs soft-404; breadcrumb copy regressed (`Κατάλογος`/`Εταιρείες`).
- `lastUsernameChangeAt` missing from session serializer → cooldown UI always optimistic, server 429s after submit.
- `logout`/`sessions`/`delete-account` etc. verified OK — no action.

## 4. Verified GOOD (highlights)

- **Security**: every `/api/admin/*` GET → 401 unauthenticated; RBAC matrix 1:1 with OLD incl. its quirks.
- **Schema**: all 24 Prisma models mapped, 0 missing/extra columns; enums exact (billing 4 enums, user 3, review, taxonomy); JSON columns (coverage/visibility/addons/type/socials/billing/stars) 100% shape-clean across sampled rows; auth-era tables (Account/Session/Verification) correctly load-bearing; cuid generator collision-safe.
- **Reviews**: full parity (validation, moderation, emails, rating math, dashboard reads).
- **Services archive core**: filters/sorts/search/suggestions/pagination match OLD (incl. slug-collision candidates, county logic, multi-word search, 6-tier suggestion ranking).
- **Billing core**: digest field order char-identical, pricing 2480/22320, coupons validated server-side, cancel calls Cardlink, `_row` full Prisma shape, enum parity; SCRUM-63 advice webhook + subscription-payment email verified live end-to-end (this session).
- **Blog**: validation/slugs/authors/search/shape all fixed and consistent with the FE.
- **Home**: featured tabs, popular subcategories, categories grid, bottom grids (top-100) verified live.
- **Plan limits 3/15/3 + plan-aware refresh (free 3/day, promoted unlimited)**: consistent across pricing.ts, feature-gate, `_PLAN_LIMITS`, `_refresh_daily_limit` (except H3's toggle-featured max-5 drift).

## 5. Stale documentation

`MIGRATION_PARITY.md` (2026-06-20) and most `parity-audit/domain-*.md` files predate commit
`c014107` and later fixes; roughly **80% of their ❌ items are now implemented** (verified
per-claim in the seven reports: auth G1/G2/G4-half/G5, admin A1-A7, blog all, reviews ~20/21,
messaging 9/13, services G1-G12, profiles G1-G12/G15, saved 1-2, media, billing gap-0 and
seven others). Treat this file as the current source of truth; the old docs should be
archived or regenerated.

---
*Generated from seven parallel read-only audits on the live docker-compose stack
(prod-seed DB: 624 users / 448 profiles / 729 services / 23 chats / 3 subscriptions).*

---

# ADDENDUM — same-day remediation (2026-07-26, later session)

All items in §1 (C1-C10), §2 (H1-H7) and most of §3 were **fixed and verified live**:

- **C1** Worldline checkout redirect: frontend proxy route added → 200 through :3000.
- **C2** Support enum: serializer accepts problem|option|feature (+legacy values).
- **C3** All server-side proxies now prefer DJANGO_INTERNAL_URL (auth/[...all], sign-cloudinary-params, cron/auto-refresh) — signing returns 401, not 500.
- **C4** All 67 naive timestamp columns → timestamptz via 14 idempotent migrations
  (`*_timestamptz_prisma_columns.py`); each drops the dead Supabase RLS policies
  that blocked ALTER TYPE (0 policies remain); refresh-cooldown & digest crashes gone;
  DRF now emits correct UTC offsets. `makemigrations --check` exits 0
  (ArrayField state-only migrations added).
- **C5** Registration: username collisions resolved for simple+pro (display_username too),
  confirmed=True at signup, register form navigates to /register/success,
  change-password verifies legacy bcrypt, OAuth intent flows via frontend cookie →
  callback → Django exchange (applied only on new-user creation).
- **C6** Sitemaps: real Next handlers fed by `GET /api/seo/sitemap-entries` —
  verified 704 services / 394 profiles / 15 articles URLs; Django index points at
  the Next routes; static page sets aligned.
- **C7** (fixed earlier) taxonomy snapshot synced; social-media archive = 16.
- **C8** Archive UI: counties filled FE-side (OLD pattern), subdivision chips carry
  parent-subcategory hrefs, bare `?online` counts as true (selector + serializer —
  DRF BooleanField coerced ''→None, now JSONField), breadcrumbs generated FE-side,
  `?page=` coerced safely, invalid category slugs → 'Category not found' (notFound()),
  nav mega-menu count-sorted, dashboard cards carry media/taxonomyLabels/sortDate.
- **C9** PII: `serialize_profile_card` (no phone/viber/whatsapp/firstName/lastName/terms)
  used by search/archive/by-username; page bundle unchanged.
- **C10** DM lookup falls back to 2-member-set before creating a chat.
- **H1-H7**: OAuth intent (see C5); Worldline TEST/LIVE env keys defined + documented;
  featured limit unified at 3 (shared _PLAN_LIMITS); admin toggle-publish/create fire
  notifications, admin edits regen slug/normalized/sanitized, admin user edit syncs
  Profile; beat schedules on crontab; cron endpoints exist (401-guarded);
  Brevo lifecycle + welcome-at-verification wired.
- **Mediums fixed**: digest per-message dedupe (OLD EmailBatch semantics), presence
  refcount, message author/replyTo, admin chats (participant search, author objects,
  sort, member fields), blog list cache purge (delete_pattern), taxonomy node delete
  (recursive, refuses while referenced), directory art restored, check-access single
  source of truth (Django), revalidate webhook fails closed, .env.example cleaned.
- **Deliberate deviations**: Supabase RLS policies dropped permanently (dead in this
  stack); taxonomy delete refuses while rows reference the subtree (OLD git-era
  deleted blindly); `seed_taxonomy --check` still trips on tags 1303 vs 1298 (DB is
  a union of historic seeds — needs a data decision, not code).
