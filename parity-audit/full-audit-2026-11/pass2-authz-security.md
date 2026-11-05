# Pass 2 — Authorization & security parity audit — 2026-11-05

Scope: every Django URL (config/urls.py + all `apps/*/urls*`) checked for who may
call it in NEW (permission classes plus object-level checks in services) against
who could reach the same capability in OLD (server-action session/role checks,
better-auth plugin ACLs, `app/api/*` routes). Also checked: the frontend
`/api/*` proxy routes and the frontend server actions that hold secrets.

Dedupe: this report leaves out everything already in SUMMARY.md and the 11
pass-1 reports. That includes the services search `status` override, the
profile-summary privacy leak, the GET revalidate-cache without secret, the
updateUserType scoping, admin revoke-sessions vs JWT, cron GET/renewals, the
XFF spoof note, the D4/D5 confirmed/banned login loop, and impersonation being
non-functional (admin.md:254).

## 1. Coverage

**OLD files read**
- `src/actions/admin/users.ts`: every gate (getAdminSessionWithPermission levels) and every `auth.api.*` admin-plugin call (setRole, banUser, impersonateUser, setUserPassword, listUserSessions, revokeUserSession(s), removeUser, createUser).
- `src/actions/admin/api-keys.ts`: validateAdminApiKey (env `ADMIN_API_KEYS` + `auth.api.verifyApiKey`).
- `src/lib/auth/permissions.ts`: the better-auth access-control statement and the admin/support/editor role definitions.
- `src/lib/auth/config.ts`: the `admin()` plugin (custom `roles`, `adminUserIds`), the `apiKey()` plugin, `socialProviders.google` (no `accountLinking` override).
- `src/actions/admin/{subscriptions,reviews,verifications,taxonomy-submission,revalidate-caches,revalidate-taxonomies}.ts`: gate levels.
- `src/actions/messages/{index,messages,reactions,presence}.ts`: membership and userId handling.
- `src/actions/auth/oauth-setup.ts`: completeOAuth gates.
- `src/actions/subscription/create-checkout-session.ts`: role gate.
- `src/actions/profiles/get-profiles.ts`: the `published` filter and the 'use server' surface.
- `src/app/api/**/route.ts`: list of all 12 routes.

**NEW files read**
- `backend/config/urls.py`, `config/settings/base.py` (REST_FRAMEWORK, SPECTACULAR_SETTINGS, SIMPLE_JWT, AUTHENTICATION_BACKENDS, ADMIN_API_KEY, CRON_SECRET), `config/settings/prod.py` (CSRF/CORS).
- `common/{permissions,authentication,throttling}.py`.
- `apps/accounts/permissions/{admin,roles}.py`, `apps/accounts/models/user.py` (is_active, is_staff, has_perm).
- Every `urls*.py` under `apps/` (39 files). An AST dump of `permission_classes`, `throttle_classes` and HTTP methods for **every** APIView in `apps/**/views/**`.
- Object-level checks:
  - `accounts/views/admin/users.py`, `accounts/services/admin_users.py`, `accounts/services/{oauth,google_oauth,password,sessions}.py`, `accounts/views/public/{account,auth,oauth,oauth_setup}.py`, `accounts/serializers/auth.py`.
  - `admin_api/views/admin/{api_keys,notifications}.py`, `admin_api/services/api_keys.py`, `admin_api/models/api_key.py`.
  - `messaging/views/public/chats.py`, `messaging/services/chat_ops.py`, `messaging/consumers.py`.
  - `services/views/public/{service,cron}.py`, `services/services/service_writes.py` (owner_or_404, update fields), `services/selectors/service_reads.py` (by-slug, page bundle, get_for_edit).
  - `reviews/views/public/reviews.py`, `reviews/services/review_ops.py` (toggle_visibility, create gates), `reviews/selectors/review_reads.py` (admin card).
  - `billing/views/public/billing.py`, `billing/services/subscription_ops.py` (toggle featured, sync).
  - `profiles/views/public/{profile,aggregations}.py`, `profiles/serializers/profile_filters.py`, `profiles/selectors/{profile_reads,profile_aggregations}.py`, `profiles/views/admin/profiles.py`.
  - `blog/views/public/article.py`, `core/views/{admin/cache,public/health,public/sitemaps}.py`.
- Frontend:
  - `app/api/{auth/[...all],auth/ws-token,auth/callback/google,auth/oauth/google/login,sign-cloudinary-params,cron/auto-refresh}/route.ts`
  - `lib/api/client.ts` (secret/IP forwarding, anonymous cached calls), `lib/auth/cookies.ts`
  - `actions/admin/{revalidate-caches,revalidate-taxonomies}.ts`
  - a grep of every frontend file for `ADMIN_API_KEY|CRON_SECRET|INTERNAL_PROXY_SECRET`: only `client.ts` uses a secret, and only for IP forwarding.

