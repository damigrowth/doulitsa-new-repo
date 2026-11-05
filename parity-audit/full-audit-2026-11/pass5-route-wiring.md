# Pass 5: Next.js app-tree wiring, route by route (2026-11-05)

Cut: every route segment under `frontend/src/app` vs `oldnext/src/app`. I checked
boundary files (loading/error/not-found), rendering-mode exports, layouts and
providers, metadata and robots, middleware matcher and auth gates, Suspense
boundaries, and route-group, parallel and intercepting structure. I made no code
changes and ran no git commands. Dedupe: I skimmed every pass 1-4 report's
finding titles first. Already-known items are listed in §4 and not reported again.

## 1. Coverage

### Route tree (both sides enumerated with `find`; every file accounted for)
- **Old:** 142 non-API files under `oldnext/src/app`. **New:** 139.
- **Same path, missing in new:** `(admin)/admin/git/page.tsx`, `(admin)/admin/taxonomies/git/page.tsx` (known, admin.md), `actions/shared-file-formatter.ts`, `actions/taxonomy-file-manager.ts` (Git-flow helpers, admin.md).
- **New only:** `(pages)/cookies/page.tsx` (part of the known consent rework, lib-shared D8).
- **Route groups:** all 10 mirror 1:1: `(admin) (archives)/(pro|services) (auth) (blog) (dashboard) (home) (pages) (profile) (service) (sitemap)`, plus the `(list)` group under `dashboard/services`. Neither side has parallel (`@slot`) or intercepting (`(..)`) routes.

### Boundary files: identical sets and identical bytes (checked with `diff -q`)
- **loading.tsx (3):** `profile/[username]`, `s/[slug]`, `dashboard/services/(list)`.
- **not-found.tsx (9):** `dir`, `dir/[category]`, `dir/[category]/[subcategory]`, `categories/[category]`, `ipiresies/[subcategory]`, `ipiresies/[subcategory]/[subdivision]`, `profile/[username]`, `s/[slug]`, `dashboard/services/edit/[id]`.
- **error.tsx:** none on either side. Only `global-error.tsx` and `global-not-found.tsx` exist, and both are byte-identical. A thrown page error therefore lands on the same full-page crash screen in both apps.

### Layouts (14): 13 byte-identical
- **Root `layout.tsx`:** differs only by the GTM-to-consent swap (known D8).
- **`dashboard/layout.tsx`:** differs only in comments.
- **Providers, checked one level down:**
  - `Body`, `Notifications`, `PathChecker` and the header/footer wrappers are identical, apart from the footer cookie button.
  - `lib/providers/*` is identical.
  - `AdminLayoutWrapper` only adds a nested `TooltipProvider`. It is harmless and does not cause a remount.
- No layout gained or lost state that would cause a remount.

### Rendering-mode exports
I extracted every `dynamic/revalidate/fetchCache/runtime/preferredRegion/generate*` export on both sides and diffed them (§2).

### Metadata
- **Page-level:** every `metadata`/`generateMetadata` export is the same on both sides, except the new `/cookies` page.
- **Shared SEO helpers:** `lib/seo/{meta,metadata,format-template,get-entity-values}.ts` are identical.
- **`pages.ts` / `fetch-entity.ts`:** the only change is the data source (known).
- **Root title template:** `'%s | Doulitsa'` on both sides.
- **robots:** `robots.txt` is identical, and neither app sets `robots`, `noindex` or `nofollow` anywhere (grep returns 0 on both).

### Middleware
- **Files:** `middleware.ts`, `middlewares/{stackHandler,withHeaders,withLowercaseRedirect,withSimpleAuth,withTokenRefresh}.ts`, compared with the old `withAdminAuth.ts` (dead code).
- **Matcher:** identical.
- **Protected prefixes:** identical, `/dashboard*` and `/onboarding*`.
- **Admin and other gates:** `/admin` is guarded by `AdminGuard` in the layout (identical file) plus per-page `requirePermission` calls. The set of `requirePermission` calls is identical, apart from the removed git page. `/oauth-setup` and `/payment/callback` are page-gated on both sides.

### Suspense, useSearchParams and dynamic imports
- I grepped every `<Suspense`, `useSearchParams` and `dynamic(` in `src/**/*.tsx` on both sides. The sets are identical, apart from the removed git page.
- No boundary streams on one side and blocks on the other.

### Page bodies
I diffed every same-path page pair. 52 differ, most by 2-10 lines: session-helper swaps, dataset-to-`getX()` swaps, null guards. All larger diffs map to known findings (§4).

