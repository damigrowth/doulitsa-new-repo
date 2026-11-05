# Billing, subscriptions & Worldline/Cardlink payments parity audit — 2026-11-05

Auditor scope: everything under OLD `src/actions/subscription/`, `src/lib/payment/**`,
`src/lib/subscription/**`, `app/api/payment/worldline/redirect`, `app/api/webhooks/worldline`
(+ `/advice`), `app/api/cron/worldline-renewals`, `app/payment/callback`, the
`/dashboard/promote` (+ `/success`) and `/dashboard/checkout` pages, `components/subscription/*`,
the featured-star button, and the payment admin email. NEW: all of `backend/apps/billing/`,
the frontend subscription actions, `lib/api/billing.ts`, the Next proxy routes, and
`lib/payment/test-mode.ts` gating. Zero code changes were made.

## 1. Coverage

### OLD files read (every one)
| File | Role |
|---|---|
| `actions/subscription/index.ts` | barrel |
| `actions/subscription/create-checkout-session.ts` | role gate, coupon check, already-active guard, billing prefill, PaymentService.createCheckout |
| `actions/subscription/cancel-subscription.ts` | cancel-at-period-end + Greek error mapping + revalidateProfile |
| `actions/subscription/restore-subscription.ts` | restore (always fails for worldline) + Greek errors |
| `actions/subscription/get-subscription.ts` | returns the full Prisma Subscription row |
| `actions/subscription/sync-billing.ts` | success-page fallback: copy profile.billing to subscription.billing if null |
| `actions/subscription/toggle-featured-service.ts` | feature/unfeature a service (max 3) |
| `actions/subscription/validate-coupon.ts` | WELCOME50 validation (no auth) |
| `lib/payment/index.ts`, `factory.ts`, `types.ts` | provider registry/types/errors |
| `lib/payment/service.ts` | PaymentService: createCheckout upsert, cancel, restore, get |
| `lib/payment/pricing.ts` | SUBSCRIPTION_PLANS + PLAN_PRICING (24.80 / 223.20 gross) |
| `lib/payment/coupons.ts` | NET_PRICES, WELCOME50, VAT-aware discount math |
| `lib/payment/record-attempt.ts` | best-effort payment-attempt audit row |
| `lib/payment/test-mode.ts` | isPaymentsTestMode / canAccessPayments / banner (only used by worldline-config in OLD) |
| `lib/payment/worldline-config.ts` | sandbox/live MID+secret+endpoints by PAYMENTS_TEST_MODE |
| `lib/payment/providers/worldline/{index,types,adapter,digest,xml}.ts` | form fields, 46-field digest, response digest, XML SaleRequest + RecurringOperation Cancel |
| `app/api/payment/worldline/redirect/route.ts` | auto-submit HTML form to Cardlink |
| `app/api/webhooks/worldline/route.ts` | initial payment / recurring child / Modirum S2S; XML advice delegation |
| `app/api/webhooks/worldline/advice/route.ts` | XML advice (recurring children) receiver + GET health |
| `app/api/cron/worldline-renewals/route.ts` | self-managed renewal/retry cron (POST only) |
| `app/payment/callback/{page,callback-redirect}.tsx` | public bounce page after Cardlink |
| `app/(dashboard)/dashboard/promote/page.tsx` | Συνδρομή/Προώθηση page (history, billing form, plan comparison, cancel) |
| `app/(dashboard)/dashboard/promote/subscription-management.tsx` | current plan card (Χρέωση, Επόμενη χρέωση, Ακυρώνεται) |
| `app/(dashboard)/dashboard/promote/cancel-subscription-button.tsx` | cancel dialog |
| `app/(dashboard)/dashboard/promote/success/{page,success-content}.tsx` | post-payment polling page |
| `app/(dashboard)/dashboard/checkout/{page,checkout-content}.tsx` | checkout form (billing, terms, interval, coupon hidden) |
| `components/subscription/{index,subscription-sheet,pricing-selection,plan-comparison,history-pagination,payment-attempts-list}.tsx` | upsell sheet, plan cards, history UI |
| `components/dashboard/services/featured-star-button.tsx` | star toggle UI |
| `lib/subscription/{index,feature-gate}.ts` | getActivePlan / canFeatureService / limits |
| `lib/hooks/use-subscription-gate.ts`, `lib/stores/use-subscription-sheet-store.ts` | sheet open state |
| `lib/validations/subscription.ts` | zod schemas |
| `lib/utils/date.ts` (addBillingCycleDays) | +N calendar days |
| `constants/email/templates/subscription-payment.ts`, `constants/email/email-config.ts` (SUBSCRIPTION_PAYMENT), `lib/email/services/admin-emails.ts` (sendSubscriptionPaymentEmail) | admin payment email |
| `lib/prisma/schema/subscription.prisma` | schema (unique constraints!) |
| `constants/datasets/subscription-types.ts` | empty file (0 lines) |
| `vercel.json` | cron list (worldline-renewals 0 6 * * *) |
| `components/dashboard/dashboard-sidebar.tsx` (Πακέτο Προβολής block only) | promote nav link |

