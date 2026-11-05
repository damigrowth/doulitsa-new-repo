# Pass 4: adversarial verification, AUTH/ACCOUNTS cluster (2026-11-05)

Verifier: I re-derived each finding from code (OLD `oldnext/`, NEW `frontend/` + `backend/`), assuming the reporter could be wrong. No code changes, no git commands.

Library evidence for OLD behaviour comes from the better-auth **1.3.28** dist at `~/Desktop/advanza/templates/dashboard-template/node_modules/{better-auth,@better-auth/core}`. Old prod pinned `>=1.4.19 <1.5`, so every verdict that rests on library internals carries a "1.3→1.4 unchanged" caveat (marked †). DRF behaviour was checked against the DRF **3.15.2** source (the backend pins `>=3.15,<3.16`).

Inputs: auth-accounts.md D1–D24, pass3-auth-accounts.md P3-D1–D7 and C1–C5, pass2-authz-security D1/D3/D4/D8/D9, pass2-state-machines D1/D2/D3, pass2-validation-matrix D1/D3/D6 and 3b, pass3-lib-shared S-D1 and C1 (throttles), and lib-shared-sweep D11.

Id prefixes: A = auth-accounts, P3 = pass3-auth, AZ = pass2-authz, SM = pass2-state-machines, VM = pass2-validation-matrix, LS = lib-shared.

---

## 0. Resolution of the throttle contradiction (affects A-D12, A-D13, LS-D11, P3 §5)

- **DRF side:** `rest_framework/throttling.py:219-225` (3.15.2) does `self.scope = getattr(view, 'throttle_scope', None)` and returns True when it is falsy. That overwrites the class-level `scope` that `common/throttling.py:72-105` sets on `LoginThrottle`, `RegisterThrottle`, `PasswordResetThrottle` and `VerificationResendThrottle`. A grep for `throttle_scope` in apps/, common/ and config/ finds 0 hits. **So every scoped throttle is a no-op.**
- **The global throttles do not apply either.** `LoginView`, `RegisterView`, `ForgotPasswordView` and `ResendVerificationView` set `throttle_classes = [<Scoped>]` (`views/public/auth.py:42,66,134,158`). That *replaces* `DEFAULT_THROTTLE_CLASSES` (`base.py:240-247`), so the anon 100/5s and user 200/5s limits are not applied to them either. **These four endpoints have no rate limit at all.**
  - `ResetPasswordView`, `ChangePasswordView` and SimpleJWT `TokenRefreshView` keep the defaults, so anon/user apply there.
- **OLD:**
  - better-auth rate-limits only inside its HTTP router (`better-auth/dist/api/index.mjs:698-712`, `onRequest → onRequestRateLimit`)†.
  - The old server actions call `auth.api.*` directly, so login, register and resend were unthrottled in OLD as well.
  - The only OLD limit was forgot-password: `checkMemoryRateLimit('forgot:'+email, 1, 10min)` (`actions/auth/forgot-password.ts:28-40`). It is in-memory, so it was per serverless instance (best-effort).
- **Net:**
  - Login, register and resend: parity (both unthrottled). This is a security note, not a regression.
  - Forgot-password: a regression from "1/10 min per email" to **unlimited**.
  - The "English throttle message" claims are moot, because nothing throttles.

---

## 1. Verdict table

