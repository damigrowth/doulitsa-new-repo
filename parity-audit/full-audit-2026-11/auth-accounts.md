# Authentication & accounts parity audit — 2026-11-05

Scope: login, register (simple + pro), Google OAuth, email verification, forgot/reset/change
password, change username, update account, delete account, upgrade-to-pro, OAuth type
selection / setup, onboarding, journey-step gating, middleware, session/cookie semantics.
Zero code changes were made. No git commands were run.

## 1. Coverage

### OLD files read (every one)
`oldnext/src/actions/auth/`
- `index.ts`: barrel re-exports.
- `login.ts`: email-only login through better-auth `signInEmail`, blocked check, redirectPath from step/role.
- `register.ts`: consent/authType/role parsing, username autogen with suffix, better-auth `signUpEmail`, Brevo registration, server redirect to `/register/success?email=`.
- `resend-verification.ts`: better-auth `sendVerificationEmail`, always returns success, `TOO_MANY_REQUESTS` mapping.
- `forgot-password.ts`: 1 request per email per 10 minutes (in-memory) with a Greek minutes message; better-auth `requestPasswordReset`.
- `reset-password.ts`: better-auth `resetPassword` plus Greek expired/used-link mapping.
- `change-password.ts`: zod `passwordChangeSchema`, better-auth `changePassword`.
- `delete-account.ts`: username confirmation, better-auth `deleteUser` (cascade plus beforeDelete hook).
- `update-account.ts`: displayName 5–50 plus image, sync to Profile, cache revalidation.
- `change-username.ts`: pro only, 30-day cooldown, User + Profile in one transaction, cache tags.
- `complete-onboarding.ts`: step gate, role fallback for broken pro/`user` accounts, zod schema, image rules, profile upsert, step to DASHBOARD, admin email, Brevo.
- `store-oauth-intent.ts`: `oauth_intent` httpOnly cookie (10 minutes); `getOAuthIntent`.
- `oauth-setup.ts` (`completeOAuth`): pro role guard, username autogen/collision, updateUser, role via Prisma, Brevo.
- `upgrade-to-pro.ts`: simple to pro (type/role/username/step ONBOARDING), Brevo, session refresh.
- `update-user-type.ts`: TYPE_SELECTION to OAUTH_SETUP with type/role.
- `maintenance.ts`: env-based maintenance status (unused by any page).
- `server.ts`: session getters, role checks, redirect guards (`requireOnboardingComplete`, `redirectCompletedUsers`, `redirectOnboardingUsers`, `redirectOAuthUsersToSetup`, `requireProUser`), admin permission helpers.
- `client.ts`: client-side session/role helpers.

Other old files
- `src/app/api/auth/[...all]/route.ts`: better-auth handler.
- `src/app/api/auth/exchange-token/route.ts`: Better Auth JWT to Supabase JWT (15 minutes); GET is a health check.
- `src/app/api/verify-email/route.ts`: wraps better-auth verifyEmail; on success forwards session cookies (auto sign-in); on failure goes to `/register/failure?email=`.
- `src/middleware.ts`, `src/middlewares/{index,stackHandler,withSimpleAuth,withLowercaseRedirect,withHeaders,withAdminAuth}.ts`. `withAdminAuth` is not exported or used.
- `src/lib/auth/config.ts`: better-auth config, including all databaseHooks (journey steps, OAuth intent, role defaults), cookies, session, username plugin, admin plugin, deleteUser hook, email senders.
- `src/lib/auth/client.ts`: authClient.
- `src/lib/validations/auth.ts`, `src/lib/validations/user.ts` (changeUsername/upgradeToPro schemas), `src/lib/validations/profile.ts` (onboarding/coverage/image schemas), `src/lib/validations/shared.ts` (email/password).
- `src/lib/utils/better-auth-error.ts`, `src/lib/utils/cooldown.ts`, `src/lib/utils/validation/formats.ts` (`generateUsernameFromEmail`, `formatDisplayName`).
- `src/lib/stores/authStore.ts`, `src/lib/email/auth-integration.ts` (verification/reset senders), `src/lib/email/services/admin-emails.ts` (`sendNewProfileEmail`; trigger only).
- Pages: `app/(auth)/{layout, login, register, register/success, register/failure, forgot-password, reset-password, oauth-callback, oauth-setup, onboarding}/page.tsx`, `app/(dashboard)/dashboard/layout.tsx`, `app/(dashboard)/dashboard/profile/account/page.tsx`.
- Components: `components/forms/auth/*` (12 files: login, register, auth-type-options, heading, register-auth-state-sync, Google button, register-pro button, forgot, reset, resend, oauth-setup, index); `components/forms/profile/{account-page-actions, form-account, form-change-password, form-change-username, form-delete-account, form-upgrade-to-pro, form-onboarding, onboarding-form-skeleton}.tsx`; `components/guards/{admin-guard, onboarding-guard, oauth-setup-guard, index}`; `components/shared/auth-required-dialog.tsx`; `components/providers/auth-provider.tsx` (entirely commented out, dead); logout handlers in `components/profile/menu-user.tsx` and `components/dashboard/dashboard-nav-user.tsx`.
- Library defaults were checked against the better-auth package source (v1.3.28 dist found locally; old pins >=1.4.19 <1.5): `minPasswordLength` defaults to 8, the order inside `signInEmail`, and the `sendVerificationEmail` and `deleteUser` behavior.