### NEW files read
- Backend: `apps/billing/{admin,apps,tasks}.py`, `models/{__init__,subscription,payment_attempt}.py`,
  `services/{providers,worldline,advice,subscription_ops,renewals,pricing,record_attempt}.py`,
  `selectors/subscription_selectors.py`, `urls/{public,admin,payment_routes}.py`,
  `views/public/billing.py`, `views/admin/billing.py`,
  `management/commands/backfill_payment_columns.py`, migration 0001 (unique flags);
  `config/settings/base.py` (WORLDLINE, PAYMENTS_*, CELERY_BEAT_SCHEDULE), `backend/.env.example`,
  `apps/messaging/emails.py` (send_subscription_payment_email, _admin_email, send_email, _format_amount_el),
  `apps/messaging/tasks.py` (task wrapper), `apps/profiles/signals.py`, `apps/profiles/services/cache.py`,
  `apps/accounts/permissions/roles.py`, `common/exceptions.py` (envelope), `apps/services/selectors/service_reads.py` (_PLAN_LIMITS/_can_feature_more).
- Frontend: `actions/subscription/*` (incl. new `get-payment-attempts.ts`), `lib/api/billing.ts`,
  `lib/api/client.ts` (ApiError), `app/api/{payment/worldline/redirect,webhooks/worldline,webhooks/worldline/advice,cron/worldline-renewals,payments/check-access}/route.ts`,
  `app/payment/callback/*`, `app/(dashboard)/dashboard/{promote,promote/success,checkout}/*`,
  `components/subscription/*`, `components/dashboard/services/featured-star-button.tsx`,
  `components/dashboard/dashboard-sidebar.tsx`, `lib/payment/{pricing,coupons,test-mode}.ts`,
  `lib/subscription/feature-gate.ts`, `lib/hooks/{use-payments-access,use-subscription-gate}.ts`,
  `lib/stores/use-subscription-sheet-store.ts`, `lib/cache/revalidation.ts` (revalidatePublicService),
  `actions/profiles/billing.ts`, `components/forms/profile/form-billing.tsx` (diff), `frontend/vercel.json`, root `vercel.json`.

### Delegated elsewhere
| Old file | Owning domain |
|---|---|
| `actions/admin/subscriptions.ts`, `app/(admin)/admin/subscriptions/**`, `components/admin/subscriptions/**` | admin (I only verified the status/delete featured-coupling in `subscription_ops.admin_*`, which matches) |
| `actions/profiles/billing.ts`, `components/forms/profile/form-billing.tsx`, `actions/admin/profiles/billing.ts` | profiles (billing-info form). One copy diff noted in D14 because the form is embedded on the promote page |
| `actions/services/{create,update,get-user-services,refresh}-service.ts` (`canCreateService` / `getPlanLimits` / `canFeatureMore` usage), `components/forms/service/steps/oneoff-subscription-step.tsx` | services |
| `lib/hooks/chat/use-chat-*-subscription.ts` | messaging (realtime "subscription", unrelated to billing) |
| `components/icon/fa/icon-paper-plane.jsx` | not billing (name match only) |
| Archive/home ranking that consumes `profile.featured` | archives/home domain |

## 2. Mapping (old → new)