| Finding | Verdict | Sev (verified) | Evidence (OLD ⇄ NEW) | Group |
|---|---|---|---|---|
| A-D1 verify link: no sign-in; failure → wrong page | CONFIRMED | HIGH | OLD `lib/auth/config.ts:148` autoSignIn; `app/api/verify-email/route.ts:46-74` (cookies forwarded; failure → `/register/failure?email=`); better-auth verifyEmail sets session† ⇄ NEW `backend/apps/accounts/views/public/auth.py:212-222` (no cookies; failure → `/register/success?verified=false&reason={exc.default_code}`); `common/exceptions.py:30,47` (`default_code` is always `"error"`); `frontend/src/app/api/verify-email/route.ts`; `form-resend-verification.tsx:67` (button only with `email`) | G1 |
| P3-D3 verification token single-use | CONFIRMED | MEDIUM | OLD stateless JWT, no consumed state (better-auth `BOULxa5h.mjs` verifyEmail: jwtVerify → updateUser → createSession)† ⇄ NEW `services/registration.py:192-199,225` (row deleted on first use) | G1 |
| A-D15 resend responses | CONFIRMED | MEDIUM | OLD `actions/auth/resend-verification.ts:28-59` (always success copy); better-auth sendVerificationEmail without a session returns `status:true` for unknown and verified emails† ⇄ NEW `views/public/auth.py:168-172` (`exc.default_code=="ok_silent"` is never true) + `registration.py:245-256` (409 already_verified; `status_code=200` + error envelope) → `lib/api/client.ts:414` only throws on `!res.ok`, so the action returns `{success:true, message:undefined}`; `form-resend-verification.tsx:27-31` (no cooldown, no alert) | G1 |
| P3-D1 Google simple signup always rejected | CONFIRMED | CRITICAL | OLD `components/forms/auth/form-oauth-setup.tsx` (auto-submit role='user'), `actions/auth/oauth-setup.ts` accepts user/freelancer/company ⇄ NEW `form-oauth-setup.tsx:174-186,205-213` (appends role='user') → `actions/auth/oauth-setup.ts:14,20` forwards it → `views/public/oauth_setup.py:29` `ChoiceField(("freelancer","company"))` gives 400 "One or more fields are invalid." (`exceptions.py:129-135`); `services/oauth.py:74` is never reached | G2 |
| A-D2 type=pro/role=user not repaired at onboarding | CONFIRMED | HIGH | OLD `actions/auth/complete-onboarding.ts:43-58,141-146` ⇄ NEW `views/public/onboarding.py:40` (`IsProfessional`) + `permissions/roles.py` IsProfessional ("Professional account required.", English 403); `frontend/src/actions/auth/complete-onboarding.ts:30-37` sends no role; `actions/auth/server.ts:183-194` locks type=pro to /onboarding | G3 |
| A-D3 Google pro without role → role=user | CONFIRMED | MEDIUM | OLD `form-auth-register.tsx:189-196` guard; `config.ts:283-289` default freelancer; old oauth-setup role enum + default ⇄ NEW guard removed (diff); `services/google_oauth.py:49-52,120` (role None → USER); `form-oauth-setup.tsx:70,154` (`z.string().min(1)`, default `userRole` = 'user') → `oauth_setup.py:29` rejects | G3 |
| A-D4 confirmed=false / expired bans locked out silently | CONFIRMED | HIGH (needs data count) | OLD `actions/auth/login.ts:75-80` checks only `blocked`; admin plugin session hook auto-unbans an expired ban (`CcYw7b-A.mjs:100-131`)† ⇄ NEW `models/user.py:143-146` `is_active = confirmed and not blocked and not banned`; SimpleJWT `get_user` rejects inactive users; `common/authentication.py:37-47` silently returns None; `services/auth.py:77,86-101` issues tokens without checking `confirmed`; `ban_expires` is written (`admin_users.py:312,327`) but never read | G4 |
| A-D5 Google login: no blocked/banned check or message | ADJUSTED | LOW-MEDIUM | OLD: the admin-plugin hook blocks **banned** users at the OAuth callback with an error redirect (`CcYw7b-A.mjs:120-125`)†. OLD did **not** check `blocked` for Google at all (only `login.ts:75` for email) ⇄ NEW `google_oauth.py:109-153` has no check; the user becomes silently anonymous (G4 mechanism) | G4 |
| A-D6 min password 8 → 6 | CONFIRMED | MEDIUM (product decision) | OLD better-auth `minPasswordLength … \|\| 8` (`BLRq-uZX.mjs:117`) enforced in reset/change (`BOULxa5h.mjs:2266,2356`)†; `form-reset-password.tsx` min 8 ⇄ NEW `serializers/auth.py:21,47-48,67`, `frontend/src/actions/auth/reset-password.ts:15` (6) | G6a |
| A-D7 no self-heal for incomplete pros at DASHBOARD | CONFIRMED | MEDIUM | OLD `actions/auth/server.ts:409-438` ⇄ NEW `frontend/src/actions/auth/server.ts:183-185` (DASHBOARD → null) | G11 |
| A-D8 onboarding server validation weaker | ADJUSTED | LOW | OLD `complete-onboarding.ts:94-108` (`onboardingFormSchemaWithMedia`) ⇄ NEW `onboarding.py:24-30` (bio 20–20000 raw, coverage any JSON, portfolio unbounded). The client zod schema is unchanged, so only crafted requests are affected: data integrity, not a user-visible bug | G6b |
| A-D9 onboarding toast + profile type/user-field sync | CONFIRMED | LOW | OLD `complete-onboarding.ts:152,164-167,251` ⇄ NEW `onboarding.py:130-131,161`; `profile_updates.py:429-442` (user fields copied only on create) | G9 |
| A-D10 simple users get no displayName | CONFIRMED | MEDIUM | OLD `actions/auth/register.ts:59-63` (`formatDisplayName(displayName \|\| username)`) ⇄ NEW `services/registration.py:85-86` (`display_name=None` for simple) | G10 |
| A-D11 consent / confirmPassword not checked server-side | ADJUSTED | LOW | OLD `register.ts:25-36,65-76` ⇄ NEW `frontend/src/actions/auth/register.ts:12` + `form-auth-register.tsx:168` (consent JSON string → `['[]']` passes `serializers/auth.py:35`); confirmPassword never sent. Reachable only with a crafted request; the client zod schema still blocks | G6b |
| A-D12 error copy: duplicate email, English validation, throttles, OAuth setup | ADJUSTED | MEDIUM | Duplicate email `registration.py:63` ⇄ OLD `better-auth-error.ts:20-25`: confirmed. English "One or more fields are invalid." `exceptions.py:133`: confirmed. OAuth setup English `services/oauth.py:38-46`: confirmed. **Throttle-message part REFUTED** (§0: never fires) | G9 |
| A-D13 forgot-password limit semantics/copy | ADJUSTED | MEDIUM | OLD `forgot-password.ts:9-40` (1/10 min per email + Greek minutes copy) ⇄ NEW: **no limit at all**, not "3/10 min per IP" (§0; `auth.py:134`, DRF `throttling.py:221-225`). The frontend `rate_limited` branch (`frontend/src/actions/auth/forgot-password.ts:20-21`) is dead code | G7 |
| LS-D11 forgot-password per-email → per-IP | ADJUSTED (merged into A-D13) | MEDIUM | same as A-D13; "3 per 10 min per IP" is wrong: unbounded | G7 |
| A-D14 reset-password result copy | CONFIRMED | LOW | OLD `reset-password.ts:43,49,61` ⇄ NEW `views/public/auth.py:199`, `services/password.py:93,103`; `form-reset-password.tsx:200` (`includes('λήξει')` matches only the expired message, not "Μη έγκυρο token") | G9 |
| A-D16 session 7 d → 3 d idle; host-only cookies | CONFIRMED (possibly intentional) | MEDIUM | OLD better-auth default 7 d/1 d†; `config.ts:60-66` crossSubDomain (prod) ⇄ NEW `lib/auth/cookies.ts:37-39` (3 d cookie); backend default 14 d unless env (`base.py:281`); the env value is unverifiable from repo | G8 |
| A-D17 guard / redirect edge cases | CONFIRMED | LOW | OLD `oauth-callback/page.tsx:41`, `server.ts:316-346` (requireRole → /login), `:392,397` (skip admin only; simple users pass), old `redirectCompletedUsers` (DASHBOARD only), `redirectOAuthUsersToSetup` (google only) ⇄ NEW `callback/google/route.ts:94` (admin only → /admin), `server.ts:145-163` (→ '/'), `:184-194`, `:243-255`, `:257-266` | G11 |
| A-D18 welcome email sent directly at verification | CONFIRMED | MEDIUM (live check) | OLD: `sendWelcomeEmail` is imported in `config.ts:9` but never called; the `:431` comment says Brevo automation sends it ⇄ NEW `registration.py:231-233` `send_welcome_email.delay`. Whether this duplicates depends on the Brevo automation (live check) | — (Emails) |
| A-D19 reset/verification mails lose the name | CONFIRMED | LOW | OLD `config.ts:98-107,127-142` ⇄ NEW `views/public/auth.py:145` (no name), `:86-91` (request data; None for simple users) | G10 |
| A-D20 login order / limits / banned copy | CONFIRMED | LOW | OLD better-auth: password → EMAIL_NOT_VERIFIED before session (so before the banned hook)†, then `login.ts:75` ⇄ NEW `services/auth.py:77-92` (blocked/banned before verified) | G9 |
| A-D21 register edge cases | ADJUSTED | LOW | OLD `registerSchema.username min(3)` (`validations/auth.ts:63-66`), so emails whose sanitized local part is under 3 characters **failed registration** in OLD ⇄ NEW `registration.py:152-168` (no length check). The claimed "500 on unique collision" is REFUTED: `resolve_simple_username` checks `is_username_available('')` and suffixes digits, so it yields usernames like `''` or `'4821'`, not a 500 (only a concurrent race could collide) | G6b |
| A-D22 account/username copy + small behaviours | CONFIRMED | LOW | NEW `views/public/account.py:90,156`, `services/account.py:46-48` (image null cannot clear), `:68` (case-sensitive confirm), `:196` (role gate) ⇄ OLD texts as cited | G9 |
| A-D23 exchange-token contract | CONFIRMED (intentional, obsolete) | LOW | `views/public/oauth_setup.py:56-65`, `services/oauth.py:102-125` | — |
| A-D24 updateUserType scoped to self | CONFIRMED (fix) | INFO | OLD `update-user-type.ts:22,50` (any userId) ⇄ NEW `account.py:173-175` | — |
| P3-D2 refresh-rotation race logs out | CONFIRMED (live repro advised) | MEDIUM | `middlewares/withTokenRefresh.ts:47-110` (per-request; 400/401 → delete both cookies :95-109); `base.py:282-283` rotate+blacklist; `client.ts` `inFlightRefresh` is per-process only | G8 |
| LS S-D1 refresh 429/5xx in a server action clears cookies | CONFIRMED | MEDIUM | `lib/api/client.ts:241-251` (`!res.ok → clearTokens()`), `:389-401`; middleware matcher skips `next-action` (`middleware.ts:20-27`); `use-unread-count.ts:30-31` polls every 60 s; refresh fetch sends no IP/secret, so the anon bucket is keyed on the container | G8 |
| P3-D4 Google: first/last name not stored | CONFIRMED | LOW | OLD `config.ts:174-189` ⇄ NEW `google_oauth.py:105,113-128` | G5 |
| P3-D5 registration store persisted | CONFIRMED | LOW | OLD `lib/stores/authStore.ts` (in-memory, comment) ⇄ NEW `authStore.ts:51` `persist(...)` | — |
| P3-D6 verified pro at TYPE_SELECTION/OAUTH_SETUP → /onboarding | CONFIRMED (deliberate repair) | LOW | OLD `login.ts:122-123` ⇄ NEW `services/auth.py:153-154`, `onboarding.py:52-60` | G11 |
| P3-D7 OAuth failure shows no message | CONFIRMED | LOW | NEW `callback/google/route.ts:55-61` (`?error=`) vs `form-auth-login.tsx:55` (reads only `message`) | G9 |
| AZ-D1 API keys are global bearer credentials | CONFIRMED (one sub-claim adjusted) | HIGH | OLD `actions/admin/api-keys.ts:20-61` validate-only; no other caller (grep); better-auth `enableSessionForAPIKeys ?? false` (`C20TDaBo.mjs:1802`)† ⇄ NEW `base.py:221-229`, `common/authentication.py:50-97` (plaintext `==`, no owner `is_active`/role check, env key → oldest admin), `admin_api/services/api_keys.py:26,36,71` (raw key stored). Sub-claim "unauthenticated validation oracle" is **parity**: OLD `validateAdminApiKey` is an un-gated `'use server'` action, also callable anonymously | G12 |
| AZ-D3 support can set admin password / demote / revoke | CONFIRMED | MEDIUM | OLD custom roles lack `set-password`/`set-role`/`impersonate` (`lib/auth/permissions.ts:69-125`); better-auth `hasPermission` (`BjOWrlEY.mjs:3-19`) + `set-user-password` check (`CcYw7b-A.mjs:1386-1397`)†, bypass only via `ADMIN_USER_IDS` (`config.ts:478`) ⇄ NEW `views/admin/users.py:127-215`, `services/admin_users.py:176-183,343-358` (no target-role check) | G12 |
| AZ-D4 Google links without checking `email_verified` | **REFUTED** (as a parity diff) | — | OLD `mapProfileToUser` returns `emailVerified: true` (`config.ts:179`), and core spreads `...userMap` over `emailVerified: user.email_verified` (`@better-auth/core/dist/social-providers/index.mjs:858-868`)†. So `handleOAuthUserInfo`'s `!userInfo.emailVerified` guard (`BOULxa5h.mjs`) could never fire: OLD linked unconditionally too. NEW `google_oauth.py:101-146` = same outcome. Hardening is optional, not a regression. The `confirmed=True` sub-claim is real; see SM-D1 | (G5) |
| AZ-D8 `/api/auth/[...all]` dot-segment traversal | UNVERIFIABLE-FROM-REPO | LOW | `frontend/src/app/api/auth/[...all]/route.ts:19` joins decoded params into `new URL(...)`. Node check: `new URL("http://b/api/auth/%2E%2E/%2E%2E/django-admin/")` → `/django-admin/`. Single-encoded `%2E%2E` is probably normalized before routing; the **double-encoded** form (`%252E%252E`) survives routing, is decoded to `%2E%2E` in params, and then collapses | — |
| AZ-D9 Google `next` open redirect | ADJUSTED | LOW (near-unreachable) | `oauth/google/login/route.ts:30,48`, `callback/google/route.ts:44,91-96` confirmed unvalidated. But `exchange_code` (`google_oauth.py:132-143`) calls `save()` for any unverified or unconfirmed user, and the `User.save` hook (`user.py:199-211`) then advances EMAIL_VERIFICATION → ONBOARDING/DASHBOARD. So `dest = next` is reached only for a user already `email_verified & confirmed & image` set **and** still at EMAIL_VERIFICATION (an inconsistent legacy state). There are only 5 steps (`user.py:40+`); the other four override `next` | — |
| SM-D1 Google login re-confirms (`confirmed=true`) | CONFIRMED | MEDIUM | OLD linking touches only `emailVerified` (`BOULxa5h.mjs` handleOAuthUserInfo), and update.after only changes step for provider=email (`config.ts:416-420`)† ⇄ NEW `google_oauth.py:135-137` | G5 |
| SM-D2 `User.save` auto-advance on every save | CONFIRMED | LOW | OLD `config.ts:416-453` (only on the verify update, provider=email) ⇄ NEW `models/user.py:199-211`; `admin_users.py:259-269,276-280,297-300` | G5 |
| SM-D3 OAuth setup creates a stub Profile | CONFIRMED | LOW | OLD `actions/auth/oauth-setup.ts` (User only) ⇄ NEW `services/oauth.py:84-89` → `profile_updates.py:429-442` (`published`/`is_active` default False, `profiles/models/profile.py:118-119`) | — |
| VM-D1 server trims passwords | ADJUSTED | MEDIUM (was HIGH) | OLD `lib/utils/form.ts:14-16` (no trim), `validations/auth.ts:42-45,153-170` (no `.trim()`) ⇄ NEW `serializers/auth.py:16,21,47-49,67` (DRF `trim_whitespace=True` default). Real, but it affects an unknown, likely tiny set of legacy passwords, and forgot-password recovers them. A lockout of an unknown subset with self-service recovery is MEDIUM | G6a |
| VM-D3 email validation looser | CONFIRMED | LOW | OLD `validations/shared.ts:13` `z.email()` (zod ^4.0.5, `oldnext/package.json:140`) in `registerSchema` (`auth.ts:60`) ⇄ NEW `serializers/auth.py:20,39,62` `EmailField` | G6b |
| VM-D6 change/reset capped at 100 | ADJUSTED | INFO | The claimed impact is REFUTED. OLD `loginSchema.password.max(100)` (`validations/auth.ts:42-45`) means a 101–128-character password set in OLD **could not log in on OLD either**. The only residual difference: a change-password with a 101–128-character new password now gets an English DRF error (client has no max) instead of succeeding into an unusable password. NEW is arguably safer | G6a |
| P3-C1 (simple-user OAuth claim wrong) | CONFIRMED | — | = P3-D1 | G2 |
| P3-C2 (store persistence) | CONFIRMED | — | = P3-D5 | — |
| P3-C3 (token semantics) | CONFIRMED | — | = P3-D3 | G1 |
| P3-C4 (upgraded simple user → Profile.display_name NULL) | CONFIRMED | (part of A-D10) | `services/account.py:195+` + `profile_updates.py:436` copies `user.display_name` (None) | G10 |
| P3-C5 (deleteUser freshAge moot) | CONFIRMED† | — | `BOULxa5h.mjs:2524-2528` (`freshAge*1e3` then `>freshAge*1e3`); unverified for 1.4 | — |
| VM-3b corrections (oauth-setup inline schema; OAuthSetup displayName 80; D1+D6 interplay) | CONFIRMED | — | `form-oauth-setup.tsx:70`; `oauth_setup.py:28` | G3 / G6a |

