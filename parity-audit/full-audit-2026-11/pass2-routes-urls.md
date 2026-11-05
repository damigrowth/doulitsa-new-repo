# Routes / URLs parity audit (PASS 2) — 2026-11-05

Scope: the full URL inventory, old vs new. It covers every page and API route, redirects (next.config, both middlewares, vercel.json), the URLs the sitemaps emit, hardcoded hrefs and email links, query-param contracts, and case/trailing-slash/host handling.
Dedupe: findings already in SUMMARY.md or the 11 pass-1 reports are left out (or listed under "Corrections").

Method: a static diff of both trees, plus **live HTTP checks** run on 2026-11-05 against
`https://doulitsa.gr` and `https://test.doulitsa.gr`. Today `doulitsa.gr` is **still the OLD app on Vercel**: DNS is `cname.vercel-dns.com`, `server: Vercel`, `x-vercel-cache`. That made it a live oracle for the old behavior. `test.doulitsa.gr` is the NEW stack.
Both hosts got the same GET requests. Only read-only GETs were used, and no code was changed.

## 1. Coverage

### OLD files read
- Every `oldnext/src/app/**` route file. That is 53 admin pages, 9 archive pages + 6 archive not-found + 6 section `sitemap.ts`, 9 auth pages, 2 blog pages, 20 dashboard pages (+ `loading`, `not-found`), home, 7 static pages, profile/service pages (+ `loading`, `not-found`), `payment/callback`, `sitemap.xml`, `sitemap_static.xml`, `(sitemap)/sitemap_index.xml`, `robots.txt`, `global-not-found`, `global-error`, and all 12 `app/api/**/route.ts`.
- `oldnext/next.config.js` (redirects/headers), `oldnext/vercel.json` (crons), `oldnext/src/middleware.ts`, `src/middlewares/{index,stackHandler,withLowercaseRedirect,withSimpleAuth,withHeaders,withAdminAuth}.ts`.
- `oldnext/public/**`: byte-compared with the new one, and identical.
- URL builders: `src/lib/auth/config.ts` (verification/reset/Google redirectURI), `src/lib/email/**`, `src/constants/email/templates/*` (every href), `src/lib/payment/providers/worldline/adapter.ts`, `src/actions/subscription/create-checkout-session.ts`, `src/lib/seo/{pages,meta,metadata,fetch-entity}.ts`, `src/lib/seo/schema/*` (URL fields), `src/lib/utils/taxonomy-routes.ts` (dead), `src/actions/services/get-services.ts` (archive not-found logic :860-900, searchParams :905-930), `src/actions/profiles/get-profiles.ts` (searchParams), and the `app/api/verify-email` and `payment/worldline/redirect` routes.
- A repo-wide grep of every `href=` / `push(` / `redirect(` / `url:` string literal (113 distinct old paths), plus every literal link that carries a query string (21 distinct patterns), was diffed against the same grep of the new tree.

### NEW files read
- Every `frontend/src/app/**` route file (same tree, plus `(pages)/cookies`, `api/auth/{callback/google,oauth/google/login,ws-token}`, `api/payments/check-access`), `frontend/next.config.js`, `frontend/vercel.json`, root `vercel.json`, `frontend/src/middleware.ts`, `src/middlewares/*` (including `withTokenRefresh.ts`).
- `frontend/src/app/api/{auth/[...all],verify-email,payment/worldline/redirect,webhooks/revalidate-cache,sign-cloudinary-params}/route.ts`, `frontend/src/actions/services/get-services.ts` (archive bundle enrichment :155-300), `frontend/src/app/(archives)/(services)/{ipiresies/[subcategory],categories/[category]}/page.tsx` + not-found, `frontend/src/lib/seo/*` (diffed).
- Backend: `apps/core/middleware.py` (LowercaseRedirectMiddleware, API host only), `apps/core/views/public/sitemaps.py` (`SitemapEntriesView`), `apps/messaging/emails.py` (every `_frontend()` link), `apps/accounts/urls` (auth surface + `BetterAuthCatchAllView`), `apps/billing/services/providers.py` (checkout URLs, provider dispatch), `apps/services/selectors/service_reads.py` (`get_archive_bundle`, breadcrumbs (unused by the FE), search preview urls), `apps/profiles/selectors/profile_aggregations.py` (hrefs).
- `DOKPLOY.md`, `GO-PRODUCTION-CHECKLIST.md` (host layout: frontend and API on separate hosts, so Django never shadows the Next `/api/*` routes).

