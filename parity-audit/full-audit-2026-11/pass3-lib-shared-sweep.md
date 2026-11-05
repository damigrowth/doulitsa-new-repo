# Lib / shared / app-level SWEEP — pass 3 (fresh re-audit) — 2026-11-05

Scope: everything outside the 10 domain reports, using `lib-shared-sweep.md` §1.4 as
the map. Pass-1 status labels were re-derived, not trusted. Zero code changes; no git.
Dedupe: I read SUMMARY.md, lib-shared-sweep.md, all pass2-*.md and the pass3-*.md files
already in this folder (auth-accounts, billing-payments, messaging, profiles-dashboard,
profiles-public-archives, reviews-saved). Known findings are not repeated here.

## 1. Coverage

### How the §1.4 labels were re-verified
- Pulled all 425 sweep-owned rows out of §1.4: 255 "identical", 48 "differs", 122 "no same-path file".
- **identical (255):** re-confirmed with `cmp`. All 255 are still byte-identical. Then I resolved
  every import in each file, both `@/…` and relative `./…`/`../…`, on both sides and diffed the
  target. That gave 54 `@/` and 76 relative edges where an identical file imports a module that
  differs. I read each differing target. They come down to these modules: `lib/utils/{cloudinary,index,media}`,
  `lib/types/{index,components,cloudinary}`, `lib/seo/{pages,fetch-entity}`, `lib/seo/schema/*`,
  `lib/auth/client`, `actions/services/get-categories` (getNavigationMenuData), `lib/validations/service`,
  `components/ui/sheet`, `components/shared/{user-avatar,next-link}`, `components/profile/menu-user`,
  `components/dashboard/dashboard-sidebar`, `components/guards/oauth-setup-guard`,
  `constants/datasets/dashboard`, `lib/cache/revalidation`, `footer-global`. The
  `@/stores/archive/archiveStore` and `components/index.ts` barrel edges are commented-out or dead imports on both sides.
- **differs (48):** read the real `diff` of every one, ignoring the line count. Below: Dockerfile, next.config.js,
  package.json (dependency and script set), dashboard layout/page, root layout, sitemap_static,
  dashboard-content/nav-services/sidebar, dynamic/index, audio/media-gallery, social-links,
  dynamic-breadcrumb, next-link, footer-global, user-avatar, sheet, blog-categories, dashboard.ts,
  footer.ts, revalidation.ts, errors.ts, json-types, fetch-entity, pages.ts, 7 schema files,
  types/{common,components,index}, utils/{datasets,date,form,index,media,misc/index},
  validations/index, middleware.ts, middlewares/index, global.d.ts, tsconfig.
- **no same-path (122):** re-checked that the "dead" claims hold. 0 importers for the 11 missing
  ui primitives (only `chart`/`toggle-group` are imported, from admin), and none for `shared/{taxonomy-selector,verified-badge,404,link}`
  (the `VerifiedBadge` in use comes from `profile-badges`). `instrumentation.ts`, email and Brevo files map to known D1/D4-D7.
- Also diffed: `oldnext/public` vs `frontend/public` (identical, 16 files) and
  `components/icon/**` (only the unused `x-custom.tsx` and a `.txt` are missing).

### NEW-side files read (beyond pass 1)
`frontend/src/lib/api/client.ts` (full), `middleware.ts`, `middlewares/{withTokenRefresh,withSimpleAuth,withHeaders,withLowercaseRedirect,stackHandler}.ts`,
`lib/auth/{cookies,client}.ts`, `app/api/auth/ws-token/route.ts`, `app/api/payments/check-access/route.ts`,
`lib/hooks/use-unread-count.ts`, `components/profile/menu-user.tsx`, `lib/seo/{fetch-entity,pages}.ts`,
`lib/seo/schema/*`, `lib/utils/{date,datasets,formatting/*,text/{slug,normalize,sanitize}}`, `lib/prisma-types.ts`,
section sitemaps, `Dockerfile`, `next.config.js`, `package.json`. Backend: `common/{exceptions,throttling,authentication,hashers,pagination,utils/{slug,normalize,cuid,cloudinary}}.py`,
`config/settings/{base,prod}.py`, `config/celery.py`, `apps/core/views/public/sitemaps.py`,
`apps/messaging/{brevo,emails}.py` (list logic, base URL), `apps/accounts/views/public/account.py` (SessionView),
`apps/saved/views/public/saved.py`, `apps/reviews/views/public/reviews.py` (CanUserReview), deploy docs
`DOKPLOY.md`, `DEPLOY-doulitsa-test.md`.

