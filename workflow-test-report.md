# Doulitsa — Workflow Test Report

**App under test:** http://localhost:3010 (Next.js frontend) · Django backend at http://localhost:8800
**Date:** 2026-06-18
**Method:** End-to-end through Chrome (browser automation). Logged in as **papakias222@gmail.com** (a Pro account, display name "Cat Advice"). Backend API was probed only to diagnose two server-side 500s.
**Image uploads:** Skipped everywhere per instructions (uploads disabled). No workflow truly broke from skipping them.

---

## ✅ Fixes applied & verified (2026-06-18)

All bugs below were fixed in code and **re-verified on the running app** after restarting the `frontend` + `backend` containers:

| Bug | Fix | Files | Verified |
|---|---|---|---|
| BUG-1 reset 500 | normalize naive `expires_at` to UTC before compare | `backend/apps/accounts/services/password.py` | reset → 200 "Ο κωδικός επαναφέρθηκε" |
| BUG-2 verify 500 | same datetime normalization | `backend/apps/accounts/services/registration.py` | verify-email → 302 redirect (no 500) |
| BUG-3 coverage can't save / blocks create-service | `address` made `.nullable()` + force `form.trigger()` on each mode toggle | `lib/validations/profile.ts`, `components/forms/profile/form-coverage.tsx` | single "Online" saves; Create Service flows step 1→3 |
| BUG-4 edit-service crash | unwrap `{ service }` payload + defensive status-badge fallback | `app/(dashboard)/dashboard/services/edit/[id]/page.tsx` | edit page renders fully |
| BUG-5 chat wrong side | WS handler falls back `authorUid ?? authorId` | `lib/hooks/chat/use-chat-subscription.ts` | sent message shows on the right immediately |
| BUG-6 chat order inverted | sort combined messages chronologically | `components/messages/messages-container.tsx` | thread chronological after reload |
| MINOR-1 debug panel | removed dev debug block (leaked User ID) | `components/forms/profile/form-basic-info.tsx` | gone |
| MINOR-2 password copy | reset rule 8→6 to match backend | `components/forms/auth/form-reset-password.tsx` | UI says "6 χαρακτήρες" |

> Note: a related untested instance of the same datetime pattern exists at `backend/apps/admin_api/services/api_keys.py:27` (API-key expiry) — worth the same guard if those keys are used.
> Email delivery (Brevo) is not connected, so reset/verify links aren't emailed to real users yet; the flows were verified via the DEBUG dev token. Connecting mail is a separate config task.
> Dev tip: file edits on macOS+Docker don't reach the container watchers, so add `WATCHPACK_POLLING: "true"` to the `frontend` env for automatic hot-reload.

**Still pending:** Admin panel CRUD — requires an account with admin rights (papakias222 is a regular Pro; `/admin*` correctly redirects to `/dashboard`).

---

## Summary table

| Workflow | Status | Notes |
|---|---|---|
| **Public + auth** | | |
| Homepage (`/`) | ✅ PASS | Nav, search, popular searches, cards. No console errors. |
| Service search → archive (`/ipiresies`) | ✅ PASS | Filters, area, online toggle, sort. |
| Service detail (`/s/[slug]`) | ✅ PASS | |
| Profile page (`/profile/[username]`) | ✅ PASS | Contact gated to login modal when logged out. |
| Pro directory (`/directory`) / Categories (`/categories`) | ✅ PASS | |
| Contact form (`/contact`) | ✅ PASS | Submitted → "Το μήνυμά σας εστάλη". |
| Static pages (`/about`,`/faq`,`/terms`,`/for-pros`) | ✅ PASS | |
| Blog (`/articles`, `/articles/[slug]`) | ✅ PASS | |
| Register (`/register`) | ✅ PASS | Test Pro account created → success message. |
| Forgot password (`/forgot-password`) | ✅ PASS | Generic confirmation (no email-existence leak). |
| Reset password — invalid token | ✅ PASS | Correctly rejected ("Μη έγκυρο token"). |
| **Reset password — valid token** | ❌ **FAIL** | **HTTP 500** datetime TypeError (BUG-1). |
| **Email verification** | ❌ **FAIL** | **HTTP 500** same datetime TypeError (BUG-2). |
| Login (`/login`) | ✅ PASS | Validation works; logged in successfully. |
| Dashboard route protection | ✅ PASS | `/dashboard` → `/login` when logged out. |
| **Dashboard (Pro)** | | |
| Dashboard home (`/dashboard`) | ✅ PASS | Stats, shortcuts, recent messages. |
| Profile › Account | ✅ PASS | Display-name save → toast. |
| Profile › Basic | ✅ PASS | Tagline save → toast. (Dev debug panel visible — see MINOR-1.) |
| Profile › Additional | ✅ PASS | Hourly rate + terms save → toast. |
| Profile › Presentation | ✅ PASS | Phone + toggles save → toast. |
| Profile › Verification | ⚠️ RENDERS | Form OK; submission needs docs (uploads disabled), not completed. |
| **Profile › Service modes (`/coverage`)** | ❌ **FAIL** | **Save button stays disabled; cannot save delivery modes (BUG-3).** |
| Services list (`/dashboard/services`) | ✅ PASS | List, counters, search, filters. |
| **Create Service** | ⛔ BLOCKED | Step 1 service-types disabled until a delivery mode is enabled — blocked by BUG-3. |
| **Edit Service (`/edit/[id]`)** | ❌ **FAIL** | **Page crashes — TypeError (BUG-4).** |
| Subscription (`/dashboard/subscription`) | ✅ PASS | Plan compare + billing select; stopped before payment. |
| Checkout (`/dashboard/checkout`) | ✅ PASS (renders) | Billing type, plan toggle, VAT totals. Payment not submitted. |
| Messages (`/dashboard/messages`) | ✅ PASS* | Send works & persists. Two display bugs (BUG-5, BUG-6). |
| Reviews (`/dashboard/reviews`) | ✅ PASS | |
| Saved (`/dashboard/saved`) | ✅ PASS | Services/Profiles tabs. |
| Documents (`/dashboard/documents`) | ⚠️ PLACEHOLDER | "interface will be added here" — feature not built. |
| **Payment / checkout completion** | ⏭️ NOT RUN | Reached the gateway step; not completed (payment not connected, per instructions). |
| **Admin panel** | ⛔ BLOCKED | `/admin*` redirects to `/dashboard` — papakias222 is not an admin (protection works). Needs an admin account. |