### NEW files read
- Frontend actions: `frontend/src/actions/auth/*`, all 19 files (index, login, register, logout, forgot/reset/change password, resend, delete, update-account, change-username, complete-onboarding, oauth-setup, store-oauth-intent, update-user-type, upgrade-to-pro, maintenance, server, client).
- Frontend lib: `frontend/src/lib/api/auth.ts`, `lib/api/client.ts` (ApiError, token refresh, error envelope), `lib/auth/{client,cookies}.ts`.
- Frontend routes and middleware: `frontend/src/app/api/auth/{[...all], oauth/google/login, callback/google}/route.ts`, `app/api/verify-email/route.ts`, `frontend/src/middleware.ts`, `middlewares/*` (including the new `withTokenRefresh.ts`).
- Every new (auth) page, the dashboard layout, the account page, and every auth/profile/guard component above, diffed line by line against the old versions.
- Backend `backend/apps/accounts/`: `urls/public.py`, `serializers/auth.py`, `views/public/{auth,account,oauth,oauth_setup,onboarding}.py`, `services/{registration,auth,password,account,oauth,google_oauth,sessions}.py`, `selectors/users.py`, `models/{user,pending_registration}.py`, `permissions/roles.py` (IsProfessional).
- Backend support code: `backend/common/{exceptions,authentication,throttling}.py`, `config/settings/base.py` (SIMPLE_JWT, throttle rates), `apps/messaging/{tasks,emails}.py` (auth email builders), `apps/profiles/services/profile_updates.py` (`ensure_profile_exists`, `update_basic_info`), `apps/profiles/models/profile.py` (published/is_active defaults), `apps/core/views/public/health.py` (MaintenanceStatusView).

### Delegated elsewhere
- Admin permission helpers in `server.ts` (`hasPermission`, `getAdminNavigationItems`, …), `lib/auth/{roles,permissions}.ts`, `apps/accounts/{views,services,selectors,serializers}/admin*`, `views/admin/team.py`, `permissions/admin.py`, `components/admin/user-auth-flow.tsx`, and admin verification pages go to the **Admin** domain.
- Email template content/HTML/subjects and Brevo list logic (`lib/email/*`, `apps/messaging/emails.py`, `brevo_state_change`) go to **Emails/notifications**. Only the triggers are audited here.
- `frontend/src/app/api/auth/ws-token/route.ts` goes to **Chat/realtime**.
- Profile field writers (`update_basic_info`, `update_coverage`, `update_portfolio`, sanitizers) and the `dashboard/profile/verification` page go to **Profiles**.
- Onboarding taxonomies/locations data (`getProTaxonomies`, `getLocations`) goes to **Taxonomies**.
- `withLowercaseRedirect` / `withHeaders` go to **SEO/routing**. Both are byte-identical to old, so there is nothing to report.

## 2. Mapping (old → new)