## 2. Rendering-mode export diff (old → new)
| Route | OLD | NEW | Status |
|---|---|---|---|
| `/` | `force-static` + `revalidate 86400` + `fetchCache force-cache` | `revalidate 300` | caching design (intentional). See **W1** for a runtime defect |
| `/dir*`, `/directory`, `/categories*`, `/ipiresies*`, `/articles*`, `/s/[slug]`, `/profile/[u]` | `revalidate 3600/300` | `force-dynamic` | known (pass2-caching §2a, blog, profiles) |
| `/dashboard` page | `revalidate 3600` | `revalidate 60` | no effect (layout is force-dynamic; lib-shared) |
| `/admin/notifications` | — | `revalidate 0` | new real-data page (copy D3); no effect |
| `messages/[chatId]` | force-dynamic + force-no-store + revalidate false | same | same |
| `onboarding` | force-dynamic | same | same |
| sitemaps (`dir`, `categories`, `ipiresies`, `s`, `profile`, `articles`) | `revalidate 3600` | `revalidate 3600` (declared) | **W2**: three are silently dynamic |

## 3. NEW DIFFERENCES

### W1. Home page ISR regeneration fails at runtime when the taxonomy maps' background `no-store` fetch runs inside the ISR render. The first regeneration after an idle minute errors and `/` stays stale until a 30 s retry — LOW (reproduced live)
- **OLD:** `(home)/page.tsx:15-17` sets `dynamic='force-static'`. Under force-static, `markCurrentScopeAsDynamic` is a no-op, so no fetch inside the render can flip the route to dynamic. Regeneration works, and tag purges refresh the page.
- **NEW:**
  - `(home)/page.tsx:22` sets only `revalidate = 300`. The comment at `:15-21` claims every fetch underneath is anonymous and cached.
  - That is not true for the taxonomy layer. During the render, `getServiceTaxonomies()` (`page.tsx:57`) and the `find*` lookups in `getHomePageData()` (`actions/home/get-home-data.ts:43-47`) call `getTaxonomyMaps()` (`lib/taxonomies/index.ts:167-178`).
  - When more than 60 s have passed since the last refresh in that Node process, `getTaxonomyMaps()` fires `_fetchTaxonomyMaps()`, which calls `fetch(…/api/taxonomy/maps, { cache: 'no-store' })` (`index.ts:151`). This happens inside the render's async context.
- **Next 15.5.19 behavior (read in node_modules):**
  - A `no-store` fetch during static generation calls `markCurrentScopeAsDynamic` (`next/dist/server/lib/patch-fetch.js:744-771`).
  - For the `prerender-legacy` work unit that sets `revalidate = 0` and throws `DynamicServerError` (`server/app-render/dynamic-rendering.js:211-219`). The throw is swallowed by the try/catch in `_fetchTaxonomyMaps`, but `revalidate = 0` stays set.
  - After the render, `build/templates/app-page.js:432-434` throws `Page changed from static to dynamic at runtime /`.
  - The response cache then re-stores the OLD entry with a 30 s back-off (`server/response-cache/index.js:286-290`, `Math.min(Math.max(revalidate||3,3),30)`).
- **Live reproduction on test.doulitsa.gr (2026-11-05 16:38-16:41):**
  - I polled `/` every 20 s. Polls only hit the cache, so nothing else refreshed the taxonomy maps.
  - The entry went from `s-maxage=300 … x-nextjs-cache: HIT` to `STALE` at 16:40:23 (regeneration triggered), then `s-maxage=30` at 16:40:43 (the error back-off signature; nothing in the code sets 30), then `STALE` again at 16:41:03 (retry).
  - At 16:41:23 the header was back to `s-maxage=300` and stayed there (HIT through 16:42:03). The retry succeeded because the failed render had itself refreshed the maps less than 60 s earlier.
  - Earlier the same day the entry was already in the `s-maxage=30` back-off state, so this happens repeatedly.
- **Impact:**
  - On a quiet instance, every regeneration of `/` (each 5-minute expiry, and after each `revalidateTag('page:home')` purge) fails on its first attempt.
  - The home page keeps the previous render for about 30-40 s longer than intended.
  - The server log gets an error each time.
  - Busy traffic hides it, because other renders keep the maps refreshed.
  - The page does not get stuck permanently: the retry inside the 60 s window succeeds. A second render-time defect could change that, so this design is fragile.
- **Fix hint:** make the background refresh not run inside a render context. Options:
  - Use `fetch(…, { next: { revalidate: 60 } })` or wrap the call in `unstable_cache`. Note that the ETag/304 handling would then need rework.
  - Schedule it outside ALS with `setTimeout(…, 0)`, which still inherits ALS in Node, so it is better to use a module-level `setInterval` started at init.
  - Or restore `dynamic = 'force-static'` on `/`, as OLD did.
- **Verify:** check the Dokploy frontend logs for `Page changed from static to dynamic at runtime /, reason: no-store fetch …/api/taxonomy/maps`.
- **Possibly intentional?:** no. The page comment explicitly intends working 5-minute ISR.
- **Same mechanism elsewhere:** any other ISR render that calls `getTaxonomyMaps()` is exposed the same way. Today `/` is the only ISR page; the sitemaps are covered in W2.