| OLD | NEW frontend | NEW Django | NEW page/UI |
|---|---|---|---|
| `createCheckoutSession` | `actions/subscription/create-checkout-session.ts` | `POST /api/billing/checkout` → `subscription_ops.create_checkout` → `providers.worldline_create_checkout` → `worldline.build_checkout_form_fields` | `dashboard/checkout` (identical checkout-content) |
| `cancelSubscription` | `cancel-subscription.ts` | `POST /api/billing/subscription/cancel` → `providers.cancel_subscription` → `worldline_cancel` / `cancel_recurring` | promote `CancelSubscriptionButton` (identical) |
| `restoreSubscription` | `restore-subscription.ts` | `POST /api/billing/subscription/restore` | no UI in either |
| `getSubscription` | `get-subscription.ts` | `GET /api/billing/subscription` (`_row`) | promote, success, checkout pages |
| direct prisma attempts query (promote page) | `get-payment-attempts.ts` | `GET /api/billing/subscription/payments?page=` | promote "Τελευταίες χρεώσεις" |
| `syncSubscriptionBilling` | `sync-billing.ts` | `POST /api/billing/sync` | success page |
| `toggleFeaturedService` | `toggle-featured-service.ts` | `POST /api/billing/services/{id}/featured/toggle` | featured-star-button |
| `validateCoupon` | `validate-coupon.ts` | `POST /api/billing/coupons/validate` (AllowAny) | checkout (coupon input hidden in both) |
| `api/payment/worldline/redirect` GET | Next proxy route | `WorldlineRedirectView` | — |
| `api/webhooks/worldline` POST | Next proxy route | `WorldlineWebhookView` → `subscription_ops.handle_worldline_webhook` | — |
| `api/webhooks/worldline/advice` POST/GET | Next proxy route | `WorldlineAdviceWebhookView` → `advice.handle_worldline_advice` | — |
| `api/cron/worldline-renewals` POST | Next proxy (GET+POST) | `WorldlineRenewalsCronView` (GET+POST) + Celery task (beat entry commented out) → `renewals.run_worldline_renewals` | — |
| (none) | `api/payments/check-access` proxy + `usePaymentsAccess` | `PaymentsCheckAccessView` | sidebar, sheet, star, checkout gating (NEW) |
| `sendSubscriptionPaymentEmail` | — | `subscription_ops._notify_subscription_payment` → `messaging.tasks/emails.send_subscription_payment_email` | — |

## 3. DIFFERENCES (the deliverable)

### D1. Initial-payment activation sets the UNIQUE `providerCustomerId` to the merchant MID → second subscriber's activation crashes — CRITICAL
- OLD: `webhooks/worldline/route.ts:288-341`. `providerCustomerId: params.mid` is only in the upsert **create** branch. Because `PaymentService.createCheckout` (`service.ts:59-78`) always pre-creates the row, the webhook always takes the **update** branch, which never touches `providerCustomerId`. In practice it stays NULL for every subscription.
- NEW: `subscription_ops.py:471` runs `sub.provider_customer_id = params.get("mid") or sub.provider_customer_id` on **every** successful initial payment, update branch included. The column is `@unique` in Prisma (`subscription.prisma:53`) and `unique=True` in Django (`migrations/0001_initial.py:22`). The MID is the same merchant id for every customer.
- Impact: the first subscriber stores the MID. The next different profile that pays fails with an IntegrityError inside `transaction.atomic()` (`subscription_ops.py:463-511`), and the webhook returns 500. Cardlink has already captured the money and scheduled the recurring charges. The subscription stays `incomplete` and the profile is not featured. No attempt row or admin email is written. Because `worldline_master_order_id` was never saved, every later recurring advice for that customer returns 404 "subscription not found" and is lost. Every retry or background confirmation fails the same way.
- Possibly intentional?: no. Fix: don't set `provider_customer_id` on update (match OLD), or never store the MID there.

### D2. `PAYMENTS_TEST_MODE` defaults to True in Django; OLD treated unset as live. FE and BE also read different env vars — HIGH (config/money)
- OLD: `test-mode.ts:14-16` uses `process.env.PAYMENTS_TEST_MODE === 'true'`, so unset means **live** credentials and production endpoints (`worldline-config.ts:38-58`). OLD had no UI gating anywhere: no check-access route, and the sidebar/sheet/star/checkout were always shown to pros.
- NEW: `config/settings/base.py:20,469` uses `PAYMENTS_TEST_MODE` default **True**, so unset means sandbox endpoint + TEST_MID. The new gating is in two places:
  - `PaymentsCheckAccessView` (`views/public/billing.py:178-216`), driven by Django's setting plus the new `PAYMENTS_ENABLED` kill-switch. The sidebar "Πακέτο Προβολής" link (`dashboard-sidebar.tsx:178`), `subscription-sheet.tsx:38-43` and `featured-star-button.tsx:47-51` hide for non-admins when not allowed.
  - The checkout page (`checkout/page.tsx:43-51`), which uses the **frontend** `process.env.PAYMENTS_TEST_MODE` (default false) and redirects to `/dashboard` when not allowed.
- Impact: if the Django env omits `PAYMENTS_TEST_MODE=false` in production, real users are sent to the Cardlink sandbox. Non-admin pros also lose the Προώθηση sidebar link, the upsell sheet and the star button. The checkout page, which reads the FE var, may still let them in, so the gates are inconsistent. `PAYMENTS_ENABLED=false` hides everything with the English reason "Payments are temporarily disabled".
- Possibly intentional?: the gating is partly intentional (the instructions mention `test-mode.ts` gating). The inverted default and the split FE/BE source are not. Verify the prod env sets `PAYMENTS_TEST_MODE=false` on BOTH services.

