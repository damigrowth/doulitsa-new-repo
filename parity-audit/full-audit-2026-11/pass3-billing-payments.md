# Billing / subscriptions / Worldline — pass 3 (fresh re-audit) — 2026-11-05

This pass looks for MECHANICAL defects only, per the _INSTRUCTIONS addendum: changes in payment behaviour (amounts shown, cancel rules, period anchoring) are intentional.

It follows the dedupe rule: anything already in billing-payments.md (D1–D20, §5), pass2-schema-db, pass2-caching-matrix (C3), pass2-state-machines (C2) or lib-shared-sweep (D12) is not repeated here.

No code was changed. No git commands were run.

## 1. Coverage

### OLD files read in full this pass
- `app/api/webhooks/worldline/route.ts`: initial, recurring-child and S2S webhook handling
- `app/api/webhooks/worldline/advice/route.ts`: XML advice receiver
- `app/api/cron/worldline-renewals/route.ts`: renewal cron (disabled in NEW on purpose)
- `app/api/payment/worldline/redirect/route.ts`: auto-submit page
- `lib/payment/{service,factory,coupons,record-attempt,worldline-config}.ts`
- `lib/payment/providers/worldline/{adapter,digest}.ts`
- `lib/payment/providers/worldline/xml.ts`: cancelRecurring + timestamp (read lines 140-219)
- `actions/subscription/{create-checkout-session,cancel-subscription,get-subscription,sync-billing,toggle-featured-service}.ts`
- `actions/admin/subscriptions.ts`: createManualSubscription (read lines 380-470)
- `lib/email/services/admin-emails.ts`: sendSubscriptionPaymentEmail
- `lib/prisma/schema/subscription.prisma`: Subscription and SubscriptionPaymentAttempt
- `middleware.ts`: matcher only

### OLD files diffed against NEW with `diff`
- `app/(dashboard)/dashboard/promote/**`
- `app/(dashboard)/dashboard/checkout/**`
- `app/payment/callback/**`
- `components/subscription/**`

### NEW files read
- Backend:
  - `apps/billing/services/{subscription_ops,providers,advice,worldline,renewals,pricing,record_attempt}.py`
  - `apps/billing/views/{public,admin}/billing.py`, `apps/billing/urls/*.py`, `apps/billing/{tasks,admin}.py`
  - `apps/billing/models/{subscription,payment_attempt}.py`
  - `management/commands/backfill_payment_columns.py`
  - `config/urls.py` (webhook mounts), `config/settings/base.py` (DRF auth/throttle/renderer defaults, ATOMIC_REQUESTS, Celery, WORLDLINE/STRIPE/PAYPAL)
  - `common/{exceptions,throttling}.py`
  - `apps/messaging/{emails.py` (send_email, payment email), `tasks.py}`
  - `apps/profiles/{signals.py, services/cache.py}`
- Frontend:
  - `app/api/{webhooks/worldline,webhooks/worldline/advice,payment/worldline/redirect,cron/worldline-renewals,payments/check-access}/route.ts`
  - `actions/subscription/*`, `lib/api/billing.ts`
  - `lib/api/client.ts` (error mapping)
  - `middleware.ts`, `middlewares/withSimpleAuth.ts`

### Delegated elsewhere
Same as billing-payments.md §1 (admin UI → admin, billing form → profiles, and so on).

## 3. NEW findings

### P3-B1. Checkout saves a subscription row whose provider depends on the credentials, before the provider check runs. A misconfiguration window leaves those profiles permanently unable to pay — MEDIUM (state corruption)
- **OLD** (`lib/payment/service.ts:28-78`):
  - The provider is `existing.provider || DEFAULT_PAYMENT_PROVIDER || 'worldline'`, which never depends on credentials.
  - The subscription row is upserted only after `provider.createCheckoutSession` succeeds.
  - A failed checkout (credentials missing) therefore writes nothing. Once the env is fixed, every pro can check out.
- **NEW**:
  - `subscription_ops.create_checkout` calls `_ensure_subscription` first (`subscription_ops.py:36-45,64`). That does `get_or_create(... provider=providers.get_provider())` and then saves `billing`/`billing_interval` (`:71-73`).
  - `get_provider()` (`providers.py:236-245`) returns `manual` (or `stripe`/`paypal` if those env vars exist) whenever the Worldline MID for the current mode is empty.
  - `providers.create_checkout` then dispatches on `subscription.provider or get_provider()` (`:250`). For `manual` it raises "No payment provider configured" (`:266`).
  - The row keeps `provider='manual'` after that. Only `worldline_create_checkout` and the webhook ever set it back to worldline, and neither is reachable now.
