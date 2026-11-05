# Caching matrix (pass 2) parity audit — 2026-11-05

Scope: every cache layer in the new stack, plus every mutation mapped to the cached
entries it changes and how each is purged. I deduped against SUMMARY.md and the
11 pass-1 reports. These are already reported and are NOT repeated here:
- profile edit doesn't purge service pages (profiles-dashboard D2)
- taxonomy approve purge no-op (home-search-taxonomy D6, admin D13)
- live-refresh misses `_pro_subcategories`/`_location_id_to_name`, and `taxonomy_data._maps` static (home-search-taxonomy D5)
- featured `.update()` (billing D4)
- blog slug rename (blog D9)
- revalidate webhook (blog D10)
- auto-refresh cache (blog D8)
- cancel not refreshing (billing D7)
- chat list read refresh (messaging D1)
- stale-after-deploy TTL drain

Zero code changes were made.

## 1. Coverage

**NEW frontend read**
- Cache plumbing: `src/lib/cache/{index,revalidation}.ts`, `src/lib/api/client.ts` (cacheable = server + `revalidate` set, no token/cookies/IP headers).
- Tagged API modules: `src/lib/api/{core,profiles,services,blog,taxonomy,admin}.ts`.
- `unstable_cache` wrappers: `actions/profiles/get-profiles.ts:171-180`, `actions/services/get-services.ts:308-317`. `lib/cache/index.ts createCachedFunction` exists but has no callers.
- Every `export const revalidate/dynamic/fetchCache` and `generateStaticParams` under `src/app` (list in §2a).
- Every `revalidateTag`/`revalidatePath`/`router.refresh()` call site. That is 120+ sites across actions/** and components/**.
- Module-level caches:
  - `lib/taxonomies/index.ts` (60 s ETag poll)
  - `lib/auth/client.ts` (5 s session cache)
  - `actions/admin/helpers.ts` navSessionCache (60 s)
  - `app/actions/taxonomy-lock.ts`
  - `lib/realtime/channels-ws.ts` token cache
- Admin refresh actions: `actions/admin/revalidate-{caches,taxonomies}.ts`, `taxonomies-shared.ts`.
- Deploy topology: `frontend/Dockerfile` (single `next start`), `next.config.js` (no custom cacheHandler), `docker-compose.yml`.

**NEW backend read**
- Every `cache.get/set/delete*`:
  - `core/views/public/home.py`
  - `core/views/admin/cache.py`
  - `core/views/public/health.py`
  - `blog/services/articles.py`
  - `profiles/selectors/profile_aggregations.py`
  - `profiles/services/{cache,profile_updates}.py`
  - `services/selectors/service_reads.py`
  - `services/signals.py`
  - `reviews/signals.py`
  - `taxonomy/views/public/maps.py`
  - `taxonomy/views/admin/dataset.py`
  - `taxonomy/services/{cache,admin_submissions}.py`
  - `messaging/consumers.py` (presence counters)
- Every `lru_cache`: `core/taxonomy.py` (×6), `core/locations.py` (×2), `taxonomy/services/taxonomy_data.py`.
- All 4 signal modules (`profiles`, `services`, `reviews`, `taxonomy`).
- Every queryset `.update()`, `bulk_*`, raw SQL, `update_or_create`/`get_or_create` and `transaction.atomic` in `apps/**` (non-test).
- All celery tasks: `messaging/tasks.py`, `billing/tasks.py`, `services/tasks.py`.
- All management commands.
- `CACHES` config (`config/settings/base.py:164-172`, django-redis, shared by every process). The web runtime is a single daphne process (`backend/Dockerfile:84`).

**OLD files read (source of truth)**
- `src/lib/cache/revalidation.ts` (revalidateService / revalidateProfile)
- `src/lib/cache/config.ts` (TTLs)
- `src/actions/services/{get-service,update-service,create-service,delete-service,get-services}.ts` (cache tags / purge calls)
- `src/actions/profiles/get-profile.ts` (tags)
- `src/actions/search/search-services.ts` (tags)
- `src/actions/reviews/{create-review,moderate-review,toggle-review-visibility,update-rating}.ts`
- `src/actions/auth/change-username.ts`
- `src/actions/admin/{users,profiles}.ts` (purge calls)
- all `sitemap*` files

**Delegated elsewhere**: none. This is a cross-cutting pass.

## 2. Inventory

### 2a. Next.js layers

| Layer | Key / tags | TTL | Source |
|---|---|---|---|
| Data Cache `GET /home` | `page:home` | 300 | lib/api/core.ts:5 |
| `GET /profiles/page/{u}` | `page:profile:{u}`, `profiles:all` | 300 | lib/api/profiles.ts:38-43 |
| `GET /profiles/by-username/{u}` (SEO metadata) | same | 300 | profiles.ts:31-36 |
| `GET /profiles/directory?…` | `archive:profiles`, `profiles:all` | 300 | profiles.ts:45-51 |
| `GET /services/{id}/page` (service page + metadata) | `service:id:{id}`, `services:all` | 300 | lib/api/services.ts:55-60 |
| `GET /services/by-slug/{slug}` | `service:slug:{slug}`, `services:all` | 300 | services.ts:48-53 (no page caller) |
| `GET /services/categories?…` | `categories-page`, `services:all` | 300 | services.ts:35-41 |
| `GET /services/navigation` | `nav:menu` **only** | 300 | services.ts:44 |
| `GET /services/search/suggestions?q` | `search:suggestions`, `services:all` | 300 | services.ts:95-100 |
| `GET /blog/articles…`, `/blog/articles/{s}`, `/related` | `blog:articles` (+`article:slug:{s}`) | 300 | lib/api/blog.ts |
| sitemap fetches | none | 3600 | app/(blog\|profile\|service)/…/sitemap.ts (same as OLD) |
| `unstable_cache` profile archive | key `['profile-archive-bundle', JSON.stringify(params)]`; tags `archive:profiles`, `profiles:all` | 300 | get-profiles.ts:171-180 |
| `unstable_cache` service archive | key `['service-archive-bundle', JSON.stringify(params)]`; tags `archive:services`, `services:all` | 300 | get-services.ts:308-317 |
| ISR | `/` (home) `revalidate=300` + generateStaticParams | 300 | app/(home)/page.tsx:22 |
| ISR (route) | sitemaps 3600; `sitemap_index.xml` 86400 | — | same as OLD |
| force-dynamic | all archives, `/profile/[u]`, `/s/[slug]`, `/articles/*`, dashboard, admin, auth | — | (`messages/[chatId]` also `fetchCache='force-no-store'`) |
| Module memory: taxonomy maps | `_taxonomyMaps` + `_taxonomyEtag`, background refetch every 60 s, If-None-Match | 60 s poll | lib/taxonomies/index.ts:143-178 |
| Module memory: other | client `useSession` cache 5 s (lib/auth/client.ts:29-33); admin navSessionCache 60 s (actions/admin/helpers.ts:59-62); ws-token cache | — | |

Both archive `unstable_cache` keys contain the full params, so they are correct per filter set. The enriched output also depends on module taxonomy state, which is not in the key; that is bounded by the 5-min TTL.

### 2b. Django layers (all django-redis, shared across daphne/celery/commands)

| Key | TTL | Builder | Purged by |
|---|---|---|---|
| `core:home` | 5 min | core/views/public/home.py:17-29 | Profile/Service/Review signals |
| `profile:page:{username}` | 30 min | profile_aggregations.py:518-625 | Profile signal (own), Service signal (owner), Review signal (reviewed profile), username change (old key) |
| `profiles:directory:{cat}:{sub}:{limit}` | 2 h | profile_aggregations.py:308-366 | Profile signal (`delete_pattern`) |
| `profiles:count:{cat}\|{sub}\|{role}` | 30 min | profile_aggregations.py:251-285 | Profile signal |
| `service:page:{id}` | 30 min | service_reads.py:272-395 | Service signal (own id), Review signal (review.service_id) |
| `services:count:{cat}\|{sub}` | 30 min | service_reads.py:600-618 | Service signal |
| `services:suggest:{normalized q}` | 5 min | service_reads.py:867-892 | **nothing** (TTL only) |
| `blog:list:{…}` / `blog:article:{slug}` | 30 / 60 min | blog/services/articles.py:35-85 | `_purge_cache` |
| `taxonomy:maps:v1` | 1 h | taxonomy/views/public/maps.py:60-63 | Taxonomy signals (`invalidate_maps_cache`) |
| `taxonomy:maps:version` (ETag) | none | maps.py:28-39 | bumped by Taxonomy signals |
| `presence:*` counters | `_PRESENCE_CONN_TTL` | messaging/consumers.py:58-87 | — |
| `health:probe` | 10 s | core/views/public/health.py:48 | — |

**In-process (per-process, no TTL)** — cleared only by `invalidate_taxonomy_caches()` in the process that ran the write:
- `core/taxonomy.py`: `_maps` :25, `_service_indexes` :44, `_slug_to_ids` :93, `_id_to_slug` :118, `_pro_subcategories` :265 (never cleared, known), `_location_id_to_name` :302 (never cleared, known)
- `core/locations.py`: `_id_to_name` :25, `_maps` :64
- `taxonomy/services/taxonomy_data.py:33` (static JSON, known)

### 2c. Django admin cache endpoints
- `RevalidateAllCachesView` (core/views/admin/cache.py:18-40) deletes only `core:home` and `profiles:directory:_:_:15`.
- `AdminRevalidateTaxonomyCachesView` (taxonomy/views/admin/dataset.py:145-155) pattern-deletes `profiles:directory:*`, `profiles:count:*`, `profile:page:*`.
- Neither is called by the frontend: `adminApi.revalidateAll` and `adminTaxonomy.revalidate` in lib/api/admin.ts:218,256 have no callers. See D6.

## 3. Mutation → cache matrix

Column 3 is the Django Redis purge. Column 4 is the Next Data Cache purge. "TTL" means nothing purges it. Bold cells are findings, new unless they say "known".

| Mutation (entry point) | Affected cached entries | Django purge | Next purge | Verdict |
|---|---|---|---|---|
| Own profile sections, onboarding, account display name/image (actions/profiles/*, auth/update-account, complete-onboarding → Profile.save) | profile:page, directory, count, core:home, **service:page of own services**, archive:services | signal ✓ (except service:page) | `revalidateMyPublicProfile` → page:profile:{u}, archive:profiles, page:home, `/` | service-page gap is known (dashboard D2) |
| Change username | profile:page old+new, service:page (profile link) | signal + explicit old-key delete ✓ | profiles:all ✓ | service pages: same as OLD (OLD didn't purge them either) |
| Service create / update / media / refresh / delete / archive, toggle-featured-service, admin service edits (Service.save/delete) | service:page:{id}, owner profile:page, core:home, services:count, **other services' service:page (relatedServices / additionalServices)**, **services:suggest:***, archive:services, **page:profile:{owner} (Next)**, **categories-page**, **search:suggestions** | signal: own service:page, owner profile:page, home, services:count | `revalidatePublicService(id)` → service:id:{id}, archive:services, page:home, `/` (+nav:menu, categories-page only when `countsChanged`) | **D1, D2** |
| Auto-refresh cron (`services/tasks.py:43-46` `.update()`) | archive order, home, profile:page service order | none | none | known (blog D8). Correction C2: profile:page order |
| Review create (pending) / moderate / visibility / delete (Review.save) | service:page:{sid}, profile:page:{reviewed}, core:home, ratings on cards | signal ✓; rating recalcs use `.save()` ✓ (recalculate_ratings.py:32,53) | profiles:all + services:all ✓ | OK. Other-service "profileOtherReviews" is stale the same way in OLD |
| Admin profile edits / publish / featured / verify (admin_profiles.py → `.save()`) | as profile edit | signal ✓ | `revalidatePublicProfile()` / `revalidateAllCaches()` ✓ | service-page gap known (D2) |
| Admin user writes: block, confirm, role, ban, email, image (admin_users.py → User.save) | profile:page (gates `user__blocked`/`confirmed`/role, embeds `user.email`), profiles:count (user join) | **none (no User signal)** | profiles:all (purged, but refetch gets stale Redis) | Same as OLD (OLD admin block/role/ban didn't revalidate, 30-min TTL). Listed for completeness, not a finding |
| Admin "account" (displayName/image → `sync_account_to_profile` → Profile.save) | profile caches | signal ✓ | profiles:all ✓ | OK |
| Delete account / admin delete user (cascade; queryset `.delete()` still emits post_delete per row) | profile + services caches | signals ✓ | profile + services:all ✓ | OK |
| Payment webhook / renewal / admin subscription status (`.update(featured)`, Subscription.save) | directory, home, profile:page, **service:page additionalServices gate** | none | none (webhook) / profiles:all (admin) | known (billing D4). Correction C3: service pages |
| Taxonomy admin CRUD (`dataset_ops` → TaxonomyNode/Skill/Tag save/delete; `commit_multiple_changes` atomic) | taxonomy:maps + ETag, in-process lru, Next `_taxonomyMaps`, nav:menu, categories-page, archive:*, search:suggestions, services:suggest, core:home, service:page `taxonomyLabels` | maps + version ✓; lru only in the writing process; rest TTL (known D5) | `revalidateTaxonomyCaches` → **mostly dead tags** | **D3, D6**; rest known D5 |
| Taxonomy submission approve/reject (raw SQL array_replace) | profile:page, service:page | no-op | none | known D6/D13 |
| `seed_taxonomy` (`update_or_create`, atomic) / `canonicalize_taxonomies` (`.save()`, whole run atomic) / `backfill_taxonomy_fks` (`bulk_update`, no signals) | all taxonomy + profile/service caches | signals fire **inside the open transaction**; lru cleared only in the command process | none | **D4**, Correction C1 |
| Blog create/update/delete (articles.py) | blog:article, blog:list | `_purge_cache` ✓ (old slug known D9) | `revalidatePublicBlog` ✓ | OK |
| Admin "revalidate all" / webhook (`revalidateAllCaches`) | everything | none (Django endpoint unused) | **misses nav:menu, blog:articles** | **D6** |
| Messaging / saved / support / reports / verification submit / billing sync | not publicly cached | — | — | OK |
| Anonymous POST `/services/count`, `/profiles/count` | services:count, profiles:count | — | — | **D8** (cache-key omission) |

## 4. DIFFERENCES (new findings)

### D1. Service writes no longer refresh OTHER service pages; deleted or unpublished services linger in "related" and "additional services" — MEDIUM
- **OLD:** every service page was cached with tags `[service.byId(id), collections.services]` (get-service.ts:499-506). Every service mutation called `revalidateService`, which revalidates `collections.services` via `getServiceTags` (lib/cache/revalidation.ts:48-66; update-service.ts:49-66; create/delete/toggle-featured likewise). So every service page, and with it every `relatedServices`/`additionalServices` list, refreshed instantly whenever any service changed.
- **NEW:**
  - The service bundle embeds cards of OTHER services: `relatedServices` (5 published services in the same category) and `additionalServices` (the pro's other published services when promoted) (service_reads.py:297-315, 372-373). It is cached as `service:page:{id}` for 30 min.
  - The Service signal deletes only `service:page:{instance.id}` (services/signals.py:23-31).
  - The frontend `revalidatePublicService(serviceId)` purges only `service:id:{serviceId}`. `services:all` is purged only when no id is passed (frontend/src/lib/cache/revalidation.ts:53-60).
- **Impact:**
  - A pro deletes, unpublishes or archives service B, or an admin rejects it. Service A's page (same category, or same promoted pro) keeps showing B's card for up to 30 min Redis + 5 min Data Cache, and the card links to a 404.
  - Retitles, image changes and featured toggles show stale data the same way.
  - Newly published services don't appear in related lists for the same window.
- **Fix:**
  - In the Service signal, also delete the `service:page:` keys of services sharing `category` or `profile_id`, or `delete_pattern("service:page:*")` for parity with OLD's collection purge.
  - In `revalidatePublicService`, also revalidate `services:all` (OLD behaviour).
- **Possibly intentional?:** no. The cache architecture is intentional, but the purge scope regressed versus `collections.services`.

### D2. Service writes don't purge the owner's profile page (Next layer), the categories page or search suggestions — MEDIUM
- **OLD:** `revalidateService` always revalidated:
  - `profile.page(username)` + `revalidatePath('/profile/<u>')`
  - `categories-page`/`categories`/`services`
  - `search.all`/`search.taxonomies` (revalidation.ts:52-95; update-service.ts:52-66)
  
  Search results were tagged `collections.services` + `search.all` (search-services.ts:344-351). So the owner's profile, the categories counts and the autocomplete were instant.
- **NEW:**
  - `revalidatePublicService(id)` (revalidation.ts:53-70) touches none of `page:profile:{owner}`, `categories-page` (only with `countsChanged`, which update-service/refresh/media/toggle-featured never pass) or `search:suggestions`.
  - The Django side purges `profile:page:{owner}` in Redis, but the Next Data Cache copy (lib/api/profiles.ts:38-43) lives on for up to 5 min.
  - Django `services:suggest:*` (service_reads.py:881-892, 5 min) is purged by nothing. The Next copy (services.ts:95-100) is tagged `services:all`, which `revalidatePublicService(id)` doesn't purge.
- **Impact:**
  - A pro edits a service title or image, opens their own profile, and sees the old card for up to 5 min.
  - A category change, or a publish via edit, leaves `/categories` counts stale for 5 min.
  - New, renamed or deleted services take up to ~10 min to appear in or leave the search dropdown.
- **Fix:**
  - Pass the owner username to `revalidatePublicService` and revalidate `page:profile:{u}`; or call `revalidateTag('services:all')` plus `revalidatePublicProfile(username)`.
  - Revalidate `categories-page` and `search:suggestions` on every service write.
  - In the Service signal, `delete_pattern("services:suggest:*")`.
- **Possibly intentional?:** no.

### D3. The taxonomy maps ETag can get permanently stuck on OLD data, and so can the in-process lru caches — MEDIUM
- **OLD:** no runtime refresh (static maps + redeploy), so there was no race.
- **NEW (`taxonomy/views/public/maps.py:50-69`):**
  1. The view reads the version **before** building: `etag = current_version()`, then on a miss it runs `build_maps()` (~3 MB, slow) and `cache.set(CACHE_KEY, data)`.
  2. A taxonomy write during that build runs `invalidate_maps_cache()`, which deletes `CACHE_KEY` and bumps the version (maps.py:35-44).
  3. The in-flight request then writes the pre-write maps back into `CACHE_KEY`.
  4. The next frontend poll (If-None-Match old) gets that stale `CACHE_KEY` with the NEW ETag (maps.py:56-67).
  5. From then on every 60 s poll returns 304 (lib/taxonomies/index.ts:146-156). The frontend keeps the old taxonomy **indefinitely**: past the 1 h `CACHE_KEY` TTL (the ETag still matches), until the next taxonomy write or a Next restart.
- **Trigger:** the window is a full build plus a write. The likeliest case is an admin making several edits in a row: the poll after edit #1 rebuilds while edit #2 lands.
- **Pre-commit signals widen it.** `commit_multiple_changes` runs inside `transaction.atomic()` (dataset_ops.py:270-276), so the signal (taxonomy/signals.py:14-25) fires before commit. A poll in between rebuilds from the uncommitted (old) DB state under the new ETag.
- **Same race in-process.** `functools.lru_cache` `_maps`/`_slug_to_ids`/`_id_to_slug`/`_service_indexes` (core/taxonomy.py:25-130) and `locations._id_to_name/_maps` can be refilled with pre-write data by a request thread that started before `cache_clear()`. They have no TTL, so archive filtering and search slug resolution stay wrong until the next write or a daphne restart.
- **Impact:** an admin edit sometimes "never goes live" on the frontend (labels, new nodes, mega-menu structure via `getServiceTaxonomies`) even though the DB is correct. This breaks the "live within ~60 s" contract in CLAUDE.md, and it is non-deterministic, so hard to diagnose.
- **Fix:**
  - Version the data key (`taxonomy:maps:{version}`) and read the version after building, or store `{version, data}` together and emit the ETag from the stored version.
  - Run `invalidate_taxonomy_caches` via `transaction.on_commit`.
- **Possibly intentional?:** no.

### D4. Every cache-purge signal fires before the transaction commits, so concurrent reads re-cache the pre-write data for the full TTL — MEDIUM (low per-request probability, but certain during bulk commands)
- **OLD:** Prisma writes commit, then the action calls `revalidateTag`. Purge always happened after commit.
- **NEW:** all four receivers purge synchronously in `post_save`/`post_delete`, with no `transaction.on_commit`:
  - profiles/signals.py:18-21
  - services/signals.py:20-36
  - reviews/signals.py:18-28
  - taxonomy/signals.py:14-25
  
  Many writes run inside `transaction.atomic()`:
  - service update/create (service_writes.py:180, 248, 363-415, 487)
  - review moderation + rating recalcs (review_ops.py:183-192, 274)
  - verification approve/reject (admin_profiles.py:501-550)
  - `profile_updates.ensure_profile_exists` (:431)
  - admin service ops (admin_services.py:325)
  - `canonicalize_taxonomies` (whole `handle` is `@transaction.atomic`, canonicalize_taxonomies.py:38)
  - `seed_taxonomy` (:54)
  
  A public read between the purge and the commit rebuilds `service:page`/`profile:page`/`profiles:directory` (2 h)/`core:home` from the still-committed old rows and stores it. The frontend's `revalidateTag` (run after the API returns) then refetches that poisoned Redis copy.
- **Impact:** an occasional "my edit doesn't show for 30 min" (2 h for directory). During a long atomic management command on production traffic it is effectively guaranteed for every touched profile or service.
- **Fix:** wrap each receiver body in `transaction.on_commit(lambda: …)`.
- **Possibly intentional?:** no.

### D5. Backend lru caches pin the fallback dataset forever if their first build fails — LOW
- **NEW:**
  - `core/taxonomy._maps()` swallows every exception from `build_maps()` and returns the shipped `_taxonomy_maps.json` (core/taxonomy.py:25-41). `lru_cache` then keeps that fallback for the life of the process.
  - `locations._id_to_name()`/`_maps()` do the same (locations.py:25-60, 64+), and can even cache `{}`.
  - A transient DB error on the first call (cold start, DB failover, a migration running) therefore leaves daphne on the build-time JSON until a taxonomy write happens in that same process, or a restart.
  - The frontend loader self-heals (it retries every 60 s, lib/taxonomies/index.ts:147-178); the backend does not.
- **Impact:** archive slug→id resolution and search label matching silently use stale taxonomy (new or renamed nodes missing) with no error.
- **Fix:** don't cache the fallback. Raise, or retry on the next call.
- **Possibly intentional?:** no.

### D6. The admin taxonomy/"revalidate all" actions purge dead tag names and miss the real ones; the Django purge endpoints are unused and partial — LOW
- **OLD:** the tag names in `revalidate-taxonomies.ts`/`revalidate-caches.ts` matched the tags OLD's fetches carried.
- **NEW:** the files are byte-identical copies (admin.md §4), but NEW fetches use different tags.
  - **`revalidateTaxonomyCaches`** (called after every taxonomy create/update/delete, taxonomies-shared.ts:103/149/185):
    - Purges `categories`, `navigation-menu`, `search:taxonomies`, `archive:all`, `archive:services:filtered`, `categories:all` (revalidate-taxonomies.ts:37-57). **No NEW fetch carries any of these.**
    - The only live ones are `categories-page` and `page:home`, plus paths `/`, `/categories*`, `/ipiresies*`.
    - Never purged: `nav:menu` (services.ts:44, the mega-menu's only tag), `archive:profiles` (and `/dir*` paths), `archive:services`, `search:suggestions`.
  - **`revalidateAllCaches`** (webhook + admin profile section edits) has the same dead names. It covers most data via `profiles:all`/`services:all`, but misses `nav:menu` and `blog:articles`.
  - **Django endpoints** (no frontend callers):
    - `RevalidateAllCachesView` deletes only `core:home` and one directory key (core/views/admin/cache.py:18-28).
    - `AdminRevalidateTaxonomyCachesView` skips `service:page:*`, `core:home`, `services:suggest:*` and the taxonomy maps (dataset.py:145-155).
- **Impact:** after a taxonomy admin edit (promised live in ~60 s), the mega-menu, `/dir` archive labels/filters and suggestions lag by up to 5 min (Data Cache TTL), plus the Django TTLs in known D5. "Revalidate all" doesn't refresh the menu or blog.
- **Fix:** replace the dead tag names with `nav:menu`, `archive:profiles`, `archive:services`, `search:suggestions`, `blog:articles`. Add `revalidatePath('/dir…')`.
- **Possibly intentional?:** no. These files were copied without remapping.

### D7. TTL-only paths stack 2–3 cache layers, so "5-minute TTL" really means 10–35 min (2 h+ for the directory) — LOW
- **OLD:** one `unstable_cache` layer per page.
- **NEW:** for any mutation with no purge (the known webhook/featured, auto-refresh, subscription expiry, admin user gates, taxonomy, D1/D2 items), the worst case is the sum of three layers. Each layer is stale-while-revalidate, so the first visitor after expiry still gets the old copy:
  - Home = ISR `/` 300 s (app/(home)/page.tsx:22) + Data Cache `page:home` 300 s + Redis `core:home` 300 s → ~15 min.
  - Profile page = 300 s + `profile:page` 1800 s → ~35 min.
  - Directory = 300 s + `profiles:directory` 7200 s.
- **Impact:** the "≤5 min" expectations stated in the pass-1 reports and in CLAUDE.md understate staleness for every TTL-only cell in §3.
- **Possibly intentional?:** partly. The layering is the chosen architecture, but the stacked windows aren't documented. This should inform the severity of the known TTL-only items.

### D8. Public count endpoints cache on keys that omit output-changing filters — LOW (latent: no page currently reads them)
- **NEW:**
  - `count_services` keys on `category|subcategory` only, but filters on `subdivision` and `status` too (service_reads.py:600-618). `ServiceFiltersSerializer` accepts both from anonymous callers (services/serializers/service.py:415-427).
  - `_profile_count_cache_key` omits `published`, which `ProfileFiltersSerializer` accepts (profile_filters.py:13; profile_aggregations.py:251-285).
  - Any anonymous `POST /api/services/count {"category":X,"status":"draft"}` or `/api/profiles/count {"published":false}` stores a wrong total under the shared key for 30 min. The same goes for a subdivision-filtered call.
- **OLD:** the same category|subcategory key (get-services.ts:668-699), but it was an internal server action, not a public endpoint accepting `status`.
- **Impact:** none today (`getServicesCount`/`getProfilesCount` have no page callers). This is wrong cache hits waiting for the first caller.
- **Fix:** include every filter in the key, or drop `status`/`published` from the public serializer.
- **Possibly intentional?:** no (subdivision omission is OLD parity; status/published poisoning is new).

## 5. Corrections to pass-1 reports

- **C1 — home-search-taxonomy D5, "Celery workers … keep stale lru_caches".**
  - No celery task reads these caches. `messaging/tasks.py`, `billing/tasks.py` and `services/tasks.py` never import `apps.core.taxonomy`/`locations`/`taxonomy_data`, so worker staleness is harmless.
  - The web runtime is one daphne process (backend/Dockerfile:84), so "extra replica" applies only if scaled.
  - The real cross-process gap is management commands (`seed_taxonomy`, `canonicalize_taxonomies`, `manage.py shell`). Their taxonomy signals clear the lru only in the command's own process, while the long-running daphne process keeps pre-command indexes until restart. The Redis maps purge does reach the frontend.
  - Add the stale-refill race (D3 here).
- **C2 — services.md §4 ("auto-refresh `.update()` → service:page not purged, sortDate not shown, harmless") and blog D8 ("≤5 min").**
  - `profile:page:{username}` lists the pro's services `order_by("-sort_date")` (profile_aggregations.py:549) and is not purged by the `.update()` either. Profile pages therefore show the pre-refresh order for up to 30 min + 5.
  - This is minor, and moot while the D7 product decision (auto-refresh never ran in OLD prod) is open.
- **C3 — billing-payments D4 scope.**
  - Besides directory/home/profile, the pro's **service pages** are affected. `additionalServices` is gated on `_is_promoted_subscriber(profile)` (service_reads.py:261, 308). Subscription changes (activation, expiry, cancel) have no signal, so `service:page:{id}` keeps showing or hiding the "other services" block for up to 30 min.
  - OLD revalidated `collections.services` on these events, which refreshed all service pages.

## 6. Confirmed same / verified OK

- Every Next Data Cache fetch is anonymous: `cacheable` skips token, cookies and IP headers (client.ts:336-378). The Django public read views behind them use no `request.user` data, so no cross-user leaks via cache. The PII in summaries is a separate known issue.
- The archive `unstable_cache` keys include all params (full `JSON.stringify`). Failures are thrown so they are never cached.
- Redis is shared by all processes, so `cache.delete*` from celery, commands and admin reaches the web process. Only the lru caches are per-process.
- Queryset `.delete()` (dataset_ops.py:114,152,207; user deletes) still emits per-row `post_delete`, so signals fire. Django-admin edits use `.save()`.
- Rating recalcs (recalculate_ratings.py), verification approve/reject, admin profile/service edits and `canonicalize_taxonomies` use `.save()`, so signals fire (subject to D4).
- The only signal-skipping bulk writes are:
  - billing `.update(featured)` (known)
  - auto-refresh `.update()` (known)
  - taxonomy-submission raw SQL (known)
  - messaging `ChatMember`/`Chat`/`Message` `.update()` (not publicly cached)
  - `backfill_taxonomy_fks` `bulk_update` (FK columns only; one-off; bounded by TTLs)
- Username change explicitly deletes the old `profile:page` key (profile_updates.py:99). Account display name/image sync goes through `Profile.save()`.
- Sitemap revalidate values (3600 / 86400) are identical to OLD.
- Frontend admin actions that call revalidation before the API write (actions/admin/users.ts) are not a race. Next defers `revalidateTag` from a server action until the action completes.
- The frontend taxonomy loader recovers from its build-time fallback on the next 60 s poll.

## 7. Open questions / couldn't verify

- **Next 15 `force-dynamic` + explicit `next.revalidate`.** I assumed tagged fetches are still cached on force-dynamic routes, as the architecture expects. The page comments ("no-store API client & ISR conflict at runtime") suggest past trouble. Worth one runtime check: `x-nextjs-cache` / fetch logs on `/profile/<u>`.
- **Admin username change.** `update_user_basic_info` (admin_users.py:186-227) updates `User.username` but not `Profile.username`, so the public profile URL and cache key keep the old name. This may belong to the admin domain. I did not verify whether OLD synced Profile here.
- **Redis isolation.** Do test.doulitsa.gr and production share a `REDIS_URL`/DB? `CACHES` sets no `KEY_PREFIX`, so a shared Redis would cross-serve `profile:page:*` etc. between environments. This is a live env check.
- **Window size for D3/D4.** Build time of `build_maps()` and real traffic are unknown, so the race probability is estimated, not measured.