---

## 2. Canonical groups (one fix each)

- **G1: Email verification flow.** Covers A-D1, P3-D3, A-D15 and P3-C3.
  - Root causes:
    - (a) The verify endpoint never issues a session.
    - (b) `exc.default_code` is used where `exc.code` is meant (`auth.py:170,219`).
    - (c) The token is deleted on first use.
  - Fix:
    - On success, `issue_tokens(user)` and have the Next proxy set `dj_access`/`dj_refresh` before redirecting.
    - On failure, redirect to `/register/failure?email=<record.identifier>`.
    - If the token is unknown but its user is already verified, redirect to the success target or `/login`.
    - Replace `default_code` with `code` in both views.
    - Resend: return the OLD always-success copy (no 409, no silent 200-error).
- **G2: Google simple-user setup rejected.** Covers P3-D1. CRITICAL.
  - Fix: send `role` only when `type==='pro'` (`actions/auth/oauth-setup.ts:20`), or accept `"user"` in `OAuthSetupSerializer.role`.
  - Data: find accounts already stuck with `SELECT … WHERE provider='google' AND type='user' AND step IN ('OAUTH_SETUP','TYPE_SELECTION')`.
- **G3: Pro accounts without a pro role.** Covers A-D2, A-D3 and the VM-3b inline schema.
  - Fix:
    - Restore the register-form guard, the OLD `_parse_intent` default (freelancer for a pro intent), and the setup-form default and enum.
    - Re-add the onboarding role picker, and let `CompleteOnboardingView` accept `role` when `type=pro and role=user`. That means replacing `IsProfessional` with a type=pro check plus the OLD effective-role logic.
