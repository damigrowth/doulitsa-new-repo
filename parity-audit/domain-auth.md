# Domain: Auth (endpoints)

Scope: per-endpoint behavior, validation, side-effects, response shape, error codes for the AUTH domain.
OLD = Next.js + Better Auth (`app_before_migrations/src/actions/auth/**`, `src/app/api/auth/**`, `src/lib/auth/config.ts`).
NEW = Django/DRF (`backend/apps/accounts/**`) + Next frontend (`frontend/src/actions/auth/**`, `frontend/src/lib/api/auth.ts`).
Method: matched by behavior; every claim cited `file:line`. RLS/session-security handled in a separate report (exchange-token / token refresh-verify covered only at endpoint-shape level here).

---

## Parity matrix

| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Login | endpoint | `actions/auth/login.ts:15` | `views/public/auth.py:38` (`LoginView`); fe `lib/api/auth.ts:40`, `actions/auth/login.ts:20` | ✅ | POST `/api/auth/login` exists. |
| Login | validation | `login.ts:22-42`, `validations/auth.ts:37` (identifier 2-50, pw 6-100, must contain `@`) | `serializers/auth.py:14` (identifier 2-255, pw 1-255) + `services/auth.py:60` (`@` check) | ⚠️ | NEW serializer min pw=1 vs OLD 6 (the fe action re-checks pw≥6 at `frontend/login.ts:36`, so effective parity for the form path; direct API callers differ). identifier max 255 vs 50. |
| Login | redirect logic | `login.ts:109-124` | `services/auth.py:139` `_derive_redirect_path` | ✅ | step/role→path replicated incl. admin/support/editor→`/admin`. |
| Login | EMAIL_NOT_VERIFIED side-path | `login.ts:86-102` (success=true, redirect `/register/success?email=`) | `services/auth.py:84-90` | ✅ | Returns no tokens, redirectPath to resend page. Matches. |
| Login | blocked user | `login.ts:75` ("...αποκλειστεί") | `services/auth.py:75` (403) | ✅ | Same Greek message. |
| Login | response shape | `{success,message,data:{user,redirectPath}}` `login.ts:126` | view `{user,redirectPath,access,refresh}` `auth.py:52`; fe re-wraps to `{success,message,data:{user,redirectPath}}` `frontend/login.ts:42` | ⚠️ | NEW adds JWT `access`/`refresh` (Better Auth used cookies). Final action shape matches; tokens are extra. |
| Login | username login | OLD requires `@` → username login REJECTED `login.ts:37` | `services/auth.py:102` `login_by_identifier` RESOLVES username→email | ⚠️ | NEW is MORE permissive: accepts username. OLD explicitly blocked it. Frontend action still blocks non-`@` (`frontend/login.ts:30`), so user-facing parity holds; direct API differs. |
| Login | rate limit | none in OLD login | `LoginThrottle` 10/min `auth.py:42`, `settings/base.py:223` | ⚠️ | NEW adds throttle OLD lacked (additive hardening). |
| Register | endpoint | `actions/auth/register.ts:17` | `views/public/auth.py:62` (`RegisterView`); fe `lib/api/auth.ts:73` | ✅ | POST `/api/auth/register`. |
| Register | validation | consent incl 'terms' `register.ts:28`; pw==confirm `register.ts:68`; pro needs username/displayName/role `validations/auth.ts:106-146` | `serializers/auth.py:19` + `services/registration.py:100` | ⚠️ | (a) OLD requires consent array to include literal `'terms'` `register.ts:28`; NEW only requires `consent` non-empty list `registration.py:118`. (b) OLD validates `password===confirmPassword` server-side `register.ts:68`; NEW register takes no confirmPassword at all. (c) auto-username for simple users w/ empty username `register.ts:55` vs NEW keeps username None for simple `registration.py:63`. |
| Register | username collision | OLD appends random 4-digit suffix, pro→error `register.ts:103-123` | NEW appends `-2,-3…` for pro, simple keeps as-is `registration.py:137` | ⚠️ | Different suffix scheme; both pro paths error on hard conflict only if exhausted. |
| Register | side-effects | creates user via Better Auth + Brevo list add `register.ts:154` | creates User+Account+Verification `registration.py:67`; Brevo = TODO `views/public/auth.py:82` | ⚠️ | NEW does NOT send verification email or add to Brevo (both TODO). Email only returned as `devVerificationToken` in DEBUG. **Functional gap** — see Detailed gaps. |
| Register | `confirmed` default | OLD email users `confirmed:true` at signup `config.ts:384` | NEW `confirmed=False` at signup `registration.py:79` | ❌ | Behavior/data mismatch — see gaps. |
| Register | success response | server-side `redirect('/register/success?email=')` `register.ts:177` | JSON `{message,userId,email}` 201 `auth.py:87`; fe returns `{success,data:{userId,email}}` `frontend/register.ts:24` | ⚠️ | OLD redirects server-side; NEW relies on client to navigate. Response shape changed (redirect→JSON). |
| Email verify (GET link) | endpoint | `app/api/verify-email/route.ts:16` | `views/public/auth.py:179` `VerifyEmailRedirectView` | ✅ | GET `/api/auth/verify-email/?token=`. |
| Email verify | success behavior | redirect to callbackURL + SET SESSION COOKIES (auto sign-in) `verify-email/route.ts:53-64`, `config.ts:148` | redirect to `determine_post_verification_redirect`, NO login `auth.py:198` | ⚠️ | NEW does not auto-sign-in after verification (OLD `autoSignInAfterVerification:true`). User must log in. |
| Email verify | failure redirect | `/register/failure?email=<email>` `verify-email/route.ts:70` | `/register/success?verified=false&reason=<code>` `auth.py:194` | ⚠️ | Different URL + query params; OLD failure page is `/register/failure`, exists `app/(auth)/register/failure`. |
| Resend verification | endpoint | `actions/auth/resend-verification.ts:11` | `views/public/auth.py:138` | ✅ | POST `/api/auth/verification/resend`. |
| Resend verification | silent-on-unknown | OLD always success `resend-verification.ts:55` | NEW `ok_silent` → 200 message `registration.py:198`, `auth.py:154` | ✅ | Both avoid leaking existence. |
| Resend verification | already-verified | OLD returns generic success (no special case) `resend-verification.ts:55` | NEW 409 `already_verified` `registration.py:205` | ⚠️ | NEW reveals "already verified" (409) where OLD stayed silent; AND fe relies on `err.code==='already_verified'` (`frontend/resend-verification.ts:18`) which is broken by the code-serialization bug (see gaps). |
| Forgot password | endpoint | `actions/auth/forgot-password.ts:12` | `views/public/auth.py:114` | ✅ | POST `/api/auth/password/forgot`. |
| Forgot password | rate limit | OLD 1 per 10min per-email `forgot-password.ts:9` | NEW 3 per 10min (scoped throttle) `settings/base.py:225` | ⚠️ | Different limit (1 vs 3) and OLD keyed per-email, NEW per-scope/IP. |
| Forgot password | always-success | OLD returns success even on error `forgot-password.ts:58` | NEW generic success msg `auth.py:130` | ✅ | Both hide existence. |
| Reset password | endpoint | `actions/auth/reset-password.ts:9` | `views/public/auth.py:163` | ✅ | POST `/api/auth/password/reset`. |
| Reset password | token+pw validation | token≥1, pw via passwordSchema `validations/auth.ts:183` | `serializers/auth.py:65` + `services/password.py:73` | ✅ | Token consumed one-time `password.py:115`. |
| Reset password | response | `{success,message}` `reset-password.ts:47` | `{message}` `auth.py:176`; fe `{success,message}` `frontend/reset-password.ts:20` | ✅ | Matches via fe wrap. |
| Change password | endpoint | `actions/auth/change-password.ts:13` | `views/public/auth.py:97` | ✅ | POST `/api/auth/password/change`, IsAuthenticated. |
| Change password | validation | new==confirm, new!=current, ≥6 `validations/auth.ts:153` | `serializers/auth.py:46` + `services/password.py:23` | ✅ | Parity incl. "new must differ" rule. |
| Change password | wrong-current error | OLD "Ο τρέχων κωδικός είναι λάθος" `change-password.ts:55` | NEW "Λάθος τρέχων κωδικός" `password.py:45` | ⚠️ | Message wording differs slightly (cosmetic). |
| Username change | endpoint | `actions/auth/change-username.ts:23` | `views/public/account.py:71` | ✅ | POST `/api/auth/username/change`. |
| Username change | rules | pro-only, 7-day cooldown, uniqueness, diff-from-current `change-username.ts:56-96` | `services/account.py:65` (same) | ✅ | Cooldown=7 days both (`change-username.ts:USERNAME_COOLDOWN_DAYS`, `account.py:26`). |
| Username change | side-effects | updates User + Profile in txn + heavy cache revalidation `change-username.ts:105-162` | updates User only; Profile sync = "done lazily by profiles app" comment, NOT called by view `account.py:112`, `account.py:71` | ⚠️ | NEW does NOT sync Profile.username (view never calls a profiles sync). OLD updated Profile. **Data gap.** |
| Username change | response | `{success,message,data:{newUsername,nextChangeDate}}` `change-username.ts:164` | `{message,data:{newUsername,nextChangeDate}}` `account.py:85` | ✅ | nextChangeDate ISO string both. |
| Update account | endpoint | `actions/auth/update-account.ts:25` | `views/public/account.py:53` (PATCH) | ✅ | PATCH `/api/auth/account`. |
| Update account | validation | displayName 5-50 `validations/auth.ts:193` | `serializers/auth.py:70` (same) | ✅ | |
| Update account | side-effects | updates User + Profile (displayName, image, normalized) + Better Auth + cache `update-account.ts:85-160` | updates User only; Profile sync = TODO `account.py:67`, `services/account.py:51` | ⚠️ | NEW does NOT sync Profile displayName/image (view comment `# TODO: profile image/displayName sync`). OLD did. **Data gap.** |
| Delete account | endpoint | `actions/auth/delete-account.ts:26` | `views/public/account.py:94` (DELETE) | ✅ | DELETE `/api/auth/account/delete` (urls `public.py:36`). |
| Delete account | URL mismatch | n/a | view at `/account/delete` `urls/public.py:36`; fe `lib/api/auth.ts:129` calls `/account/delete` BUT `actions/auth/delete-account.ts:19` calls `/auth/account` DELETE | ❌ | The migrated **action** hits the wrong path — see gaps. |
| Delete account | validation | username==confirmUsername & matches session `delete-account.ts:46` | `services/account.py:124` (confirm==user.username) | ⚠️ | NEW validates only `confirmUsername`==user.username (serializer passes `confirmUsername` `account.py:104`); OLD also required `username`==session.username. Effectively same outcome. |
| Upgrade to pro | endpoint | `actions/auth/upgrade-to-pro.ts:20` | `views/public/account.py:109` | ✅ | POST `/api/auth/upgrade-to-pro`. |
| Upgrade to pro | rules | simple-only, username uniqueness, set pro/role/step=ONBOARDING `upgrade-to-pro.ts:53-89` | `services/account.py:149` (same) | ✅ | NEW also reissues JWT `account.py:124`. |
| Upgrade to pro | side-effect | Brevo state change `upgrade-to-pro.ts:92` | none (no Brevo) | ⚠️ | NEW omits Brevo sync. |
| Update user type | endpoint | `actions/auth/update-user-type.ts:21` | `views/public/account.py:132` (PATCH) | ✅ | PATCH `/api/auth/user-type`. |
| Update user type | authz | OLD takes `userId` arg, no ownership check (server action, trusted caller) `update-user-type.ts:21` | NEW enforces `userId==request.user.id` else 403 `account.py:143` | ✅ | NEW stricter (good). Sets step=OAUTH_SETUP both `update-user-type.ts:54`, `account.py:218`. |
| OAuth setup/complete | endpoint | `actions/auth/oauth-setup.ts:12` | `views/public/oauth_setup.py:33` `OAuthSetupView` | ✅ | POST `/api/auth/oauth/setup`. |
| OAuth setup | rules | username availability + auto-suffix for simple, pro needs username/displayName/role, set step `oauth-setup.ts:36-95` | `services/oauth.py:23` | ⚠️ | NEW does NOT auto-generate username for simple users (OLD `oauth-setup.ts:36` generates from email, then digit-suffix loop). NEW simple user with taken/empty username errors or leaves blank. |
| OAuth setup | side-effects | role via Prisma, preserve Google image, Brevo `oauth-setup.ts:75-110` | sets role/type/step + `ensure_profile_exists` for pro `oauth.py:54-78` | ⚠️ | NEW does not preserve image explicitly nor Brevo; creates Profile for pro (OLD did not create profile here — done at onboarding). |
| OAuth intent store/get | endpoint | `actions/auth/store-oauth-intent.ts:15` (cookie) | `views/public/oauth.py:22` | ✅ | POST/GET `/api/auth/oauth/intent`, httpOnly 10-min cookie `oauth.py:38`, `account.py:28`. |
| OAuth intent | get response | OLD returns `ActionResult<OAuthIntent|null>` `store-oauth-intent.ts:46` | NEW `{intent: …|null}` `oauth.py:52`; fe unwraps `frontend/store-oauth-intent.ts:25` | ✅ | Cookie cleared on read both. |
| Onboarding complete | endpoint | `actions/auth/complete-onboarding.ts:27` | `views/public/onboarding.py:33` | ✅ | POST `/api/auth/onboarding/complete`, IsAuthenticated+IsProfessional. |
| Onboarding complete | validation | image required+https (not blob), bio/category/subcategory/coverage, step must be ONBOARDING `complete-onboarding.ts:36-121` | `onboarding.py:24` bio 20-20000, category/subcategory/coverage; image optional `onboarding.py:25` | ⚠️ | NEW: image OPTIONAL (OLD makes profile image REQUIRED for pros `complete-onboarding.ts:100`); no https/blob URL guard; no `step==ONBOARDING` precondition check. |
| Onboarding complete | side-effects | upsert Profile (visibility, published, normalized fields), step→DASHBOARD, admin email, Brevo `complete-onboarding.ts:124-230` | profiles service `update_basic_info`/`update_portfolio` + step→DASHBOARD `onboarding.py:60-77`; admin email + Brevo = TODO `onboarding.py:79` | ⚠️ | NEW relies on profiles app; admin-notification email + Brevo not sent (TODO). |
| Session (getSession) | endpoint | `actions/auth/server.ts:57` / `client.ts:15` (Better Auth) | `views/public/account.py:35` `SessionView`; fe `lib/api/auth.ts:81` | ✅ | GET `/api/auth/session`, AllowAny, `{user,session}` or `{user:null,session:null}`. |
| Me / current user | endpoint | `server.ts:162` getCurrentUser (+profile) | `views/public/account.py:26` `MeView`; fe `lib/api/auth.ts:85` | ⚠️ | NEW `/me` returns `{user}` only (no profile). fe `getCurrentUser` `frontend/server.ts:74` fetches profile separately via profilesApi — parity preserved at action level. |
| Me/session | response shape (AuthUser) | Better Auth user object (camelCase) | `selectors/users.py:67` `serialize_session_user` (camelCase) | ⚠️ | See Response-shape section — several fields may be missing vs OLD AuthUser (lastUsernameChangeAt, displayUsername present; updatedAt, banExpires casing). |
| Logout / sign-out | endpoint | Better Auth `[...all]` POST signOut `app/api/auth/[...all]/route.ts:4` | catch-all returns `{ok:true}` `oauth_setup.py:108`; fe `logout()` just `clearTokens()` `lib/api/auth.ts:52` | ⚠️ | NEW logout = client clears JWT cookies only; no server-side session/token blacklist. OLD invalidated server session. |
| Exchange token (Supabase JWT) | endpoint | `app/api/auth/exchange-token/route.ts:29` | `views/public/oauth_setup.py:56` `ExchangeTokenView` | ⚠️ | OLD POST takes Better Auth JWT in body, verifies, returns Supabase-signed JWT `{token,expiresIn:900}`. NEW ignores body, mints from `request.user`, `expiresIn:3600`, different claims (`user_role`,`user_type`, iss `django-backend`). 15min→60min TTL. (Cutover-only; flagged.) |
| Token refresh | endpoint | n/a (Better Auth cookie sessions) | `urls/public.py:50` SimpleJWT `TokenRefreshView` | ✅ | New JWT infra; no OLD equivalent (additive). |
| Token verify | endpoint | n/a | `urls/public.py:51` `TokenVerifyView` | ✅ | Additive. |
| Maintenance status | endpoint | `actions/auth/maintenance.ts:14` | `core/views/public/health.py:61` `MaintenanceStatusView` | ✅ | GET `/api/auth/maintenance`. |
| Maintenance | response | `{isUnderMaintenance, message?}` (message from env) `maintenance.ts:20` | `{isUnderMaintenance, message|null}` `health.py:67` | ⚠️ | NEW message hardcoded "We'll be right back." (not from `MAINTENANCE_MESSAGE` env); OLD used env message. |
| Better Auth catch-all | endpoint | `app/api/auth/[...all]/route.ts:4` (real handler) | `oauth_setup.py:68` manifest 404 shim | ⚠️ | NEW catch-all is a stub manifest, not a functional Better-Auth proxy; only `sign-out`-ish paths return ok. Any unmigrated subpath → 404. |
| Username availability check | used internally by register/oauth | Better Auth `isUsernameAvailable` `register.ts:99` | `selectors/users.py:49` `is_username_available` (no public endpoint) | ❓ | No standalone public availability endpoint in NEW; verify the frontend register form doesn't call a live check. |