### Delegated elsewhere / already owned
- Admin `/admin/git` and `/admin/taxonomies/git` removal → admin.md (Git flow superseded).
- `/api/debug/time` removal → blog-support-media-crons.md (intentional).
- `/api/auth/exchange-token` contract → auth-accounts.md D23.
- Cron routes and Vercel crons → blog-support-media-crons.md / billing-payments.md.

## 2. Mapping (old URL → new status)

Status legend: **SAME** = same path, same status/redirect (live-verified where marked ✓). **REDIRECT** = still 30x to the same target. **MISSING** = 404 or broken on new. **DIFF** = resolves but with a different status or contract.

### 2a. Redirects and normalisation (all live-verified ✓, old vs new identical)
| Old URL | Old response | New response | Status |
|---|---|---|---|
| `/s` | 308 → `/ipiresies` | 308 → `/ipiresies` | SAME ✓ |
| `/profile` | 308 → `/pros` → 308 `/dir` | same chain | SAME ✓ |
| `/pros`, `/pros/:cat`, `/pros/:cat/:sub` | 308 → `/dir…` | same | SAME ✓ |
| `/companies`, `/companies/:cat[/:sub]` | 308 → `/dir…` | same | SAME ✓ |
| `/auth/sign-in` | 308 → `/login` | same | SAME ✓ |
| Uppercase static prefix (`/DIR`, `/Profile/x`) | 301 → lowercase prefix (dynamic part kept) | same (`withLowercaseRedirect` byte-identical) | SAME ✓ |
| Trailing slash (`/dir/`, `/profile/x/`) | 308 → no slash | same | SAME ✓ |
| `/Ipiresies/` | 308 → `/Ipiresies` (slash first), then 301 lowercase | same | SAME ✓ |
| `/dashboard*`, `/onboarding*` while logged out | 307 → `/login` | same | SAME ✓ |
| `http://doulitsa.gr/*` | 308 → https | host-level, see §5 | live check at cutover |
| `https://www.doulitsa.gr/*` | **307** → apex (Vercel domain setting) | not configured in the repo | live check at cutover (§5) |

### 2b. Public page routes
| Old route | New | Status / notes |
|---|---|---|
| `/` | same | SAME |
| `/about`, `/contact`, `/faq`, `/for-pros`, `/privacy`, `/terms`, `/politiki-akirosis` | same (byte-identical page files) | SAME ✓ (every sitemap_static URL returns 200 with the same `<title>`) |
| `/cookies` | old 404 → new 200 | additive (known, lib-shared D15) |
| `/dir`, `/dir/[category]`, `/dir/[category]/[subcategory]` | same | SAME ✓: all 175 old `dir/sitemap.xml` URLs give 200 with the same title on new. Bad slugs give 404 on both ✓ |
| `/directory` | same | SAME ✓ |
| `/categories`, `/categories/[category]` | same | Valid: SAME ✓ (8/8). **Bad slug: old 404 → new 200 (D1)** |
| `/ipiresies`, `/ipiresies/[subcategory]`, `/ipiresies/[subcategory]/[subdivision]` | same | Valid: SAME ✓ (all 315 old sitemap URLs give 200 with the same title). **Bad slug: old 404 → new 200 (D1)** |
| `/s/[slug]` | same | SAME ✓. The ID comes from the slug tail (`/s/wrong-text-887` and `/s/887` resolve on both). A missing service gives 200 plus the not-found page on **both** (loading.tsx streaming), so this is not a regression |
| `/profile/[username]` | same | SAME ✓. Case-sensitive on both (`/profile/XFDESIGNSTUDIO` shows not-found on both). A missing profile gives 200 plus the not-found page on both |
| `/articles`, `/articles/[slug]` | same | SAME ✓: all 15 old article URLs give 200 with the same title. Old category slugs → known blog D1 |
| `/login`, `/register`, `/register/success`, `/register/failure`, `/forgot-password`, `/reset-password`, `/onboarding`, `/oauth-setup`, `/oauth-callback` | same (login/register/reset pages byte-identical) | SAME |
| `/payment/callback` (+ `?status=success`, `?canceled=true`, `?error=config|payment|security`) | same; Django builds `{base}/payment/callback?{query}` | SAME |
| `/robots.txt`, `/site.webmanifest`, `/favicon*.png`, `/favicon.ico`, `/apple-touch-icon-v1.png`, `/android-chrome-*`, `/doulitsa-og.png`, `/doulitsa-logo.svg`, `/category-icons/*` | identical `public/` | SAME ✓ |
| `/sitemap.xml`, `/sitemap_index.xml`, `/sitemap_static.xml`, `/{s,profile,articles,dir,ipiresies,categories}/sitemap.xml` | same 7-entry index | SAME ✓ (see 2e) |
| `/blog`, `/services`, `/pricing`, `/help`, `/careers`, `/support`, `/sign-in` | 404 on old too (they appear only in the lowercase list or as a dead redirect) | SAME ✓ (404 both) |

