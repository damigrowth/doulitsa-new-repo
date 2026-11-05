# Pass 4: adversarial verification of the billing and schema/DB findings (2026-11-05)

**Scope.** I re-checked every numbered finding in these reports against the code:
- `billing-payments.md` (D1–D20, plus §5)
- `pass3-billing-payments.md` (P3-B1..B7, C1–C4)
- `pass2-schema-db.md` (D1–D7, C1–C4)
- `pass2-caching-matrix.md` C3
- `pass2-state-machines.md` C2
- `pass3-blog-support-media-crons.md` C2 (about billing D10)
- `pass2-routes-urls.md` D3

**Rules.** No code was changed and no git commands were run. Per the Addendum, a payment BEHAVIOR change counts as INTENTIONAL. Only MECHANICAL defects survive: crashes, unique violations, lost webhooks, purge gaps, and wrong email recipient or content.

**Verdict legend.**
- **CONFIRMED**: re-read on both sides (file:line given).
- **REFUTED**: the claim is wrong.
- **ADJUSTED**: the claim is real, but its scope or severity was changed.
- **UNVERIFIABLE-FROM-REPO**: needs a live env or DB check (see §4).

---

## 1. Addendum re-classification (BEHAVIORAL → INTENTIONAL, not bugs)

| ID | Item | Why it is behavioral |
|---|---|---|
| billing D8 | "Χρέωση" shows the charged gross amount instead of the fixed 20€/180€ | Displayed amount; this is exactly what the Addendum names |
| billing D9 | Manual and Stripe subscriptions can now be cancelled | Cancel rule |
| billing D10 (expiry part) | Canceled-at-period-end subscriptions never expire | Renewal cron disabled on purpose. Net effect equals OLD. The HTTP/beat hazard part is kept below |
| billing D11 | Advice period anchoring: `max(stored_end, charge ts)` plus the historical skip | Period anchoring; named in the Addendum |
| billing D12 | Six C14N digest candidates; `_charset_`/`submitButton` skipped | A production verification fix, still bound to the shared secret. Not a defect |
| billing D13 | Webhook edge paths: content-type tolerance, last duplicate key wins, `firstPaymentAt` set when null, cancel falls back to master order id | Documented, deliberate. The missing-secret redirect showing `error=security` instead of `error=config` is cosmetic; dropped |
| billing D17 | Checkout pre-writes `billing = profile.billing or {}` | Harmless. The webhook overwrites it (`subscription_ops.py:487`). Sync is a no-op only for abandoned checkouts |
| billing D18 | History page number is clamped before querying | UI improvement |
| billing D19 | Callback uses `window.location.href` | Deliberate session fix (commented in `callback-redirect.tsx`) |
| billing D6 | Unfeaturing requires an active promoted subscription; an unpublished featured service can be unfeatured | Entitlement rule. **Borderline: ask the user.** Side effect: a past_due pro keeps `featured=true` services they cannot un-star (OLD let them) |
| billing D16 | Coupon copy | Coupon UI is hidden in both apps (`COUPON_INPUT_VISIBLE=false`), so this is unreachable. Dropped |

Kept as mechanical, although payment-adjacent:
- **D5, D7, P3-B4, P3-B5**: English or technical error text reaches users, and the page does not refresh after a write. These are copy and refresh defects, not payment rules.
- **D15**: email content. The Addendum explicitly keeps emails.
- **D2, D20**: config and env mechanics.

---

## 2. Verdict table: mechanical findings

### 2a. Billing

