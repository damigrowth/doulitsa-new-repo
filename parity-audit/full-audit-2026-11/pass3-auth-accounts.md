# Pass 3: auth and accounts, fresh re-audit (2026-11-05)

Scope is the same as auth-accounts.md. I re-derived it with `find`/`ls` over `oldnext/src/actions/auth`, `app/(auth)`, `app/api/auth*`, `app/api/verify-email`, `middlewares/`, `lib/auth`, `components/forms/auth`, `components/guards` and the account and onboarding profile forms.

Before writing, I read every earlier report's findings: SUMMARY, auth-accounts, and all pass2-* reports, including pass2-routes-urls. Only NEW findings are listed here. No code was changed and no git commands were run.

## 1. Coverage

### OLD files read
- **All 18 files in `src/actions/auth/*`**, re-read: login, register, resend, forgot, reset, change-password, delete, update-account, change-username, complete-onboarding, store-oauth-intent, oauth-setup, upgrade-to-pro, update-user-type, maintenance, server, client, index.
- **`lib/auth/config.ts`**, line by line: hooks, Google `mapProfileToUser`, session settings, plugins. Also `lib/auth/client.ts` and `lib/auth/index.ts` (the barrel).
- **Pages:** `app/(auth)/**` (11 files), `app/api/auth/[...all]`, `app/api/auth/exchange-token`, `app/api/verify-email`.
- **Middleware:** `middleware.ts` and every file in `middlewares/*`.
- **Components:** `components/forms/auth/*` (12 files), `components/guards/*`, `components/forms/profile/{account-page-actions,form-account,form-change-password,form-change-username,form-delete-account,form-upgrade-to-pro,form-onboarding,onboarding-form-skeleton}`, `components/shared/auth-required-dialog.tsx`.
- **Libraries:** `lib/stores/authStore.ts` and `lib/validations/{auth,user,profile,shared}.ts`.
- **Files pass 1 never listed:**
  - `lib/utils/auth-error-handler.ts` (`handleAuthError`): dead code with zero importers, so nothing to compare.
  - `lib/types/auth.ts`: types only.
  - `lib/prisma/schema/auth.prisma`: belongs to the schema domain (pass2-schema-db).
- **Old library behaviour:** checked in the better-auth 1.3.28 dist found at `~/Desktop/advanza/templates/dashboard-template/node_modules/better-auth` (`verifyEmail`, `deleteUser`, `freshSessionMiddleware`, rate-limit defaults).

### NEW files read
- **Frontend actions:** all 19 files in `frontend/src/actions/auth/*`.
- **Frontend libraries:** `lib/auth/{client,cookies}.ts`, `lib/api/auth.ts`, `lib/api/client.ts` (the refresh path), `lib/stores/authStore.ts`.
- **Frontend middleware:** `middleware.ts` and `middlewares/{withSimpleAuth,withTokenRefresh,index}.ts`.
- **Frontend routes:** `app/api/auth/{oauth/google/login,callback/google}/route.ts`, `app/api/verify-email/route.ts`.
- **Frontend pages and components:** every `(auth)` page, the dashboard layout, the account page, and every form or guard above, diffed against old.
- **Backend `apps/accounts`:**
  - `urls/public.py`, `serializers/auth.py`
  - `views/public/{auth,account,oauth,oauth_setup,onboarding}.py`
  - `services/{auth,registration,password,account,oauth,google_oauth}.py`
  - `selectors/users.py`, `models/{user,pending_registration}.py`
- **Other backend code:** `common/throttling.py`, the `SIMPLE_JWT` block in `config/settings/base.py`, `apps/profiles/services/profile_updates.py` (`sync_account_to_profile`, `sync_username_to_profile`, `ensure_profile_exists`, the image branch of `update_basic_info`).
- **DRF behaviour:** confirmed by running it (stock DRF, run read-only inside an unrelated local container that has DRF installed):
  - `ChoiceField(choices=('freelancer','company'))` with `"user"` gives `"user" is not a valid choice.`
  - `CharField` trims `' abc123 '` to `'abc123'`.