**Delegated elsewhere / already covered**: payment webhooks and digest (billing-payments.md), cron/revalidate webhooks (blog-support-media-crons.md), auth flows (auth-accounts.md), admin data-wipe bugs (admin.md).

## 2. Mapping (authz-relevant, old → new)

| OLD capability / gate | NEW endpoint / gate |
|---|---|
| better-auth `admin()` plugin ACL (custom roles from `permissions.ts`) behind `auth.api.setRole / setUserPassword / impersonateUser / listUserSessions / revokeUserSession(s) / banUser / removeUser / createUser` | `/api/admin/users/*`: only `HasResourcePermission(USERS, …)` plus `_require_can_assign` |
| `validateAdminApiKey` (env `ADMIN_API_KEYS`, better-auth hashed keys); keys not used as request credentials | `ApiKeyAuthentication` in `DEFAULT_AUTHENTICATION_CLASSES` + `/api/admin/api-keys/*` |
| `getProfilesByFilters` / `getProfilesCount` ('use server', called from server components) | public `POST /api/profiles/search`, `/count` (AllowAny) |
| better-auth Google social sign-in (default accountLinking) | `POST /api/auth/oauth/google/exchange` → `google_oauth.exchange_code` |
| better-auth `/api/auth/[...all]` handler | Next proxy `app/api/auth/[...all]/route.ts` → Django `/api/auth/<path>` |
| — (no equivalent) | `/api/schema/`, `/api/docs/`, `/api/redoc/`; `/django-admin/` |
| Supabase realtime (JWT, RLS) | Channels `ChatConsumer` / presence consumer with `?token=` |

## 3. DIFFERENCES

### D1. Admin API keys are now bearer credentials for the whole Django API (and the env key acts as a real admin) — HIGH
- OLD:
  - `actions/admin/api-keys.ts:14-61`: env `ADMIN_API_KEYS` (comma list) and DB keys are only ever **validated** by `validateAdminApiKey`, which returns `{valid, source}`. Nothing in OLD used a key to authenticate a request: there is no `x-api-key` handling anywhere in `src/` (grep).
  - better-auth's `apiKey()` plugin (`lib/auth/config.ts:480-495`) has no `enableSessionForAPIKeys` set. Default is off, so a key never became a session.
  - better-auth stores keys **hashed** (SHA-256, default `disableKeyHashing:false`).
- NEW:
  - `config/settings/base.py:221-229` puts `common.authentication.ApiKeyAuthentication` in `DEFAULT_AUTHENTICATION_CLASSES`, so it applies to every endpoint.
  - `common/authentication.py:50-98`:
    - `Authorization: ApiKey <ADMIN_API_KEY>` authenticates as `User.objects.filter(role="admin").order_by("created_at").first()`. That is a real admin row, so all actions are attributed to the oldest admin. If none exists, it uses a synthetic admin.
    - A DB key authenticates as `api_key.user`, looked up by `ApiKey.objects.get(key=provided)`.
  - What the key path skips:
    - It ignores the owner's `is_active`, `banned` and `blocked`. DRF's `IsAuthenticated` only checks `is_authenticated`, which is always True (`user.py:149`), so a banned admin's key keeps full access.
    - It ignores the key's stored `permissions` JSON.
    - It compares with plain `==` and has no throttle other than global anon (100/5s).
  - `admin_api/services/api_keys.py:46-80` stores the raw key in `api_keys.key` (plaintext). Hashed keys migrated from OLD can never match, so all pre-cutover keys silently stopped working.
  - `ValidateApiKeyView` (AllowAny, no scoped throttle) is an unauthenticated oracle for the env key.
  - Env var renamed `ADMIN_API_KEYS` (list) → `ADMIN_API_KEY` (single).
- Impact:
  - Anyone holding the env key, or any DB key, has full admin power over every `/api/admin/*` route: users, roles, passwords, payments, deletes.
  - A DB dump leaks usable keys.
  - Banning or blocking the key owner does not revoke a key.
- Fix hint:
  - Drop `ApiKeyAuthentication` from the defaults; attach it only to the ops endpoints that need it.
  - Hash keys (SHA-256, like better-auth) and compare in constant time.
  - Reject keys whose owner is not `is_active` or not admin-like.
  - Throttle `/api/admin/api-keys/validate`.