### D3. Webhook proxy (Next → Django) drops User-Agent and follows Django's 302 — HIGH (verify)
- OLD: Cardlink POSTed straight to the Next route. The browser got `302 /payment/callback?...`, and Modirum S2S (detected via `user-agent` containing "Modirum") got JSON (`route.ts:60-61,195-245`).
- NEW: `confirmUrl`/`cancelUrl` default to `{FRONTEND_BASE_URL}/api/webhooks/worldline` (`providers.py:56-58`, unless `WORLDLINE_RETURN_URL` is set). The Next proxy (`frontend/src/app/api/webhooks/worldline/route.ts:24-39`) forwards only Content-Type, not User-Agent, and uses default `fetch`, which follows redirects (`redirect:'manual'` is used elsewhere, e.g. `api/auth/[...all]/route.ts:29`, but not here).
  - `is_s2s` is therefore always False (`views/public/billing.py:300-301`). Modirum background confirmations get the browser branch, and the digest-mismatch "already processed" JSON ack never triggers.
  - The browser no longer gets a 302. The server-side fetch follows Django's redirect, so the browser receives a **200 with the HTML of `/payment/callback`** rendered at URL `/api/webhooks/worldline`. It probably still works by accident (the client component then does `window.location.href=...`), but it is fragile, and the status/redirect semantics differ from OLD.
- Impact: post-payment navigation depends on Next hydrating a page under a foreign URL. S2S acknowledgements are now HTML instead of JSON.
- Possibly intentional?: no. Fix: forward `user-agent` and use `redirect:'manual'`, passing `Location` through, or point Cardlink straight at Django.

### D4. Featured flag changes from payment events bypass Django cache invalidation — HIGH
- OLD: every activation, renewal and failure called `revalidateProfile({... includeHome:true, includeServices:true})` (`route.ts:370-380,491-501,558-568`; `advice/route.ts:260-270,326-336`), so archives/home reflected `featured` immediately.
- NEW: `_revalidate_featured` (`subscription_ops.py:283-290`) and `renewals._set_featured` (`renewals.py:288-295`) use `Profile.objects.filter(...).update(featured=...)`, a queryset update that sends no `post_save`. The only purge is the `post_save` signal in `apps/profiles/signals.py` (whose docstring itself says writes must never use `.update()`). Nothing in billing calls `invalidate_profile_caches`, and no Next tag revalidation runs after webhooks.
- Impact: after paying, a pro's featured placement stays invisible in directories for up to 2 h (`profiles:directory:*` TTL), on home for 5 min (`core:home`), and on the profile page for 30 min. The same delay applies to un-featuring after a failed renewal. Admin status/delete (`admin_update_status`/`admin_delete`) have the same `.update()` pattern, although OLD admin did not revalidate either.
- Possibly intentional?: no.

### D5. Cancel (and toggle) error messages are English instead of the OLD Greek texts — MEDIUM
- OLD (`cancel-subscription.ts:57-75`, `restore-subscription.ts:52-71`, `create-checkout-session.ts:25-34,54-56,122-131`, `toggle-featured-service.ts:22-63`):
  - 'Απαιτείται επαγγελματικό προφίλ'
  - 'Το προφίλ δεν βρέθηκε'
  - 'Δεν βρέθηκε συνδρομή'
  - 'Δεν βρέθηκε ενεργή συνδρομή'
  - 'Αποτυχία ακύρωσης συνδρομής' (any Cardlink failure)
  - 'Αποτυχία επαναφοράς συνδρομής'
  - 'Η συνδρομή δεν είναι προγραμματισμένη για ακύρωση'
  - 'Ο πάροχος πληρωμών δεν έχει ρυθμιστεί'
  - 'Αποτυχία δημιουργίας συνεδρίας πληρωμής'
  - 'Μη έγκυρα δεδομένα'
  - 'Η υπηρεσία δεν βρέθηκε'
  - 'Έχετε φτάσει το μέγιστο αριθμό προβεβλημένων υπηρεσιών'
- NEW: the frontend actions pass `ApiError.message` straight through (`actions/subscription/*.ts`), and Django raises:
  - "Required role missing." (`accounts/permissions/roles.py:33`)
  - "Profile missing" (`subscription_ops.py:32`)
  - "No subscription found" (`:106,115`, `providers.py:297`)
  - "No active subscription found" (`providers.py:143`)
  - "Worldline cancel failed: <STATUS> - <msg>" (`providers.py:146-149`, 502)
  - "Worldline does not support restoring…" (`providers.py:154-157`)
  - "Subscription is not scheduled for cancellation" (`providers.py:299-302`)
  - "Worldline not configured" / "No payment provider configured" (`providers.py:50,266`)
  - "One or more fields are invalid." (serializer errors)
  - "Service not found" (`subscription_ops.py:226`)
  - "Max 3 featured services per profile" (`:238-243`)
  - "Active promoted subscription required" (`:219-222`)