### Delegated elsewhere
- `prisma/schema/auth.prisma` and allauth tables: owned by pass2-schema-db.
- `ws-token` and the chat header's `firstName`: owned by messaging.
- Throttle keying and XFF: owned by lib-shared-sweep D11/D12.

## 2. Mapping
Unchanged from auth-accounts.md §2, which I re-verified.

## 3. DIFFERENCES (new only)

### P3-D1. Simple-user Google signup can never finish: the setup call is always rejected, so the user is stuck on /oauth-setup — CRITICAL (auth)
- **OLD:**
  - `form-oauth-setup.tsx` auto-submits simple users with `role='user'`, `type='user'` and an email-derived username.
  - `actions/auth/oauth-setup.ts:98-104` accepts a `role` in `['user','freelancer','company']` and moves the step to DASHBOARD (:77).
  - The user lands on /dashboard.
- **NEW:**
  - The same form (`frontend/src/components/forms/auth/form-oauth-setup.tsx:174-186`, and also `handleSimpleUserSubmit` :204-212) still appends `role='user'`.
  - `frontend/src/actions/auth/oauth-setup.ts:14,20` forwards it (`role: role || undefined`, which stays `'user'`).
  - Django `OAuthSetupSerializer.role = ChoiceField(choices=("freelancer","company"), required=False, allow_null=True)` (`backend/apps/accounts/views/public/oauth_setup.py:29`) rejects it with `"user" is not a valid choice.` I verified this with real DRF. The response is HTTP 400 with "One or more fields are invalid.".
  - The service code that would map simple users to `UserRole.USER` (`services/oauth.py:74`) is never reached.
- **Which flows are hit:** both simple-user Google flows.
  - Register with Google as "Χρήστης": intent `type=user`, then OAUTH_SETUP.
  - "Σύνδεση με Google" from /login as a new user: TYPE_SELECTION, then Απλό Προφίλ (`update_user_type` sets OAUTH_SETUP), then the same auto-submit.
- **Impact:**
  - The page shows the "Ολοκλήρωση εγγραφής..." spinner forever, plus a red English "One or more fields are invalid." alert.
  - The step stays OAUTH_SETUP. `requireOnboardingComplete` (`actions/auth/server.ts` `getSetupRedirect`) sends every dashboard visit back to /oauth-setup, so the account is unusable.
  - The only way out is an admin changing the step.
- **Fix:** the frontend should send no role for `type=user` (`role: type === 'pro' ? role : undefined`), or the serializer should accept `"user"` and ignore it for simple users.
- **Possibly intentional?:** no. The pro path works, so QA probably exercised only the pro signup (see the "QA 2026-10" comment in the same form).

### P3-D2. Refresh-token rotation race: two simultaneous requests after the 15-minute access expiry log the user out — MEDIUM (auth/session)
- **OLD:** one better-auth session cookie (7 days, `updateAge` extension). Concurrent requests never invalidate it. Opening several tabs at once is always fine.
- **NEW:**
  - `withTokenRefresh` (`frontend/src/middlewares/withTokenRefresh.ts:47-110`) runs per request. It is not de-duplicated across requests: `inFlightRefresh` in `lib/api/client.ts` only de-dupes inside one process call path.
  - It POSTs the same `dj_refresh` to `/api/auth/token/refresh` whenever `dj_access` is missing.
  - SimpleJWT has `ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION` (`config/settings/base.py:282-283`). The first request rotates and blacklists the old token. The second gets 401 "Token is blacklisted", which the middleware treats as `refreshDead` and answers with `cookies.delete(dj_access)` + `cookies.delete(dj_refresh)` (:95-109).
  - If that second response reaches the browser after the first, the fresh pair is deleted and the user is anonymous on the next click.