### Delegated / already owned
- The refresh-token rotation race (concurrent refreshes log the user out) is auth pass3 P3-D2. Not repeated here.
- The ws-token route never refreshes, so realtime breaks after 15 min (messaging pass3).
- ScopedRateThrottle subclasses are no-ops (profiles-dashboard pass3 C1). Confirmed below.

## 2. Mapping
No mapping changes vs pass-1 §2. One addition: the server-side token refresh exists in two
copies with different failure semantics: `middlewares/withTokenRefresh.ts` for document/RSC
requests and `lib/api/client.ts refreshAccessToken` for server actions and route handlers. The
middleware matcher skips `next-action` and `/api/*`, so the second copy is the one that runs for
every client-triggered action (S-D1).

## 3. DIFFERENCES (new only)

### S-D1. A refresh that fails with 429 or 5xx inside a server action deletes both auth cookies, logging the user out — MEDIUM
- OLD: a better-auth session cookie lasted 7 days and was never deleted on a transient backend error. A DB or network failure just made that one request anonymous.
- NEW:
  - `lib/api/client.ts:241-251` `refreshAccessToken` runs `if (!res.ok) { await clearTokens(); return null; }` for ANY non-2xx from `POST /auth/token/refresh`. That includes 429, 500, 502, 503 and 504. Then `client.ts:400` calls `clearTokens()` again before the anonymous retry.
  - The middleware copy is deliberately more careful. `withTokenRefresh.ts:72-77` treats only 400/401 as a dead token: "Any other status (5xx, network) → leave cookies alone".
- When this path runs:
  - `dj_access` has `maxAge` 15 min, the same as the token lifetime (`lib/auth/cookies.ts:37`). After 15 min the browser simply drops the cookie.
  - The middleware matcher excludes `next-action` requests (`middleware.ts:20-27`), so server actions never get the middleware refresh. They reach `apiRequest` with no token, Django answers 401, and `refreshAccessToken` runs.
  - The header's `MessagesMenu` → `useUnreadCount` polls the `getTotalUnreadCount` server action every 60 s and on window focus (`lib/hooks/use-unread-count.ts:30-31`; `components/profile/menu-user.tsx:189`). So for every logged-in user on any page, this refresh path runs about every 15 minutes.
- Why it fails in practice:
  - The refresh `fetch` (`client.ts:243-247`) sends no `X-Real-Client-IP`/`X-Internal-Proxy-Secret`. SimpleJWT's `TokenRefreshView` (`apps/accounts/urls/public.py:62`) has no throttle override, so it falls under the global `anon 100/5s` bucket keyed on the frontend container's IP. That is the same bucket pass-1 D12 and pass-3 billing P3-B2 describe.
  - Any burst returns 429. Any backend redeploy returns a Traefik 502/503 while Django restarts.
  - There is also no timeout on that fetch, unlike the middleware's 5 s `AbortController`.
- Impact: logged-in users get silently logged out whenever their 15-minute refresh coincides with a backend deploy or a throttle burst. The next click lands on `/login`. These look like "random logouts after deploys", with a separate root cause from P3-D2 (concurrency).
- Fix: in `refreshAccessToken`, clear cookies only on 400/401 (mirror the middleware). On other statuses, return null without clearing, and skip the `clearTokens()` at :400 in that case. Forward the real IP and secret on the refresh call, or exempt `token/refresh` from the anon throttle. Add an `AbortSignal.timeout`.
- Possibly intentional?: no. The two copies disagree, and the middleware comment states the intended rule.

### S-D2. Backend email links default to `http://localhost:3000`, and the SUMMARY env checklist names the wrong variable — LOW (config trap)
- OLD: every email link was built as `process.env.NEXT_PUBLIC_APP_URL || 'https://doulitsa.gr'` (`lib/email/services/{admin,service,review,message}-emails.ts`, `auth-integration.ts:80`). A missing env var still produced production links.
- NEW:
  - `config/settings/base.py:416` `FRONTEND_BASE_URL = env.str("FRONTEND_BASE_URL", default="http://localhost:3000")`.
  - It is used for every email link (`apps/messaging/emails.py:44 _frontend`), the verification/reset links (`apps/accounts/views/public/auth.py`, 2 uses), Cardlink return URLs (`apps/billing/services/providers.py` ×3, `views/public/billing.py`), the WS origin allow-list (`config/asgi.py:32-34`) and the API-host sitemaps.
  - The backend never reads `LIVE_URL`, which is frontend-only.