| OLD | NEW frontend action / route | NEW Django endpoint | Page/UI |
|---|---|---|---|
| `login.ts` | `actions/auth/login.ts` → `lib/api/auth.login` | `POST /api/auth/login` (`LoginView` → `login_by_identifier`) | `/login`, `form-auth-login.tsx` (identical) |
| `register.ts` | `actions/auth/register.ts` | `POST /api/auth/register` (`RegisterView` → `registration.register`) | `/register`, `form-auth-register.tsx` (+client push) |
| better-auth verify + `api/verify-email` | `app/api/verify-email/route.ts` (proxy) | `GET /api/auth/verify-email/` (`VerifyEmailRedirectView`) | `/register/success`, `/register/failure` |
| `resend-verification.ts` | `actions/auth/resend-verification.ts` | `POST /api/auth/verification/resend` | `form-resend-verification.tsx` (identical) |
| `forgot-password.ts` | `actions/auth/forgot-password.ts` | `POST /api/auth/password/forgot` | `/forgot-password` (identical) |
| `reset-password.ts` | `actions/auth/reset-password.ts` | `POST /api/auth/password/reset` | `/reset-password` (identical) |
| `change-password.ts` | `actions/auth/change-password.ts` | `POST /api/auth/password/change` | `form-change-password.tsx` (identical) |
| `update-account.ts` | `actions/auth/update-account.ts` | `PATCH /api/auth/account` (+`sync_account_to_profile`) | `form-account.tsx` (mode onBlur) |
| `change-username.ts` | `actions/auth/change-username.ts` | `POST /api/auth/username/change` | `form-change-username.tsx` (identical) |
| `delete-account.ts` | `actions/auth/delete-account.ts` | `DELETE /api/auth/account/delete` | `form-delete-account.tsx` |
| `upgrade-to-pro.ts` | `actions/auth/upgrade-to-pro.ts` | `POST /api/auth/upgrade-to-pro` | `form-upgrade-to-pro.tsx` (identical) |
| `update-user-type.ts` | `actions/auth/update-user-type.ts` | `PATCH /api/auth/user-type` | `form-oauth-setup.tsx` |
| `oauth-setup.ts` | `actions/auth/oauth-setup.ts` | `POST /api/auth/oauth/setup` | `/oauth-setup`, `form-oauth-setup.tsx` (changed) |
| `store-oauth-intent.ts` | same (frontend cookie) | (also `POST/GET /api/auth/oauth/intent`, unused by the UI) | register Google button |
| better-auth Google social | `api/auth/oauth/google/login` + `api/auth/callback/google` | `POST /api/auth/oauth/google/exchange` | callback routes by step |
| `complete-onboarding.ts` | `actions/auth/complete-onboarding.ts` | `POST /api/auth/onboarding/complete` | `/onboarding`, `form-onboarding.tsx` (changed) |
| `server.ts` guards | `actions/auth/server.ts` | `GET /api/auth/session`, `/api/profiles/me` | dashboard layout, auth pages |
| `api/auth/[...all]` | `app/api/auth/[...all]` proxy | `BetterAuthCatchAllView` (sign-out only, else 404 manifest) | n/a |
| `api/auth/exchange-token` | none | `GET/POST /api/auth/exchange-token` | n/a |
| better-auth sign-out | `lib/api/auth.logout` + `actions/auth/logout.ts` | `POST /api/auth/logout` | user menus |
| better-auth session cookie | `dj_access`/`dj_refresh` + `withTokenRefresh` | `POST /api/auth/token/refresh` | middleware |
| `maintenance.ts` | `actions/auth/maintenance.ts` | `GET /api/auth/maintenance` | unused in both |

## 3. DIFFERENCES

### D1. Email verification no longer signs the user in, and a failed or expired link goes to the wrong page — HIGH
- OLD: `lib/auth/config.ts:148` sets `autoSignInAfterVerification: true`. `app/api/verify-email/route.ts:46-63` forwards better-auth's session `set-cookie` headers and redirects to `callbackURL`, which `register.ts:126` sets to `/onboarding` for pros and `/dashboard` for simple users. The user lands logged in. On a bad or expired token it redirects to `/register/failure?email=<email from JWT>` (`verify-email/route.ts:65-72`), which shows "Ο σύνδεσμος έληξε" and a working resend button.
- NEW: `backend/apps/accounts/views/public/auth.py:206-222` (`VerifyEmailRedirectView`) only redirects and sets no auth cookies. The frontend proxy (`frontend/src/app/api/verify-email/route.ts`) forwards none either. The user arrives at `/onboarding` or `/dashboard` with no session, and middleware (`withSimpleAuth`) bounces them to `/login`. On failure it redirects to `/register/success?verified=false&reason=<exc.default_code>`. No page reads `verified`/`reason`, there is no `email` param so the resend button is hidden (`form-resend-verification.tsx` renders it only `if (email)`), and the copy says "Σχεδόν Έτοιμοι! Έλεγξε το email σου". Also, `exc.default_code` is always `"error"` (`common/exceptions.py:30`; the specific code lives in `exc.code`).
- Impact: every new email signup has to log in again after clicking the link. Expired-link users see a misleading "check your email" page with no way to resend.
- Fix hint: on success, issue a JWT pair (`issue_tokens`) and have the Next proxy set the `dj_access`/`dj_refresh` cookies before redirecting. On failure, redirect to `/register/failure?email=<record.identifier>`.
- Possibly intentional?: no.

### D2. Pro accounts with role='user' are no longer repaired at onboarding, so existing broken accounts are stuck — HIGH
- OLD: `form-onboarding.tsx:121-131,597-633,1287` and `complete-onboarding.ts:43-58,124-130` handle "pro accounts that ended up with role='user' (old Google-signup bug)". The form shows a role picker (Επαγγελματίας/Επιχείρηση), filters categories by the picked role, and blocks submit until a role is picked. The server persists the picked role, or returns "Παρακαλώ επιλέξτε αν είστε Επαγγελματίας ή Επιχείρηση".
- NEW: `frontend/src/components/forms/profile/form-onboarding.tsx` has the picker removed and filters by `user.role` only. With role 'user' it shows the unfiltered list. `actions/auth/complete-onboarding.ts` sends no role. `views/public/onboarding.py:40` requires `IsProfessional` (role freelancer/company), so these users get a 403 "Professional account required." (English). Meanwhile `requireOnboardingComplete` (`actions/auth/server.ts`, `getSetupRedirect`) locks every `type=pro` user who is not at DASHBOARD to `/onboarding`.
- Impact: production accounts already in the broken type=pro/role=user state cannot finish onboarding or reach the dashboard. D3 can create new ones.
- Possibly intentional?: no. The old fix appears to be a late commit that was not ported.