### 2c. Dashboard routes (all 20 old pages exist at the same path; `searchParams` keys per page are identical)
`/dashboard`, `/dashboard/checkout` (`?interval`, `?error`, `?canceled=true`), `/dashboard/documents`, `/dashboard/messages` (`?chatId`), `/dashboard/messages/[chatId]`, `/dashboard/profile{,/account,/additional,/basic,/contact-details,/coverage,/verification}`, `/dashboard/promote`, `/dashboard/promote/success`, `/dashboard/reviews` (`?rec_page`, `?g_rec_page`), `/dashboard/saved`, `/dashboard/services`, `/dashboard/services/create`, `/dashboard/services/create/success`, `/dashboard/services/edit/[id]` → all **SAME**.
`redirect('/sign-in')` inside the messages pages points to a 404 path on both (an old bug, ported 1:1).

### 2d. Admin routes
All old `/admin/**` pages exist at the same paths except `/admin/git` and `/admin/taxonomies/git`. Those are known (admin.md) and live-checked: old 307 → login, new 404.
The dead old links `/admin/profiles?id=X` and `…/create?parent=X` had no live callers in old.

### 2e. Sitemap output (live, old prod vs new test)
- Index: identical 7 children ✓. `sitemap_static`: old 14 URLs, all present on new, plus `/cookies` and `/politiki-akirosis` (known).
- `categories` 8/8 identical. `articles` 15/15 identical.
- `ipiresies` (old 315 / new 277), `dir` (175 / 142), `s` (950 / 705), `profile` (596 / 395). These differ only because the test DB is an older or partial snapshot. The old-only service URLs have the newest ids, and they show "404 - … δεν βρέθηκε" on test. The URL **patterns** are identical: `/s/<slug>`, `/profile/<encodeURIComponent(username)>`, `/articles/<slug>`, `/ipiresies/<sub>[/<div>]`, `/dir/<cat>[/<sub>]`, `/categories/<cat>`.
- Every old taxonomy, static or article sitemap URL (527) returns **200 with exactly the same `<title>`** on new. A row-by-row title diff gave 0 differences.

### 2f. API routes
| Old | New | Status |
|---|---|---|
| `/api/auth/[...all]` (better-auth) | proxy → Django `/api/auth/<rest>` (`BetterAuthCatchAllView`) | DIFF for in-flight email links (D2) |
| `/api/auth/callback/google` (Google redirect URI) | same path, explicit route; same redirect_uri sent to Google | SAME (no Google Console change needed) |
| `/api/auth/get-session` and other better-auth client endpoints | old 200 → new 404 JSON | expected (the client was rewritten); only stale old browser bundles hit them |
| `/api/auth/exchange-token` | proxied via the catch-all to Django (401 without auth) | known (auth D23) |
| `/api/verify-email?token&callbackURL` | proxy (`callbackURL` ignored) | known (auth D1) |
| `/api/payment/worldline/redirect?session=` | proxy, same param | SAME |
| `/api/webhooks/worldline` (POST, the Cardlink confirm/cancel URL) | proxy, same path | SAME path (UA issue known, billing D3) |
| `/api/webhooks/worldline/advice` (GET, POST) | same | SAME path |
| `/api/webhooks/revalidate-cache` (GET, POST) | same, now fails closed without a secret | SAME path |
| `/api/sign-cloudinary-params` (POST) | proxy | SAME |
| `/api/cron/{auto-refresh,worldline-renewals}` (POST) | GET+POST | SAME path (behavior known) |
| `/api/cron/process-email-batches` (GET) | same | SAME |
| `/api/debug/time` | 404 | known, intentional |