- **G4: Account-status gating.** Covers A-D4 and A-D5.
  - Fix:
    - `is_active` = `not blocked and not (banned and (ban_expires is None or ban_expires > now))`. Drop `confirmed`, or decide it explicitly after a prod count.
    - Auto-clear expired bans as better-auth did.
    - Check blocked/banned in `google_oauth.exchange_code` and redirect to `/login?message=<Greek>`.
- **G5: Google exchange / save-hook side effects on existing users.** Covers SM-D1, SM-D2 and P3-D4.
  - Fix:
    - Stop setting `confirmed` (and the image) for existing users.
    - Store `given_name`/`family_name`.
    - Narrow the `User.save` hook to the transition (an `email_verified` False→True flip) instead of every save, and stop forcing `confirmed`.
- **G6a: Password field semantics.** Covers A-D6, VM-D1 and VM-D6.
  - Fix: `trim_whitespace=False` on all password `CharField`s (also `admin_users.py:84,111`). Decide min 6 vs 8 as a product call. The max-100 cap is harmless.
- **G6b: Server-side validation gaps.** Covers A-D8, A-D11, A-D21 and VM-D3.
  - Fix:
    - Port the OLD zod rules into serializers: consent must contain `terms` (parse the JSON), simple username at least 3, email regex, bio stripped 80–5000, coverage refine, portfolio at most 10.