### D3. Google pro signup without a role creates type=pro / role=user — MEDIUM
- OLD:
  - `form-auth-register.tsx:189-196` blocks Google signup for pro until freelancer/company is chosen.
  - `lib/auth/config.ts:283-289` defaults to `freelancer` for a pro intent whose role is missing or invalid ("A pro account must never end up with role='user'").
  - `oauth-setup.ts:36-42` rejects pro without freelancer/company in Greek.
  - The `form-oauth-setup.tsx` defaults: `role: userRole === 'freelancer'||'company' ? userRole : 'freelancer'`, with zod enum validation.
- NEW:
  - `frontend/src/components/forms/auth/form-auth-register.tsx` has the guard removed.
  - `backend/apps/accounts/services/google_oauth.py:44-55,109` `_parse_intent` returns role None, so the user is created with `role=UserRole.USER`, `type=PRO`.
  - `form-oauth-setup.tsx` defaults `role: userRole || 'freelancer'`, which is `'user'`, and the schema is `z.string().min(1)`. Submitting fails at the DRF ChoiceField with "One or more fields are invalid." (English) until the user clicks a role button.
- Impact: confusing English error during Google pro signup. If the user abandons setup, the account ends up in the D2 state.
- Fix hint: restore the client guard, default `intent_role` to freelancer for pro intents, and restore the setup-form default and enum.
- Possibly intentional?: no.

### D4. Users with `confirmed=false` (and expired bans) can never use the site after login — HIGH (needs a data check)
- OLD: `confirmed` was informational. `login.ts` and better-auth never gated on it; only `blocked` was checked, at login (`login.ts:75-80`). better-auth's admin plugin rejected banned users only while the ban was unexpired.
- NEW: `backend/apps/accounts/models/user.py:144-147` defines `is_active = confirmed and not blocked and not banned`. SimpleJWT's `get_user` rejects inactive users, and `common/authentication.py:CookieJWTAuthentication` then silently treats the request as anonymous. `services/auth.py:login` does not check `confirmed`, so tokens are issued, the UI says "Επιτυχής Σύνδεση!", and every following request is anonymous, which loops back to `/login`. Bans are treated as permanent: `ban_expires` is ignored both at login (`services/auth.py:78`) and in `is_active`.
- Impact: any legacy or migrated user with `confirmed=false`, or with an expired ban, cannot use the site and gets no error message.
- Possibly intentional?: partly. Enforcing `blocked` on every request is arguably a fix. The `confirmed` gate and the ignored ban expiry are not. Run a count of `users.confirmed=false` in prod.

### D5. Google login has no blocked/banned check or error message — MEDIUM
- OLD: better-auth's admin plugin blocks session creation for banned users on social sign-in too, with a Better Auth error redirect.
- NEW: `services/google_oauth.py:exchange_code` issues tokens without checking `blocked` or `banned`. Access is then silently denied per request (D4 mechanism). The callback routes to `/dashboard`, which bounces to `/login` with no message.
- Possibly intentional?: no.

### D6. Effective minimum password length dropped from 8 to 6 — MEDIUM
- OLD: better-auth's `minPasswordLength` defaults to 8 (verified in better-auth source: `minPasswordLength: options.emailAndPassword?.minPasswordLength || 8`). It is enforced in `signUpEmail`, `resetPassword` and `changePassword`, so a 6–7 character password was rejected server-side with the localized PASSWORD_TOO_SHORT message, even though the client schemas said 6. The reset form itself requires 8: `form-reset-password.tsx:29-32` and the hint "Τουλάχιστον 8 χαρακτήρες".
- NEW: `serializers/auth.py` (`RegisterSerializer`, `ChangePasswordSerializer`, `ResetPasswordSerializer`) and `services/password.py` all use min 6. `actions/auth/reset-password.ts` also checks 6.
- Possibly intentional?: possibly. The old 8 was implicit, and the old register UI says "Τουλάχιστον 6 χαρακτήρες". Product decision.

### D7. Self-healing check for pros with incomplete profiles is gone — MEDIUM
- OLD: `server.ts:407-438` (`requireOnboardingComplete`): a pro at DASHBOARD whose profile is missing image, category or subcategory is moved back to `step=ONBOARDING`, Brevo is re-synced, and they are redirected to `/onboarding`.
- NEW: `frontend/src/actions/auth/server.ts` `getSetupRedirect` returns null for any step=DASHBOARD user. No profile check.
- Impact: pros with incomplete profiles keep dashboard access (and may be published without an image or category).
- Possibly intentional?: no.