---

## Detailed gaps (per ❌ / ⚠️)

### ❌ G1 — Custom error `code` is dropped from the JSON envelope (high impact)
- OLD/NEW contract: frontend reads `err.code` to branch (`frontend/actions/auth/resend-verification.ts:18` checks `err.code === 'already_verified'`; `frontend/actions/auth/forgot-password.ts:20` checks `err.code === 'rate_limited'`).
- NEW behavior: `common/exceptions.py:117-123` builds the envelope from `exc.default_code` (the **class attribute**), not the per-instance `code` passed to `ApiError(..., code="already_verified")`. The constructor `exceptions.py:43` stores the code only inside DRF's `detail`, never on `self.default_code`. Result: every `ApiError(code="...")` serializes as `"error"` (or the subclass default), so `already_verified`, `invalid_credentials`, `email_taken`, `username_taken`, `same_username`, `cooldown_active`, etc. all collapse to `code:"error"`.
- Also DRF `Throttled` serializes via the else-branch (`exceptions.py:135`) as `code:"throttled"`, but the frontend expects `"rate_limited"` (`forgot-password.ts:20`) — never matches.
- Impact: frontend special-case branches silently dead; users see generic messages, "already verified" 409 not handled, rate-limit copy not shown.
- Suggested fix: in `json_exception_handler`, for `ApiError` use the instance code: `code = getattr(exc, "detail", None) and getattr(exc.detail, "code", None) or exc.default_code` — or store `self.code = code or self.default_code` in `ApiError.__init__` and read `exc.code`. Align `Throttled` → emit `rate_limited`.