### W2. `/ipiresies/sitemap.xml`, `/categories/sitemap.xml` and `/dir/sitemap.xml` declare `revalidate = 3600` but are rendered per request (not cached) — LOW
- **OLD:** the same three files with `revalidate = 3600` (Prisma). Live prod: `x-vercel-cache: HIT`, `age: 3487-3492` on all three, so they were cached for an hour.
- **NEW:**
  - `ipiresies/sitemap.ts:2,19` and `categories/sitemap.ts:2,15` call `getServiceTaxonomyPaths()`, which calls `servicesApi.getServiceTaxonomyPaths()` = `api.get('/services/taxonomy-paths')` with no `revalidate` (`lib/api/services.ts:80`).
  - `dir/sitemap.ts` calls `getProTaxonomyPaths()`, which calls `api.get('/profiles/taxonomy-paths')` (`lib/api/profiles.ts:53-54`).
  - Without `revalidate`, `apiRequest` reads `cookies()` for the JWT (`client.ts:338-341` → `readServerTokens:90-110`) and fetches with `cache:'no-store'` (`client.ts:375-377`). Both opt the route out of static generation.
  - Live test: these three return `cache-control: public, max-age=0, must-revalidate` with **no** `x-nextjs-cache` header, so they are dynamic.
  - By contrast `s/`, `profile/` and `articles/sitemap.xml`, which use a direct `fetch(…, { next:{revalidate:3600} })`, return `x-nextjs-cache: HIT`.
- **Impact:**
  - Every crawler hit runs the Django taxonomy-paths aggregation, and that query is itself uncached on the Django side (pass3-profiles C3).
  - `lastModified: new Date()` now changes on every fetch instead of hourly, which makes `<lastmod>` meaningless to crawlers.
  - There is no visible user effect.
- **Fix hint:** pass `{ anonymous: true, revalidate: 3600, tags: [...] }` on these two API helpers, or at least on the sitemap call path.
- **Possibly intentional?:** no. The file still declares 3600.

## 4. Corrections and known items checked (not re-reported)

### C1. pass2-caching-matrix §2a is wrong for three routes
§2a, line 91 ("ISR (route) sitemaps 3600 … same as OLD"): true for `s`, `profile`, `articles` and `sitemap.xml`, false for `ipiresies`, `categories` and `dir` (see W2).

### C2. pass2-caching-matrix §2a/§D7 assumes `/` behaves as ISR 300 s
That only holds while some other render has refreshed the taxonomy maps in the last 60 s. Otherwise each regeneration fails once and retries after 30 s (see W1), which adds about 30-40 s to the "~15 min" staleness estimate for home.

### Known items re-confirmed, not re-reported
- Admin git routes removed (admin.md).
- force-dynamic on archives, blog, `/s`, `/profile` (pass2-caching, known).
- Chat page non-member and empty-chat guards (messaging D2).
- Coverage page guard (profiles-dashboard D16).
- OAuthSetupGuard pro redirect (pass3-auth).
- Article author picker (payload D1).
- GTM/consent (lib-shared D8).
- Sitemap `/cookies` and `/politiki-akirosis` (lib-shared).
- Dashboard sidebar subscription link gated by payments access (billing gating G4).
- ws-token after access expiry (pass3-messaging P3-D2).
- Refresh rotation race (pass3-auth P3-D2).
- Service-edit unwrap and notFound (admin/services payload class).

## 5. Confirmed same (wiring level)
- Boundary files, Suspense boundaries, route groups, middleware matcher, protected prefixes, admin layout guard and per-page permissions, title template, robots: all as listed in §1.
- **Middleware token refresh plumbing:** the stack order lowercase → refresh → auth → headers works. `withHeaders` rebuilds `NextResponse.next` from the patched request headers, so `x-dj-fresh-access` reaches render and the cookies `withTokenRefresh` sets survive (`withHeaders.ts:9-32`, `withTokenRefresh.ts:80-91`). The dead-token path strips cookies before `withSimpleAuth`, so `/dashboard` redirects to `/login` cleanly.
- **Prefetch requests skip middleware on both sides (same matcher).** In new this cannot render an anonymous dashboard layout: every `/dashboard/services*` link lives inside the dashboard layout, which is shared and not re-rendered, and segments without `loading.tsx` skip the component tree on prefetch.

## 6. Open questions
- W1 root cause: confirm from the frontend container logs. The 30 s back-off proves regenerations error, and the no-store taxonomy fetch is the mechanism the code shows, but the logged reason should be checked.
- `getSession()` (`actions/auth/server.ts:37-55`) has no React `cache()` dedupe. Dashboard renders call it 2-4 times per request (layout guard, profile layout, page). That is performance only, and I did not measure it.