| ID | Verdict | Sev (pass 4) | Evidence (NEW ↔ OLD) | Notes |
|---|---|---|---|---|
| **billing D1**: MID written to the UNIQUE `provider_customer_id` | **CONFIRMED** | **CRITICAL** | NEW `subscription_ops.py:471` sets it on every success, including the update branch. `models/subscription.py:47-48` and `migrations/0001_initial.py:22` declare it `unique=True`. OLD `webhooks/worldline/route.ts:293` writes `providerCustomerId` only in the `create:` branch; the `update:` branch (`:317-341`) never touches it, and the checkout always pre-creates the row (`service.ts:57-78`). Prisma also declares it `@unique` (`subscription.prisma:53`). | Nothing else in the repo writes it: only `:471`, plus admin display. The first paying profile takes the MID. Every later activation by a different profile raises an IntegrityError inside `transaction.atomic()`. The view does not catch it, so the response is a 500 and the whole write rolls back: no `worldline_master_order_id`, no attempt row, no email, and later advices return 404 at `advice.py` lookup. **Fix: delete line 471.** OLD rows are NULL, so nothing needs migrating; just clear any MID already written (see §4 SQL). |
| **billing D2**: `PAYMENTS_TEST_MODE` defaults to True in Django; FE and BE read different vars | **CONFIRMED + ESCALATED** | HIGH (env-conditional) | `base.py:20,469` (`default=True`) vs FE `lib/payment/test-mode.ts:15` (`=== 'true'`). OLD `test-mode.ts:14-16` was FE-only. | **New consequence:** the Django `PAYMENTS_ENABLED` kill-switch and test-mode gate are enforced **only in the UI** (sidebar, sheet, star). `CheckoutSessionView` (`views/public/billing.py:53-66`) checks only `IsAuthenticated, IsProOrAdmin`. `/dashboard/checkout` (`checkout/page.tsx:43`) uses the FE var and ignores `PAYMENTS_ENABLED`. Mismatch case: BE unset (so sandbox) while FE says live. A non-admin pro who opens `/dashboard/checkout` is sent to the **Cardlink sandbox**. A sandbox CAPTURED is signed with the TEST secret, which BE also uses, so it validates and **activates promoted for free**. Fix: enforce `PAYMENTS_ENABLED` and the test-mode gate in `create_checkout`. Make the FE page use `/api/payments/check-access`. Default `PAYMENTS_TEST_MODE=False`, or fail closed. |
| **billing D3**: webhook proxy drops User-Agent and follows Django's 302 | **CONFIRMED, ADJUSTED** | MEDIUM | NEW `frontend/src/app/api/webhooks/worldline/route.ts:26-33` forwards only Content-Type and uses default `fetch` (follows redirects); compare `api/auth/[...all]/route.ts:29` `redirect:'manual'`. Django side: `views/public/billing.py:298-299` `is_s2s = "Modirum" in UA`, which is always False through the proxy. OLD `route.ts:60-61`. | The browser bounce *works by accident*: the callback page reads `searchParams` server-side (`payment/callback/page.tsx:15-19`). Next fetches the redirect target `{FRONTEND_BASE_URL}/payment/callback?status=…` and serves its HTML as a 200 at `/api/webhooks/worldline`, and the client props carry the status. Real mechanical losses: (a) S2S acknowledgements become 200 HTML; (b) an S2S digest failure on a non-active order returns **200** (via the followed `error=security` redirect) instead of OLD's **400**, so Cardlink will not retry. Fix: forward `user-agent`, use `redirect:'manual'`, and pass `Location`/status through. |
| **billing D4**: featured flips via `.update()` skip cache purge | **CONFIRMED** | HIGH | See group **G1** below. OLD `route.ts:371,492,559` and `advice/route.ts:261,327` call `revalidateProfile(includeHome, includeServices)`. | Admin status/delete: OLD `actions/admin/subscriptions.ts` has **no** revalidate call (grep), so by the purge-gap rule those two are *not* parity gaps. Fix them anyway inside the same helper. |
| **billing D5**: English error messages | **CONFIRMED** | MEDIUM | `frontend/src/actions/subscription/cancel-subscription.ts:17` passes `err.message` straight through. Django texts: `subscription_ops.py:32,106,115,219-222,226,238-243`, `providers.py:50,146-149,154-157,266,297-302`. The OLD Greek list is accurate. | One correction: the publish check is already Greek ("Μόνο δημοσιευμένες υπηρεσίες…", `subscription_ops.py:229-233`). Canonical fix: map by `code` to Greek in the FE actions, or change the Django texts. |
| **billing D7**: cancel does not refresh the promote page | **CONFIRMED** | MEDIUM | NEW `cancel-subscription.ts` has no `revalidate*`, and `promote/cancel-subscription-button.tsx` has no `router.refresh` (grep returns no match). OLD `cancel-subscription.ts:42`. | A second click sends another Cardlink cancel, which likely returns 502 English text (D5/P3-B5). Fix: `router.refresh()` or `revalidatePath('/dashboard/promote')` in the action. |
| **billing D10 (hazard part)**: the HTTP GET cron could double-bill | **REFUTED as live** (latent), per blog-crons C2 | LOW | `frontend/vercel.json` still lists `/api/cron/worldline-renewals 0 6 * * *`. The view accepts GET (`billing.py:411-415`). But `DEFAULT_AUTHENTICATION_CLASSES` includes SimpleJWT (`base.py:221-229`), so `Bearer <CRON_SECRET>` gets a 401 before `_run` (live-proven in blog-crons N1). | Becomes live if anyone applies N1's `authentication_classes=[]` fix to this view. **Recommendation:** remove this route and view, or make it 410, and remove the vercel.json entry. The DatabaseScheduler beat row is UNVERIFIABLE (SQL Q8). |
| **billing D15**: admin payment email content | **CONFIRMED** | LOW | NEW `messaging/emails.py:404-474`: subject `"{type}: {name} — {amount}"` (no user email); date is raw UTC ISO (`when = …isoformat()`); from address is `DEFAULT_FROM_EMAIL`, whose default is `noreply@example.com` (`base.py:378`). Recipient chain `emails.py:47-55` matches. OLD `admin-emails.ts:440-540`. | Content drift, which the Addendum counts. Check the prod `BREVO_SENDER_EMAIL`. |
| **billing D14**: billing-form success copy | CONFIRMED (copy) | LOW | `frontend/src/actions/profiles/billing.ts:22` | Belongs to profiles; not billing logic. |
| **billing D20**: `WORLDLINE_BASE_URL`/`API_URL` override wins over the endpoints | **CONFIRMED** | MEDIUM (env-conditional) | `worldline.py:70-72` (`cfg["BASE_URL"] or endpoints…`). `.env.example:56-57` ships both set to `…/sandbox/uiform`. Generic `MERCHANT_ID`/`SHARED_SECRET` back-fill both modes (`:58-65`). | If copied from the example, live mode posts to the sandbox URL. `API_URL=…/uiform` also breaks the XML cancel. Live check Q-ENV. |
| **P3-B1**: provider stored as `manual` when the MID is missing at first checkout | **CONFIRMED** | MEDIUM | `subscription_ops.py:36-45` `get_or_create(defaults provider=get_provider())`. `providers.py:236-245` (credential-dependent), `:250` dispatches on the stored provider, `:266` raises. `worldline_create_checkout` resets the provider only on success (`providers.py:78`). OLD `service.ts:28-35` uses `existing.provider \|\| DEFAULT_PAYMENT_PROVIDER \|\| 'worldline'` and upserts only after success. | Parity caveat: an *admin-manual* row (`provider=manual`) blocks re-checkout in BOTH stacks. Only the credential-window poisoning is new. SQL Q3. |
| **P3-B2**: webhooks are throttled on the frontend container's IP | **CONFIRMED (code)**; load is unverifiable | MEDIUM | No `throttle_classes` override in `views/public/billing.py` (grep returns nothing). Defaults are `base.py:240-250` (anon `100/5s`). `common/throttling.py` `get_ident` falls back to REMOTE_ADDR, and the proxies send no `X-Real-Client-IP`/secret (`webhooks/worldline/route.ts:26-33`). | A 429 on an advice is a lost renewal after Cardlink's two retries. Fix: `throttle_classes = []` on the webhook, advice and redirect views. |
| **P3-B3**: proxies have no try/catch and no timeout | **CONFIRMED** | LOW-MEDIUM | `webhooks/worldline/route.ts:26` and `advice/route.ts:24` (POST) `await fetch` with no catch and no `AbortSignal`. Only the advice GET catches. | During a backend deploy, a failed fetch returns a Next 500. Cardlink does retry on 5xx, so the main loss is the user's bounce page. |
| **P3-B4**: cancel transport and config errors give a raw 500 ("HTTP 500" toast) | **CONFIRMED** | LOW | `worldline.py:332,371,381` raise `RuntimeError`; `requests.post` exceptions are uncaught; `providers.py:135-149` converts only a parsed status. `common/exceptions.py` returns None, so Django serves an HTML 500. OLD `adapter.ts:128-136` wraps everything into 'Αποτυχία ακύρωσης συνδρομής'. | DB stays untouched (correct). |
| **P3-B5**: cancel parser keeps the empty envelope `<Message>` | **CONFIRMED** | LOW | `worldline.py:387` `fields.setdefault(tag, (el.text or "").strip())`. The sibling sale parser `:283` guards with `if text and tag not in fields`. | One-line fix: copy the `:283` guard. |
| **P3-B6**: parse strictness (`isdigit`, `int()`, `or` vs `??`, naive timestamp) | **CONFIRMED** | LOW | `subscription_ops.py:354`, `advice.py:251,257-259,113-114`. OLD `route.ts:147` `parseInt`, `advice/route.ts:156,160` `parseInt`/`??`. | Edge-only. The worst case is `Sequence` with stray whitespace: a recurring child is mis-routed as an initial payment and silently dropped. |
| **P3-B7**: redirect page lacks the noscript sentence and spinner | **CONFIRMED** | LOW (copy) | `views/public/billing.py:260-273` vs OLD `redirect/route.ts:41-49`. | Correction C2 against pass-1 §4 stands. |
| **pass2-routes D3**: Stripe success URL `/dashboard/billing` | **CONFIRMED** | LOW (latent) | `providers.py:180-181` | Reachable only through P3-B1-style provider poisoning when `STRIPE_SECRET_KEY` is set. Recommend deleting the Stripe and PayPal checkout paths. |
| **billing §5 / P3 C4**: concurrent browser + S2S processing | **CONFIRMED (C4 correct)** | LOW | `subscription_ops.py:458-508`: the row is read before `atomic()`, there is no `select_for_update`, and the full `sub.save()` runs. The idempotency read at `:378-386` is also outside the transaction. | Double attempt row plus double admin email, in both stacks. NEW also loses concurrent field writes. See pass3-profiles-dashboard for the same race on Profile. |
| **P3 C1**: `admin_create_manual` purges via `save()` | **CONFIRMED** | — | `subscription_ops.py:826` `profile.save(update_fields=["featured","updated_at"])` | This **refutes** the part of state-machines C2 that lumps manual-create in with `.update()`. |
| **state-machines C2** (admin paths use `.update()`) | **ADJUSTED** | — | True for `:743` and `:760`; false for manual create (`:826`). | Folded into G1. |
| **caching C3**: service pages also stale | **CONFIRMED, ADJUSTED** | MEDIUM (part of G1) | `service_reads.py:261,308` `_is_promoted_subscriber` gates `additionalServices` inside the 30-min `service:page:{id}` cache. There is no Subscription signal (grep `post_save` in billing returns none). | Remove "cancel" from C3's trigger list: cancel leaves status active and plan promoted, so the gate does not change. The real triggers are activation, past_due, admin status/delete and manual create. Even `Profile.save()` would not fix this, because the Profile signal does not purge `service:page:*` (profiles-dashboard D). |
| **billing §5**: trailing `/` on the advice OrderId | UNVERIFIABLE | — | Same in both stacks | Needs a real advice sample. |