### ❌ G2 — Delete-account action calls the wrong URL
- `frontend/src/actions/auth/delete-account.ts:19` issues `DELETE /auth/account`, but the Django route only exposes DELETE at `/auth/account/delete` (`backend/.../urls/public.py:36`; the bare `/auth/account` is `UpdateAccountView` PATCH-only, `account.py:53`). The typed client helper is correct (`lib/api/auth.ts:129` → `/auth/account/delete`) but the server action bypasses it with a raw `apiRequest('/auth/account', …)`.
- Impact: account deletion via the server action 405s / fails. OLD reliably deleted (`delete-account.ts:60`).
- Suggested fix: action should call `authApi.deleteAccount(...)` or `apiRequest('/auth/account/delete', …)`.

### ❌ G3 — `confirmed` flag diverges at registration
- OLD: email/password users created with `confirmed: true` at signup (`src/lib/auth/config.ts:384`).
- NEW: `confirmed=False` at signup (`services/registration.py:79`), set True only on email verify (`registration.py:181`).
- Impact: `me`/`session.confirmed` differs for unverified users; `requireProfileComplete` (`frontend/actions/auth/server.ts:199` redirects when `!confirmed`) and `canAccessDashboard` (`frontend/actions/auth/client.ts:159`) behave differently. Any UI gating on `confirmed` is affected.
- Suggested fix: decide intended semantics; if matching OLD, set `confirmed=True` at registration in `registration.py:68`.