### 2g. Links in OLD emails (already sent, sitting in inboxes) → new
| Old email link | New |
|---|---|
| `/dashboard`, `/dashboard/messages`, `/dashboard/reviews`, `/dashboard/services/edit/{id}`, `/s/{slug}`, `/profile/{username}` | SAME path |
| `/admin/services/{id}`, `/admin/profiles/{id}`, `/admin/users/{id}`, `/admin/reviews[/{id}]`, `/admin/verifications[/{id}]`, `/admin/subscriptions/{id}` | SAME path. Admin ids are the same cuids if the data was migrated 1:1 |
| `/api/verify-email?token=<better-auth JWT>&callbackURL=…` | resolves, but the token is invalid on the new stack → `/register/success?verified=false` (known auth D1 page; transitional) |
| `/api/auth/reset-password/<token>?callbackURL=…/reset-password` | **raw JSON 404 (D2)** |
| Brevo `serviceUrl: https://doulitsa.gr/ipiresies/{slug}` (`brevo/workflows.ts:160`) | dead code in old (`onServiceApproved` has no caller), so ignored |

## 3. DIFFERENCES (new findings only)

### D1. Unknown service-archive slugs return HTTP 200 with an empty archive. Old returned 404 — MEDIUM (SEO)
- OLD: `getServiceArchivePageData` resolves the slug against the service taxonomy. When the slug is unknown it returns `{success:false, error:'Subcategory not found' | 'Subdivision not found' | 'Category not found'}` (`oldnext/src/actions/services/get-services.ts:864-893`). The pages call `notFound()` when `error.includes('not found')`, and `/categories/[category]` also calls it when `!currentCategory`. The live old site returns **404** for `/ipiresies/zz-nope`, `/ipiresies/sxediasmos/zz-nope` and `/categories/zz-nope` (verified 2026-11-05).
- NEW: `frontend/src/actions/services/get-services.ts:155-300` takes the backend bundle as given. Its `enrich()` (≈:175-181) turns any unknown slug into a stub `{id: slug, slug, label: slug}` and never returns a "not found" error. So `ipiresies/[subcategory]/page.tsx:74-78`, `[subdivision]/page.tsx` and `categories/[category]/page.tsx:86-106` never call `notFound()`. Live on test.doulitsa.gr, the same 3 URLs return **HTTP 200**. The page renders an empty archive whose `<h1>` is the raw slug ("zz-nope"), while the metadata (from `getServiceSubcategoryMetadata`) gives the `<title>` "404 - Κατηγορία δεν βρέθηκε" and `noindex`.
- Impact: retired or renamed taxonomy slugs, typo links and old external links become soft-404s, where the old site returned a hard 404. Google reports "Soft 404", and users see an empty listing titled with a raw slug instead of the "Ουπς! Η κατηγορία δεν βρέθηκε" page. Every renamed or removed service subcategory from the old taxonomy is exposed this way at cutover. `/dir/*` is not affected (live 404 on both). The pro-side wrong-type case is profiles-public-archives D5.
- Fix: in the FE action, return `{success:false, error:'… not found'}` when `findServiceBySlug(slug) ?? findServiceById(slug)` is null for the route's slug, as old did, instead of building a stub.
- Possibly intentional?: no.