### 2b. Schema / DB

| ID | Verdict | Sev | Evidence | Notes |
|---|---|---|---|---|
| **schema D1**: cutover has no codified dump → Django path; docs contradict each other | **CONFIRMED** | CRITICAL (process) | `DATABASE-RESTORE-RUNBOOK.md:10-18` ("Do NOT restore the raw Supabase backup"), `:58-60` and `:150` (regenerate the seed from the "current working DB"); `GO-PRODUCTION-CHECKLIST.md:70-71` ("take the FINAL production dump" → restore with the runbook); `DEPLOY-doulitsa-test.md:37` and `DOKPLOY.md:21` (`--fake-initial` on the raw dump). The conversion SQL exists only in `backend/README.md:66-90`. `docker-entrypoint.sh:14` runs only `migrate --fake-initial`. | Adjustment: the runbook never says the working DB is the June test DB. It just gives **no step** to get post-June prod writes into it. Either path is unsafe as written. Must be resolved before cutover; not a code bug. |
| **schema D2**: allauth tables missing (faked), so `user.delete()` 500s | **CONFIRMED in code; live state UNVERIFIABLE** | HIGH if the tables are absent | `base.py:83-86` (installed), `:194-197` (allauth backend). `README.md:83` fakes `account`/`socialaccount`. `account.py:187` and `admin_users.py:366` call `user.delete()`. | Caveat: the README comment ("data migration conflicts with real data") hints that the tables *might* exist on some env. Q1 decides. Brevo delete is enqueued before the failing delete (`account.py:176-179`), so the contact is deleted even when the user is kept. That is a mechanical defect either way: move the enqueue to `transaction.on_commit`. |
| **schema D3**: free-text values against PG ENUM columns → DataError 500 | **CONFIRMED in code; enum type UNVERIFIABLE** | MEDIUM | `services/views/public/service.py:281-282` → `service_reads.py:730-731`; `reviews/views/admin/reviews.py:45-53` (plus `int(rating)` ValueError, which 500s regardless of the DB); `taxonomy/services/admin_submissions.py:59-62`; `taxonomy/services/submissions.py:126-127`. No later migration alters these columns (only timestamptz RunSQL and state-only AlterFields). psycopg 3 binds str as unknown, which is cast to the enum → `22P02`. | Q2 confirms the enum types. |
| **schema D4**: drift in `chat_members.id`, `users.password`, `users.last_login` | **CONFIRMED (code contradiction)**; live state UNVERIFIABLE | MEDIUM | `chat_ops.py:277-284`: the comment says there is no id, and the code uses a raw INSERT. The model has an implicit id (`messaging/migrations/0001_initial.py:95`). `README.md:69-70` vs `parity-audit/schema-diff.md`. | Q4 and Q5. |
| **schema D5**: Prisma DB defaults and FKs are not reproduced by Django | **CONFIRMED** | MEDIUM (latent) | Raw INSERT `chat_ops.py:282` omits `joinedAt/lastSeen/muted/online` (model: `auto_now_add`/`default=False`, with no DB default). `db_constraint=False` across `messaging/models/chat.py:21-90`. | Affects only rebuilt DBs and pytest. Q6 confirms the defaults exist live. |
| **schema D6**: deterministic `cid` + UNIQUE → concurrent start-chat 500 | **CONFIRMED** | LOW | `chat_ops.py:246` (sorted cid), then check (`:247`) then `create` (`:276`), with no IntegrityError handling | — |
| **schema D7**: Django-admin model validators block saving legacy rows | **CONFIRMED** (by construction) | LOW | URLField, EmailField and max_length in the models; ModelForm `full_clean()` runs them | Q7 sizes it. |
| **schema C1**: saved toggle answers "saved" on an FK violation | **CONFIRMED (code)**; FK presence UNVERIFIABLE | LOW | `saved/services/toggle.py:23-27,36-39` catches `IntegrityError` and returns True | Q6. |
| **schema C2**: blocking a non-existent user → IntegrityError 500 | **CONFIRMED (code)**; FK presence UNVERIFIABLE | LOW | `chat_ops.py:570` `update_or_create`, unguarded; model has `db_constraint=False` (`chat.py:86-90`), but the DB FK survives the dump | Q6. |
| schema C3, C4 | CONFIRMED | — | No ALTERs of TEXT columns exist in any migration (grep `AlterField`/`RunSQL`) | — |
| schema §5: NULL arrays → `canonicalize_taxonomies.py:62,83` | UNVERIFIABLE | LOW | — | Q9. |

