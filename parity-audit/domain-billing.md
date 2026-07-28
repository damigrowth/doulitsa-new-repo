# Domain: Billing/Subscription

AUDIT-ONLY parity check. OLD = Next.js + Prisma + Supabase (`app_before_migrations`). NEW = Django/DRF (`backend`) + Next.js frontend (`frontend`). Golden rule: NEW must do everything OLD did. This domain handles real money (Worldline/Cardlink). **Multiple payment-correctness defects found — the NEW Worldline integration would not actually work against the real Cardlink gateway, and the entire payment-attempt audit trail is gone.**

---

## Parity matrix

| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Get my subscription | endpoint | `app_before_migrations/src/actions/subscription/get-subscription.ts:15-43` | `frontend/.../get-subscription.ts:7-14` → `backend/apps/billing/views/public/billing.py:130-137` → `subscription_ops.py:92-97,312-337` | ⚠️ | NEW returns a hand-built `_row()` dict (camelCase subset). OLD returned the **full Prisma `Subscription`** object (all columns incl. worldline/discount/period/paymentMethod fields). Many keys dropped (see Response-shape). |
| Create checkout / payment init | endpoint + provider | `create-checkout-session.ts:18-133` + `lib/payment/service.ts:28-81` + `providers/worldline/adapter.ts:49-124` | `frontend/.../create-checkout-session.ts` → `views/public/billing.py:52-65` → `subscription_ops.py:47-71` → `providers.py:38-71,210-228` | ❌ | NEW digest algorithm, field set, field order, amount, order-id encoding, and redirect mechanism are ALL different & wrong (see Payment-flow section + Gaps 1-5). Would be rejected by Cardlink. |
| "Already active" guard on checkout | business rule | `create-checkout-session.ts:59-65` (block if status active) | — | ❌ | NEW `create_checkout` has NO already-active guard. Re-subscribe / double-charge possible. |
| Coupon validation at checkout | business rule | `create-checkout-session.ts:39-47` (must be valid + interval-applicable) | `subscription_ops.py:47-71` (coupon passed straight to provider, no validation) | ❌ | NEW never validates coupon server-side at checkout; invalid coupon silently ignored by `apply_coupon`. |
| Payment redirect page | endpoint | `app/api/payment/worldline/redirect/route.ts:13-90` (full auto-submit form w/ ALL signed fields) | `views/public/billing.py:159-182` | ❌ | NEW renders a stub form with ONLY `orderid` — no signed params, no digest. Cannot reach Cardlink payment page. Code comment admits "full flow needs DB-stored form params". |
| Payment callback / webhook | endpoint + provider | `app/api/webhooks/worldline/route.ts:49-499` | `views/public/billing.py:185-197` + `subscription_ops.py:153-202` + `providers.py:80-88` | ❌ | NEW webhook: wrong digest verify, wrong subscription lookup (`extData` never sent by Cardlink), no recurring-child handling, no idempotency, no S2S/Modirum content-type handling, no audit log. See Gaps 6-10. |
| Recurring child notification (Sequence ≥ 2) | provider | `route.ts:136-139,368-499` (`handleRecurringChild`) | — | ❌ | **Completely missing in NEW.** Cardlink auto-charge notifications would 404/ignore; period never advances; past_due never set from gateway. |
| Idempotency on callback | business rule | `route.ts:176-190` (skip if already active) | — | ❌ | NEW has no idempotency; duplicate Cardlink POST would double-increment paymentCount / totalPaidLifetime. |
| Cancel subscription | endpoint + provider | `cancel-subscription.ts:16-77` + `service.ts:86-117` + `adapter.ts:126-136` (Cardlink XML `RecurringOperationRequest` Cancel) | `frontend/.../cancel-subscription.ts` → `views/public/billing.py:115-127` → `subscription_ops.py:74-80` → `providers.py:231-239` | ❌ | NEW does NOT call Cardlink to stop recurring billing (only Stripe branch calls provider). Worldline cancel updates DB only → **card keeps getting charged by Cardlink.** Also OLD set `canceledAt` when cancelAtPeriodEnd=true; NEW only sets it when `at_period_end` is False (Gap 13). |
| Restore subscription | endpoint + provider | `restore-subscription.ts:16-72` + `service.ts:122-157` + `adapter.ts:138-144` (Worldline THROWS — unsupported) | `views/public/billing.py:106-112` → `subscription_ops.py:83-89` → `providers.py:242-248` | ❌ | OLD: Worldline restore is **explicitly unsupported** (throws → user must re-subscribe) and requires `cancelAtPeriodEnd=true`. NEW silently flips status back to ACTIVE locally for ALL providers, with no precondition and no gateway call. Behavioral divergence + can mark a canceled-at-gateway sub active. |
| Validate coupon (standalone) | endpoint | `validate-coupon.ts:11-40` (annual-only, real pricing w/ VAT) | `views/public/billing.py:86-103` + `pricing.py:42-55` | ❌ | Different coupon codes, different prices, no interval gating, different pricing shape. See Gap 11. |
| Toggle featured service | endpoint + gating | `toggle-featured-service.ts:15-90` + `lib/subscription/feature-gate.ts:canFeatureService` | `views/public/billing.py:68-74` → `subscription_ops.py:113-142` | ⚠️ | NEW enforces max-5 + promoted-required, BUT skips OLD checks: service must be `published` (OLD line 46-48) and ownership-by-`pid`. NEW only filters by profile (ok) but allows featuring non-published services. No cache revalidation. |
| Sync billing | endpoint | `sync-billing.ts:11-66` | `views/public/billing.py:77-83` → `subscription_ops.py:100-110` | ⚠️ | OLD only syncs when `subscription.billing===null && profile.billing!==null`, then verifies persistence. NEW overwrites whenever differs (no null-guard, no verify). Could clobber a good snapshot. Auth: OLD requires auth only; NEW requires auth only — OK. |
| Plan gating: can-create-more services | gating | `lib/subscription/feature-gate.ts:canCreateService` (free=5, promoted=15) | `selectors/subscription_selectors.py:12-19` only exposes `has_active_subscription`; per-plan service limits NOT in billing | ❓/⚠️ | `canCreateService`/`maxServices`(5/15)/`maxDailyRefreshes`/`autoRefresh`/`getRemainingFeaturedSlots` not found in billing. Verify they live in NEW services app; if absent → plan limits unenforced. |
| Cron: recurring renewals | task + provider | `app/api/cron/worldline-renewals/route.ts:41-319` + `providers/worldline/xml.ts:executeRecurringCharge` | `tasks.py:18-60` + `providers.py:90-117` | ❌ | NEW renewal cron: wrong XML/charge mechanism (form POST + string-match "success" vs OLD signed XML SaleRequest v2.1), no token-expiry check, no retry state machine (OLD: 3 retries × 3 days then cancel), no auth secret, wrong amount source, no audit log. See Gap 12. |
| Admin: list subscriptions | endpoint | `actions/admin/subscriptions.ts:27-120` | `views/admin/billing.py:29-33` → `subscription_ops.py:208-236` | ⚠️ | OLD search matches profile.displayName OR user.email; NEW matches `profile__username` OR `provider_customer_id` (different fields). Row shape differs. |
| Admin: get subscription | endpoint | `admin/subscriptions.ts:125-168` | `views/admin/billing.py:36-43` → `subscription_ops.py:239-241` | ⚠️ | Shape: NEW returns `_row()` subset; OLD returns full subscription + nested profile/user incl `role`. |
| Admin: update status | endpoint | `admin/subscriptions.ts:173-237` | `views/admin/billing.py:52-59` → `subscription_ops.py:244-263` | ✅/⚠️ | Both update status, set canceledAt on cancel, sync profile.featured. Parity OK. (OLD also re-features on reactivate; NEW does via featured = active&&promoted.) |
| Admin: delete subscription | endpoint | `admin/subscriptions.ts:242-291` | `views/admin/billing.py:45-49` → `subscription_ops.py:266-277` | ✅ | OLD only un-features if plan==promoted; NEW always un-features. Minor. |
| Admin: stats | endpoint | `admin/subscriptions.ts:296-326` | `views/admin/billing.py:62-66` → `subscription_ops.py:280-287` | ✅ | Keys match: total/active/canceled/pastDue. |
| Admin: create manual subscription | endpoint | `admin/subscriptions.ts:386-473` | `views/admin/billing.py:69-79` → `subscription_ops.py:290-309` | ⚠️ | OLD checks user.type==pro and blocks if already active. NEW skips both guards. Otherwise parity OK. |
| **Payment-attempt audit log** | schema + side-effect | `lib/payment/record-attempt.ts` + `schema/subscription.prisma:109-134` (`subscription_payment_attempts`) + 6 call sites | **NONE** | ❌❌ | **MODEL + TABLE + ENUMS + ALL CALL SITES MISSING.** No `SubscriptionPaymentAttempt` model, no migration, no `recordPaymentAttempt` anywhere in `backend/`. Confirmed by grep. See Gap 0. |
| Payments check-access | endpoint | (route present `app/api/payments/check-access/route.ts`) | `views/public/billing.py:143-156` | ❓ | NEW present (test-mode gating). OLD route not deeply read; behavior likely parity. Mark verify. |

