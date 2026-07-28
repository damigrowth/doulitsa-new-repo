# Auth & Authorization (RLS) Parity

**Scope:** Authorization (Supabase RLS → Django/DRF) + auth session security, whole app.
**OLD:** Next.js + better-auth + Supabase RLS + Prisma (`app_before_migrations/`).
**NEW:** Django/DRF (`backend/`).

## Architecture summary (how authorization moved)

- **OLD model.** Postgres RLS enforced row access. Two enforcement paths:
  - HTTP/PostgREST: policies match `auth.jwt() ->> 'sub'` (the better-auth JWT `sub` claim, set in `lib/auth/config.ts:499-511`, 15m expiry).
  - Realtime: policies match `current_user_id()` set via `set_user_id()` RPC session var (`lib/supabase/client-rls.ts:145-165`, `server-rls.ts:67-83`).
  - Admin escalation: policies match `auth.jwt() ->> 'role' = 'admin'`. App-level RBAC in `lib/auth/roles.ts` / `permissions.ts`.
  - **Important:** Most data-mutation in the OLD app went through Prisma server actions using the privileged DB connection (RLS bypassed), with authorization done in the action code. RLS was a defense-in-depth layer, and several policies were **latent** (no OLD app feature ever exercised them — see gaps).
- **NEW model.** No Postgres RLS. Authorization is enforced in Django via: (a) DRF `permission_classes`, (b) `get_queryset()` / selector filtering, (c) service-layer ownership checks raising 403/404. Admin RBAC is ported verbatim from `roles.ts` into `apps/accounts/permissions/admin.py` (`ROLE_PERMISSIONS`, `HasResourcePermission(resource, level)`), mirroring full/edit/view and admin/support/editor roles.

The correct parity question is **"does NEW enforce the same effective row access the OLD app delivered?"** — answered per policy below. RLS policies that existed in Postgres but were never reachable from OLD app code are flagged as `LATENT` (not a regression), but called out because they widen behavior if any NEW endpoint is added later.

---

## RLS policy matrix

`pg_policies` rows are from the live DB (`django` DB, 81 policies). `sub = auth.jwt()->>'sub'`.