---

## 3. Same-root-cause groups (canonical fixes)

### G1. Queryset `.update()` / no-signal writes leave public caches stale (billing D4, caching C3, state-machines C2, plus related items)

**All signal-skipping writes in `backend/apps`** (exhaustive grep of `.update(`, `bulk_update`, and `cursor()` outside tests and migrations):

| Site | Write | Public caches left stale | Parity gap? |
|---|---|---|---|
| `billing/services/subscription_ops.py:288` `_revalidate_featured` (called from the initial success `:511`, classic child `:580`/`:613`, advice `advice.py:322,366`) | `Profile.featured` | `profiles:directory:*` (2 h), `core:home`, `profile:page:{u}`, `service:page:{id}` (additionalServices gate), Next tags | **YES**: OLD revalidated |
| `billing/services/renewals.py:293` `_set_featured` | same | same | cron disabled; fix for hygiene |
| `billing/services/subscription_ops.py:743` `admin_update_status` | same | same | no (OLD admin did not revalidate); fix anyway |
| `billing/services/subscription_ops.py:760` `admin_delete` | same | same | no; fix anyway |
| `services/tasks.py:46` auto-refresh | `Service.sort_date/refreshed_at` | `service:page:*`, `profile:page:*` order | known (services §4, caching C2) |
| `taxonomy/services/admin_submissions.py:262,275` raw `array_replace` | profile and service arrays | profile and service pages | known (admin) |
| `messaging/...:240,359,413,605` | ChatMember/Chat/Message | not publicly cached | no |
| `taxonomy/management/commands/backfill_taxonomy_fks.py:80,99` | FK columns only | bounded by TTL; one-off | no |