- **G7: Rate limiting.** Covers A-D13 and LS-D11, plus the §0 note for login/register/resend.
  - Fix: make the scoped throttles real. Set `throttle_scope` on the views, or subclass `SimpleRateThrottle` so the class `scope` is honoured. Add the OLD per-email 1/10 min key for forgot-password and the Greek minutes copy.
  - Also keep `AnonRateThrottle` in the `throttle_classes` lists, which currently replace the defaults.
- **G8: Session lifetime / spurious logout.** Covers P3-D2, LS S-D1 and A-D16.
  - Two independent fixes:
    - (a) In `refreshAccessToken`, clear cookies only on 400/401, add a timeout, and forward the IP and secret.
    - (b) Rotation race: either a grace window for the previous refresh token, or don't delete cookies when the request's refresh token differs from the current cookie.
  - A-D16 (3 d vs 7 d) is a product decision.
- **G9: Copy and messages.** Covers A-D9, A-D12 (minus the throttle part), A-D14, A-D20, A-D22 and P3-D7.
  - Fix: restore the OLD Greek strings; map `/login?error=` to a Greek alert; give DRF validation failures a Greek summary.
- **G10: Display name.** Covers A-D10, A-D19 and P3-C4.
  - Fix:
    - `display_name = formatDisplayName(display_name or username)` server-side for both types.
    - Pass `user.display_name`/`username` to the reset and verification mail tasks.