- **Impact**: any pro who first clicks "Ολοκλήρωση Συνδρομής" while the MID is missing gets a permanent `provider=manual, status=incomplete` row. This can happen during cutover or with the D2 test/live mix-up, for example `PAYMENTS_TEST_MODE` defaulting to True while only LIVE credentials are set.
  - Every later checkout for that pro fails with "No payment provider configured" (500), even after the env is fixed. A DB edit is the only way out.
  - If a `STRIPE_SECRET_KEY` happens to be set, the pro is instead sent to a Stripe Checkout that nothing listens to.
- **Fix**: resolve the provider for a new or incomplete row as `worldline` (as OLD did) rather than by credentials. Or create/update the row only after the provider call succeeds. Or treat `manual`/`stripe` rows with `status=incomplete` as worldline at checkout.

### P3-B2. Cardlink webhooks and advices are subject to the global anon throttle, keyed on the frontend container's IP — MEDIUM (lost webhooks)
- **OLD**: no throttling on `/api/webhooks/worldline` or `/advice`.
- **NEW**:
  - `WorldlineWebhookView`, `WorldlineAdviceWebhookView`, `WorldlineRedirectView` and `WorldlineRenewalsCronView` (`views/public/billing.py`) do not override `throttle_classes`, so `DEFAULT_THROTTLE_CLASSES` apply (`base.py:240-251`: anon `100/5s`).
  - The Next proxies (`frontend/src/app/api/webhooks/worldline/route.ts`, `.../advice/route.ts`) call Django with a raw `fetch`. They send no `X-Real-Client-IP` / `X-Internal-Proxy-Secret`.
  - `ClientIPThrottleMixin.get_ident` (`common/throttling.py`) therefore falls back to REMOTE_ADDR, which is the frontend container.
  - So every Cardlink callback shares one bucket with all of the frontend's non-forwarded SSR calls. lib-shared D12 notes that cacheable calls skip IP forwarding.
- **Impact**: during a crawler burst or a cache-expiry wave (D12 already reports pages 500ing from this bucket), a Cardlink POST gets a DRF 429 before the handler runs.
  - The browser return lands on a JSON 429 instead of `/payment/callback`.
  - The Modirum S2S confirmation is rejected.
  - Recurring advices are retried at most twice by Cardlink and are then lost: no period advance, no attempt row, no admin email.
- lib-shared D12 covers page 500s only. This payment-path consequence is not recorded anywhere.
- **Fix**: set `throttle_classes = []` on the two webhook views (and the redirect view), or make the proxies forward the IP.

### P3-B3. Next proxies for webhook, advice and redirect have no error handling and no timeout — LOW (lost webhooks in deploy windows)
- **OLD**: Cardlink hit the handler in-process, with one hop.
- **NEW**: `frontend/src/app/api/webhooks/worldline/route.ts:24-39`, `.../advice/route.ts:24-37` (POST) and `.../payment/worldline/redirect/route.ts:19-33` `await fetch(TARGET…)` with no try/catch and no `AbortSignal` timeout.
  - The GET health check in the advice route is the only handler with a catch.
  - While Django restarts (every backend deploy), the fetch rejects and Next answers with a generic 500 page.
- **Impact**:
  - A pro who pays during a backend deploy is bounced to a Next 500 page. The payment is captured, and activation depends on the S2S confirmation, which hits the same failure window.
  - Advices go through the same window, with Cardlink's two retries.
  - A hung Django keeps Cardlink's connection open indefinitely, with no timeout.
- **Fix**: catch the error and return 502/503 so Cardlink retries. For the browser path, redirect to `/payment/callback?error=payment`. Add a timeout.

### P3-B4. Cancel: Cardlink transport failures surface as an unhandled 500, shown as "HTTP 500" — LOW
- **OLD**: `adapter.ts:128-136` wraps any `cancelRecurring` error in `ProviderOperationError` → 'Αποτυχία ακύρωσης συνδρομής' (`cancel-subscription.ts:61-64`). This covers network errors, non-2xx responses, bad XML and missing credentials.
- **NEW**: `worldline.cancel_recurring` raises `RuntimeError` on missing credentials, non-2xx or an XML parse error (`worldline.py:331-381`). `requests.post` raises `ConnectionError`/`Timeout`.
  - `providers.worldline_cancel` (`providers.py:135-149`) only converts a parsed non-CANCELED status into an ApiError.
  - The other errors escape DRF (`json_exception_handler` returns None → Django HTML 500).
  - `client.ts:406-408` then throws `ApiError('HTTP 500')`, and the action shows the toast "HTTP 500".