`admin_create_manual` (`:826`) correctly uses `save()`.

**Canonical fix.** Add one helper, e.g. `apps/billing/services/cache.py::apply_featured_and_purge(profile_id, featured)`. It should:
1. Do `profile.featured = featured; profile.save(update_fields=["featured","updated_at"])`, which fires the existing `invalidate_profile_caches` (home, directory, count, profile:page).
2. Additionally delete `service:page:{id}` for every service of that profile, plus `services:count:*`. The Profile post_save does not cover these; this also closes profiles-dashboard D.
3. Run inside `transaction.on_commit(...)`, so caching D4's pre-commit race does not re-cache stale data.

Then:
- Route `_revalidate_featured`, `_set_featured`, `admin_update_status` and `admin_delete` through it.
- Purge `service:page:*` on any Subscription status or plan change, or add a `post_save` on `Subscription` that calls the helper's service-page purge. That covers the `_is_promoted_subscriber` gate.

The Next Data Cache layer cannot be told from a Django webhook, because no Django→Next tag channel exists; `/api/webhooks/revalidate-cache` is a Vercel-deploy hook. That layer stays TTL-bounded at about 5 min, which the caching design accepts.

### G2. Next proxy hop for Cardlink (D3, P3-B2, P3-B3)
These three share one root cause: Cardlink → Next `fetch` → Django with no header pass-through, no `redirect:'manual'`, no try/catch or timeout, and no IP forwarding, while Django applies the default throttles. Two fix options:
- **Preferred**: point Cardlink's confirm, cancel and advice URLs straight at Django, and set `throttle_classes=[]`, `authentication_classes=[]`, `renderer_classes=[JSONRenderer]` on the webhook and advice views. That also covers P3 §6's 406 risk.
- **Or** harden all three proxies identically: forward `user-agent`, use `redirect:'manual'` and pass `Location` through, add a `try/catch` that returns 502 or 503 (so Cardlink retries), and add `AbortSignal.timeout(20000)`.