| Table/policy | OLD rule | OLD source | NEW enforcement (file:line) | Status | Security impact |
|---|---|---|---|---|---|
| **accounts** users_read/update/delete_own (userId=sub); system_insert | Owner-only CRUD on OAuth provider links | pg_policies; better-auth `Account` | Managed via accounts services; not user-exposed as REST CRUD. Password account read/write owner-scoped in `services/account.py`, `password.py:36` | ✅ OK | Internal table; no public list endpoint → no leak |
| **users** users_read/update_own (id=sub); public_read (confirmed & !blocked & !banned); admins_update; system_insert | Self read/update; public can read confirmed/unbanned users; admin update | pg_policies | Self: `selectors/users.py serialize_session_user`; public profile reads gated separately; admin: `HasResourcePermission(USERS, ...)` `views/admin/users.py`. No public bulk `users` list endpoint | ✅ OK | NEW exposes user data only via profile endpoints w/ published filter |
| **profiles** users_read/create/update/delete_own (uid=sub) | Owner CRUD | pg_policies; `actions/profiles/*` | `services/profile_updates.py:21-36` `_require_pro_owner` loads `Profile.objects.filter(user_id=user.id)` or 404; `views/public/profile.py:161-170` me-read by user id | ✅ OK | Owner writes enforced |
| **profiles** public_read_published (published=true AND isActive=true) | Public reads only published+active | pg_policies | `selectors/profile_reads.py:14-17` `.filter(published=True, is_active=True)` | ✅ OK | Filter present |
| **profiles** admins_read_all / admins_update | Admin read+update all | pg_policies | `views/admin/profiles.py:31-99` `HasResourcePermission(PROFILES, view/edit/full)` | ✅ OK | Properly gated |
| **services** users CRUD own (pid IN my profiles) | Owner CRUD via profile | pg_policies; `actions/services/*` | `services/service_writes.py:90-190` `_require_profile`, `_owner_or_404(service_id, profile)`; `selectors/service_reads.py:109-113,381` owner filter | ✅ OK | Owner enforced on update/delete |
| **services** public_read_published (status='published') | Public reads published only | pg_policies | `selectors/service_reads.py:26-27` `_public_qs().filter(status=PUBLISHED)`; search 257-270 reuses `_public_qs()` | ✅ OK | Filter present incl. search |
| **services** admins_read_all / admins_update | Admin read+update | pg_policies | `views/admin/service.py:24-61` `HasResourcePermission(SERVICES, ...)` | ✅ OK | Gated |
| **reviews** authenticated_create | Any authed user creates | pg_policies; `actions/reviews/create-review.ts` | `services/review_ops.py:23-69` (self-review block + duplicate block) | ✅ OK | Plus extra anti-abuse |
| **reviews** public_read_published (published=true) | Public reads published | pg_policies | `selectors/review_reads.py:35-37` `_published_qs()` = `status=APPROVED, published=True` | ✅ OK | Filter present |
| **reviews** users_read_own (authorId=sub); profile/service owners read theirs | Author + reviewed-owner reads | pg_policies | `selectors/review_reads.py:80-95` me/given (`author=user`), me/received (`profile__user_id=user.id`) | ✅ OK | Scoped reads present |
| **reviews** users_update_own (authorId=sub AND createdAt > now-24h) | Author edits own review within 24h | pg_policies | **No user-facing review-edit endpoint in NEW** (`reviews/urls/public.py` has none). OLD app also had none — `actions/reviews/update-rating.ts` is only rating-aggregate recompute, not review edit. | ⚠️ LATENT (parity OK) | RLS-only policy; neither app exposed it → no regression. If a NEW edit endpoint is added, replicate the 24h `created_at` guard. |
| **reviews** users_delete_own (authorId=sub) | Author deletes own | pg_policies | **No user-facing delete route** (only `views/admin/reviews.py:79` admin delete). OLD app had no self-delete action either. | ⚠️ LATENT (parity OK) | RLS-only; no OLD feature used it. Flag if self-delete is added. |
| **reviews** admins_read_all/update/delete | Admin moderation | pg_policies; `actions/reviews/moderate-review.ts` | `views/admin/reviews.py:29-100` `HasResourcePermission(REVIEWS, view/edit/full)`; `review_ops.moderate_review` | ✅ OK | Gated |
| **reviews** visibility (comment hide) | Profile owner hides comment | `actions/reviews/toggle-review-visibility.ts` | `services/review_ops.py:115-134` `toggle_visibility` requires `review.profile.user_id == user.id` (profile-owner only) | ✅ OK | Matches OLD owner-only toggle |
| **media** users CRUD own (userId=sub) | Owner CRUD | pg_policies; `lib/utils/media.ts` | Upload sets `user=request.user` (`media/services/cloudinary_upload.py:39-99`). **No user read/delete REST endpoint found** by sub-audit. | ❓ VERIFY | OLD media reads went through profile/service payloads, not a direct media list; likely OK but no owner-scoped media list/delete endpoint exists. Not a leak (no list endpoint), but a missing-capability gap. |
| **media** public_read (isTemporary=false) | Public reads permanent media | pg_policies | Media surfaced inside profile/service serializers (already published-filtered). No standalone media list endpoint. | ✅ OK (indirect) | No raw temp-media exposure |
| **media** system_cleanup_temp (>24h) | Cron deletes temp media | pg_policies | ❓ Celery/cron cleanup task not confirmed in this audit | ❓ VERIFY | Orphaned temp media may accumulate; not a security hole |
| **messages** read/insert (member); update own (authorUid=current_user_id) | Member read/insert; author edit | pg_policies; `actions/messages/*` | `messaging/services/chat_ops.py:204-270` membership checks + `author_id != user.id → 403` | ✅ OK | Strong parity (incl. block checks) |
| **chats / chat_members** read/insert own | Member-scoped | pg_policies | `chat_ops.py:42-198` filters `ChatMember.objects.filter(user_id=user.id)`; membership-gated detail | ✅ OK | Membership enforced |
| **blocked_users** users CRUD own (blockerId=sub); read who blocked them; admins manage | Owner blocklist + bidirectional read | pg_policies | `chat_ops.py:337-366` blocker-scoped writes, bidirectional `blocked-status`. **No admin block-management endpoint** (admin policy LATENT in OLD app too) | ✅ OK (user) / ⚠️ LATENT (admin) | User paths correct |
| **saved_profiles / saved_services** users CRUD own (userId=sub) | Owner save/unsave/list | pg_policies; `actions/saved/*` | `saved/services/toggle.py:11-42`, `selectors/saved_reads.py:10-70` `filter(user=user)` | ✅ OK | Owner-scoped |
| **saved_*** profile/service_owners_see_saves | Owner sees who saved their item | pg_policies | **No "who saved me" endpoint in NEW.** Sub-audit confirms OLD app has **no such feature** (`actions/saved/` = toggle/get-saved-items/get-saved-state only). | ⚠️ LATENT (parity OK) | RLS-only policy never used by OLD app → no regression |
| **verifications** users read/create own (uid=sub) | Owner submit/read | pg_policies; `actions/profiles/verification.ts` | `views/public/profile.py:232-251` submit/get bound to `request.user` | ✅ OK | Owner-scoped |
| **verifications** users_update_own_pending (uid=sub AND status='PENDING') | Owner edits while pending | pg_policies | No user-update-verification endpoint in NEW (resubmit not exposed). OLD action set is submit/read. | ⚠️ LATENT/VERIFY | If resubmit-while-pending is a real OLD UX, add owner+status=PENDING guard. Confirm OLD `verification.ts` write path. |
| **verifications** admins_read_all/update | Admin review | pg_policies; `actions/admin/verifications.ts` | `views/admin/verifications.py:20-65` `HasResourcePermission(VERIFICATIONS, ...)` | ✅ OK | Gated |
| **contacts** anyone_create | Public contact form | pg_policies; `actions/messages/contact.ts` | `support/views/public/support.py:50-71` `AllowAny` + throttle | ✅ OK | Public create |
| **contacts** users_read_own (email match) | User reads own submissions | pg_policies | **No user read-own-contacts endpoint** in NEW. OLD app had no such read feature either (contact.ts is create-only). | ⚠️ LATENT (parity OK) | RLS-only; no regression |
| **contacts** admins_read/update/delete | Admin manages | pg_policies; `actions/admin/*` | Django admin (`support/admin.py`) + admin_api; no public DRF leak | ✅ OK | Admin-only |
| **email_batches / jwks / verification (better-auth)** `no_user_access` (false) | Fully locked | pg_policies | NEW: not exposed via any public endpoint; `jwks`/`verification` are internal models | ✅ OK | Locked internal tables |
| **pending_registrations** users read/insert/update; system delete expired | OAuth registration bridge | pg_policies | `models/pending_registration.py`; managed in registration/oauth services | ✅ OK | Internal flow only |
| **sessions** users read/insert/update/delete own (userId=sub) | Owner session mgmt | pg_policies; better-auth | NEW: `Session` model read-only/legacy; auth is JWT. **No public session list/revoke endpoint** — admin-only (`views/admin/users.py`). | ⚠️ DIFFERS | See session section — user self-revoke not exposed; mitigated by short access TTL + blacklist on refresh |