### D8. Onboarding server-side validation is weaker than old — MEDIUM
- OLD: `complete-onboarding.ts:95-110` runs `onboardingFormSchemaWithMedia` on the server: bio of 80–5000 characters after stripping HTML, category/subcategory required, the coverage rules (at least one mode; onbase needs address/zipcode/area/county; onsite needs at least one county), portfolio of at most 10, and image validity.
- NEW: `views/public/onboarding.py:24-30` checks bio `min_length=20, max_length=20000` on raw HTML, `coverage` as any JSON, and portfolio with no maximum. The frontend action requires bio length ≥ 20 raw. The client form still runs the old zod schema, so only direct API calls or a modified client get through.
- Possibly intentional?: no.

### D9. Onboarding success copy and profile type sync — LOW
- OLD: the toast says "Η εγγραφή ολοκληρώθηκε επιτυχώς!" (`complete-onboarding.ts:233`). The profile's `type` is always set to the effective role, and username/displayName/displayNameNormalized/email are re-synced on upsert.
- NEW: the toast says "Καλώς ήρθες στο dashboard" (`onboarding.py:160`). `profile.type` is set only if empty, and the user fields are copied only when the profile is first created (`ensure_profile_exists`).
- Possibly intentional?: no.

### D10. Simple users get no displayName — MEDIUM
- OLD: `register.ts:59-65` sets `displayName = formatDisplayName(displayName || username)`, i.e. the capitalized auto-username (for example "Nikos"), and `name = displayName`. The verification email greets that name.
- NEW: `registration.py:84-86` sets `display_name=display_name`, which is None for simple users because the form sends none, and `name = display_name or username`. The pro display name is not capitalized server-side either. The verification email is sent with `data.get("displayName")`/`username`, both None for simple users, so the greeting has no name.
- Impact: every surface that shows `displayName` (header menu, reviews, chat) shows an empty value or a fallback for new simple users.
- Possibly intentional?: no.

### D11. Consent and confirm-password are no longer checked server-side — MEDIUM
- OLD: `register.ts:24-34` requires consent to include `'terms'`, with "Πρέπει να αποδεχτείτε τους όρους χρήσης" (field: "…Όρους Χρήσης"). `register.ts:75-83` checks password equals confirmPassword.
- NEW: `actions/auth/register.ts` sends `formData.getAll('consent')`, which is the single JSON string `'["terms"]'`. If the box is unchecked it sends `'[]'`, a non-empty list. `RegisterSerializer.consent` only requires a list of at least one string. confirmPassword is never sent or checked.
- Impact: the client zod schema still blocks normal users, but the server accepts registrations without terms consent.
- Fix hint: parse the JSON and require `'terms' in consent`.
- Possibly intentional?: no.

### D12. Duplicate-email and validation error texts changed; validation and throttle errors show in English — MEDIUM
- OLD:
  - Duplicate email: "Ο χρήστης υπάρχει ήδη. Χρησιμοποιήστε άλλο email." (`better-auth-error.ts:20-25`).
  - Validation summaries were Greek: "Μη έγκυρα δεδομένα εγγραφής", "Μη έγκυρα στοιχεία σύνδεσης", etc.
  - Rate limits: "Πάρα πολλές προσπάθειες. Παρακαλώ δοκίμασε ξανά σε λίγα λεπτά."
- NEW:
  - Duplicate email: "Υπάρχει ήδη λογαριασμός με αυτό το email" (`registration.py:63`).
  - Any DRF serializer failure returns "One or more fields are invalid." with English field details such as "Enter a valid email address." or "Ensure this field has at least…" (`common/exceptions.py:127-135`). Actions display `err.message` directly.
  - Throttles (login 10/min, register 5/min, resend 3/10min) return DRF's English "Request was throttled. Expected available in N seconds."
  - The OAuth setup service errors are English: "Invalid for pro", "Required ≥3 chars", "Required" (`services/oauth.py:38-46`).
- Possibly intentional?: no.

### D13. Forgot-password rate limit semantics and copy — MEDIUM
- OLD: `forgot-password.ts:9-38` allows 1 request per email per 10 minutes, with "Μπορείς να ζητήσεις επαναφορά κωδικού 1 φορά κάθε 10 λεπτά. Δοκίμασε ξανά σε N λεπτό/λεπτά." When the limit hits, the UI shows that error and does not show the success panel.
- NEW: `PasswordResetThrottle` allows 3 per 10 minutes per IP (`config/settings/base.py:254`), so an attacker can send several reset emails to one address from different IPs. The message is "Έχεις ήδη ζητήσει επαναφορά πρόσφατα. Δοκίμασε ξανά αργότερα." with no minutes.
- Possibly intentional?: no.