### G3. Gateway error surfacing (D5, P3-B4, P3-B5)
Wrap `worldline_cancel` in `try/except (RuntimeError, requests.RequestException)` and raise `ApiError(code="provider_error", 502)`. Fix the parser at `worldline.py:387`. Map `code` to the OLD Greek texts in the frontend actions.

### G4. Payment env and gating (D2, D20, P3-B1, routes D3)
All four depend on credentials and env.
- Resolve the provider for incomplete rows as worldline.
- Enforce `PAYMENTS_ENABLED` and test mode server-side in `create_checkout`.
- Use a single source for test mode.
- Ignore `WORLDLINE_BASE_URL`/`API_URL` unless explicitly needed, and fix `.env.example`.
- Drop the Stripe and PayPal checkout paths.

### G5. Restore and schema drift (schema D1, D2, D4, D5)
Write one idempotent `prepare_prisma_dump` management command. It should:
- add `users.password` and `last_login timestamptz`;
- give `chat_members.id` a `GENERATED BY DEFAULT AS IDENTITY` PK, keeping the composite unique;
- run the allauth migrations for real, or remove allauth;
- `--fake-initial` the Prisma apps.

Then rewrite the four cutover docs as one sequence: final dump → command → migrate → copy the `taxonomy_*` tables from test (or `seed_taxonomy`) → backfills.