- Impact: users see English or technical gateway text in toasts. The star button only special-cases the featured-limit text (`featured-star-button.tsx:82-87`).
- Possibly intentional?: no.

### D6. Unfeaturing a service now requires an active promoted subscription — MEDIUM
- OLD: `toggle-featured-service.ts:50-56`. If the service is already featured, it is unfeatured with no plan check. The only other gate is ownership + `status==='published'` (checked for both directions, `:46-48`).
- NEW: `subscription_ops.py:218-222` raises 403 "Active promoted subscription required" before anything else, in both directions. The published check runs only when featuring (`:229-233`).
- Impact: a pro whose subscription went `past_due`/canceled (services keep `featured=true` in both stacks) can no longer remove the star; they get an English error toast. Conversely, a featured service that became unpublished can now be unfeatured, which OLD refused.
- Possibly intentional?: no.

### D7. Cancel does not refresh the promote page — MEDIUM (verify in browser)
- OLD: the `cancelSubscription` server action calls `revalidateProfile` → `revalidateTag(...)` (`cancel-subscription.ts:42-49`, `lib/cache/revalidation.ts:139-166`). A server action that revalidates re-renders the current route, so the "Ακυρώνεται" badge and amber notice appear and the cancel CTA disappears right after the toast.
- NEW: `frontend/src/actions/subscription/cancel-subscription.ts` does no revalidate, and the button (`promote/cancel-subscription-button.tsx`, identical) does no `router.refresh()`.
- Impact: after a successful cancel the page still shows "Ενεργό" and the "Ακύρωση Συνδρομής" button until a manual reload. A second click sends another Cardlink cancel, which will likely fail and show an English 502 message (D5).
- Possibly intentional?: no.

### D8. "Χρέωση" on the subscription card shows the gross charged amount, not OLD's fixed net price — MEDIUM
- OLD: `subscription-management.tsx:60` shows `'180€/έτος'` / `'20€/μήνα'` (hard-coded net prices).
- NEW: `subscription-management.tsx:60-74` shows `subscription.amount` in euros, e.g. "223,20€/έτος", "24,80€/μήνα", "111,60€/έτος" with WELCOME50. It falls back to 22320/2480 when `amount` is null, so admin-created manual subscriptions (no payment) show "223,20€/έτος".
- Impact: the visible price differs from OLD and from plan-comparison/checkout copy (which still say 20€/15€/180€).
- Possibly intentional?: possibly (looks like a deliberate "show what was charged" change). Confirm with the user.

### D9. Cancel works for manual/legacy subscriptions where OLD errored — MEDIUM
- OLD: `service.ts:95-104`. Manual subscriptions have no `providerSubscriptionId`, so the user gets 'Δεν βρέθηκε ενεργή συνδρομή'. A provider without an adapter ('manual', 'stripe') gives `ProviderNotConfiguredError` ('Ο πάροχος πληρωμών δεν έχει ρυθμιστεί'). Only worldline subscriptions were cancellable.
- NEW: `providers.py:269-287`. Manual makes no external call and sets `cancel_at_period_end=True` + `canceled_at`. Stripe makes a best-effort call and sets the flags.
- Impact: a pro with an admin-granted subscription can now "cancel" it. The UI then shows "Ακυρώνεται" with an expiry date, but nothing ever expires it (see D10).
- Possibly intentional?: possibly a fix. Report to the user.