### D14. Reset-password result messages changed — LOW/MEDIUM
- OLD (`reset-password.ts`):
  - Success: "Κωδικός επαναφέρθηκε επιτυχώς! Συνδέσου με τον νέο σου κωδικό."
  - Invalid or used token: "Ο σύνδεσμος επαναφοράς έχει λήξει ή έχει ήδη χρησιμοποιηθεί. Παρακαλούμε αιτηθείτε νέο σύνδεσμο." The form shows a "request new link" link whenever the message contains "λήξει".
  - Validation: "Λάθος στοιχεία".
- NEW (`services/password.py`, `views/public/auth.py:203`):
  - Success: "Ο κωδικός επαναφέρθηκε".
  - Invalid or used token: "Μη έγκυρο token", with no link because the text lacks "λήξει".
  - Expired token: "Το token έχει λήξει".
- Possibly intentional?: no.

### D15. Resend-verification responses changed — MEDIUM
- OLD (`resend-verification.ts`; better-auth `send-verification-email` with no session always returns `status:true`): known, unknown and already-verified emails all get "Το email επιβεβαίωσης στάλθηκε! Έλεγξε τα εισερχόμενά σου και τον φάκελο spam." If the email exists it is sent, even if already verified.
- NEW:
  - Known and unverified: "Στάλθηκε email επαλήθευσης".
  - Already verified: an error, "Το email έχει ήδη επαληθευτεί" (409). This reveals account state.
  - Unknown email: `ResendVerificationView` checks `exc.default_code == "ok_silent"`, which is always False (the class default is "error"; the instance code is `exc.code`). The ApiError is re-raised and serialized as HTTP 200 with an `{error:{…}}` body. The client treats it as success with `message: undefined`, so nothing is displayed and no cooldown starts.
- Fix hint: use `exc.code`, and the same fix applies to `VerifyEmailRedirectView`.
- Possibly intentional?: no.

### D16. Session lifetime: 3-day idle logout versus better-auth's 7-day session — MEDIUM
- OLD: better-auth default session `expiresIn` is 7 days, refreshed after 1 day of use (`updateAge`). Cookies are shared across `doulitsa.gr` subdomains (`crossSubDomainCookies`, `config.ts:60-66`).
- NEW: access token 15 minutes, refresh token 3 days with rotation and blacklist (`frontend/src/lib/auth/cookies.ts`; backend default `SIMPLE_JWT_REFRESH_LIFETIME_DAYS` is 14, with env 3). Cookies are host-only.
- Impact: users are logged out after 3 quiet days instead of 7. The session no longer spans www and the apex domain.
- Possibly intentional?: yes, likely. The cookies.ts comment documents 3 days on purpose. Confirm with product.

### D17. Admin roles after Google login, and auth-page guard edge cases — LOW
- Google login destination:
  - OLD: the Google login callback goes through `/oauth-callback`, which sends `admin`, `support` and `editor` to `/admin` (`oauth-callback/page.tsx:39-44`).
  - NEW: `app/api/auth/callback/google/route.ts` sends only `role==='admin'` to `/admin`; support/editor go to `/dashboard`.
- `redirectCompletedUsers`:
  - OLD (`server.ts:529-549`): redirects only step=DASHBOARD users (admin roles to /admin).
  - NEW: redirects any admin role to /admin regardless of step.
- `redirectOAuthUsersToSetup`:
  - OLD: only provider=google with step=OAUTH_SETUP.
  - NEW: any provider at TYPE_SELECTION or OAUTH_SETUP.
- `requireOnboardingComplete`:
  - OLD: skips only `role==='admin'`, and lets simple (`type==='user'`) users through regardless of step.
  - NEW: skips all admin roles. A simple user at ONBOARDING is sent to onboarding, and a pro at any non-DASHBOARD step is locked to onboarding (OLD allowed e.g. EMAIL_VERIFICATION/TYPE_SELECTION pros through).
- `requireRole` / `requireAnyRole` (used by AdminGuard):
  - OLD: redirect to `/login`.
  - NEW: redirect to `/`.
- Possibly intentional?: partly. The pro lock is a deliberate hardening; the support/editor Google redirect looks like a bug.

### D18. Welcome email now also sent directly at verification — MEDIUM (delegate content to Emails)
- OLD: `config.ts:431` notes "Welcome email is now sent via Brevo automation when contact is added to list". At verification only `brevoWorkflowService.handleUserStateChange` runs; there is no direct welcome send.
- NEW: `registration.py:224-226` sends `send_welcome_email.delay(...)` and also `brevo_state_change("email_verified")`.
- Impact: if the Brevo automation is still active, users get two welcome emails.
- Possibly intentional?: unclear. The new code comment claims old parity, but the old code does not send it directly.

### D19. Reset and verification emails lose the user's name — LOW (delegate to Emails)
- OLD: `config.ts:98-107,127-142` greets with the DB displayName/username.
- NEW: `ForgotPasswordView` calls `send_password_reset_email.delay(email, token)` with no display name. The verification email at register uses request data (see D10).