- **G11: Guards and redirects.** Covers A-D7, A-D17 and P3-D6.
  - Fix:
    - Port the DASHBOARD self-heal (missing image/category/subcategory → ONBOARDING + Brevo).
    - The Google callback should send support/editor to `/admin`.
    - Decide whether the deliberate pro lock and the P3-D6 repair stay (both look intentional).
- **G12: Admin authorization.** Covers AZ-D1 and AZ-D3.
  - Fix:
    - Remove `ApiKeyAuthentication` from the defaults.
    - Hash keys and compare in constant time.
    - Check the owner's active status and role.
    - Refuse password/role/session/ban/delete/basic-info writes on admin-like targets unless the actor is admin.
- **Standalone:** A-D18 (Emails; live Brevo check), SM-D3, A-D23, A-D24, P3-D5, AZ-D8, AZ-D9.

---

## 3. Notes on each non-CONFIRMED verdict

- **A-D5 (ADJUSTED, LOW-MEDIUM).**
  - OLD Google sign-in never checked `blocked`: only the email `login.ts:75` did, and better-auth knows nothing about `blocked`. So a blocked user signed in with Google normally in OLD.
  - Only `banned` (unexpired) was refused, at session creation, with a redirect to better-auth's English `/api/auth/error?error=banned` page.
  - NEW silently denies both blocked and banned users via `is_active`. The real regressions are the missing message for banned users and the ignored ban expiry (G4). Denying blocked users is arguably a fix.