### D10. `_expire_canceled_subscription` (cancel-at-period-end → free + un-feature) is effectively dead code; HTTP cron path still live — MEDIUM
- OLD: no expiry logic anywhere. A `cancelAtPeriodEnd` subscription stays `active`/featured forever, even though the card copy says "Μετά τη λήξη, θα επιστρέψετε στο Βασικό πακέτο" (`subscription-management.tsx:79-83`). The OLD cron (`cron/worldline-renewals/route.ts`) only exports **POST**, while Vercel crons call **GET**, so in practice it never ran in production.
- NEW: expiry lives only in `renewals.run_worldline_renewals` (`renewals.py:95-119,262-272`), which runs only via the cron.
  - The Celery beat entry is commented out (`base.py:331-341`, intentional).
  - Net behavior matches OLD: canceled subscriptions never expire, and the promised downgrade never happens.
  - However, `WorldlineRenewalsCronView` and the Next proxy accept **GET and POST** (`views/public/billing.py:411-415`, `frontend/src/app/api/cron/worldline-renewals/route.ts:16-22`), and `frontend/vercel.json` still lists `/api/cron/worldline-renewals` at `0 6 * * *`. If the frontend is ever deployed on Vercel with `CRON_SECRET`, that GET would run the full renewal path: XML SaleRequest charges on top of Cardlink's scheduled recurring (the double-billing the beat comment warns about), and past_due flips on rejection.
  - `CELERY_BEAT_SCHEDULER` is the DatabaseScheduler, so a previously-persisted `billing-process-worldline-renewals` row could still be enabled in `django_celery_beat` even though the dict entry is commented out (not verifiable from code).
- Possibly intentional?: disabling the cron is intentional. Note: the expiry fix is unreachable, and the GET/HTTP trigger is a live hazard OLD didn't have.

### D11. Advice period anchoring differs from OLD — MEDIUM (possibly intentional)
- OLD: `advice/route.ts:217-239`. `newPeriodStart = currentPeriodEnd || now`, `newPeriodEnd = start + 30/365`, and the period always advances.
- NEW: `advice.py:292-321` anchors on `max(stored_end, <Message timeStamp>)` and, when the charge timestamp is before `current_period_start`, treats it as "historical": the payment is counted and recorded, but the period is not moved. The override-days knob is intentional and not reported.
- Impact: after missed/late advices NEW self-heals to a future date, where OLD could leave a period already in the past. "Επόμενη χρέωση" can differ between stacks for the same advice sequence.
- Possibly intentional?: likely (self-healing). Confirm.

### D12. Advice digest accepts several C14N variants; response digest ignores `_charset_`/`submitButton` — LOW (possibly intentional)
- OLD: advice compares only the raw `<Message>…</Message>` substring (`advice/route.ts:110-126`). The form webhook digests ALL non-`digest` fields in POST order (`digest.ts:40-58`).
- NEW: `advice._build_digest_candidates` tries 6 variants (`advice.py:122-176,199-215`). Its docstring cites an OLD `buildDigestCandidates`, which does **not** exist in the `oldnext` copy. `worldline.validate_response_digest_from_items` skips `_charset_` and `submitButton` (`worldline.py:120-130`).
- Impact: more permissive verification. It is still secret-bound, so this is not a security hole, but it is a behavioral difference.
- Possibly intentional?: yes, likely a production fix. The audited OLD copy predates it.

### D13. Webhook edge paths differ — LOW
- Missing shared secret:
  - OLD: browser → `error=config` (`route.ts:121-125`).
  - NEW: treated as a digest failure → browser `error=security` / S2S 400 (`providers.py:127-132`).
- Non-form Content-Type from a non-Modirum client:
  - OLD: redirects `error=payment` (`route.ts:94-97`).
  - NEW: parses the body anyway (`views/public/billing.py:321-336`).
- Duplicate form keys:
  - OLD: `formData.get` takes the first.
  - NEW: dict comprehension takes the last (`:338`).
- `firstPaymentAt`:
  - OLD: set only on create (practically never set).
  - NEW: set when null (`subscription_ops.py:500-501`).
- Cancel order id:
  - OLD: `providerSubscriptionId` only.
  - NEW: falls back to `worldline_master_order_id` (`providers.py:141`).
- Possibly intentional?: mostly yes (documented in comments), except the missing-secret path.

### D14. Promote-page billing form success copy differs — LOW
- OLD: `actions/profiles/billing.ts:133` shows 'Τα στοιχεία τιμολόγησης ενημερώθηκαν επιτυχώς!'. Empty fields are stored as `''`.
- NEW: `frontend/src/actions/profiles/billing.ts:22` shows 'Τα στοιχεία χρέωσης ενημερώθηκαν'. Empty fields are sent as `null`, which flows into the `subscription.billing` snapshot.
- Delegated for deeper review to the profiles domain.

### D15. Admin payment email differs from OLD template/config — LOW
- OLD: `email-config.ts:166-174`, `subscription-payment.ts`, `admin-emails.ts:440-540`:
  - subject `"{Νέα Συνδρομή|Ανανέωση Συνδρομής} - {name} ({userEmail}) - {amount}"`
  - from `Admin Doulitsa <noreply@doulitsa.gr>`
  - Brevo tag `subscription_payment`, plus attributes PROFILE_NAME/USER_EMAIL/PLAN/AMOUNT/PAYMENT_TYPE
  - dedicated plain-text body, date formatted `toLocaleString('el-GR')`
  - two buttons (Προβολή Συνδρομής + outlined Προβολή Προφίλ), footer "® Doulitsa, 2026"