---

## Auth flow matrix

NEW base route `/api/auth/`. OLD = better-auth + `src/actions/auth/*`.

| Flow | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|
| Sign-up / register | `actions/auth/register.ts`; better-auth `config.ts:70-113` | `POST /register` `views/public/auth.py:62-94` → `services/registration.py:39-97` | ✅ OK | Creates User(step=EMAIL_VERIFICATION) + Account(credential) + Verification(1h) |
| Sign-in (email/pw) | `actions/auth/login.ts`; better-auth | `POST /login` `views/public/auth.py:38-59` → `services/auth.py:47-115` | ✅ OK | identifier=email|username; unverified → no tokens, redirect to verify; blocked → 403 |
| Email verification (send/resend) | better-auth `config.ts:114-149` (sendOnSignUp, 1h) | `POST /verification/resend` `auth.py:138-160` → `registration.py:194-218` | ⚠️ Email TODO | Token logic OK; actual Brevo email send is a TODO (`registration.py`, `auth.py:82`) — emails may not be delivered yet |
| Email verification (confirm) | better-auth `/api/verify-email` (custom route) | `GET /verify-email?token=` `auth.py:179-199` → `registration.py:149-191` | ✅ OK | 1h TTL, one-time, advances step, 302 redirect |
| Password forgot (request) | `actions/auth/forgot-password.ts`; `config.ts:89-112` | `POST /password/forgot` `auth.py:114-135` → `password.py:55-70` | ⚠️ Email TODO | Silent (no enumeration). Reset email send is TODO |
| Password reset (confirm) | `actions/auth/reset-password.ts` | `POST /password/reset` `auth.py:163-176` → `password.py:73-117` | ✅ OK | `reset:{token}` 1h TTL, one-time, Argon2 rehash |
| Password change (authed) | `actions/auth/change-password.ts` | `POST /password/change` `auth.py:97-111` → `password.py:23-52` | ✅ OK | Rejects OAuth-only accounts; verifies current pw |
| OAuth Google intent | `actions/auth/store-oauth-intent.ts`; `config.ts:150-191`, cookie hooks 248-345 | `POST/GET /oauth/intent` `views/public/oauth.py:22-55` → `account.py:184-201` | ✅ OK | httpOnly `oauth_intent` cookie, 10m TTL |
| OAuth callback / provider flow | better-auth google provider `config.ts:150-191` | Handled by **django-allauth** (`settings/base.py:58-61,180-190`); Django views transform result | ❓ VERIFY | Allauth wiring present; end-to-end Google callback not exercised in this audit |
| OAuth setup (complete profile) | `actions/auth/oauth-setup.ts` | `POST /oauth/setup` `views/public/oauth_setup.py:33-53` → `services/oauth.py:23-79` | ✅ OK | Issues fresh JWTs, creates Profile for pro |
| Token refresh | better-auth session refresh | `POST /token/refresh` (SimpleJWT `TokenRefreshView`) `urls/public.py:50` | ✅ OK | Rotation + blacklist on (see session section) |
| Token verify | n/a (session-based) | `POST /token/verify` (SimpleJWT) `urls/public.py:51` | ✅ OK (added) | New capability |
| Session read | better-auth `getSession` | `GET /session` `views/public/account.py:35-50` | ✅ OK | Returns user + `jti` as session id; null when unauth |
| Session list / revoke (self) | better-auth sessions (`sessions` table, owner RLS) | **Admin-only** `views/admin/users.py` (list/revoke). No self-service endpoint. | ⚠️ DIFFERS | OLD users could manage own sessions; NEW user cannot self-revoke. Mitigated by 15m access + refresh blacklist. |
| Logout / sign-out | better-auth signOut + `nextCookies` | Catch-all `oauth_setup.py:106-109` returns `{ok:true}`; client clears cookies | ⚠️ DIFFERS | No server-side refresh-token invalidation on logout (no blacklist call). Old refresh token stays valid up to 14d until used/rotated. |
| Account update (name/image) | `actions/auth/update-account.ts` | `PATCH /account` `views/public/account.py:53-68` → `account.py:34-53` | ⚠️ Partial | Profile image sync to profiles app is TODO (`account.py:51-52`) |
| Change username | `actions/auth/change-username.ts` | `POST /username/change` `account.py:71-91` → `account.py:65-118` | ✅ OK | 7-day cooldown, uniqueness |
| Account delete | `actions/auth/delete-account.ts`; better-auth `deleteUser` `config.ts:209-246` | `DELETE /account` `account.py:94-106` → `account.py:124-143` | ⚠️ Partial | Cascades User+sessions+accounts+profile. OLD also did Brevo contact cleanup + verification-token cleanup (`config.ts:211-245`) — Brevo/GDPR cleanup not confirmed in NEW |
| Upgrade to pro | `actions/auth/upgrade-to-pro.ts` | `POST /upgrade-to-pro` `account.py:109-129` → `account.py:149-178` | ✅ OK | Sets type=PRO, role, step=ONBOARDING, new JWTs |
| Update user-type (post-OAuth) | `actions/auth/update-user-type.ts` | `PATCH /user-type` `account.py:132-152` → `account.py:204-220` | ✅ OK | userId must equal request.user.id |
| Onboarding complete | `actions/auth/complete-onboarding.ts` | `POST /onboarding/complete` `views/public/onboarding.py:33-82` | ✅ OK | IsAuthenticated+IsProfessional, step→DASHBOARD |
| Supabase RLS token exchange | `actions/auth` exchange (better-auth jwt) | `POST/GET /exchange-token` `oauth_setup.py:56-65` → `oauth.py:82-105` | ✅ OK (transitional) | Mints 1h JWT; obsolete once Channels replaces Supabase Realtime |