---

## Payment flow parity (init → redirect → callback → state update → invoice)

OLD flow (works against Cardlink, empirically tuned):
1. **Init** (`adapter.ts:49-124`): build 20+ form fields incl `extRecurringfrequency`/`extRecurringenddate`/`extTokenOptions=100`/`var1..var4`(profileId/plan/interval/coupon); amount from `PLAN_PRICING` (`promoted` month `24.80` / year `223.20`, gross incl 24% VAT) or coupon-discounted; orderId `DOL{profileId}{ts36}`; digest via **fixed 46-field order** (`digest.ts:8-33`), `base64(sha256(concat(fields in fixed order)+secret))`. `service.ts:59-78` upserts a `incomplete` subscription storing `providerSubscriptionId=orderId` so the webhook can recover context (Cardlink does NOT echo var1-9).
2. **Redirect** (`redirect/route.ts`): server renders an **auto-submitting HTML form** POSTing ALL signed fields to Cardlink (`shophandlermpi`). Required because Cardlink needs a form POST.
3. **Callback** (`webhooks/worldline/route.ts`): handles 3 POST types — browser redirect, S2S recurring child (Sequence≥2), and Modirum background confirmation (non-form content-type). Validates response digest via **insertion-order** `validateResponseDigestFromFormData`. Idempotent. On CAPTURED/AUTHORIZED → `handlePaymentSuccess`.
4. **State update**: `handlePaymentSuccess` (tx) upserts subscription `active/promoted`, sets period start/end via `addBillingCycleDays` (Athens calendar, 30/365), stores `worldlineToken`/`worldlineTokenExp`/`worldlineMasterOrderId`, `paymentMethodLast4`, increments `paymentCount`/`totalPaidLifetime`, sets `firstPaymentAt`/`lastPaymentAt`, flips `profile.featured=true`, revalidates cache, records payment attempt. Recurring child & cron renewal advance the period and record attempts; failures → `past_due`, then cron retries 3×/3-day then `canceled`.
5. **Invoice / AADE**: OLD copies `profile.billing` snapshot (invoice/AFM/DOY/profession) onto the subscription and passes business-purchase + tax fields to checkout for the Cardlink invoice. No explicit AADE/myDATA call found in scope (likely handled by Cardlink invoice or out of scope).