---

## 4. Consolidated live checks (run on test.doulitsa.gr DB, then prod at cutover)

```sql
-- Q0  billing D1: is the unique constraint live, and has the MID already been written?
SELECT indexname, indexdef FROM pg_indexes
 WHERE tablename = 'subscriptions' AND indexdef ILIKE '%providerCustomerId%';
SELECT "providerCustomerId", count(*) FROM subscriptions GROUP BY 1 ORDER BY 2 DESC;

-- Q0b billing D1 victims: money captured but the subscription never activated
SELECT s.id, s.pid, s.status, s.provider, s."providerSubscriptionId", s."worldlineMasterOrderId", s."updatedAt"
  FROM subscriptions s
 WHERE s.status = 'incomplete' AND s.provider = 'worldline'
 ORDER BY s."updatedAt" DESC;
-- (no attempt row is written on the crash path, so cross-check orderIds against the Cardlink back-office)

-- Q0c remediation, after the code fix (NOT to be run by the auditor):
-- UPDATE subscriptions SET "providerCustomerId" = NULL WHERE "providerCustomerId" IS NOT NULL;

-- Q1  schema D2: do the allauth tables exist?
SELECT to_regclass('public.account_emailaddress'), to_regclass('public.account_emailconfirmation'),
       to_regclass('public.socialaccount_socialaccount'), to_regclass('public.socialaccount_socialtoken'),
       to_regclass('public.socialaccount_socialapp');
SELECT app, name FROM django_migrations WHERE app IN ('account','socialaccount') ORDER BY app, id;

-- Q2  schema D3: which status/type columns are still PG ENUMs?
SELECT table_name, column_name, data_type, udt_name
  FROM information_schema.columns
 WHERE (table_name, column_name) IN (('services','status'),('reviews','status'),('reviews','type'),
       ('blog_articles','status'),('taxonomy_submissions','type'),('taxonomy_submissions','status'),
       ('subscriptions','status'),('subscriptions','plan'),('subscriptions','provider'));

-- Q3  P3-B1: rows already poisoned by a credential-less checkout
SELECT id, pid, provider, status, "createdAt" FROM subscriptions
 WHERE provider <> 'worldline' AND status = 'incomplete';

-- Q4  schema D4: chat_members shape
SELECT column_name, data_type, is_nullable, column_default, is_identity
  FROM information_schema.columns WHERE table_name = 'chat_members' ORDER BY ordinal_position;
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'chat_members'::regclass;

-- Q5  schema D4: users auth columns
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_name = 'users' AND column_name IN ('password','last_login');

-- Q6  schema D5 / C1 / C2 / state-machines D7: legacy FKs and DB defaults still present?
SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE contype = 'f' AND conrelid::regclass::text IN
       ('saved_services','saved_profiles','reviews','chats','messages','blocked_users','chat_members')
 ORDER BY 1, 2;
SELECT column_name, column_default FROM information_schema.columns
 WHERE table_name = 'chat_members' AND column_name IN ('joinedAt','lastSeen','muted','online');

-- Q7  schema D7: legacy values that Django admin validators would reject
SELECT count(*) FROM profiles WHERE website IS NOT NULL AND website <> '' AND website !~ '^https?://';
SELECT count(*) FROM profiles WHERE length(phone) > 64 OR length(viber) > 64 OR length(whatsapp) > 64;

-- Q8  billing D10: a stale persisted renewals beat row?
SELECT name, task, enabled, last_run_at FROM django_celery_beat_periodictask
 WHERE task ILIKE '%worldline%' OR name ILIKE '%worldline%';

-- Q9  schema §5: NULL Prisma list columns
SELECT count(*) FILTER (WHERE skills IS NULL) AS skills_null,
       count(*) FILTER (WHERE "contactMethods" IS NULL) AS cm_null FROM profiles;
SELECT count(*) FILTER (WHERE tags IS NULL) AS tags_null,
       count(*) FILTER (WHERE addons IS NULL) AS addons_null,
       count(*) FILTER (WHERE faq IS NULL) AS faq_null FROM services;
```