- Impact:
  - If `FRONTEND_BASE_URL` is forgotten on prod Dokploy, these all point to localhost: verification and password-reset mails, admin notification buttons, and the Cardlink redirect back.
  - SUMMARY.md's "Live env / DB checks → backend: … `LIVE_URL`" would send ops to check the wrong variable (see Corrections). The deploy docs (`DOKPLOY.md:45`, `DEPLOY-doulitsa-test.md:63`) do list `FRONTEND_BASE_URL`.
- Fix: default to `https://doulitsa.gr` like OLD, or fail at startup in `prod.py` when it is unset or localhost.
- Possibly intentional?: the dev default is intentional. The prod fallback differing from OLD is not.

### S-D3. The deploy doc's suggested private `DJANGO_INTERNAL_URL=http://backend:8000` cannot work with prod settings — LOW (docs vs config)
- `DEPLOY-doulitsa-test.md:118-120` says DJANGO_INTERNAL_URL "can instead be a private hostname (e.g. `http://backend:8000`)".
- `config/settings/prod.py` sets `SECURE_SSL_REDIRECT = True`, and `SecurityMiddleware` is enabled (`base.py:118`), with no `SECURE_REDIRECT_EXEMPT`. `ALLOWED_HOSTS` comes only from `DJANGO_ALLOWED_HOSTS` plus `127.0.0.1`/`localhost`.
- A plain-http internal call has no `X-Forwarded-Proto`. It gets a 400 DisallowedHost, or, if `backend` is added to the hosts, a 301 to `https://backend:8000/…`, which then fails TLS.
- That would break every SSR fetch, server action, sitemap and webhook proxy at once (all use `DJANGO_INTERNAL_URL`, see `client.ts:69-78`).
- `docker-compose.yml:199` only works because it runs `config.settings.dev`.
- Impact: none today, since both docs set the public https URL. It is a trap for anyone who follows the "faster" tip. A private hop would also be the natural fix for pass-1 D12/P3-B2, so the trap matters.
- Fix: document that a private hop needs `SECURE_REDIRECT_EXEMPT`/`SECURE_PROXY_SSL_HEADER` handling (for example, send `X-Forwarded-Proto: https` from Next) and an `ALLOWED_HOSTS` entry. Or drop the tip.

### S-D4. Frontend dependency drift: `react-hook-form` unpinned, React minor bump — INFO
- OLD `package.json`: `react 19.0.1`, `react-dom 19.0.1`, `react-hook-form 7.60.0` (exact pin), `next ^15.5.15`.
- NEW: `react 19.2.7`, `react-dom 19.2.7`, `react-hook-form ^7.60.0` (installed 7.79.0 in `frontend/node_modules`), `next ^15.5.19`.
- Every form in the app (`useForm`, `zodResolver`, `formState.isDirty`/`isValid` gating of the submit buttons) runs on a 19-minor-version newer RHF than prod. The old exact pin looks deliberate.
- No behavioral difference was found in code review. I list it so that a form-validation or disabled-state regression found in QA gets checked against the RHF bump first.
- Removed packages (`@vercel/speed-insights`, `@next/third-parties`, `react-select`, `react-stars`, `embla-carousel-autoplay`, `@floating-ui/dom`, …) have 0 importers in old `src`, so there is no impact.

## Corrections
- **SUMMARY.md, "Live env / DB checks", backend list: "`LIVE_URL`"** is wrong for the backend. Django reads `FRONTEND_BASE_URL` (S-D2). `LIVE_URL` is a frontend runtime var (canonical/sitemap/JSON-LD, pass-1 D14).
- **lib-shared-sweep §4 "47/53 ui primitives (the 13 missing …)"**: the counts are 64 old `components/ui` files, 50 byte-identical, 1 differing (`sheet.tsx`, the intentional drawer fix) and 13 absent. The conclusion (absent ones unused or admin-only) stands. I re-verified it with importer greps.
- **lib-shared-sweep D11** (forgot-password "per-IP 3/10min"): I confirm profiles-dashboard pass3 C1. DRF `ScopedRateThrottle.allow_request` replaces the class `scope` with `getattr(view, 'throttle_scope', None)`. No view sets `throttle_scope`, so `PasswordResetThrottle` never fires and forgot-password has no rate limit at all, apart from the global anon/user throttles if the view keeps them. The D11 copy point (no minutes in the message) stands. The "3 mails per 10 min per IP" impact is understated: it is unbounded.
- **lib-shared-sweep D19** ("Retries: … OK otherwise") is incomplete. The refresh step's failure handling is the defect in S-D1.