### D20. Login and Google edge differences — LOW
- Login check order:
  - OLD (better-auth `signInEmail`): verify password, then EMAIL_NOT_VERIFIED (redirect to resend page), then the `blocked` check after the session exists. A blocked but unverified user goes to the resend page.
  - NEW (`services/auth.py:76-92`): blocked/banned checked before email verification. The backend also accepts usernames (`login_by_identifier`), but the frontend still rejects identifiers without '@', so there is no user-visible difference.
- Login input limits:
  - OLD: identifier max 50, password max 100 (zod).
  - NEW: no maximum on the identifier in the action, serializer max 255.
- Old banned users got better-auth's banned message; new users get "Ο λογαριασμός σας έχει αποκλειστεί".

### D21. Register edge cases — LOW
- OLD: the better-auth username plugin enforced 3–30 characters and `[a-zA-Z0-9_-]` for auto-generated simple usernames, lowercased usernames, and stored `displayUsername`. The username was checked before email, so with both taken a pro saw the username error.
- NEW:
  - `resolve_simple_username` does no length check. An email local part of 1–2 characters, or one with only non-ASCII characters (empty string), is accepted. An empty username can collide on the unique index and cause a 500.
  - A pro username is stored as typed (not lowercased) if sent directly to the API.
  - For simple users `display_username` is None.
  - Email is checked before username.
- NEW `RegisterSerializer.displayName` has max 80 (OLD had none server-side; the client allows unlimited).

### D22. Account and username copy differences — LOW
- updateAccount success:
  - OLD: "Ο λογαριασμός σας ενημερώθηκε επιτυχώς!"
  - NEW: "Ο λογαριασμός ενημερώθηκε" (`account.py:84`, `actions/auth/update-account.ts`).
- changePassword success:
  - OLD: "Ο κωδικός άλλαξε επιτυχώς!"
  - NEW: "Ο κωδικός άλλαξε επιτυχώς" (no "!").
- Wrong current password:
  - OLD: the better-auth localized INVALID_PASSWORD message.
  - NEW: "Λάθος τρέχων κωδικός".
- upgradeToPro success:
  - OLD: "Ο λογαριασμός σας αναβαθμίστηκε! Θα μεταφερθείτε στη σελίδα ολοκλήρωσης προφίλ."
  - NEW: "Έγινες επαγγελματίας".
- upgradeToPro rejection:
  - OLD: "Ο λογαριασμός σας είναι ήδη επαγγελματικός", checked on `type!=='user'`.
  - NEW: "Μόνο απλοί χρήστες μπορούν να γίνουν επαγγελματίες", checked on `role!='user'`. An admin-role user of type 'user' could upgrade in OLD (losing the admin role) but is refused in NEW.
- deleteAccount username mismatch:
  - OLD: "Το username δεν ταιριάζει με τον λογαριασμό σας".
  - NEW: "Η επιβεβαίωση ονόματος χρήστη δεν ταιριάζει". Client pre-check in NEW: "Η επιβεβαίωση δεν ταιριάζει".
- changeUsername confirm comparison:
  - OLD: case-insensitive (`confirmUsername.toLowerCase()`).
  - NEW: case-sensitive (`account.py:68`). The client lowercases both, so this only affects the API.
- updateAccount trimming: NEW strips whitespace from displayName.
- updateAccount image removal: OLD accepted `image: null` (removes the image); NEW skips the image update when null, so the image cannot be cleared.
- `form-account.tsx`: validation mode changed from onChange to onBlur, so the Save button's enabled state updates on blur, not while typing.

### D23. `/api/auth/exchange-token` contract changed — LOW
- OLD: unauthenticated POST with a Better Auth JWT in the body. It returns a Supabase JWT (15 minutes) with claims sub, email, role, type, `aud:'authenticated'`, `iss:'better-auth'`. GET is a health check.
- NEW: requires auth. Both GET and POST mint a 1-hour token with sub, role, user_role, user_type, `iss:'django-backend'` (no email/aud) (`services/oauth.py:mint_supabase_jwt`).
- Possibly intentional?: yes. It is obsolete with Channels and has no frontend caller.

### D24. Security fix: `updateUserType` is now limited to the caller's own account — LOW, possibly intentional (fix)
- OLD: `update-user-type.ts` updated any `userId` passed by the client, with no session check.
- NEW: `UpdateUserTypeView` returns 403 unless `userId == request.user.id`. This is an improvement; noted only for completeness.