- The DB is correctly left untouched. This is a distinct path from D5 (the 502 "Worldline cancel failed" text).
- **Fix**: catch `RuntimeError` / `requests.RequestException` in `worldline_cancel` and raise `ApiError(code="provider_error", status_code=502)`.

### P3-B5. Cancel response parser keeps the empty outer `<Message>` envelope, so Cardlink's reason is lost — LOW
- **OLD**: `xml.ts:190-198` reads `VPOS.Message.RecurringOperationResponse|ErrorResponse` → `.Status`/`.Message`/`.ErrorMessage`/`.Description`.
- **NEW**: `worldline.py:383-393` iterates every element and does `fields.setdefault(tag, (el.text or "").strip())`.
  - The first `Message` element is the VPOS envelope, whose text is empty. `""` is stored, and the real inner `<Message>` is ignored.
  - The SaleResponse parser in the same file (`:270-284`) was fixed for exactly this case ("only keep elements that carry a value"). `cancel_recurring` was not.
- **Impact**: when the cancel is refused, the error reads "Worldline cancel failed: <STATUS> - unknown error" unless `ErrorMessage`/`Description` exists, and the log loses Cardlink's reason. The status check itself is unaffected.

### P3-B6. Small parsing-strictness drifts in the callback/advice handlers — LOW
- **Classic webhook `Sequence`**:
  - NEW: `str(...).isdigit()` (`subscription_ops.py:354`), so "2 " or "2.0" become 0. The recurring child would then be handled as an *initial* payment: no pending row, empty profile_id, a silent return, and a JSON "ok". The child is lost.
  - OLD: `parseInt`, which tolerates these.
- **Advice `TxSequence`**:
  - NEW: `int()` raises on "4.0", so the sequence becomes 0.
  - OLD: `parseInt` gives 4. This only affects the attempt's sequence and child order id.
- **Advice amount fallback**:
  - OLD uses `??`. NEW uses `or` (`advice.py:256-260`).
  - A legitimate `TxTotal` of "0"/"0.00" falls through to PaymentTotal/OrderAmount.
- **Advice `<Message timeStamp>` without an offset**:
  - NEW assumes UTC (`advice.py:114-115`). An Athens-local stamp without an offset would then be 2–3 h in the future and feed the D11 anchoring.
- All of these are edge cases, since Cardlink normally sends plain integers and offsets. They are listed for completeness.

### P3-B7. The Django auto-submit redirect page drops OLD's no-JS instruction text and spinner — LOW (copy)
- **OLD** (`redirect/route.ts:35-81`):
  - The `<noscript>` block contains "Η JavaScript πρέπει να είναι ενεργοποιημένη. Πατήστε το κουμπί παρακάτω."
  - The page has a spinner and a centred layout.
- **NEW**: `WorldlineRedirectView` (`views/public/billing.py:260-273`) renders only `<p>Ανακατεύθυνση στη σελίδα πληρωμής...</p>` plus the noscript form button. There is no explanatory sentence and no styling.
- This contradicts pass 1 §4's "same auto-submit HTML texts" (see C2 below).

## 4. Corrections
- **C1 — pass2-state-machines C2 (and billing D4 scope): `admin_create_manual` does purge Django caches.**
  - It uses `profile.featured = True; profile.save(update_fields=["featured","updated_at"])` (`subscription_ops.py:825-826`). That fires the `post_save` receiver, `invalidate_profile_caches`, which clears `core:home`, `profile:page:{username}`, `profiles:directory:*` and `profiles:count:*`.
  - Only `admin_update_status` / `admin_delete` (`:743,760`) and the webhook/advice/renewal paths use the purge-less `.update()`.
  - For manual create, the only stale layers are `service:page:*` (caching C3) and Next tags.
- **C2 — billing-payments §4 "same auto-submit HTML texts"**: not the same. See P3-B7.
- **C3 — billing-payments D5 / §4 cancel flow**:
  - The cancel *request* XML is identical, but the response parsing is not (P3-B5).
  - D5's list of cancel failure modes is incomplete. Transport and config failures are an unhandled 500, not a 502 with a message (P3-B4).
- **C4 — billing-payments §5 race note ("parity… can double-increment payment_count")**: the outcome is not the same in both stacks.
  - OLD uses atomic `{increment: 1}`, so a concurrent browser + S2S pair (or an advice retry racing the first delivery) double-increments `paymentCount`/`totalPaidLifetime`.
  - NEW does a read-modify-write full `sub.save()` on a snapshot loaded before the transaction (`subscription_ops.py:460-508`, `advice.py:310-321`). One increment is lost instead, so the counters stay correct.
  - Both stacks still write two attempt rows and send two admin emails. The admin `_row` max-merge with the CAPTURED-attempt count then shows the inflated attempt count.
  - NEW's full-row `save()` can also overwrite any field written concurrently, for example an admin status change between the read and the save.