## 4. Re-verified same (this pass)
- All 255 "identical" sweep files are still byte-identical. Their differing imports are accounted for: type-only changes (`PrismaJson`→`AppJson`, `@prisma/client` enums → `lib/prisma-types.ts`; every enum value checked against the 13 `.prisma` schemas, all equal), dead/commented exports, or known findings (D9/D10/D14/D17/D18, services D5).
- Middleware: chain order (lowercase → token refresh → simple auth → headers), the matcher (identical, including the `missing` prefetch/action rules), `withLowercaseRedirect` and `withHeaders` (byte-identical; `x-current-path` has no reader on either side), and `withSimpleAuth`, whose protected-path logic is identical with only the cookie names changed. In the refresh branch the fresh token reaches RSC via `x-dj-fresh-access`. In the dead branch the cookie header is stripped before `withSimpleAuth`, so the `/dashboard` → `/login` redirect still works.
- API client: the error envelope maps `{error:{code,message,details}}` to `ApiError`. 204 → undefined. FormData bodies skip JSON content-type and survive the retry. Cacheable calls are fully anonymous, and Next caches only status-200 fetches (`next/dist/server/lib/patch-fetch.js:611`), so error responses are never stored in the Data Cache. The anonymous retry after 401 can't double-execute a mutation (auth runs before the view).
- Optional-auth endpoints (`/auth/session`, `/saved/state`, `/reviews/can-review`, `/payments/check-access`) can answer anonymously when the access cookie has lapsed. The 60 s unread poll plus `MenuUser`'s per-navigation `refetch` keep that window at ≤60 s or one click, so there is no separate finding.
- SEO: `fetchEntity` profile/taxonomy branches match OLD (profile payload `category`/`subcategory` are ids, `profile_reads.py:92-93`). The service branch is known services D5. JSON-LD helpers differ only in the base-URL env chain (D14). `getArticleMetadata` matches apart from known D17. `lib/seo/{meta,metadata,format-template,get-entity-values}` are identical, and the canonical, sitemap and sitemap-index use the same `LIVE_URL || https://doulitsa.gr`.
- Sitemaps: Django `SitemapEntriesView` has `_ENTRIES_MAX_LIMIT = 50_000`, equal to the `limit=50000` the frontend asks for, so there is no truncation. The error → `[]` fallback and `revalidate 3600` are the same as OLD.
- Utilities: `normalizeTerm` ↔ `normalize_term` (NFD + strip U+0300–036F + lower; final-sigma handling equal in JS and Python 3), `createSlug`/`generateServiceSlug` ↔ `common/utils/slug.py` (same longest-first stable ordering, same regexes), and `lib/utils/date.ts`/`formatting/*` (only the dead `addBillingCycleDays` was removed; the TZ dependency is known D1). `datasets.ts` changes are limited to id-or-name coverage matching, null guards and the breadcrumb `baseHref` removal (known D9/D18). `getLocations()` → `locationOptions` is the same static source as OLD.
- New cuids (`common/utils/cuid.py`: `c` + base36, 24 chars) pass the frontend zod `.cuid()` checks (`validations/shared.ts:12`, `admin.ts:774`).
- Brevo `sync_user_to_correct_list` re-checked line by line against `list-management.ts:277-330` + `workflows.ts:405-428`: the same completeness rule (image && category && subcategory), published count, remove-others-then-add, blocked/banned → remove all.
- `next.config.js`: redirects, headers and images are identical (images `unoptimized`, so remote hosts don't matter). `public/` is identical. The Dockerfile only adds TZ (known D1) and build args.
- The admin email recipient fallback `contact@doulitsa.gr` matches OLD (`emails.py:47-55`).

## 5. Open questions / couldn't verify
- S-D1: how often the 15-min refresh actually lands in a deploy window or a 429 burst. This needs Traefik/Django logs for `POST /api/auth/token/refresh` with status ≠ 200, correlated with "logged out" reports.
- S-D2: whether prod Dokploy actually has `FRONTEND_BASE_URL=https://doulitsa.gr`. A live env check is needed.
- S-D4: RHF 7.60 → 7.79 changelog impact on `isDirty`/`isValid` with `mode` defaults. Not exercised in a browser.