### ⚠️ G4 — Verification email + Brevo not sent (register / resend / onboarding / upgrade / oauth)
- OLD sends the verification email on signup (`config.ts:115` sendOnSignUp + `:118`) and adds users to Brevo lists at register/onboarding/oauth/upgrade (`register.ts:154`, `complete-onboarding.ts:219`, `oauth-setup.ts:99`, `upgrade-to-pro.ts:92`).
- NEW marks all of these as TODO (`views/public/auth.py:82`, `:129`; `onboarding.py:79`) and only surfaces the token via `devVerificationToken` in DEBUG (`auth.py:92`).
- Impact: in production no user can verify email / receive reset email; Brevo lists never updated. Core flow broken until messaging integration lands.
- Suggested fix: wire `apps.messaging` tasks at the noted TODO sites.

### ⚠️ G5 — Profile sync missing on username-change and update-account
- OLD updates the Profile row alongside the User for username (`change-username.ts:117`) and displayName/image (`update-account.ts:95`), plus cache revalidation.
- NEW updates only the User; the profiles sync is described as "done lazily by the profiles app" but the **views do not call it** (`account.py:71` change-username, `account.py:67` update-account TODO).
- Impact: Profile.username / Profile.displayName / Profile.image go stale → public profile pages and search show old values. Cache revalidation also absent (separate caching domain).
- Suggested fix: call the profiles-app sync from `UpdateAccountView`/`ChangeUsernameView`.