- **A-D8 / A-D11 (ADJUSTED, LOW).** Both code claims are true, but the unchanged client zod schemas block every UI path, so there is no user-visible behaviour change; only crafted API calls are affected.
- **A-D12 (ADJUSTED).** The throttle sub-bullet is refuted: no throttle can fire on login, register or resend (§0). Everything else stands.
- **A-D13 / LS-D11 (ADJUSTED, still MEDIUM).**
  - The reports say NEW is "3/10 min per IP". It is actually unlimited.
  - An attacker can mail-bomb any address via `/api/auth/password/forgot` with no limit at all.
  - OLD's limit was per serverless instance, so even OLD was best-effort.
- **A-D21 (ADJUSTED).**
  - The 500 claim does not reproduce. Collision handling suffixes digits, so for example a second `''` local part becomes `'4821'`.
  - The real difference is the reverse of what the report implies: OLD **rejected** registration for emails whose sanitized local part is under 3 characters (`registerSchema.username.min(3)`, plus the username plugin). NEW accepts them with junk usernames (`''`, `'ab'`, `'4821'`).
- **AZ-D1 sub-claim (ADJUSTED).** The "unauthenticated oracle" exists in OLD too: `validateAdminApiKey` is an exported `'use server'` function with no session gate. All the other points stand at HIGH.
- **AZ-D4 (REFUTED).**
  - OLD's account-linking guard was neutralized by its own `mapProfileToUser`, which hard-codes `emailVerified: true` and is spread last in `@better-auth/core` google `getUserInfo`. So OLD linked any Google identity to the same-email account, exactly like NEW.
  - The 1.4.x code was not inspected (†). If 1.4 changed the spread order, this would flip. Settle it by reading `@better-auth/core` 1.4.19 `social-providers` google `getUserInfo`.
