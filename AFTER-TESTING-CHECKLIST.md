# After-Testing Checklist — Worldline Daily-Recurring Test (2026-08-14)

Everything below was set up ONLY to test payments + daily recurring on
https://test.doulitsa.gr. Once testing is confirmed (a second Επιτυχής charge
appears in "Τελευταίες χρεώσεις" the next day), revert the items below before
going anywhere near production.

---

## 1. Dokploy backend env (test server)

| Var | Test value (now) | After testing |
|---|---|---|
| `WORLDLINE_RECURRING_OVERRIDE_DAYS` | `1` (daily charges) | **Remove it** (or set `0`) → real cadence: 30 days monthly / 365 yearly |
| `PAYMENTS_TEST_MODE` | `true` (Cardlink sandbox) | Keep `true` on test. **Production must be `false`** (uses `WORLDLINE_LIVE_MID` / `WORLDLINE_LIVE_SHARED_SECRET`) |
| `PAYMENTS_ENABLED` | `true` | Keep as desired; production launch decision |
| `WORLDLINE_TEST_MID` / `WORLDLINE_TEST_SHARED_SECRET` | `9000011131` / `Cardlink1` | Fine to keep on test — sandbox-only credentials. Never used when `PAYMENTS_TEST_MODE=false` |

Frontend (Dokploy): `PAYMENTS_TEST_MODE` must always match the backend value.

## 2. Local docker-compose.yml

`WORLDLINE_RECURRING_OVERRIDE_DAYS: "1"` is set in the backend service env
(line ~92). Remove the line (or set `"0"`) when done testing locally.

## 3. Cancel the test subscription(s) at CARDLINK — not just the DB

The test payment created a Cardlink-scheduled recurring: **every 1 day until
13/08/2031**. Cardlink keeps charging on ITS schedule regardless of our DB.

- Cancel via the app (Ακύρωση συνδρομής — calls the XML Cancel API), **or**
  cancel the recurring order in the Cardlink test panel.
- Then clean up the test subscription rows / payment attempts for the test
  account if you want a fresh state.

## 4. Cardlink panel (per MID) — when switching to the LIVE MID

The sandbox MID 9000011131 panel URLs now point at the test deployment:

- Confirmation / Cancel URL → `https://test.doulitsa.gr/api/webhooks/worldline`
- Payment/Recurring advice URLs → `https://api-test.doulitsa.gr/api/webhooks/worldline`

For production, the LIVE MID's panel must point at the production domains
(`https://doulitsa.gr/...` + production API host). Also make sure the old
Vercel URL (`doulitsa-git-scrum-64-...vercel.app`) is not referenced anywhere.

## 5. test_user gating

The account nikolaosxchatzinikolaou@gmail.com had `test_user=True` set on the
test server so the Promote page is visible while `PAYMENTS_TEST_MODE=true`.
Unset it (or leave it — it only matters while test mode gating is active):

```bash
python manage.py shell -c "from apps.accounts.models import User; \
User.objects.filter(email='nikolaosxchatzinikolaou@gmail.com').update(test_user=False)"
```

## 6. Code that is TEST-AWARE but safe to keep (no revert needed)

These are permanent improvements — they behave normally when the override is
unset:

- `backend/apps/billing/services/advice.py` — multi-variant C14N digest
  verification, period anchoring, `recurring_override_days()` helper.
- `backend/apps/billing/services/subscription_ops.py` — initial activation and
  recurring-success paths use the override only when > 0.
- `backend/apps/billing/services/worldline.py` — digest-mismatch diagnostic
  log (fires only on failure; keys/hashes/secret fingerprint, no PII).
  Optional: downgrade/remove the verbose log once payments are stable.
- `backend/config/settings/base.py` — `WORLDLINE_RECURRING_OVERRIDE_DAYS`
  setting (defaults to 0 = off).
- Checkout form (`build_checkout_form_fields`) — `extRecurringfrequency` uses
  the override only when set; otherwise 30/365 as before.

## 7. Reminder — disabled cron stays disabled

`billing-process-worldline-renewals` in `CELERY_BEAT_SCHEDULE` is commented
out on purpose: recurring charges come from Cardlink's scheduler via the
advice webhook. Do NOT re-enable it — the merchant's XML API channel does not
allow PAYMENT transactions (Cardlink error O1) and it would double-drive
renewals.

---

**Verification before calling testing done:**
1. Day 2: a second Επιτυχής row appears in Τελευταίες χρεώσεις.
2. Επόμενη χρέωση moved forward by 1 day (advice handler updates the period).
3. Admin subscription-payment email arrived (Brevo) for the recurring charge.
4. After removing the override + redeploy: a NEW test payment shows
   Επόμενη χρέωση +30 days (then cancel it at Cardlink too).