- **Triggers:** browser restore with several doulitsa tabs; middle-clicking several links after more than 15 minutes idle; two quick navigations. (The middleware matcher skips prefetch and server-action requests, so it is mainly multi-tab or multi-document.)
- **Impact:** random "I was logged out" reports. This is not covered by auth D16 (lifetime) or admin D4.
- **Fix:** on 401, don't clear the cookies if the request's refresh cookie differs from the one being refreshed. Better: use a short grace window (keep the old refresh valid for N seconds after rotation), or turn off blacklist-on-rotation.
- **Possibly intentional?:** no.

### P3-D3. Verification links are single-use: a second click, or a mail-scanner pre-fetch, lands on the "check your email" page — MEDIUM
- **OLD:** better-auth's verification token is a stateless JWT (1 hour). `verifyEmail` (better-auth 1.3.28 dist `BOULxa5h.mjs:536-640`) has no "already used" state. Every click within the hour re-verifies and, with `autoSignInAfterVerification`, creates a session and redirects to callbackURL. A user who clicks twice, or whose corporate mail scanner (for example Defender Safe Links) opened the link first, still ends up signed in.
- **NEW:** `registration.verify_email_token` (`backend/apps/accounts/services/registration.py:192-225`) looks up the `Verification` row and deletes it on first use. Any later GET of the same link fails with `invalid_token` and is redirected to `/register/success?verified=false…` (the page from auth D1: "Σχεδόν Έτοιμοι! Έλεγξε το email σου", with no resend button).
- **Impact:**
  - Users who click the link again (very common), or whose mail gateway pre-fetches links, see a "check your email" page even though the account is verified.
  - Nothing tells them to just log in.
- **Fix:** if the token is unknown but the user it belonged to is already verified, redirect to the success destination (or `/login?message=…`). Alternatively, keep the row until it expires and make verification idempotent.
- **Possibly intentional?:** no. Single-use is a reasonable hardening, but the failure UX is not old behaviour.

### P3-D4. Google sign-up no longer stores first and last name — LOW
- **OLD:** `lib/auth/config.ts:174-186` `mapProfileToUser` sets `firstName=given_name`, `lastName=family_name` and `displayName = name || "given family" || null`.
- **NEW:**
  - `services/google_oauth.py:105,113-128` creates the user with `display_name=name`, where `name = info.name or <email local part>`. `first_name`/`last_name` stay NULL, although the columns exist (`models/user.py:107-108`).
  - When Google has no name, the old code stored null; the new code stores the email local part as the display name.
- **Impact:**
  - Initials and name fallbacks that read `firstName`/`lastName` show nothing for new Google users: `UserAvatar`, `user-image.tsx`, the chat header and `lib/utils/messages.ts`.
  - Admin user views show empty first/last name.
- **Possibly intentional?:** no.

### P3-D5. The registration type/role store is now persisted in localStorage — LOW
- **OLD:** `lib/stores/authStore.ts` is explicitly "in-memory only — reset on each /register visit". It is a plain `subscribeWithSelector` store.
- **NEW:** `frontend/src/lib/stores/authStore.ts` wraps it in zustand `persist({ name: 'auth-registration-store', partialize: {type, role} })`.
  - `RegisterAuthStateSync` (identical in both apps) resets on mount only when there is no hash. With `#pro` / `#for-pros` it calls `setAuthType('pro')` and leaves the persisted `role` in place.
  - The persisted state also makes the server render (type '') disagree with the client's first render, so the old type flashes or a hydration warning appears.
- **Impact:** a visitor coming back via `/register#pro` finds the previous Επιχείρηση/Επαγγελματίας choice pre-selected (old: none selected). That pre-selected role also quietly reaches `storeOAuthIntent` for Google signup.
- **Possibly intentional?:** unlikely. The old app removed persistence on purpose; its comment says so.

