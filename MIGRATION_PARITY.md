# Migration Parity Report — Doulitsa (Next.js + Supabase → Next.js + Django + Postgres)

> **Audit-only deliverable.** No code was changed. Every verdict cites `file:line`
> evidence; items that couldn't be resolved from code sit under *Needs human
> verification*. Match is by **behavior**, not name. The golden rule: the NEW app must
> do *everything* the OLD app did — the only intended change is the backend tech.

## Summary

- **OLD repo (source of truth, production):** `app_before_migrations/` — "Doulitsa"
  Next.js app on **Supabase** (Postgres + better-auth) accessed via Prisma + Supabase
  client. ~109 server-action files under `src/actions/`, 12 `app/api/**/route.ts`
  handlers, Prisma schema in `src/lib/prisma/schema/*.prisma`.
- **NEW repo (target, not yet shipped):** `./` — `frontend/` (Next.js, calls the API) +
  `backend/` (Django + DRF + Channels + Postgres; apps: accounts, admin_api, billing,
  blog, core, media, messaging, profiles, reviews, saved, services, support, taxonomy).
- **Capabilities audited:** ~555 across 13 domains + 3 cross-cutting passes (schema,
  auth/RLS, Supabase-features/config).
- **Tally (aggregated from the per-domain sub-reports in [`parity-audit/`](parity-audit/)):**
  - ✅ Matched: **~210**  ⚠️ Partial/differs: **~210**  ❌ Missing/broken: **~90**  ❓ Needs verification: **~40**
- **Overall:** endpoint *coverage* is good — nearly every OLD operation has *a* NEW
  counterpart, and the **RLS → Django authorization port is faithful (0 hard RLS
  regressions)**. The danger is concentrated in **payments, transactional email,
  response-shape drift, dropped validation, and live-chat/search behavior**.

### Top risks (ranked)