### ⚠️ G6 — Email-verify no auto-login + different failure URL
- OLD: on success sets Better-Auth session cookies (auto sign-in, `verify-email/route.ts:53`, `config.ts:148 autoSignInAfterVerification:true`); on failure → `/register/failure?email=` (`route.ts:70`).
- NEW: no token/session issued on success (`auth.py:198`); failure → `/register/success?verified=false&reason=<code>` (`auth.py:194`).
- Impact: user lands logged-out after verifying (extra login step); the `/register/failure` page (which exists) is no longer used; query-param contract changed.
- Suggested fix: optionally issue JWT + set cookies on success; align failure redirect target/params with the existing pages.

### ⚠️ G7 — Onboarding image no longer required / no https/blob guard / no step precondition
- OLD enforces profile image REQUIRED for pros, rejects `blob:` URLs, requires `https://`, and requires `user.step === 'ONBOARDING'` (`complete-onboarding.ts:36`, `:100-121`).
- NEW makes `image` optional (`onboarding.py:25`), has no URL guard, and no step precondition (only IsProfessional permission).
- Impact: pros can complete onboarding without a valid profile image; bad/blob URLs can persist; users not in ONBOARDING step can call it.
- Suggested fix: replicate the image-required + https + step checks in `CompleteOnboardingView`/serializer.