## 4. Confirmed same
- All auth pages are identical except the getCurrentUser call signature: login, register, register/success, register/failure, forgot-password, reset-password, oauth-callback, oauth-setup, onboarding, and the account page. That covers titles, Greek copy, guard calls, and the reset page's missing-token redirect to /forgot-password.
- Identical components: `form-auth-login`, `form-forgot-password` (only an error-field rename), `form-reset-password`, `form-resend-verification` (60s cooldown), `auth-type-options`, `heading-form-register`, `register-auth-state-sync` (#pro/#user/#for-pros hashes), `button-login-goolge`, `button-register-pro`, `auth-required-dialog`, `account-page-actions` (Change Password only for provider=email, Change Username only for pros, Upgrade only for simple users), `form-change-password`, `form-change-username`, `form-upgrade-to-pro`, `form-delete-account` (bar the call shape), `onboarding-guard`, `admin-guard`, and `onboarding-form-skeleton`.
- Client validation schemas are byte-identical: `lib/validations/auth.ts`, onboarding/coverage zod, `changeUsernameSchema`, `upgradeToProSchema`, `cooldown.ts` (30 days).
- Login: the frontend rejects identifiers without '@' with "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email". Invalid credentials return "Λάθος email ή κωδικός πρόσβασης". An unverified email redirects to `/register/success?email=` with no tokens. redirectPath logic matches: ONBOARDING goes to /onboarding; DASHBOARD goes to /admin for admin/support/editor, otherwise /dashboard; anything else goes to the resend page.
- Register: pro needs role, username ≥3 and displayName. A taken pro username returns "Το συγκεκριμένο username χρησιμοποιείται ήδη. Επιλέξτε ένα διαφορετικό username." Simple usernames come from the email local part with a random 0–9999 suffix, up to 5 tries. Users start at step EMAIL_VERIFICATION with confirmed=True. Brevo registration sync runs. The client navigates to `/register/success?email=`.
- Verification state transition: pros go to ONBOARDING and simple users to DASHBOARD. Token TTL is 1 hour; reset token TTL is 1 hour.
- Journey steps: Google signup with intent lands at OAUTH_SETUP, without intent at TYPE_SELECTION. Pre-verified Google users get confirmed=True. `updateUserType` moves to OAUTH_SETUP (pro defaults to freelancer from the form). OAuth setup moves pros to ONBOARDING and simple users to DASHBOARD. Simple users get an auto-username with suffix. A taken pro username gives the same Greek error. Brevo sync runs on OAuth setup. The OAuthSetupGuard hard redirect is listed as intentional.
- Admin email-verified flip: `User.save()` advances the step, which mirrors the old update.after hook.
- Change username: pro only, "Μόνο επαγγελματίες…"; cooldown message "Πρέπει να περιμένετε N ημέρες…"; same-name and taken messages; lowercase storage with displayUsername kept in original case; Profile.username synced; success "Το username άλλαξε επιτυχώς!" with nextChangeDate.
- Update account: displayName 5–50 with the same Greek messages, and sync to the Profile.
- Delete account: username confirmation, cascade delete, verification tokens deleted by email, Brevo contact deleted, all refresh tokens revoked, hard redirect to `/`.
- Upgrade to pro: sets type/role/username/displayUsername/step ONBOARDING, Brevo sync, hard redirect to /onboarding.
- Onboarding: the step gate message "Ο λογαριασμός δεν είναι στη φάση ολοκλήρωσης εγγραφής". The image rules and messages for required, blob: and non-https images. visibility defaults to {email:false, phone:true, address:true}. published/isActive set, step to DASHBOARD, admin new-profile email, Brevo sync.
- Middleware: unauthenticated `/dashboard*` and `/onboarding*` redirect to `/login`. The public/auth path lists are the same. `withLowercaseRedirect` (including the /pros and /companies 301s) and `withHeaders` are identical.
- Logout: sign-out followed by `window.location.href='/'`, with the server-side token blacklisted.
- OAuth intent cookie: `oauth_intent`, httpOnly, sameSite lax, 10 minutes, path `/`.

## 5. Open questions / couldn't verify
- The exact better-auth-localization el-GR strings (for example INVALID_EMAIL_OR_PASSWORD, PASSWORD_TOO_SHORT, INVALID_PASSWORD, BANNED_USER) could not be read because the package is not installed in `oldnext/`. The thrown-error text old users saw for wrong current password, short password and banned accounts is therefore unconfirmed.
- The old better-auth version is 1.4.x; the defaults were checked in a local 1.3.28 copy. The `minPasswordLength` default of 8 and the session defaults (7 days / 1 day) are documented as unchanged in 1.4, but this was not checked against 1.4 source.
- D4 severity depends on production data (`SELECT count(*) FROM users WHERE confirmed=false` and expired `ban_expires`). This could not be checked.
- D18: whether the Brevo "welcome" automation is still active in the new setup belongs to the Emails domain.
- Whether `DEBUG` is False on Dokploy could not be checked. The `devVerificationToken` / `devResetToken` fields leak tokens when DEBUG is on.
- Better-auth's `deleteUser` uses `sensitiveSessionMiddleware`. Whether old prod demanded a fresh session (`freshAge` 1 day) before deletion, which would be a behavior the new app lacks, was not confirmed.