### P3-D6. Login of a verified pro at TYPE_SELECTION or OAUTH_SETUP now goes to /onboarding — LOW (possibly an intentional fix)
- **OLD:** `actions/auth/login.ts:109-124`: any verified step other than ONBOARDING or DASHBOARD goes to `/register/success?email=` (the resend page).
- **NEW:** `services/auth.py:151-155` `_derive_redirect_path` sends `type=pro` to `/onboarding`. `CompleteOnboardingView` (`onboarding.py:52-60`) accepts `TYPE_SELECTION` pros that have a username.
- **Impact:** stranded pros can now finish onboarding. A pro at OAUTH_SETUP (a Google user who later set a password via forgot-password) still fails at the onboarding step gate with "Ο λογαριασμός δεν είναι στη φάση ολοκλήρωσης εγγραφής".
- **Possibly intentional?:** yes, a deliberate repair (see the comments). Listed for completeness.

### P3-D7. A Google OAuth failure shows no message — LOW
- **NEW:** `app/api/auth/callback/google/route.ts:55-61` redirects every failure to `/login?error=<google_denied|oauth_state|oauth_exchange|oauth_network>`. The login form only reads `?message=` (`form-auth-login.tsx:55`), so the user silently lands back on /login.
- **OLD:** better-auth redirected errors to its own `/api/auth/error?error=…` page (English, unbranded). That was also poor, but it was visible.
- **Possibly intentional?:** n/a. Suggest mapping `?error=` to a Greek alert.

## 4. Corrections to earlier reports
- **C1. auth-accounts.md §4, "Journey steps … OAuth setup moves pros to ONBOARDING and simple users to DASHBOARD. Simple users get an auto-username with suffix": wrong for simple users.** The simple path is rejected at the serializer before it reaches the service (P3-D1). Only the pro half of that claim holds.
- **C2. auth-accounts.md §4, "register-auth-state-sync identical": true for the file, but misleading.** The store it drives changed from in-memory to persisted (P3-D5).
- **C3. auth-accounts.md §4, "Verification state transition … Token TTL is 1 hour": TTL true, semantics differ.** Old tokens were reusable within the TTL; new ones are single-use (P3-D3).
- **C4. Scope addendum to auth D10 (simple users get no displayName); not a new finding.** A new simple user who later upgrades to pro also gets `Profile.display_name = NULL`. `ensure_profile_exists` copies `user.display_name`, and onboarding has no name field, so the public profile, cards and JSON-LD show a blank name. In old, the formatted username was there. Fixing D10 fixes this too.
- **C5. Pass-1 §5 open question, "deleteUser freshAge": likely moot.**
  - better-auth 1.3.28's `deleteUser` computes `freshAge = sessionConfig.freshAge * 1e3` and then compares `now - createdAt > freshAge * 1e3`. Because of that double multiplication, the configured 1 day becomes about 1,000 days, so the check effectively never fired.
  - Unless 1.4 fixed this (unverified), old prod did not require a fresh session for deletion. No difference to report.

## 5. Re-verified same (independently)
- **Every pass-1 "identical" page and component** was re-diffed with a line count and shows 0 changed lines: login/register/success/failure/forgot/reset pages, the `(auth)` layout, form-auth-login, form-reset-password, form-resend-verification, auth-type-options, heading, button-login-goolge, button-register-pro, account-page-actions, form-change-password, form-change-username, form-upgrade-to-pro, onboarding-guard, admin-guard, skeleton, auth-required-dialog, and `lib/validations/{auth,user,shared}.ts`, `utils/validation/formats.ts`, `cooldown.ts`, `actions/auth/client.ts`.
  - `validations/profile.ts` has only coverage `address` made nullable and the visibility booleans made required.
  - Known small diffs remain: oauth-callback, oauth-setup, onboarding, dashboard layout, account page, the OAuthSetupGuard pro redirect, and the D3/D2 form changes.