### ⚠️ G8 — Register validation looseness
- OLD requires consent array to literally contain `'terms'` (`register.ts:28`) and validates `password === confirmPassword` server-side (`register.ts:68`).
- NEW only requires non-empty `consent` list (`registration.py:118`) and accepts no confirmPassword.
- Impact: a client bypassing the form could register without true terms acceptance / without password confirmation. Low user-facing risk (form enforces) but a server-contract weakening.

### ⚠️ G9 — OAuth setup: simple-user username auto-generation dropped
- OLD auto-generates username from email for simple users and digit-suffixes on collision (`oauth-setup.ts:36-58`).
- NEW only lowercases/uses provided username; simple users with empty username get `username=""` (`oauth.py:55` only runs when truthy), and Google image preservation is not explicit.
- Impact: OAuth simple users may end up with no/blank username; Google avatar may be lost.

### ⚠️ G10 — Exchange-token semantics changed (cutover-only)
- OLD verifies a Better-Auth JWT from the request body and returns a Supabase-secret-signed JWT with `aud:'authenticated'`, `iss:'better-auth'`, TTL 15m (`exchange-token/route.ts:61`).
- NEW ignores the body, signs with the Django signing key, claims `user_role/user_type`, `iss:'django-backend'`, TTL 60m (`oauth.py:82`). Marked obsolete-on-cutover but currently a behavior divergence for any code still consuming it.