Legend: ✅ pass · ❌ fail (bug) · ⚠️ partial/incomplete · ⛔ blocked · ⏭️ intentionally skipped · * pass with caveats

---

## 🔴 Bugs to fix (by priority)

### BUG-1 (HIGH) — Password reset crashes (HTTP 500) on a valid token
`POST http://localhost:8800/api/auth/password/reset` → `TypeError: can't compare offset-naive and offset-aware datetimes`.
Source: `backend/apps/accounts/services/password.py` → `reset_password()`: `if record.expires_at < datetime.now(timezone.utc):` (naive DB value vs aware now). Invalid tokens correctly 400 (they return before this line), so it only fails on a *real* token. No user can complete a reset.

### BUG-2 (HIGH) — Email verification crashes (HTTP 500)
`GET http://localhost:8800/api/auth/verify-email/?token=...` → same `TypeError` (verification path in `apps/accounts/services/registration.py`). Since login issues **no session tokens** to unverified users (`apps/accounts/services/auth.py`), a freshly registered account can never verify and therefore never log in. Same root cause as BUG-1 — fix both together (make `Verification.expires_at` timezone-consistent, e.g. `USE_TZ=True` or `timezone.make_aware`/compare with `utcnow`).

### BUG-3 (HIGH) — Profile › Service modes can't be saved → blocks service creation
`/dashboard/profile/coverage`. Toggling Online / at-my-place / at-client checkboxes enables **Cancel** but the **Save** button stays `disabled=true` (verified via DOM); the change never persists. Because new-service creation requires at least one enabled delivery mode, **`/dashboard/services/create` step 1 has both service-type options permanently disabled** ("ενεργοποιήστε το από τη Διαχείριση Προφίλ (Τρόποι Παροχής)") and the wizard can't proceed. So this one form bug blocks the entire create-service flow. Fix the Save button's enabled/dirty condition on the coverage form.

### BUG-4 (HIGH) — Edit Service page crashes
`/dashboard/services/edit/1080` → `Runtime TypeError: Cannot read properties of undefined (reading 'bg')` at `src/app/(dashboard)/dashboard/services/edit/[id]/page.tsx:83` (`EditServicePage`): `StatusColors[service.status].bg`. `StatusColors[service.status]` is `undefined` because the service's status value (pending / "Σε Αναμονή") isn't a key in the `StatusColors` map. Page fails to render → services can't be edited. Add a guard/default and ensure all status values are mapped.

### BUG-5 (MINOR) — Outgoing chat message renders on the wrong side
In `/dashboard/messages`, a just-sent message appears as a left/grey **received** bubble; only after reload does it correctly show right/green as sent. Optimistic-render uses wrong author alignment.

### BUG-6 (MINOR/MEDIUM) — Message thread order inverted after reload
After reload, the newest ("Σήμερα") message group renders **above** the older ("13 Ιουνίου") group instead of below. The live view ordered correctly; the reloaded/persisted order is flipped.

### MINOR-1 (DEV) — Debug panel shipped in Profile › Basic
`/dashboard/profile/basic` renders a visible debug block: `isValid / isDirty / Category Value / Subcategory Value / Username / User ID / Errors`. Remove before production (also leaks the User ID in the UI).

### MINOR-2 — Inconsistent password-length copy
Reset-password UI says "Τουλάχιστον 8 χαρακτήρες" but the backend enforces **6** (login/register say 6). Align the message.

---

## ⛔ Coverage gaps (need your input)

- **Admin panel** — `/admin` and `/admin/users` redirect to `/dashboard` because papakias222 has no admin role (this is correct protection). To test admin CRUD (users, profiles, services, reviews, articles, taxonomies, subscriptions, verifications, analytics) I need an **account with admin rights**.
- **Payment completion** — intentionally not run (payment not connected, per your instruction). The flow is reachable up to the gateway/checkout step.
- **Create-service steps 2–5** — unreachable until BUG-3 is fixed (or a delivery mode is enabled in the DB).
- **Service edit** — unreachable until BUG-4 is fixed.

---

## Notes
- Pre-existing test data observed (not bugs): a service titled "Re-run canonicalize_taxonomies…", display name "Cat Advice (Cat truths)aaaaabb", test conversations (Νίκος Τέστερ, Μαρία).
- A registered test account `qa.testpro.wf@example.com / test12345` was created during the register test; it is unverified (and can't be verified due to BUG-2).
- A browser password-manager extension intermittently hijacked focus on auth fields (an extension quirk, not an app bug); worked around by setting values via the DOM.