- Possibly intentional?: partly. The docstring mentions "infra/ops scripts", but turning the key into a global credential is undocumented. Plaintext storage, the lack of an owner-status check and the global scope are not intentional.

### D2. Public `/api/profiles/search` and `/api/profiles/count` accept `published:false` → unpublished profiles are listable — HIGH (data exposure)
- OLD: `actions/profiles/get-profiles.ts:92,376` has the same `published: filters.published !== false`. But `getProfilesByFilters` / `getProfilesCount` were only called from server components, so no client could set the flag (grep: no client import).
- NEW:
  - `profiles/serializers/profile_filters.py:13` has `published = BooleanField(default=True)`, so the caller controls it.
  - `profile_aggregations.py:215-217` (list) and `:264-266` (count) filter `published=filters.get("published", True)`.
  - Both views are `AllowAny` (`views/public/aggregations.py:30-51`).
  - Rows are serialized with `serialize_profile_card`: the summary minus phone/viber/whatsapp/first/last/terms. That still includes `displayName, username, tagline, bio, image, socials, website, coverage, portfolio, rate, contactMethods, paymentMethods, budget, size, commencement, uid`.
  - The frontend never sends `published` (`lib/api/profiles.ts:59-62`, `actions/profiles/get-profiles.ts:27` only types it).