- NEW: `messaging/emails.py:404-474`:
  - subject `"{type}: {name} — {amount}"` (no user email)
  - from DEFAULT_FROM_EMAIL (`BREVO_SENDER_EMAIL`, default `noreply@example.com`)
  - tag `subscription-payment`, no attributes
  - text = tag-stripped HTML, date printed as a raw ISO string
  - profile link is a plain text link, not a button
- Trigger set matches OLD: initial success + every renewal (classic child, advice, cron). Recipient is `ADMIN_NOTIFICATION_EMAIL || ADMIN_EMAIL || contact@doulitsa.gr`. No user-facing payment emails in either stack.
- Possibly intentional?: no (copy/format drift).

### D16. Coupon / validation copy — LOW (coupon UI hidden in both: `COUPON_INPUT_VISIBLE=false`)
- Invalid coupon:
  - OLD: 'Μη έγκυρο κουπόνι'.
  - NEW: the FE remaps `invalid_coupon` to 'Άκυρο κουπόνι' (`validate-coupon.ts:17-19`). Checkout still returns 'Μη έγκυρο κουπόνι' from Django.
- Empty code:
  - OLD: 'Εισάγετε κωδικό κουπονιού'.
  - NEW: DRF `CharField` rejects blank first with "One or more fields are invalid.", so `views/public/billing.py:101-102` is unreachable.

### D17. Checkout pre-writes `subscription.billing = profile.billing or {}` — LOW
- OLD: `service.ts:59-78` doesn't touch `billing` at checkout. The success-page `syncSubscriptionBilling` copies it only when NULL.
- NEW: `subscription_ops.py:70-73` sets it at checkout, `{}` when the profile has none. The webhook overwrites it later anyway.
- Impact: the sync fallback becomes a no-op (billing is `{}` instead of NULL). Failed/abandoned checkouts leave a snapshot that OLD wouldn't have.

### D18. Payment-history page clamping — LOW
- OLD: `promote/page.tsx:37-56` queries `skip=(requested-1)*10` and clamps only the displayed page number, so `?historyPage=99` shows an empty list.
- NEW: `subscription_ops.list_payment_attempts` clamps before querying, so the last page is shown.

### D19. Payment callback navigation uses full page loads — LOW (possibly intentional)
- OLD: `callback-redirect.tsx` uses `router.replace(...)`, so the callback page is replaced in history.
- NEW: uses `window.location.href = ...` (comment: refresh the session after the cross-site round-trip), so the callback page stays in history and Back re-triggers the bounce.
- Possibly intentional?: yes (session-cache fix).

### D20. Config hazard: WORLDLINE_BASE_URL/API_URL override wins over test/live endpoints — LOW/verify
- OLD: endpoints are hard-coded per mode (`worldline-config.ts:19-28`).
- NEW: `worldline.py:70-72` uses `cfg["BASE_URL"] or endpoint`. `backend/.env.example:56-57` ships `WORLDLINE_BASE_URL=WORLDLINE_API_URL=https://www.cardlink.gr/sandbox/uiform`, which is neither Cardlink endpoint OLD used. Generic `WORLDLINE_MERCHANT_ID/SHARED_SECRET` also back-fill BOTH test and live (`:58-65`).
- Impact: if the example values reach a real env, the checkout form posts to the wrong URL, or live mode silently uses the generic/test credentials. Verify the deployed env leaves BASE_URL/API_URL empty.

## 4. Confirmed same
- Plans/pricing: free 3 services / 0 featured; promoted 15 services / 3 featured / auto-refresh. Gross 24.80 / 223.20, net 20/180, VAT 24%. WELCOME50 = 50% off annual promoted only, same rounding (111.60 gross). `lib/payment/{pricing,coupons}.ts` are byte-identical apart from imports; `pricing.py` matches.
- Checkout form fields and the 46-field digest order. Specifically: version 2, lang el, deviceCategory 0, `orderid` = `DOL{alnum pid}{base36 ms}` truncated to 50 chars, the same orderDesc text, `trType 1`, `extRecurringfrequency` 30/365, `extRecurringenddate` = now+1825d (UTC, YYYYMMDD), confirm=cancel URL, `extTokenOptions 100`, var1..var4, phone formatting (+30), address line1/country GR. Base64url session to the redirect page, and the same auto-submit HTML texts.
- Already-active guard ('Έχετε ήδη ενεργή συνδρομή'), coupon interval check ('Το κουπόνι ισχύει μόνο για ετήσια συνδρομή'), and the pending row upsert (provider_subscription_id = orderId, billing_interval, discount fields).
- Initial-payment state transition (apart from D1):
  - Idempotency on an active orderid, and recovery of profile/interval/coupon from the pending row.
  - Plan on update is always promoted; status active.
  - Period = now + 30/365 days; cancel flags reset.
  - Billing snapshot, amount/currency/method fields, payment_count/total increments.
  - `profile.featured=true`; attempt row `initial`/seq 1; admin email.