### D2. Old-format password-reset links (already in inboxes) give a raw JSON 404 that lists the whole API surface — LOW (transitional, plus minor info exposure)
- OLD: better-auth emailed `{base}/api/auth/reset-password/<token>?callbackURL=<base>/reset-password` (`oldnext/src/lib/auth/config.ts` sendResetPassword uses better-auth's `url`; `actions/auth/forgot-password.ts:46,94` sets `redirectTo`). Live old: an invalid or expired token gives 302 → `/reset-password?error=INVALID_TOKEN`, a branded page.
- NEW: `frontend/src/app/api/auth/[...all]/route.ts` proxies to Django `BetterAuthCatchAllView` (`apps/accounts/urls` last pattern). Live it returns **404 `application/json`** `{"error":{"code":"not_implemented","message":"Better Auth path 'reset-password/abc123' is not migrated…","details":{"supported":{…every auth endpoint…}}}}`. The same happens for any `doulitsa.gr/api/auth/<anything>`.
- Impact: anyone who asked for a reset just before cutover and clicks after it gets a JSON error page instead of the reset form. The tokens would be invalid anyway, but old sent the user to a page where they can request a new link. The catch-all also publishes the full DRF auth endpoint map on the main domain.
- Fix: in the `[...all]` route (or Django), `GET reset-password/<token>` → 302 `/reset-password?error=INVALID_TOKEN`, and any other unknown GET → a plain 404 without the manifest.
- Possibly intentional?: partly. The manifest is a dev aid. The redirect is a cheap transitional shim.

### D3. Stripe checkout success/cancel URLs point at `/dashboard/billing`, a route that never existed — LOW (latent)
- OLD: only the Worldline provider existed, and `successUrl` was `${baseUrl}/dashboard/promote/success` (`create-checkout-session.ts:100`).
- NEW: `backend/apps/billing/services/providers.py:180-181` uses `FRONTEND_BASE_URL + "/dashboard/billing?status=success|cancel"`. There is no `dashboard/billing` page in either app (logged-in users get a 404). The code is reachable through `create_checkout` (:247-258) when `subscription.provider == "stripe"` (for example a migrated Strapi-era row) or when the Worldline MID is unset and `STRIPE.SECRET_KEY` is set (`get_provider` :235-244).
- Impact: none while Worldline is configured. If the Stripe fallback is ever used, the buyer lands on a 404 after paying.
- Fix: use `/dashboard/promote/success` and `/dashboard/checkout?canceled=true` (the old contract), or remove the Stripe path.
- Possibly intentional?: no. It is an unported leftover.

## 4. Confirmed same (verified)
- Route tree: every old page route exists at the same path in new except `/admin/git` and `/admin/taxonomies/git` (known). Route groups are mirrored 1:1, and there are no parallel or intercepted routes in either app.
- `next.config.js` `redirects()` are identical (9 rules). `withLowercaseRedirect`, `withHeaders` and `stackHandler` are byte-identical, the middleware matcher is identical, and the `withSimpleAuth` public/auth path lists and the `/login` redirect target are identical. All of this was live-verified (§2a).
- No `trailingSlash`, `basePath` or i18n config in either app. Both use Next's default 308 slash-strip ✓.
- `searchParams` keys per page (archives: `search`, `sortBy`, `page`, `limit`, `county`, `περιοχή`, `online`, `type`; dashboard: `chatId`, `rec_page`, `g_rec_page`, `interval`, `error`, `canceled`; auth: `email`, `token`, `verified`, `step`, `type`) are the same names in the same files. The same `useSearchParams()` consumers exist (except one dead admin component). Value-level differences (`?online=false`, `?περιοχή=` on services, the `?search` loss, `?limit=abc` → 500) are already in pass-1.
- Hardcoded hrefs: all 113 old internal path literals resolve to existing new routes. The only old-only literals are dead code or known items.
- Sitemap URL patterns, robots.txt, the static sitemap list (plus 2 known additions) and the identical `<title>` of all 527 old taxonomy, static and article URLs.
- Google OAuth redirect URI is the same (`{origin}/api/auth/callback/google`). Cardlink confirm/cancel URL path (`/api/webhooks/worldline`) and the payment redirect URL (`/api/payment/worldline/redirect?session=`) are the same.
- New emails use the same link paths as old for welcome, review, new-profile, service-created, service-published, unread digest, subscription-payment and reset (`/reset-password?token=`, the URL old's better-auth redirect ended on).
- `/s/<anything>-<id>` ID-tail resolution, and soft-404 (200) for a missing service or profile, are the same on both (old behaves this way too, which is why it is not reported).

## 5. Open questions / couldn't verify
- **Cutover host config:** live DNS on 2026-11-05 shows `doulitsa.gr` and `www` still on Vercel. Today `www.doulitsa.gr` → apex is a **307** (Vercel) and `http` → `https` is a 308. Nothing in the repo configures www → apex on Dokploy/Traefik. Verify after the DNS switch that `www.doulitsa.gr/*` redirects (ideally 301/308) to the apex and that the TLS cert covers `www`. Otherwise every www backlink and bookmark breaks.
- **Taxonomy slug drift at cutover:** the 40 old-only `/ipiresies/...` and 33 old-only `/dir/...` sitemap URLs all still render on test (200, same title), so no slug was renamed in code. Whether any service or profile slug or username changed in the prod migration can only be checked against the prod DB. Compare the old prod `s/sitemap.xml` and `profile/sitemap.xml` against the new prod sitemaps right after cutover; the scratch lists are reproducible with the curl loop described in §2e.
- **Old-format verification links** (`/api/verify-email?token=<better-auth JWT>`) land on the known auth-D1 page (`verified=false`, no resend). This only matters inside the 1-hour token window around cutover.