---

## Response-shape mismatches (OLD vs NEW)

1. **Error code dropped** (G1): OLD frontend expects `error.code` ∈ {`already_verified`,`rate_limited`,...}; NEW always emits class-level default (`error` / `throttled` / `validation_error`). `common/exceptions.py:117`.
2. **Validation error HTTP status**: NEW DRF `serializer.is_valid(raise_exception=True)` returns **400** with `{error:{code:"validation_error",details:{field:[..]}}}` (`exceptions.py:125`), while service-level `FieldErrors` returns **422** (`exceptions.py:74`). Two different statuses for "validation" depending on path. OLD used `{success:false,errors:{field:[..]}}` at 200 (server action). Frontend `register.ts:34` reads `err.details` for both — keys match (camelCase field names), status differs.
3. **Login adds tokens**: NEW `{user,redirectPath,access,refresh}` vs OLD `{success,message,data:{user,redirectPath}}`. Extra `access`/`refresh` top-level keys (`auth.py:52`).
4. **Register success**: OLD = HTTP redirect (no JSON body); NEW = `{message,userId,email}` 201 (`auth.py:87`). `userId`/`email` are new keys; redirect removed.
5. **AuthUser payload** (`selectors/users.py:67`): camelCase preserved (`emailVerified`,`displayName`,`displayUsername`,`banExpires`,`createdAt` ISO). Potentially MISSING vs OLD Better-Auth user: `updatedAt`, `lastUsernameChangeAt`, `name` is present but `displayUsername` vs Better Auth's `displayUsername` ok. Dates are ISO strings (`isoformat()`) — verify the frontend `AuthUser` type still treats them as strings (OLD Prisma returned Date objects in server context). ❓ verify consumer expectations.
6. **Session object**: NEW `session` = `{id: <jti>}` only (`account.py:48`); OLD Better-Auth session had `expiresAt`, `token`, `ipAddress`, `userAgent`, etc. Anything reading `session.expiresAt` breaks. ❓ verify consumers.
7. **Maintenance message**: NEW hardcodes string, ignores `MAINTENANCE_MESSAGE` env (`health.py:69`) vs OLD env-driven (`maintenance.ts:18`).
8. **exchange-token**: `expiresIn` 3600 vs 900; claim names differ (G10).

---

## Counts

matched = 24 partial = 28 missing = 4 needs_verification = 4

(Status tally over matrix rows + gaps; "missing/❌" = G1 error-code, G2 delete URL, G3 confirmed default, delete-account-URL row. "❓ verify" = username-availability endpoint, AuthUser date/field completeness, session-object fields, me-without-profile consumers.)