- **AZ-D8 (UNVERIFIABLE).** The `new URL()` collapse is proven locally. Whether Next 15 passes the encoded segments through depends on its router. Live check: `curl -i 'https://test.doulitsa.gr/api/auth/%252E%252E/%252E%252E/api/health'`, also with `%2E%2E`. A 200 health body means traversal works.
- **AZ-D9 (ADJUSTED, LOW).** The unvalidated redirect is real code. The "EMAIL_VERIFICATION user" example is wrong, because exchange-time `save()` plus the `User.save` hook advances that step before routing. Still fix it (`next` must start with `/` and not `//`); it is cheap.
- **VM-D1 (ADJUSTED, HIGH → MEDIUM).** The behaviour is confirmed. The severity was lowered because the population is unknowable and likely tiny, and forgot-password is a self-service recovery.
- **VM-D6 (ADJUSTED, INFO).** The impact claim is refuted: OLD's login schema capped passwords at 100, so the described user could not log in on OLD either.

## 4. Contradictions resolved

- **Throttles:** pass-1 auth (D12/D13), lib-shared D11 and pass3 §5 assume active throttles. lib-shared pass3 C1 and profiles-dashboard pass3 C1 say they are no-ops. **C1 is correct, and understated:** the auth views also drop the global anon/user throttles (§0).
- **AZ-D4 vs SM-D1:** both cite `google_oauth.py:131-146`. The linking half (AZ-D4) is parity. The `confirmed` half (SM-D1) is a genuine regression.
- **A-D4 vs SM-D1:** a Google login heals the `confirmed=false` lockout for Google users only. Fix G4 and G5 together, or A-D4's scope stays hidden.
- **P3-D2 vs S-D1:** both are "random logout", with distinct roots: the concurrency race vs. clearing cookies on 5xx/429. They are grouped in G8 with two separate fixes.

## 5. Live checks that settle open items

1. `SELECT count(*) FROM users WHERE confirmed=false;` and `… WHERE banned AND "banExpires" < now();` (A-D4 severity).
2. `SELECT count(*) FROM users WHERE provider='google' AND type='user' AND step IN ('OAUTH_SETUP','TYPE_SELECTION');` (P3-D1 victims), and `… WHERE type='pro' AND role='user';` (A-D2/D3 victims).
3. Dokploy env `SIMPLE_JWT_REFRESH_LIFETIME_DAYS` (A-D16). Whether the Brevo welcome automation is still active (A-D18).
4. The AZ-D8 curl above. Whether `ADMIN_API_KEY` is set and `api_keys` has rows (AZ-D1).
5. The better-auth 1.4.19 source for the † items: `getUserInfo` spread order, `minPasswordLength` default, the verifyEmail statelessness, and `freshAge`.