**Q-ENV (not SQL).** Check the Dokploy env on BOTH the frontend and backend services:
- `PAYMENTS_TEST_MODE`, `PAYMENTS_ENABLED`
- `WORLDLINE_BASE_URL`, `WORLDLINE_API_URL`, `WORLDLINE_RETURN_URL`, `WORLDLINE_CANCEL_URL`
- `WORLDLINE_{TEST,LIVE}_MID`, `WORLDLINE_MERCHANT_ID`
- `BREVO_SENDER_EMAIL`, `INTERNAL_PROXY_SECRET`, `STRIPE_SECRET_KEY`

Also check which confirm and advice URLs are registered in the Cardlink back-office (the Next proxy or Django directly). That decides G2's preferred fix.

---

## 5. Notes
- **Priority order for fixes:**
  1. billing D1 (one-line delete; blocks the 2nd subscriber onward)
  2. schema D1 (cutover data loss)
  3. G1 (purge)
  4. D2 server-side gate (free-activation hazard under env mismatch)
  5. schema D2, after Q1
  6. G2
  7. the rest
- **Corrected claims:**
  - pass-1 §4: the auto-submit HTML is not the same (P3 C2 upheld).
  - state-machines C2: manual-create uses `save()`.
  - caching C3: cancel is not a trigger.
  - billing D10's HTTP hazard is currently not live.
  - billing D4's admin paths are not parity gaps (OLD admin did not revalidate either). Fix them anyway.
- **Out of scope here, related:** pass3-profiles-dashboard notes that the full-row `Profile.save()` in dashboard forms can revert a webhook's `featured` flip. G1's helper uses `update_fields`, so it does not make that worse.