NEW flow (`providers.py` + `subscription_ops.py` + `tasks.py`):
1. **Init** (`providers.py:38-71`): only ~10 fields, NO recurring/token fields except `extTokenOptions=100`, NO var fields; instead sends `extData=subscription.id` (a field Cardlink does **not** support/return). Amount from `pricing.py` placeholder **1999/19990 cents (€19.99/€199.90)** — WRONG vs €24.80/€223.20. Digest = `sha256(sorted-by-key concat + secret).hexdigest()` — **wrong algorithm (hex not base64), wrong ordering (alphabetical, not Cardlink's fixed 46-field order)**. OrderId `sub-{id}-{ts}`.
2. **Redirect** (`billing.py:159-182`): stub form with only `orderid`. **Broken.**
3. **Callback** (`billing.py:185-197` + `providers.py:80-88`): verifies digest with the same wrong alphabetical-hex scheme; looks up subscription by `payload['extData']` (never present from Cardlink) → always 404 in production. No recurring-child, no idempotency, no S2S handling.
4. **State update** (`subscription_ops.py:153-202`): sets active/promoted, stores token, increments totals, sets `last_payment_at`/`first_payment_at`, flips `profile.featured`. **Does NOT set `current_period_start/end`, `billing_interval`, `payment_method_*`, `discount_*`, `worldline_token_exp` reliably (only inside the success branch), `currency`.** No payment-attempt record.
5. **Invoice/AADE/billing snapshot at checkout**: billing snapshot copied in `subscription_ops.py:52-54`, but business-purchase/AFM/DOY/profession/address NOT forwarded to Cardlink params (`providers.py:54-67` only sends email + billCountry='GR'). Invoice prefill lost.

---

## Detailed gaps (per ❌/⚠️)

### Gap 0 — `subscription_payment_attempts` model entirely missing ❌❌ (DATA-LOSS / AUDIT-LOSS)
- **OLD**: `schema/subscription.prisma:109-134` defines `SubscriptionPaymentAttempt` (`subscription_payment_attempts`) with `status`(enum CAPTURED/AUTHORIZED/REFUSED/REFUSEDRISK/CANCELED/ERROR), `source`(enum initial/recurring_child/cron_renewal/cron_retry/manual), `amount`, `currency`, `sequence`, `txId`, `paymentRef`, `orderId`, `message`, `errorMessage`, indexes. Written by `recordPaymentAttempt` (`record-attempt.ts`) from 6 places: initial success/fail (`webhooks/worldline/route.ts:208,337`), recurring child success/fail (`:427,473`), cron renewal/retry success/fail/exception (`cron/.../route.ts:215,254,274`).
- **NEW**: No model, no migration (`migrations/0001_initial.py` has only `Subscription`), no enums, `models/__init__.py` exports none, zero `record`/`PaymentAttempt` references in `backend/` (grep-confirmed).
- **Impact (money/data-loss)**: Permanent loss of the per-charge financial audit trail used for reconciliation, dispute handling, retry accounting, and detecting silent double-charges. Every successful/failed Cardlink charge becomes untraceable.
- **Suggested fix**: Add `SubscriptionPaymentAttempt` model (db_table `subscription_payment_attempts`, db_columns matching Prisma camelCase) + `PaymentAttemptStatus`/`PaymentAttemptSource` TextChoices + migration; add a `record_payment_attempt()` helper (best-effort, swallow errors) and call it at all 6 equivalents (webhook initial, recurring child, cron renewal/retry success/fail/exception).

### Gap 1 — Wrong Worldline request digest algorithm ❌ (payment-correctness)
- OLD: `base64(sha256(fields-in-fixed-46-order + secret))` (`digest.ts:26-33`). NEW: `sha256(sorted-alphabetically values + secret).hexdigest()` (`providers.py:74-77`). Wrong encoding (hex vs base64) AND wrong field ordering.
- **Impact**: Cardlink rejects the request signature → checkout impossible. Also webhook verify uses same wrong scheme → genuine callbacks rejected / forged ones not the concern but real ones fail.
- **Fix**: Port `DIGEST_FIELD_ORDER` (46 fields) + base64-sha256 for requests, and the insertion-order `validateResponseDigestFromFormData` for responses.

### Gap 2 — Wrong prices ❌ (money)
- OLD `PLAN_PRICING` gross incl VAT: month `24.80`, year `223.20` (`pricing.ts:49-54`); net 20/180 (`coupons.ts:39-44`). NEW `pricing.py:15-18`: 1999/19990 cents = €19.99/€199.90 — placeholder, code comment even admits it.
- **Impact**: Customers charged the wrong amount.
- **Fix**: Set month=2480, year=22320 cents; mirror VAT/net logic.

### Gap 3 — Wrong coupon catalog ❌ (money)
- OLD: single `WELCOME50` (50% off, **annual only**, promoted) with VAT-aware `DiscountedPricing` (`coupons.ts:50-101`). NEW: `WELCOME10/SUMMER25/FRIEND50` (`pricing.py:22-26`), no interval/plan gating, flat percent on cents.
- **Impact**: Wrong discounts; OLD's only real coupon (`WELCOME50`) does not exist in NEW → previously-advertised promo broken; NEW coupons grant unintended discounts.
- **Fix**: Replace coupon table with `WELCOME50` annual-only + VAT-aware pricing matching `calculateDiscountedPricing`.

### Gap 4 — Missing recurring/token request fields at checkout ❌ (payment-correctness)
- OLD sends `extRecurringfrequency`(30/365), `extRecurringenddate`(+1825d), `trType=1`, `deviceCategory`, `lang=el`, `orderDesc`, `var1-4`, billing address fields. NEW sends none of these. Without `extRecurring*` Cardlink will not set up the scheduled recurring charge → no auto-renew, no token issuance as configured.
- **Fix**: Port full `formFields` set from `adapter.ts:79-104`.

### Gap 5 — Wrong context-recovery mechanism (`extData`) ❌ (payment-correctness)
- OLD knows Cardlink does NOT echo var1-9, so it stores `providerSubscriptionId=orderId` and recovers profile/plan/interval/coupon from DB in the webhook (`service.ts:49-78`, `route.ts:144-169`). NEW relies on `extData=subscription.id` being echoed back by Cardlink (`providers.py:65`, `subscription_ops.py:159`) — Cardlink does not return arbitrary `extData`, so the webhook will never find the subscription.
- **Fix**: Store orderId on the subscription at checkout and look up by `provider_subscription_id`/`worldline_master_order_id` (split off `/N` for children) instead of `extData`.

### Gap 6 — Broken redirect page ❌ (payment-correctness)
- See flow §2. NEW emits only `orderid`. User can never actually pay.
- **Fix**: Persist signed form fields (e.g. base64url in the redirect URL like OLD) and render the full auto-submit form to `shophandlermpi`.

### Gap 7 — No recurring-child handling ❌ (money / state machine)
- OLD `handleRecurringChild` (`route.ts:368-499`) advances period, increments totals, re-features, records attempt on success; sets `past_due` + un-features + records on failure; strips `/N` from orderid to find master. NEW has nothing for Sequence≥2.
- **Impact**: When Cardlink auto-charges, NEW never learns → `currentPeriodEnd` frozen, no past_due, featured state stale. Subscribers either lose featured wrongly or keep it after failed charges.

### Gap 8 — No callback idempotency ❌ (money)
- OLD `route.ts:176-190` short-circuits if order already active. NEW none → Cardlink's duplicate background confirmation double-increments `payment_count`/`total_paid_lifetime`.
- **Fix**: Guard on already-active order before applying.

### Gap 9 — No S2S / Modirum content-type handling ❌
- OLD parses `text/plain`/url-encoded bodies from "Modirum VPOS"/"Modirum HTTPClient", returns JSON acks (`route.ts:50-87,224-235`). NEW assumes `request.data` is a dict and returns redirects/JSON generically. Background confirmations may fail to parse/ack.

### Gap 10 — currentPeriod / billingInterval / payment-method / currency not persisted on success ⚠️→❌
- OLD `handlePaymentSuccess` sets `currentPeriodStart/End`, `billingInterval`, `paymentMethodLast4/Brand/Type`, `currency`, `discountCode/PercentOff`, `worldlineTokenExp`. NEW `handle_worldline_webhook` sets none of period/interval/payment-method/currency/discount (only amount/token/totals/featured).
- **Impact**: Renewal cron (`tasks.py` filters on `current_period_end__lte=now`) would fire immediately/incorrectly because period_end stays null; UI missing card/period info.

### Gap 11 — Standalone coupon-validate divergence ❌
- OLD returns `{code, percentOff, pricing: DiscountedPricing(originalNet, discountAmount, netAmount, vatAmount, grossAmount, percentOff)}` and only for annual (`validate-coupon.ts`). NEW returns `{code, percentOff, pricing: {amount, currency, interval, label, originalAmount?, discount?}}` (`billing.py:86-103`). Different keys, no VAT breakdown, no annual gating.

### Gap 12 — Renewal cron mechanism + retry state machine ❌ (money)
- OLD (`cron/worldline-renewals/route.ts`): `Bearer CRON_SECRET` auth; selects active-due AND past_due-retry; token-expiry check → past_due; signed **XML SaleRequest v2.1** via `executeRecurringCharge` (`xml.ts:52-134`) using stored token; on success advance period via Athens calendar, record attempt; on fail → past_due + un-feature + record; retry up to 3× every 3 days then `cancelExpiredSubscription` (status canceled, plan free, un-feature). NEW (`tasks.py` + `providers.py:90-117`): Celery task, no auth concept, simple form-POST to `API_URL` and string-match `"success"` in response text (not signed XML, will not authenticate), `timedelta(days=30/365)` (not Athens calendar), no token-expiry, no retry/cancel state machine, no audit, amount from `subscription.amount or 1999`.
- **Impact**: Renewals will silently fail (wrong protocol), past_due never retried/cleaned up, no cancel-after-retries; revenue churn + stuck states.

### Gap 13 — Cancel/restore semantics + no gateway cancel ❌ (money)
- **Cancel**: OLD calls Cardlink XML `RecurringOperationRequest`/`Operation=Cancel` (`adapter.ts:126-136`, `xml.ts:147-203`) to STOP the card being charged, then sets `cancelAtPeriodEnd=true` + `canceledAt=now`. NEW (`providers.py:231-239`) only updates DB for Worldline (Stripe branch only calls provider); **never tells Cardlink to stop** → card keeps getting charged. Also OLD sets `canceledAt` when cancelAtPeriodEnd=true; NEW sets `canceled_at` only when `at_period_end is False`.
- **Restore**: OLD Worldline restore THROWS (unsupported; must re-subscribe) and requires `cancelAtPeriodEnd=true` precondition (`adapter.ts:138-144`, `service.ts:122-157`). NEW silently sets status ACTIVE for all providers with no precondition (`providers.py:242-248`) → can resurrect a gateway-canceled sub locally.
- **Impact**: Money (continued charging after cancel) + inconsistent local/gateway state.

### Gap 14 — toggle-featured drops published-status + revalidation ⚠️
- OLD requires `service.status==='published'` (`toggle-featured-service.ts:46-48`) and revalidates caches. NEW (`subscription_ops.py:127-142`) allows featuring any owned service (incl draft/pending), no cache revalidation.

### Gap 15 — Missing business rules: checkout already-active guard, manual-sub pro-type/already-active guards, sync null-guard+verify ⚠️
- See matrix rows. Each is a small OLD guard absent in NEW.

---

## Response-shape mismatches

1. **Get subscription** — OLD: full Prisma `Subscription` (snake/camel as Prisma) wrapped `{subscription}`; includes `worldlineToken`, `worldlineTokenExp`, `worldlineMasterOrderId`, `currentPeriodStart`, `billing`, `paymentMethodType/Last4/Brand`, `discountCode/PercentOff/AmountOff`, `firstPaymentAt`, `createdAt/updatedAt`, etc. NEW `_row()` (`subscription_ops.py:312-337`) returns only: id, profileId, provider, plan, status, billingInterval, amount, currency, cancelAtPeriodEnd, canceledAt, currentPeriodEnd, lastPaymentAt, paymentCount, totalPaidLifetime, profile{}. **Dropped:** currentPeriodStart, billing snapshot, all paymentMethod*, all discount*, worldline*, firstPaymentAt, stripe*, createdAt/updatedAt. Frontend types are `unknown`, so silent breakage in any UI reading dropped fields.
2. **Cancel** — OLD returns `{canceledAt: Date|null}` (Date object client-side). NEW returns `{canceledAt: ISO-string|null}` (`subscription_ops.py:80`); frontend re-wraps to Date (`cancel-subscription.ts:11-15`). OK after frontend adaptation, but note NEW only populates canceledAt when not at-period-end (Gap 13).
3. **Restore** — both `{restored:true}`. OK.
4. **Validate coupon** — shape divergence (Gap 11): OLD `pricing` = full VAT breakdown; NEW `pricing` = plan dict.
5. **Admin list/get** — OLD returns full subscription + `profile{ id, displayName, image, username, user{id,email[,name,role]} }`; NEW `_row()` profile = `{id, username, displayName, image, email, user{id,email,name}}`. Key set differs (NEW adds top-level `email`, omits `role`). Dates ISO strings in NEW vs Prisma Date objects in OLD.
6. **Admin manual create** — both `{id}`. OK.
7. **Webhook** — OLD returns HTTP redirects (`/payment/callback?...`) for browser + JSON for S2S; NEW always returns JSON (`{ok, subId, status}`) — browser redirect-based UX broken (Gap 9).

---

## Counts

- **matched (✅ / parity OK): 4** — admin update-status, admin delete, admin stats, restore-response-shape (trivial).
- **partial (⚠️): 9** — get-subscription shape, toggle-featured (published/revalidation), sync-billing (null-guard/verify), admin list (search fields/shape), admin get (shape), admin manual (guards), plan-gating selectors (needs verify too), payments check-access overlap, response-shape camelCase subsets.
- **missing / wrong (❌): 14** — payment_attempts model (❌❌), request digest, prices, coupons, recurring fields, extData recovery, redirect page, recurring-child handler, idempotency, S2S handling, period/method persistence, coupon-validate shape, renewal cron + retry SM, cancel-gateway/restore semantics.
- **needs_verification (❓): 2** — per-plan service/refresh limits (`canCreateService`/maxServices/autoRefresh) location in NEW; payments check-access exact parity.

**Headline:** This domain is NOT at parity and is unsafe to ship. The Django Worldline integration uses a fabricated digest/price/field model rather than porting the empirically-tuned Cardlink one, the recurring-charge + cancel-at-gateway + retry state machine is gone, and the entire `subscription_payment_attempts` audit table is absent.