- Failed initial: attempt recorded only when a pending row exists; status unchanged. CANCELED → `canceled=true`, otherwise `error=payment`. The S2S JSON bodies match (subject to D3).
- Recurring child via the classic webhook (Sequence≥2) and via advice:
  - Master id lookup (strip "/N"), and 404 when not found.
  - Success: active, period from stored end (classic), payment_count+1, amount, `cancel_at_period_end=false`/`canceled_at=null` (OLD also cleared these), featured=true, attempt `recurring_child`, admin renewal email.
  - Failure: `past_due` + featured=false + attempt row. Advice failure still returns 200.
  - Advice TxId idempotency; non-Recurring advice types acknowledged; MID mismatch only warns; malformed advice → 400, missing secret → 500, missing OrderId → 400; GET health JSON identical.
  - XML advice posted to the classic URL is delegated (body starts with `<`).
- Cancel flow (Worldline): Cardlink `RecurringOperationRequest/Cancel` XML is identical (canonical Message with namespaces, attribute order, offset timestamp, digest). A non-CANCELED reply aborts without a DB write. On success only `cancel_at_period_end` + `canceled_at` change; status stays active.
- Restore: always fails for worldline; the precondition checks are the same.
- Promote page structure, texts and conditions:
  - Header "Προώθηση / Διαχείριση επιλεγμένου πακέτου προβολής."
  - Free card when there is no subscription, the plan is free, or the status is canceled.
  - "Ενεργό" / raw status badge, "Ακυρώνεται", "Επόμενη χρέωση" = currentPeriodEnd (el-GR).
  - History card only when active, with the (N) count, newest first, 10/page; billing form when active; PlanComparison with the cancel CTA hidden while canceling.
- Cancel dialog texts and the success toast; the success page polling (12×5 s) and its texts; the callback page text "Ολοκλήρωση πληρωμής..." and its routing targets; `checkout-content.tsx` is identical (validation messages, terms, prices 20€/15€/180€); sheet/plan-comparison/pricing-selection/history-pagination are identical apart from the gating in D2.
- Featured-service limit counts all of the profile's `featured=true` services against max 3, the same as OLD.
- Sync-billing logic (only when the subscription billing is NULL, with a verify step).
- Admin status/delete featured coupling (promoted only; active→true, canceled→false; delete→false) and manual create guards. Deeper admin parity is delegated.
- Intentional, not reported: override-days knob, disabled renewals beat, `backfill_payment_columns`, `_attempt_fallbacks`/`_row` max-merge, and the XML SaleRequest namespace fix in `execute_recurring_charge` (cron-only path).

## 5. Open questions / couldn't verify
- D1: confirm on the test DB whether more than one profile has activated (the unique violation needs two different profiles). Check `SELECT "providerCustomerId", count(*) FROM subscriptions GROUP BY 1`.
- D2/D20: actual Dokploy env values (`PAYMENTS_TEST_MODE`, `PAYMENTS_ENABLED`, `WORLDLINE_BASE_URL/API_URL/RETURN_URL`) on both the frontend and backend services.
- D3: whether Cardlink's configured confirm URL points at the Next proxy or straight at Django, and whether Next App Router hydration at `/api/webhooks/worldline` actually completes the bounce. Needs a live sandbox payment.
- D10: whether `django_celery_beat` still has an enabled `billing-process-worldline-renewals` PeriodicTask row from an earlier deploy, and whether anything external calls `/api/cron/worldline-renewals`.
- Both stacks have the same race: browser + S2S CAPTURED for one order processed concurrently can double-increment payment_count, write two attempts and send two emails. The idempotency read is outside the transaction and there is no `select_for_update`. This is parity, not a new bug, but worth noting.
- The advice docs show the master `<OrderId>DOL.../</OrderId>` with a trailing slash. Neither stack strips it before the `worldline_master_order_id` lookup, so if Cardlink really sends the slash, both would 404. Can't verify without a real advice sample.
- Both stacks also share this: a past_due user who re-checks out overwrites `provider_subscription_id`, so a later cancel targets the new order, not the still-scheduled master. Parity; flagged for awareness.