| # | Risk | Severity | Type | Where |
|---|------|----------|------|-------|
| 1 | **Billing/payments not production-safe** — `subscription_payment_attempts` model missing; Worldline/Cardlink integration fabricated (wrong digest, placeholder prices, webhook 404s, no recurring-sequence, no callback idempotency = double-charge, cancel doesn't stop charging, unsigned renewal cron) | 🔴 Critical | Money / data-loss | `apps/billing/**` |
| 2 | **All transactional email stubbed (`TODO`)** — verification, password reset, contact/feedback, review & verification & taxonomy notifications never send | 🔴 Critical | Broken core flow | `apps/*/services/**` |
| 3 | **Review PII leak + hidden-review leak** — `author.email` exposed in cards; public lists return hidden-comment rows and miscount totals | 🔴 Critical | Security / data | `apps/reviews/selectors/review_reads.py` |
| 4 | **Logout doesn't blacklist refresh token; no user session revocation** — a leaked refresh token survives logout ~14 days | 🔴 Critical | Security | `apps/accounts/**` |
| 5 | **County/location filtering broken** (profiles + services): nationwide pros dropped, slug→county-id not resolved, OLD "online OR county" became AND | 🟠 High | Broken feature | `apps/profiles/selectors/profile_aggregations.py`, `apps/services/**` |
| 6 | **Custom error `code` dropped from API envelope** — every frontend `err.code` branch is dead | 🟠 High | Broken UI logic | `common/exceptions.py:120` |
| 7 | **Live chat regressions** — read receipts dropped; presence/unread websocket routing mismatch | 🟠 High | Broken realtime | `apps/messaging/consumers.py`, `chat_ops.py` |
| 8 | **Search degraded** — homepage autocomplete dead (shape bug); location/taxonomy/accent/fuzzy matching + relevance ranking lost | 🟠 High | Broken feature | `apps/core/**`, `frontend/.../home-search.tsx` |
| 9 | **Taxonomy pending-submission flow broken** — `pending_<id>` prefix mismatch; approve/reject don't reconcile profiles/services | 🟠 High | Data integrity | `apps/taxonomy/**` |
| 10 | **Schema drift** — unmodeled table, an array/jsonb type mismatch, dropped defaults + dropped indexes | 🟡 Medium | Schema / perf | see *Schema diff* |

### Methodology & evidence
This report synthesizes 16 detailed per-area sub-reports (full parity matrices with
every row + citation) saved in [`parity-audit/`](parity-audit/). Schema and several
headline code claims were **verified against the live restored DB and source** during
the audit (see *Schema diff* and *Verification notes*).

---

## Parity matrix (consolidated — ❌ missing/broken and key ⚠️ differs; ✅ summarized per domain)

> Full per-row matrices (incl. all ✅) are in the per-domain files under `parity-audit/`.

### Auth & Accounts — ✅24 ⚠️28 ❌4 ❓4 → `parity-audit/domain-auth.md`, `auth-rls.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Error `code` in JSON envelope | Response shape | actions throw `ApiError(code=…)` | `common/exceptions.py:120,135` | ❌ | Serializes class `default_code`, drops per-instance `code` → FE `err.code` checks dead |
| Delete account via action | Endpoint | `frontend/.../auth/delete-account.ts:19` `DELETE /auth/account` | Django delete at `/auth/account/delete` | ❌ | Bare path is PATCH-only → deletion fails |
| `confirmed` at registration | Business rule | `config.ts:384` `confirmed:true` | `apps/accounts/.../registration.py:79` `False` | ❌ | Changes `me`/session gates |
| Verification/reset emails + Brevo sync | Side-effect | OLD sent | register/resend/onboarding/oauth `TODO` | ❌ | No verify/reset possible in prod |
| Username/account update → Profile sync | Business rule | OLD synced User+Profile | view updates User only | ⚠️ | Stale public profile (username/displayName/image) |
| Login response | Response shape | OLD redirect-based | adds top-level `access`/`refresh` | ⚠️ | FE adapted, but envelope differs |
| Register loosened | Validation | confirmPassword + consent enforced | server no longer enforces | ⚠️ | Weaker server validation |

### Profiles — ✅4 ⚠️15 ❌4 ❓3 → `parity-audit/domain-profiles.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| County filter | Filter | `get-services.ts` / `resolveToCountyId` | `profile_aggregations.py:27` `_all` vs `'54'`, no slug→id | ❌ | County directory returns 0; nationwide pros dropped |
| AFM lookup response | Response shape | `{onomasia,doy_descr,postal_address,…}` | `afm_lookup.py:85-98` `{name,profession,address,doy,active}` | ❌ | Billing/verification autofill reads undefined |
| taxonomy-paths (SSG routes) | Endpoint | filters `user.role`, returns slugs sorted | `profile_reads.py:21-33` filters `Profile.type`, raw ids, unsorted, no guards | ❌ | Broken static routes |
| Profile field validation | Validation | tagline≥10, bio≥80, coverage rules, phone/url regex, portfolio max-10 | not ported to DRF serializers | ⚠️ | Invalid data persists |
| Count endpoint | Filter | counts category/subcat only | NEW also applies coverage/online/search | ⚠️ | Different totals |
| Card/page shape | Response shape | incl. `coverage`,`groupedCoverage`,`role`,`taxonomyLabels` | several omitted; `featuredCategories=[]` | ⚠️ | Missing keys/arrays (casing OK) |
| Verification/report admin email | Side-effect | OLD sent | `TODO` | ⚠️ | Admins not notified |

### Services — ✅7 ⚠️16 ❌6 ❓3 → `parity-audit/domain-services.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Archive search fields | Filter | `build-search-conditions.ts:41` (tags, subdivision, coverage, displayName, accents) | `service_reads.py:48-55` title/desc/subcat only | ❌ | Major discoverability loss |
| County coverage filter | Filter | `get-services.ts:445` online OR county, onbase/onsite | NEW AND, drops nationwide + gating | ❌ | Wrong location results |
| Featured services | Endpoint+shape | taxonomy objects + "all" bucket + take 8, reviewCount tiering | raw slugs, take 50/20 | ❌ | Home tabs break |
| Service-page bundle | Response shape | breadcrumbs, coverage, additionalServices, tagsData, budget/size/contact | only `{service,related,reviews,reviewStats}` | ⚠️ | Missing page sections |
| Report email / refresh-boost / slug gen | Side-effect | OLD did | `TODO` / dropped | ⚠️ | Notifications + slug behavior lost |
| Plan/subscription create gating | Business rule | plan limits enforced | `canCreateMore` hardcoded true | ⚠️ | No plan enforcement |
| Sort options (7) | Sort | archive sorts | all map (NEW adds `popular`) | ✅ | Only default-shuffle timing differs |

### Messaging / Chat — ✅8 ⚠️16 ❌4 ❓2 → `parity-audit/domain-messaging.md`, `supabase-config.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Live presence / online | Realtime | Supabase presence | `consumers.py:164` `presence.<uid>` group, never `group_send` to it | ❌ | Online dots never update live |
| Live read receipts | Realtime | `subscribeToReadReceipts` | `chat_ops.py:273` no broadcast | ❌ | "Seen" not live |
| Live chat-list / unread badge | Realtime | `subscribeToUserChats` | `use-chat-list-subscription.ts` listens on dead `/ws/presence/` | ❌ | Sidebar unread never refreshes |
| Live new-message/edit/delete/reaction | Realtime | Supabase postgres_changes | `chat.<id>` group + `use-chat-subscription.ts` | ✅ | Works (typing added) |
| Message pagination | Pagination | default 20, ascending | default 50, descending | ⚠️ | Order + size differ |
| Chat keys | Response shape | `avatar`,`unread`,`otherMemberId`,`authorUid`,nested author/replyTo | `image`,`unreadCount`,`otherUserId`,`authorId` | ⚠️ | FE normalizers don't patch all renames |

### Reviews — ✅12 ⚠️21 ❌14 ❓8 → `parity-audit/domain-reviews.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Public list `visibility=true` filter | Filter | `get-reviews.ts:26-27,54-55` | `review_reads.py:138` nulls comment only, keeps row | ❌ | Hidden reviews leak; totals/pagination wrong |
| `author.email` in card | Response shape (PII) | not exposed | `review_reads.py:153` | ❌ | **PII leak** |
| Create-review business rules | Validation | profile-exists, has-services, serviceId required, service∈profile (`create-review.ts:75-132`) | none | ❌ | Allows invalid/PROFILE reviews |
| Rating rounding | Business rule | stats 1dp, stored 2dp | raw floats | ❌ | Different displayed ratings |
| Moderation idempotency / owner toggle guard | Business rule | "already moderated" + approved-only | missing | ❌ | Re-moderation + invalid toggles |
| Card shape | Response shape | `updatedAt`, `author.name/username`, nested `service{}` | dropped / flat `serviceId` | ⚠️ | Dashboard cards break |
| New-review / approval emails | Side-effect | OLD sent | `TODO` | ⚠️ | No notifications |

### Saved — ✅17 ⚠️6 ❌2 ❓0 → `parity-audit/domain-saved.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Saved-service card shape | Response shape | `taxonomyLabels`, resolved `category`, transformed `coverage`, `type`, `groupedCoverage` | `saved_reads.py:73-101` missing/raw | ❌ | Blank category/coverage/type badges |
| Saved-profile card shape | Response shape | `ArchiveProfileCardData` | reuses profile-detail payload | ❌ | Omits card keys, over-fetches private fields |
| Toggle/dedupe/auth/sort/pagination | Core | — | — | ✅ | Match (NEW safer: user from JWT) |
| Default page size | Pagination | 12 | 20 (`serializers/saved.py`) | ⚠️ | Masked: page always sends 12 |

### Billing / Subscription — ✅4 ⚠️9 ❌14 ❓2 → `parity-audit/domain-billing.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| `subscription_payment_attempts` | Schema+endpoints | `subscription.prisma:109-133` + 6 write sites | no model/migration (`billing/models/`) | ❌ | Financial audit trail lost (table has data) |
| Worldline/Cardlink digest | Payment integrity | base64-sha256 over fixed 46-field order | `sha256` hex over sorted values | ❌ | Gateway rejects / insecure |
| Prices & coupons | Business rule | €24.80/€223.20, `WELCOME50` annual | €19.99/€199.90 placeholders, fake coupons | ❌ | Wrong charges |
| Webhook / callback | Payment flow | server-to-server, redirects | `billing.py:159-182` relies on `extData` echo Cardlink never returns | ❌ | Webhook 404s in prod |
| Callback idempotency | Payment safety | present | absent (`subscription_ops.py:153-202`) | ❌ | Double-charge risk |
| Cancel → stop charging | Payment flow | tells provider | `providers.py:231-239` DB-only | ❌ | Card keeps being billed |
| Renewal cron | Payment flow | signed XML SaleRequest v2.1 + retry state machine | unsigned form-POST, string-match (`tasks.py`,`providers.py:90-117`) | ❌ | Renewals broken/insecure |

### Blog — ✅16 ⚠️13 ❌2 ❓0 → `parity-audit/domain-blog.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| categorySlug validation | Validation | rejects unknown vs 13 static slugs; required on publish | stores any string | ❌ | Breaks category archives silently |
| Author-profile existence | Validation | verified | blind create (`db_constraint=False`) | ❌ | Dangling authors |
| Admin list `authors` | Response shape | incl `{profileId,order,profile}` | dropped | ⚠️ | Admin author UI breaks |
| Public detail author shape | Response shape | nested `author.profile.*` | flat, missing fields | ⚠️ | AuthorBox mismatch |
| Pagination `hasMore` | Pagination | `hasMore`, no `page` | `page`, no `hasMore` | ⚠️ | "load more" breaks |
| Search semantics / slug suffix / thresholds | Filter+Validation | raw-title branch, timestamp suffix, tighter limits | word-AND, `-2/-3`, looser | ⚠️ | Accent search lost; looser validation |

### Support (contacts + verifications) — ✅16 ⚠️7 ❌4 ❓4 → `parity-audit/domain-support.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Contact admin + user emails | Side-effect | sent | `support.py:67` `TODO` | ❌ | Support channel dead |
| Feedback admin email | Side-effect | sent | `support.py:97` `TODO` | ❌ | — |
| Verification admin email | Side-effect | sent | `services/verification.py:53` `TODO` | ❌ | Admins blind to requests |
| AFM validation | Validation | any 1–20 chars | `profile_updates.py:66` exact `^\d{9}$` | ⚠️ | Submissions OLD accepted now 400 |
| Admin verification row | Response shape | incl `profile.image`,`profile.type` | `_verification_row` omits | ⚠️ | Empty admin columns |
| `sortBy=status` | Sort | supported | silently ignored | ⚠️ | Falls back to created_at |

### Taxonomy — ✅6 ⚠️6 ❌4 ❓0 → `parity-audit/domain-taxonomy.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| `pending_<id>` prefix | Business rule | `taxonomy-submission.ts:116` | `submissions.py:31` bare cuid; FE still expects prefix | ❌ | Pending tags/skills unrecognized |
| Approve reconciliation | Business rule | array_replace pending→real id across profiles/services + cache | `admin_submissions.py:64-93` none | ❌ | Saved id orphaned forever |
| Reject cleanup | Business rule | array_remove pending id | `admin_submissions.py:96-109` none | ❌ | Dangling ids |
| Static-dataset dup check | Validation | `taxonomy-submission.ts:63-86` | skipped | ❌ | Duplicate submissions |
| Admin list shape / sorts | Response shape | `items`, `categoryLabel`, `submitterProfile` | `submissions`, dropped enrichments, no-op sorts | ⚠️ | Admin UI degraded |

### Admin + Github — ✅~38 ⚠️~52 ❌~10 ❓~3 → `parity-audit/domain-admin.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Cache revalidation on mutations | Side-effect | `adminCache.revalidateAll` | absent everywhere | ❌ | Stale public pages |
| Git ops + per-item taxonomy CRUD | Endpoint | FE `git-operations.ts` via Octokit | Django endpoints exist but unused/dead | ❌ | Migration incomplete |
| Brevo/CRM side-effects + stats | Side-effect | synced | stubbed; brevo-stats wrong (`noServices=0`) | ❌ | CRM drift |
| Profile section-update endpoints | Business rule | owner-path logic | basic-info drops image/skills/coverage; additional-info no endpoint | ⚠️ | Silent no-ops |
| api-key `expiresIn` units | Bug | seconds | days-vs-seconds mismatch | ⚠️ | Wrong expiry |
| verification-status alias route | Bug | works | wrong kwarg → 500 | ⚠️ | Broken endpoint |
| RBAC role gates | AuthZ | `lib/auth/roles.ts` | `apps/accounts/permissions/admin.py` 1:1 | ✅ | Faithful port (+chats now gated) |

### Home + Search + Shared (core) — ✅4 ⚠️8 ❌9 ❓1 → `parity-audit/domain-home-search.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Homepage autocomplete | Bug | returns `{taxonomies,services}` | FE `home-search.tsx:52` reads `result.success` (undefined) | ❌ | Dropdown never populates |
| Suggestion shape | Response shape | incl `url`,`label`,`type`,`matchType` | bare objects | ❌ | Clicks navigate to `undefined` |
| Search quality | Filter | 6-tier relevance, location/coverage, taxonomy-label, plural, tag/subdivision id, accent | rating-sort only, dropped | ❌ | Greek category/city search returns nothing |
| Featured services/profiles selection | Business rule | per-category top-8 media-gated / 16 gated+fallback | global top-50/12 by rating | ❌ | Wrong home content |
| Popular subcategories | Business rule | service subcategory counts | pulls pro directory | ❌ | Wrong vocabulary |
| Home bundle shape | Response shape | — | reconstructed in FE `get-home-data.ts` | ⚠️ | Mostly compensated client-side |

### Media — ✅13 ⚠️4 ❌0 ❓0 → `parity-audit/domain-media.md`
| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Media records layer | Schema/endpoint | Prisma `Media` table **unused** (media as JSON) | `models/media.py` + `POST /api/media/upload` populates it | ✅ | NEW does *more* |
| Server-side `max 10` cap | Validation | `validations/service.ts:1023`, `profile.ts:303` | serializers no `max_length` | ⚠️ | Unlimited attachments |
| `_pending`/`blob:` strip | Validation | `sanitizeCloudinaryResources` | `common/utils/cloudinary.py:43-54` key-whitelist only | ⚠️ | Broken images can persist |
| Cloudinary signing | Integration | `actions/cloudinary/...` | `media/services/cloudinary_signing.py` | ✅ | Faithful + adds size/type enforcement |

---

## Detailed gaps (🔴 Critical & 🟠 High — with fixes)

### 🔴 1. Billing / payments — not production-safe
- **OLD:** Full Worldline/Cardlink lifecycle — signed digest (base64-SHA256 over a fixed
  46-field order), real prices/coupons, server-to-server webhooks with idempotency,
  recurring Sequence≥2 child notifications, signed XML `SaleRequest v2.1` renewals with a
  3×/3-day retry→cancel state machine, and a `subscription_payment_attempts` audit row
  written from 6 sites.
- **NEW:** `apps/billing` models only `Subscription`; payment-attempt table exists in the
  DB (4 rows) but is invisible to the ORM. The gateway integration is reconstructed with
  a wrong digest algorithm, placeholder prices/coupons, a webhook that depends on an
  `extData` echo Cardlink never returns (404s in prod), no idempotency (double-charge),
  cancel that never tells Cardlink to stop, and an unsigned form-POST renewal cron.
- **Impact:** Money correctness + financial audit loss. **Do not ship billing as-is.**
- **Fix:** Port the OLD digest/field-order, prices, coupons, S2S webhook + redirect
  handling, recurring-sequence handler, callback idempotency, and signed-XML renewal cron
  verbatim; add the `PaymentAttempt` model + migration mapping the existing table and wire
  `record_payment_attempt` into all 6 sites; make cancel call the provider.

### 🔴 2. Transactional email is stubbed everywhere
- **OLD:** Sent email verification, password reset, contact/feedback confirmations + admin
  alerts, review/verification/taxonomy notifications, with Brevo list syncs.
- **NEW:** These are `# TODO` comments across `apps/accounts`, `apps/support`,
  `apps/reviews`, `apps/profiles`, `apps/taxonomy`.
- **Impact:** In prod, users cannot verify email or reset passwords; admins receive no
  contact/verification alerts. Integration creds are wired (`anymail`/Brevo) — only the
  send calls are missing.
- **Fix:** Implement the send-helpers (Brevo templates exist in `.env.example`) and call
  them at each flagged site.

### 🔴 3. Reviews — PII leak + hidden-review leak
- **OLD:** `get-reviews.ts:26-27,54-55` filtered `visibility=true` for both rows and
  `total`; cards never exposed reviewer email.
- **NEW:** `apps/reviews/selectors/review_reads.py:138` only nulls the *comment* when
  `visibility=False` (the row + count still return), and `:153` includes
  `"email": author.email` in the card.
- **Impact:** Hidden reviews resurface and corrupt totals/pagination; reviewer emails
  leak to any consumer of a public list. **Verified in source.**
- **Fix:** Re-add `.filter(visibility=True)` on public list + count; drop `email` from the
  card payload.

### 🔴 4. Session security — logout & revocation
- **OLD:** users could delete their own `sessions` rows; better-auth session lifecycle.
- **NEW:** `oauth_setup.py:106-109` "logout" just returns `{ok:true}` (no
  `RefreshToken(t).blacklist()`, though `token_blacklist` is installed); only admins can
  revoke sessions.
- **Impact:** A stolen/leaked refresh token stays valid up to the 14-day lifetime even
  after explicit logout.
- **Fix:** Blacklist the refresh token on logout; add a user self-service "log out all
  sessions" endpoint.

### 🟠 5. County / location filtering (profiles + services)
- **OLD:** resolved an area **slug** → parent **county id** (`resolveToCountyId`), treated
  nationwide pros specially, and combined "online OR in-county" as an OR.
- **NEW:** `profile_aggregations.py:27` uses `NATIONWIDE_COUNTY_ID="_all"` (vs OLD `'54'`)
  and never resolves slug→id; services turns the OR into an AND and drops nationwide +
  onbase/onsite gating.
- **Impact:** County-filtered directory/listings return 0 or wrong results and silently
  drop nationwide providers.
- **Fix:** Port `resolveToCountyId`, restore the nationwide id + OR semantics.

### 🟠 6. Custom error `code` dropped from API envelope
- **OLD:** actions threw `ApiError(message, code)`, FE branched on `err.code`
  (`resend-verification.ts:18`, `forgot-password.ts:20`, …).
- **NEW:** `common/exceptions.py:120,135` serialize `exc.default_code` (the class default),
  never the per-instance `code=`. **Verified.** So `already_verified`,
  `invalid_credentials`, `rate_limited`, etc. all collapse to `"error"`/`"throttled"`.
- **Fix:** Serialize `getattr(exc, 'code', None) or exc.default_code`.

### 🟠 7. Live chat — read receipts & presence/unread
- **NEW:** `consumers.py:164` PresenceConsumer joins `presence.<userId>` but nothing ever
  `group_send`s there; `chat_ops.py:273` `mark_messages_read` doesn't broadcast;
  `use-chat-list-subscription.ts` listens on `/ws/presence/` for events that never arrive.
  Live new-message/edit/delete/reaction **do** work via the `chat.<id>` group.
- **Impact:** Online dots, live "seen", and sidebar unread badges never update live.
- **Fix:** Broadcast presence to the `presence.<userId>` group on connect/disconnect/
  heartbeat, and emit a `chat.message_read` broadcast from `mark_messages_read`.

### 🟠 8. Search degraded
- **NEW:** `frontend/.../home-search.tsx:52` reads `result.success` that the action never
  returns (dead dropdown); backend suggestions lack `url/label/type/matchType`; relevance
  ranking, location/coverage search, and taxonomy/plural/accent/tag-id fuzzy matching are
  dropped.
- **Fix:** Align the action's return contract; port the OLD ranking + matchers.

### 🟠 9. Taxonomy pending-submission flow
- **NEW:** `submissions.py:31` returns a bare cuid while the FE still ships
  `PENDING_PREFIX`/`isTaxonomySubmissionId`; `admin_submissions.py` approve/reject don't
  `array_replace`/`array_remove` the pending id across `profiles.skills[]` /
  `services.tags[]`.
- **Impact:** User-submitted skills/tags are never recognized/styled and are orphaned on
  approve/reject.
- **Fix:** Restore the `pending_<id>` contract and the reconcile-on-approve/reject logic.

*(Remaining 🟠/🟡 items — admin cache revalidation, git-ops migration, featured-content
selection, validation drops — are detailed in the per-domain files.)*

---

## Schema diff

Compared 30 OLD Prisma models vs NEW Django models and the **live restored DB**. Because
the live DB was created by Prisma, columns/enums/indexes are physically present; the gaps
are in the **Django model layer** (a fresh `migrate` on an empty DB would not reproduce
them).

| Table | Issue | OLD (prisma) | NEW | Severity | Verified |
|---|---|---|---|---|---|
| `subscription_payment_attempts` | **Model entirely missing** | `subscription.prisma:109-133` (+ enums `28-43`) | absent from `billing/models/` | ❌ | ✅ table present w/ 4 rows; ORM-invisible |
| `email_batches.messageIds` | Type mismatch | Prisma `String[]` (`email.prisma:35`) | Django jsonb (`messaging/models/chat.py:107`) | ❌ | ✅ live DB col = `ARRAY`/`_text` |
| `services.sortDate` | Lost `@default(now())` in model | `service.prisma:62` | `service.py:77` no default; col is NOT NULL | ⚠️ | ✅ live DB has `CURRENT_TIMESTAMP` default (Prisma); model omit → fresh migrate drops it |
| `profiles`,`services`,`reviews`,`taxonomy`,`chats` | Composite/search indexes not in `Meta.indexes` | prisma `@@index` | model code | ⚠️ | Present in live DB; fresh migrate wouldn't recreate → query regressions |
| `media.bytes` | `BigIntegerField` vs DB `integer` | `media.prisma` | `media/models` | ⚠️ | Minor (widening) |
| FK relations as plain CharField | `chats.lastMessageId`, `messages.replyToId`/`deletedBy` | prisma relations | `db_constraint=False`/CharField | ⚠️ | No DB FK enforcement |

**Boot-time findings clarified:** `users.password` / `users.last_login` are **dump-vs-model
artifacts, not OLD→NEW gaps** (OLD stores passwords in `accounts.password`; the columns
were added so `AbstractBaseUser` can boot). `chat_members.id` is an intentional surrogate
PK; the old composite `(chatId,uid)` is preserved as a UNIQUE constraint.

---

## Auth & RLS gaps

**RLS → Django: no hard regressions.** All ~30 distinct Supabase RLS rules the OLD app
actually exercised have faithful NEW equivalents — owner-only writes via
`_owner_or_404`/`_require_pro_owner`, `published`/`status=PUBLISHED` read filters in
selectors, membership-gated messaging, and a verbatim admin RBAC port
(`apps/accounts/permissions/admin.py` ↔ `lib/auth/roles.ts`). 81 raw policies in the dump
collapse to those ~30 rules; the rest are Supabase-internal (realtime/storage/vault).

**Session-security gaps (fix):** logout doesn't blacklist refresh tokens; no user
self-service revocation; refresh lifetime 14d; account-delete drops GDPR side-effects
(Brevo contact + token cleanup); verification/reset email sends stubbed.

**Latent RLS (existed but no OLD feature used them — replicate if you add the feature):**
review self-edit-24h, review self-delete, "who saved me" on saved_profiles/services,
contacts read-own, blocked_users admin-manage.

Detail: `parity-audit/auth-rls.md`.

---

## Response-shape mismatches (silently break the UI)

| Endpoint area | OLD key/shape | NEW key/shape | File:line |
|---|---|---|---|
| AFM lookup | `onomasia, doy_descr, postal_address[_no/_zip]` | `name, profession, address(joined), doy, active` | `apps/profiles/.../afm_lookup.py:85-98` |
| Review card | nested `service{id,title,slug}`, `author.name/username`, `updatedAt` | flat `serviceId`, **`author.email`**, dropped | `apps/reviews/selectors/review_reads.py` |
| Chat objects | `avatar`,`unread`,`otherMemberId`,`authorUid`, nested author/replyTo/isOwn/isRead | `image`,`unreadCount`,`otherUserId`,`authorId` | `apps/messaging/**` |
| Saved cards | `taxonomyLabels`,`groupedCoverage`,`role`, resolved `category` | missing/raw | `apps/saved/selectors/saved_reads.py:57-101` |
| Blog | public list `hasMore`; admin/detail nested `author.profile.*` + `order` | `page`; flat author | `apps/blog/**` |
| Search suggestions | `url,label,type,location,matchType` | bare `{category}`/`{id,slug,title}` | `apps/core/**` |
| Profile/service cards | `coverage`,`groupedCoverage`,`role`,`taxonomyLabels`,`featuredCategories` | omitted / `[]` | `apps/profiles/**`, `apps/services/**` |

Casing is otherwise handled correctly (NEW selectors emit camelCase `displayName`,
`reviewCount`, `contactMethods`, `createdAt`, `isActive`); the breaks are missing/renamed
keys, not snake_case leakage — except AFM and the chat renames above.

---

## Needs human verification (❓)

- Review **admin** endpoints (list/detail/**delete**/stats/admin-toggle) are NEW-only with
  no `actions/reviews` counterpart — confirm intended vs missing-from-OLD.
- Whether NEW frontend components actually consume the new envelope-less shapes (several
  selectors changed; FE normalizers patch only some).
- Owner-scoped media read/delete + temp-media cleanup job; `verifications` resubmit-while-
  PENDING guard.
- Per-plan service limits exact parity (`check-access`); brevo-stats `noServices` source.
- No standalone username-availability endpoint in NEW (OLD had one?).
- `email_batches`, `pending_registrations`, better-auth `verification` token table — owner
  app/usage to confirm.

Full ❓ lists per domain are in the `parity-audit/` files.

---

## Appendix — detailed per-area sub-reports

Each has the complete parity matrix (incl. ✅ rows), detailed gaps, and file:line evidence:

| Area | File |
|---|---|
| Schema diff | [`parity-audit/schema-diff.md`](parity-audit/schema-diff.md) |
| Auth & RLS (cross-cutting) | [`parity-audit/auth-rls.md`](parity-audit/auth-rls.md) |
| Supabase features & config | [`parity-audit/supabase-config.md`](parity-audit/supabase-config.md) |
| Auth (endpoints) | [`parity-audit/domain-auth.md`](parity-audit/domain-auth.md) |
| Profiles | [`parity-audit/domain-profiles.md`](parity-audit/domain-profiles.md) |
| Services | [`parity-audit/domain-services.md`](parity-audit/domain-services.md) |
| Messaging/Chat | [`parity-audit/domain-messaging.md`](parity-audit/domain-messaging.md) |
| Reviews | [`parity-audit/domain-reviews.md`](parity-audit/domain-reviews.md) |
| Saved | [`parity-audit/domain-saved.md`](parity-audit/domain-saved.md) |
| Billing/Subscription | [`parity-audit/domain-billing.md`](parity-audit/domain-billing.md) |
| Blog | [`parity-audit/domain-blog.md`](parity-audit/domain-blog.md) |
| Support | [`parity-audit/domain-support.md`](parity-audit/domain-support.md) |
| Taxonomy | [`parity-audit/domain-taxonomy.md`](parity-audit/domain-taxonomy.md) |
| Admin + Github | [`parity-audit/domain-admin.md`](parity-audit/domain-admin.md) |
| Home + Search + Shared | [`parity-audit/domain-home-search.md`](parity-audit/domain-home-search.md) |
| Media | [`parity-audit/domain-media.md`](parity-audit/domain-media.md) |