- **Login:**
  - The '@' check and invalid-credential copy match. Unverified users get no tokens and are redirected to `/register/success?email=` (now from the action).
  - Redirect paths match for ONBOARDING, and for DASHBOARD with admin/support/editor going to /admin.
  - Legacy bcrypt `$2a/$2b/$2y` hashes verify. Old hashing was bcrypt-12, overriding better-auth's scrypt, so there are no scrypt hashes to migrate.
- **Register:**
  - The duplicate check is case-insensitive, and the pro username-taken copy matches.
  - Simple usernames come from the email local part plus a 0–9999 suffix, up to 5 tries.
  - The user starts at EMAIL_VERIFICATION with confirmed=True and provider email, and gets a credential Account row.
- **Change password:**
  - Requires the current password, new ≠ current and new = confirm.
  - Google-only accounts are refused.
  - Other sessions are not revoked in either app (better-auth `revokeOtherSessions` defaults to false).
- **Reset password:**
  - Consumes the token.
  - Creates a credential Account when none exists, as better-auth does.
  - Does not revoke sessions in either app (`revokeSessionsOnPasswordReset` defaults to false).
  - Forgot-password for a Google-only user sends a reset in both apps.
- **Update account:**
  - displayName must be 5–50 characters.
  - The Profile `display_name` / `display_name_normalized` sync is ported (`sync_account_to_profile`).
  - The image JSON or URL handling does not crash: precedence is `(a or b) if dict else image`.
- **Change username:**
  - The 30-day cooldown, same-name and taken checks all match.
  - The username is stored lowercase, with `displayUsername` in its original case.
  - `Profile.username` is synced, and the old `profile:page:<old>` Redis key is deleted.
  - The service pages' stale profile link is part of profiles-dashboard D2.
- **Delete account:**
  - The username comparison is case-sensitive in both apps.
  - The cascade runs, verification rows are deleted by email, and the Brevo contact delete is enqueued.
  - The new app additionally blacklists refresh tokens.
- **Upgrade to pro:**
  - Writes type, role, username, displayUsername and step ONBOARDING.
  - Keeping your own current username is allowed.
  - Brevo is synced.
- **Update user type:**
  - Moves the step to OAUTH_SETUP.
  - Type user forces role user.
- **Onboarding:**
  - Image required / blob / https messages match.
  - `user.image` is synced via `update_basic_info`.
  - published / isActive / DASHBOARD / admin email / Brevo match.
- **Google:**
  - The redirect URI is the same.
  - The intent cookie is `oauth_intent`, httpOnly, lax, 10 minutes, `/`. The new app deletes it after the callback, which is harmless.
  - New users with intent go to OAUTH_SETUP, without intent to TYPE_SELECTION.
  - An existing email account gets linked. Its `provider` stays `email`, so the Change Password button stays.
  - An unverified email account is advanced by the save hook, the same as the old link plus the update.after hook (the missing Brevo sync is known from pass2-state-machines D2).
- **Middleware:** `withSimpleAuth` logic and path lists match line for line. Only the cookie names changed: `dj_access`/`dj_refresh` instead of `better-auth.session_token`.
- **Rate limits:** the old actions called `auth.api.*` server-side, which bypasses better-auth's HTTP rate limiter. So old had effectively no login or register throttle; the new throttles are known (auth D12, lib D12).

## 6. Open questions
- **P3-D1:** please confirm live on test.doulitsa.gr. Register with Google as "Χρήστης" with a fresh Google account; expect the stuck spinner. Also run `SELECT count(*) FROM users WHERE provider='google' AND step IN ('OAUTH_SETUP','TYPE_SELECTION') AND type='user';` to find accounts already stuck.
- **P3-D2:** reproduce live. Log in, wait more than 15 minutes, then open two dashboard tabs at the same moment, for example by restoring a window.
- **P3-D3:** does test/prod mail go through a link-scanning gateway? Gmail does not pre-fetch, but Outlook/Office 365 tenants often do.