- Impact: anyone can `POST /api/profiles/search {"published": false}` and enumerate every unpublished profile (users who hid their profile or haven't finished onboarding) with bio, website, socials and coverage.
- Fix: drop `published` from `ProfileFiltersSerializer`, or ignore it on the public views, and hard-code `published=True`. Same family as services.md D1, but a separate code path.
- Possibly intentional?: no.

### D3. Support can take over or neutralize admin accounts: set password, demote, revoke sessions — MEDIUM (privilege escalation)
- OLD:
  - These actions go through better-auth's admin plugin, which runs its own ACL after the app gate. `hasPermission` checks the actor's role against `options.roles`. Here that is the custom `admin`/`support`/`editor` roles from `lib/auth/permissions.ts:69-125`.
  - In those roles, `user` only allows `create, read, update, delete, ban, unban`, and none of the roles has a `session` resource.
  - So `setUserPassword` (needs `user:set-password`), `setRole` (`user:set-role`), `impersonateUser` (`user:impersonate`), `listUserSessions` and `revokeUserSession(s)` (`session:*`) were refused for **support**, and for admin too unless the actor was in `ADMIN_USER_IDS` (`config.ts:478`).
  - `banUser`/`removeUser`/`createUser` were allowed.
- NEW:
  - `accounts/views/admin/users.py:127-225` and `services/admin_users.py:176-183, 343-359, 373-381` gate only on `HasResourcePermission(USERS, view|edit)`. Support has `users: full`.
  - There is no check on the **target's** role. Support can:
    - `POST /api/admin/users/{adminId}/password` → set any admin's password (direct account takeover).
    - `POST /users/{adminId}/role {"role":"user"}` → demote an admin. `_require_can_assign` only checks the *new* role (`user` is in support's allowed set).
    - Revoke an admin's sessions.
- Impact: a support-role account, or a compromised one, can become admin by resetting an admin's password and logging in as them.
  - Note: OLD support could already change an admin's **email** via `updateUserBasicInfo` (prisma, `users.ts:644-652`, `view`) and then use forgot-password. That is a slower pre-existing path, and it is still open in NEW (`AdminUserBasicInfoView`).
- Fix hint: for any write on `/api/admin/users/{id}/*`, refuse when the target is admin-like (`admin/support/editor`) and the actor is not admin. At minimum do this for password, role, sessions, ban, delete and basic-info (email).
- Possibly intentional?: no. The NEW docstring at `admin_users.py:387-392` assumes OLD allowed support. It did at the app gate, but the better-auth ACL refused it (see Corrections).

### D4. Google sign-in links to an existing account by email without checking Google's `email_verified` — MEDIUM
- OLD: better-auth's default account linking (`config.ts:150-160`, no `accountLinking` override) links a social login to an existing user only if the provider says the email is verified, or the provider is in `trustedProviders` (empty by default). Otherwise you get "account not linked".
- NEW: `accounts/services/google_oauth.py:100-145` reads `email` from userinfo and never reads `email_verified`. It then:
  - finds the user by `email__iexact`,
  - links the Google `sub`,
  - forces `email_verified=True` **and `confirmed=True`**.
- Impact:
  - A Google identity with an unverified email address (Workspace/consumer accounts on non-Gmail addresses) can log into the matching local account.
  - It also silently re-confirms a user an admin had un-confirmed via `/users/{id}/confirmed/toggle`.
- Fix: require `info.get("email_verified") is True` before linking or creating. Don't touch `confirmed` for existing users.
- Possibly intentional?: no.

### D5. OpenAPI schema, Swagger UI and Redoc are publicly served — LOW/MEDIUM (info disclosure)
- OLD: no API documentation endpoint.
- NEW: `config/urls.py:32-36,105` mounts `/api/schema/`, `/api/docs/` and `/api/redoc/`. `SPECTACULAR_SETTINGS` (`base.py:266-277`) sets no `SERVE_PERMISSIONS`, so drf-spectacular's default `AllowAny` applies.
- Impact: anonymous users get a full map of every admin endpoint, serializer field and enum (roles, journey steps), which makes D1/D3-style probing easy.
- Fix: set `SERVE_PERMISSIONS: ["apps.accounts.permissions.roles.IsAdmin"]`, or mount the docs only when `DEBUG`.
- Possibly intentional?: possibly, as a dev convenience; it should not be on prod.

### D6. `/django-admin/` is exposed with an unthrottled login form — LOW (possibly intentional)
- OLD: no equivalent.
- NEW:
  - `config/urls.py:110` serves Django admin on the API host.
  - DRF throttles don't apply to it, and there is no `django-axes` or other rate limiting (grep), so admin passwords can be brute-forced without limit there. The DRF `LoginView` has a 10/min limit.
  - `User.has_perm` returns True for `role=admin` (`user.py:164-168`). An admin can edit any table directly, bypassing all service-layer logic (payments, subscription state, cache purge signals).
  - `ModelBackend` checks `users.password`. Whether that column is populated for admins is a data question (credential passwords live in `accounts`).
- Fix hint: restrict by IP/basic-auth at Dokploy, or add login throttling.
- Possibly intentional?: likely, as an ops tool. Report for awareness.

### D7. WebSocket consumers accept banned/blocked users and never re-check — LOW
- OLD: Supabase realtime with a 15-minute Supabase JWT minted only for a live better-auth session. Banning a user revoked their sessions, so no new realtime JWTs were issued.
- NEW:
  - `messaging/consumers.py:96-114` and `:205-230` validate `?token=` and load the user with `User.objects.get(id=…)`. There is no `is_active`, `banned` or `blocked` check (DRF's `JWTAuthentication.get_user` would reject them).
  - Once connected, a socket stays subscribed to `chat.<id>` / `presence.<uid>` indefinitely.
  - `frontend/src/app/api/auth/ws-token/route.ts` hands the httpOnly access token to JS for this.
- Impact: a user banned or blocked mid-session keeps receiving live messages until they disconnect.
- Fix: check `user.is_active` on connect, and drop sockets on ban/block (broadcast to `presence.<uid>`).
- Possibly intentional?: no.

### D8. Next `/api/auth/[...all]` proxy forwards any sub-path with the caller's cookies (dot-segment traversal possible) — LOW (needs live test)
- OLD: `/api/auth/[...all]` was the better-auth handler, which only answers its own routes.
- NEW: `frontend/src/app/api/auth/[...all]/route.ts:18-41` builds `new URL(`${TARGET}/api/auth/${restPath.join('/')}`)`, where TARGET is `DJANGO_INTERNAL_URL`. It forwards Cookie and Authorization, and copies every upstream header (incl. Set-Cookie) back.
  - Next decodes catch-all params, so `/api/auth/%2E%2E/%2E%2E/django-admin/` should become `['..','..','django-admin','']`. The WHATWG URL parser then collapses that to `${TARGET}/django-admin/`.
  - That would reach any Django path, including ones Dokploy might block on the public API host, through the internal network.
- Impact: low unless the public host restricts paths (e.g. `/django-admin/`, `/api/schema/`) that the internal one doesn't. Rate-limit buckets for these calls key on the frontend container IP.
- Fix: whitelist the few paths still needed (e.g. `sign-out`), or reject any segment equal to `.`/`..`.
- Possibly intentional?: no (compat shim).

### D9. Google OAuth `next` parameter is an open redirect — LOW
- OLD: better-auth validates `callbackURL` against `trustedOrigins`.
- NEW:
  - `app/api/auth/oauth/google/login/route.ts:31,49` stores `?next=` unvalidated in the `g_oauth_next` cookie.
  - `app/api/auth/callback/google/route.ts:42,90-96` does `NextResponse.redirect(new URL(dest, origin))` with `dest = next`, unless the step is TYPE_SELECTION/OAUTH_SETUP/ONBOARDING/DASHBOARD.
  - `new URL('https://evil.example', origin)` and `//evil.example` both leave the site.
- Impact: only users whose step is outside those four (e.g. EMAIL_VERIFICATION, or a null step) are redirected to the attacker URL, right after login.
- Fix: accept `next` only if it starts with `/` and not `//`.
- Possibly intentional?: no.

## 4. Confirmed same (verified)

- **Admin resource bindings**: every admin view's resource and level matches the OLD action gate (USERS, TEAM, SETTINGS, BLOG, SUBSCRIPTIONS, CHATS, PROFILES, VERIFICATIONS, SERVICES, TAXONOMIES, REVIEWS). Several NEW write views use `view` level (e.g. `AdminUserRoleView`, `AdminUserBanView`, `AdminToggleBlockView`, blog detail PATCH). That mirrors OLD exactly, and it is not exploitable, because no role holds `view`/`edit` on any resource except `dashboard`.
- **Editor scope**: editor only reaches SERVICES endpoints and `profiles/search/for-services` (SERVICES edit).
- **Django admin perms**: `is_staff` lets support/editor into `/django-admin/`, but `has_perm` is admin-only, so they see nothing.
- **Owner checks**:
  - services: update, media, archive, delete, refresh and for-edit all use `_owner_or_404` / `profile__user_id`.
  - reviews: visibility toggle requires the profile owner; create blocks self-review and duplicates.
  - billing: toggle-featured filters `profile=profile`; sync, cancel and restore are scoped to the caller.
  - saved, me/* and taxonomy submissions/me are scoped to `request.user`.
- **Mass assignment**: the update serializers for account, services, profiles, register, oauth-intent, upgrade and onboarding accept no status/featured/verified/published/role fields beyond OLD's freelancer/company choice.
- **Crons**: auto-refresh, process-email-batches and worldline-renewals all require `Bearer CRON_SECRET` and fail closed when it is unset. The Django revalidate webhook (POST) uses `hmac.compare_digest` and fails closed.
- **Public reads**: blog detail only returns published articles. Sitemap entries apply the published/active/blocked/confirmed filters. Service by-slug and page bundle use `_public_qs` plus the profile-published gate.
- **Frontend server actions**: none holds a privileged credential. `client.ts` forwards only the user's own JWT, and cacheable calls are forced anonymous. `revalidateAllCaches` has no auth check, but it is identical to OLD.
- **Pre-existing in OLD, not regressions**: these messaging gaps also existed in OLD, and OLD was weaker because its actions took `userId` as a parameter.
  - `mark-read`, unread counts and reactions don't check chat membership (`chat_ops.py:405-445, 643-700`).
  - `users/{id}/presence` is readable by any logged-in user.
  - `oauth/setup` has no step gate (same as OLD `completeOAuth`).
  - Hardening these is optional; they're listed here only for completeness.

## 5. Corrections to pass-1

- **admin.md §4 "setUserRole / assignAdminRole role-hierarchy checks" and the impersonate/setUserPassword rows treated as matching OLD**: only partly true.
  - OLD's `setUserRole`, `setUserPassword`, `impersonateUser`, `listUserSessions` and `revokeUserSession(s)` also had to pass better-auth's admin-plugin ACL. With the custom roles in `lib/auth/permissions.ts`, that ACL refuses all of them for every role, unless the actor's id is in `ADMIN_USER_IDS`.
  - So in OLD prod these actions worked only for env-listed admins and never for support. NEW lets support do all of them (D3).
  - The NEW comment at `admin_users.py:387-392` ("support satisfies… would wrongly block support") rests on this mistaken premise.
  - Caveat: this is based on better-auth 1.4's `hasPermission` semantics (custom `roles` replace the defaults; `adminUserIds` bypass). `oldnext` has no `node_modules`, so it could not be executed.
- Also correct: admin.md:290 "API keys: SETTINGS gates … same" is right for the management endpoints. It misses that NEW turned the keys into request credentials (D1).

## 6. Open questions / couldn't verify

1. Prod `ADMIN_USER_IDS` on the old Vercel app: if it listed all team members, OLD support could do the D3 actions too.
2. Is `ADMIN_API_KEY` set on Dokploy prod, and are there rows in `api_keys` (D1)?
3. Does the Dokploy/Traefik config restrict `/django-admin/` or `/api/schema/` on the public API host (D5/D6/D8)?
4. D8 depends on Next 15 decoding `%2E%2E` / `%2F` in catch-all params. Needs a live request: `curl -i https://test.doulitsa.gr/api/auth/%2E%2E/%2E%2E/api/health`.
5. Are `users.password` columns populated for any admin (D6)?