## 5. Re-verified same (pass-1 "confirmed same" claims I re-checked line by line)
- **Classic webhook**:
  - The XML-body probe delegates to advice.
  - Digest failure → for S2S, "already processed" if an active row has that orderid, else 400; for the browser, `error=security`.
  - The Sequence ≥ 2 branch, apart from P3-B6.
  - Pending-row recovery of profile, interval and coupon.
  - Idempotency on an active orderid.
  - Failed-initial attempt rows only when a pending row exists, for CANCELED/REFUSED/REFUSEDRISK/ERROR.
  - The CANCELED/REFUSED redirect and JSON bodies.
- **`_handle_payment_success`, apart from known D1**: the same fields are written as OLD's update branch:
  - the plan create/update rule
  - period now + 30/365
  - cancel flags cleared
  - billing snapshot
  - amount, currency and method
  - discount
  - count/total increments
  - featured=true inside the transaction
  - The attempt row and admin email are sent after commit, and the email payload's `paymentCount` equals the post-increment value, as in OLD.
- **Recurring child (classic) and advice**:
  - Master lookup `provider=worldline AND worldlineMasterOrderId`, with "/N" stripped (classic) or not (advice), as in OLD.
  - The success write set, including clearing the cancel flags.
  - Failure → past_due, featured=false and an attempt row; advice failure → 200.
  - TxId dedup before the lookup.
  - RECOGNIZED_STATUSES → ERROR mapping.
  - `childOrderId` convention.
  - Non-Recurring advice ack.
  - MID mismatch is a warning only.
  - 400/500/404 codes.
  - Advice GET health JSON.
- **`record_payment_attempt`**: best-effort, swallows errors, called outside the transactions. With `ATOMIC_REQUESTS=False` a swallowed DB error cannot poison an outer transaction.
- **Request digest**: 46-field order and algorithm are identical.
- **Response digest**: insertion order. The `_charset_`/`submitButton` skip is known D12.
- **Checkout form fields**: identical.
- **Pricing**:
  - Gross 2480/22320.
  - WELCOME50 math, including rounding: Python `round` vs `Math.round` never meets a .5 tie on these values.
  - `find_coupon` normalisation.
- **Cancel request**:
  - Identical canonical/final XML and digest.
  - Uses `providerSubscriptionId` (with a master fallback, known D13).
  - The DB is written only after CANCELED.
- **Restore** preconditions.
- **Manual-subscription rules**: pro-only, the already-active guard, update overwrites provider to manual, and the featured=true flip. All the same as OLD `createManualSubscription`.
- **Admin payment email**:
  - Trigger points: initial, classic child, advice and cron success only.
  - Recipient chain.
  - Payload values (`payment_count` post-increment, discount, order id/ref).
  - Fire-and-forget with no retry, in both stacks.
  - Formatting differences are known D15.
- **UI**: diffed promote, checkout, callback and subscription components. Apart from known D2/D8/D18/D19 and the type imports, they are identical. Dates are parsed with `new Date(...)` before formatting, so there is no string-vs-Date crash.
- **Webhook URLs**:
  - Not shadowed by `apps.core.urls.webhooks`.
  - No trailing-slash issue.
  - Exempt from the Next middleware (`/api` is excluded by the matcher).
  - `/payment/callback` is not auth-gated.

## 6. Open questions
- **DRF content negotiation runs before the handler.** Default renderers are JSON + Browsable.
  - If Cardlink is ever pointed straight at Django and sends `Accept: application/xml` or `text/xml` with no `*/*`, the webhook/advice POST would get a 406 *before processing*.
  - Through the Next proxy the Accept header is Node's `*/*`, so this is not an issue today.
  - Verify Cardlink's Accept header before repointing. The safest option is to set `renderer_classes=[JSONRenderer]` and a permissive `content_negotiation_class` on those views.
- **P3-B1**: check the test/prod DB for already-poisoned rows: `SELECT id, pid, provider, status FROM subscriptions WHERE provider <> 'worldline' AND status = 'incomplete';`
- **P3-B2**: is `INTERNAL_PROXY_SECRET` set? Even if it is, the webhook proxies don't send it.
- **Shared hazard (both stacks, not a difference)**: two open checkout tabs. The second checkout overwrites `provider_subscription_id`. Paying in the first tab then finds no pending row, and var1 is not echoed. `_handle_payment_success` returns silently, the user sees success, and the money is captured without activation.