---

## Detailed gaps (security holes first)

### A. ⚠️ Logout does not invalidate refresh tokens (session security)
- **OLD:** better-auth `signOut` destroys the server session row → token unusable immediately.
- **NEW:** `/sign-out` catch-all returns `{ok:true}` and relies on the client clearing `dj_access`/`dj_refresh` cookies (`oauth_setup.py:106-109`). The refresh token is **not** added to the SimpleJWT blacklist on logout. A copied refresh token remains valid for up to `REFRESH_TOKEN_LIFETIME` (14 days, `settings/base.py:250-260`) until it is next used and rotated.
- **Impact:** Medium. Stolen/leaked refresh token survives an explicit logout. Worse on shared devices.
- **Suggested fix:** Add a real logout endpoint that calls `RefreshToken(token).blacklist()` (token_blacklist app is already installed, `base.py:51`). Accept the refresh token from the `dj_refresh` cookie and blacklist it server-side.

### B. ⚠️ No user self-service session revocation
- **OLD:** `sessions` RLS let a user delete their own session rows (e.g. "log out other devices").
- **NEW:** session list/revoke exists **only** under admin (`views/admin/users.py`); no public equivalent.
- **Impact:** Low–Medium. Users can't kill other sessions after a compromise. Partly mitigated by 15-minute access TTL.
- **Suggested fix:** Add `/api/auth/sessions` (list, scoped `Session.objects.filter(user=request.user)`) + revoke that blacklists associated refresh tokens.

### C. ⚠️ Account-delete side-effects incomplete (GDPR)
- **OLD `config.ts:211-245`:** delete also removes the Brevo email contact (GDPR) and dangling verification tokens by email.
- **NEW `account.py:124-143`:** relies on FK CASCADE; Brevo cleanup + email-keyed verification-token cleanup not confirmed.
- **Impact:** Low security, GDPR/compliance gap. **Suggested fix:** add Brevo-delete + `Verification.objects.filter(...email...).delete()` in `delete_account`.

### D. ⚠️ Email delivery is stubbed (verification + password reset)
- Token creation/validation is correct, but Brevo sends are `TODO` (`registration.py`, `password.py`, `auth.py:82`). Verification/reset **links may never reach users** in current state.
- **Impact:** High *functional* (users can't verify/reset), low pure-authz. **Suggested fix:** wire Brevo before launch; until then DEBUG returns dev tokens.

### E. ❓ Media owner read/delete + temp-media cleanup unverified
- No owner-scoped media list/delete REST endpoint found; temp-media (>24h) cleanup job not confirmed (vs RLS `system_cleanup_temp_media`).
- **Impact:** Not a leak (no list endpoint exposes others' media; media is surfaced only via already-filtered profile/service payloads). Capability/housekeeping gap. **Suggested fix:** confirm a Celery beat task deletes `is_temporary=True, created_at < now-24h`; add owner-scoped delete if the OLD dashboard offered it.

### F. ❓ `verifications` resubmit-while-PENDING
- RLS allowed owner update while `status='PENDING'`. NEW exposes submit + read but no update. Confirm whether OLD `actions/profiles/verification.ts` exposed a resubmit; if so, add an owner + `status=PENDING` guarded update.

### LATENT (RLS present, never used by OLD app — not regressions, but tighten if endpoints are added)
- `reviews.users_update_own` (24h edit) / `users_delete_own` — no OLD app feature; NEW has none → parity. Replicate 24h `created_at` guard if a review-edit endpoint is added.
- `saved_*.{profile,service}_owners_see_saves` — OLD `actions/saved/*` has no "who saved me"; NEW has none → parity.
- `contacts.users_read_own` — OLD `contact.ts` is create-only; NEW has none → parity.
- `blocked_users.admins_manage_all` — no admin block UI in either → parity.

### Session model mapping (lifetime / rotation / revocation)
| Aspect | OLD (better-auth) | NEW (SimpleJWT) | Delta |
|---|---|---|---|
| Mechanism | DB `sessions` rows + signed session cookie; separate 15m JWT for Supabase RLS (`config.ts:43-49,499-511`) | Stateless JWT access+refresh; `dj_access` httpOnly cookie (`common/authentication.py:23-47`) + Bearer header | Stateful → stateless |
| Access lifetime | JWT 15m (`config.ts:509`) | Access 15m default (`base.py:250-260`) | ✅ Same |
| Session/refresh lifetime | session `freshAge` 1d; session row until expiry | Refresh 14 days | ⚠️ Longer refresh window |
| Rotation | better-auth managed | `ROTATE_REFRESH_TOKENS=True`, `BLACKLIST_AFTER_ROTATION=True` (`base.py`) | ✅ Rotation on |
| Revocation | delete session row (user or admin) | Blacklist on rotation; **logout does not blacklist**; user self-revoke missing | ⚠️ See A,B |
| Password hashing | bcrypt cost 12 (`config.ts:74-88`) | Argon2 for new + `BetterAuthBcryptPasswordHasher` to verify legacy bcrypt (`common/hashers.py:15-48`, `base.py PASSWORD_HASHERS`) | ✅ Compatible (no scrypt — OLD used bcrypt, claim of scrypt would be wrong) |
| Admin RBAC | `lib/auth/roles.ts` ROLE_PERMISSIONS | `apps/accounts/permissions/admin.py:45-128` verbatim mirror (admin/support/editor, full/edit/view) | ✅ Faithful port |

---

## Counts
- **rls_policies = 81** (live `pg_policies`; ~30 distinct table+intent rules).
- **rls_missing (effective regressions vs OLD app behavior) = 0.** All app-reachable OLD access rules have a NEW DRF/queryset/service equivalent.
  - **rls_latent (RLS-only, never used by OLD app) = 6** (reviews edit-24h, reviews self-delete, 2× saved-owners-see-saves, contacts read-own, blocked admin-manage) — tighten if endpoints are added.
  - **rls_unverified = 3** (media owner read/delete, temp-media cleanup job, verifications resubmit-while-PENDING).
- **auth_flows = 22** enumerated.
- **auth_missing_or_differs = 5**: logout no server-side blacklist (A), no self session-revoke (B), account-delete side-effects incomplete (C), email delivery stubbed (D), OAuth callback not end-to-end verified. (None are missing endpoints; they are behavioral/security deltas.)
