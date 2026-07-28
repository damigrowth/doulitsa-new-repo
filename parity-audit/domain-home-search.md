# Domain: Home + Search + Shared (core)

Audit-only migration parity check. OLD = Next.js + Prisma + Supabase; NEW = Django/DRF (`apps.core`, with search/featured living in `apps.services`) + Next.js frontend actions calling the Django API.

Scope files:
- OLD: `app_before_migrations/src/actions/home/get-home-data.ts`, `.../actions/search/search-services.ts`, `.../actions/shared/index.ts` (+ helpers `lib/utils/search/build-search-conditions.ts`, `lib/utils/text/normalize.ts`, `lib/taxonomies/index.ts`, reused `actions/profiles/get-directory.ts` & `actions/services/get-categories.ts`).
- NEW backend: `backend/apps/core/views/public/home.py`, `backend/apps/core/urls/public.py`, `backend/apps/services/selectors/service_reads.py` (`get_featured_services`, `search_suggestions`), `backend/common/utils/normalize.py`.
- NEW frontend: `frontend/src/actions/home/get-home-data.ts`, `.../actions/search/search-services.ts`, `.../actions/shared/index.ts`, `frontend/src/lib/api/core.ts`, `.../lib/api/services.ts`. Consumers: `frontend/src/components/home/home-search.tsx`, `.../components/ui/search-dropdown.tsx`.

---

## Parity matrix

| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Home page bundle endpoint | endpoint | home/get-home-data.ts:156-432 | core/views/public/home.py:11-30; urls/public.py:13 (`GET /api/home`) | ⚠️ partial | Aggregation exists but selection rules, ordering, counts, response keys diverge (rows below). |
| Featured services per category (8 each, featured + media-present) | endpoint+rules | home/get-home-data.ts:171-197 | services/service_reads.py:223-242 (`get_featured_services`) | ❌ | OLD: per-category top-8 `featured=true` AND `media != null`, `orderBy updatedAt desc`. NEW: global top-50 `featured`, fallback fills to 20 by rating, no per-category-8, no media filter, ordered by `-rating`. |
| Featured profiles (16, featured, image, fallback to top-rated) | endpoint+rules | home/get-home-data.ts:200-249 | home.py:41-46 -> profiles `list_profiles_by_filters({limit:12, sortBy:rating_high})` | ❌ | OLD take=16, `featured=true`, image NOT null, user role in freelancer/company + confirmed + not blocked, order `updatedAt desc`, fallback to top-rated. NEW take=12, sort by rating, no featured filter, no image/role/confirmed gating, no fallback branch. |
| Popular subcategories (top 8 by service count, hero chips) | endpoint+rules | home/get-home-data.ts:258-349 | home.py:49-53 -> profiles `directory_data(limit=12).popularSubcategories` | ❌ | OLD: SERVICE subcategory counts via `groupBy`, top 8. NEW: pulls PRO directory popular subcats (different vocabulary), limit 12 not 8. |
| Categories-with-subcategories (8 featured cats, top-3 subs each) | endpoint+rules | home/get-home-data.ts:352-376 | home.py:57-62 -> services `get_categories_page().categories` | ⚠️ partial | OLD filters `featured===true`, slice 8, top-3 subs sorted by count, drops empty. NEW returns all categories with up to 10 subs (service_reads.py:182-188), no featured filter/8-cap/top-3; frontend re-derives (see below). |
| proSubcategoriesWithProfiles (pro subcats that have profiles) | response key | home/get-home-data.ts:380-387,405 | NOT in backend payload; derived in FE get-home-data.ts:131-135 | ⚠️ partial | Backend payload uses key `proCategoriesWithSubcategories` (home.py:27); FE recomputes `proSubcategoriesWithProfiles` from local taxonomy + live-sub set. |
| serviceSubcategoriesWithServices (service subcats with services) | response key | home/get-home-data.ts:389-396,406 | NOT in backend payload; derived in FE get-home-data.ts:126-130 | ⚠️ partial | Backend omits this key; FE recomputes from `categoriesWithSubcategories` live subs. |
| Home caching (5 min, tag invalidation) | infra | home/get-home-data.ts:420-432 (`unstable_cache`, tags, revalidate HOME) | home.py:17-29 (`cache.set timeout=300`) | ⚠️ partial | TTL matches (5 min). NEW has no tag-based invalidation on content change; stale up to 5 min (same as OLD revalidate, acceptable). |
| Global search / autocomplete suggestions | endpoint | search/search-services.ts:325-354 | services/service_reads.py:462-520; urls/public.py:24 (`GET /api/services/search/suggestions?q=`) | ⚠️ partial | Endpoint exists but ranking, taxonomy entities, location matching, response shape all diverge (Search section). |
| Search min-length guard (`<2` → empty) | validation | search-services.ts:329-338 | service_reads.py:476-477 (`len<2` → empty) | ✅ matched | Both short-circuit on <2 chars with empty result. FE also guards (search-services.ts:7-9). |
| Search accent/case normalization | search | normalize.ts:1-6 (NFD + strip combining + lowercase) | common/utils/normalize.py:9-15 (identical algorithm) | ✅ matched | `normalize_term` mirrors `normalizeTerm` exactly. |
| Search caching | infra | search-services.ts:28-55,344-351 (1h taxonomy cache + 5m per-term) | none on suggestions endpoint | ⚠️ partial | NEW `search_suggestions` not cached; runs queries every keystroke. Perf-only, not correctness. |
| Shared helpers (counties/locations/nav/config) | endpoint | shared/index.ts:1-23 (entire file commented out) | shared/index.ts:1-23 (entire file commented out) | ✅ matched | No active shared actions in either codebase; nothing to migrate. |
| Search frontend wrapper shape (`{success,data}`) | response shape | OLD search-services.ts returns `ActionResult<...>` (`{success,data}`) | FE search-services.ts:6-18 returns raw `{taxonomies,services,hasResults}` | ❌ | FE no longer wraps in `{success,data}` but consumer still reads `result.success && result.data` (home-search.tsx:52). Dropdown never populates. |

---

## Search parity (query handling, accent/fuzzy, ranking, limits, entities)

**Query handling / tokenization**
- OLD (search-services.ts:150-166): splits normalized term into words `length>=2`; 1 word → `OR` of conditions; multi-word → `AND` of per-word `OR`s; 0 words → no results.
- NEW (service_reads.py:482-486): splits on `[\s,.()\-/]+`, normalizes, drops tokens `<3` chars (OLD threshold is `>=2`), AND's remaining; falls back to whole-phrase if all dropped.
- ❌ **Token length threshold differs** (OLD ≥2 vs NEW ≥3). 2-char Greek tokens (e.g. abbreviations) are dropped by NEW.

**Accent/fuzzy**
- Both normalize accents identically (NFD + strip + lowercase). Both use substring (`icontains`) — no trigram/fuzzy. ✅ on normalization.
- OLD additionally matches via taxonomy-label fuzzy lookups: `findMatchingServiceSubcategoryIds`, `findMatchingSubdivisionIds`, `findMatchingProSubcategoryIds` (incl. **plural** forms), `findMatchingTagIds` (build-search-conditions.ts:65-85). These convert a label match into ID `in` filters so typing a category/tag *label* surfaces services. ❌ **NEW has none of this** — it only does `subcategory__icontains` on the raw slug (service_reads.py:493), so label/plural/tag matching is lost.

**Ranking**
- OLD services: multi-tier sort — title startsWith > any-word startsWith > coverage match > description match > tags last (search-services.ts:240-295); plus location-having boost when no title match.
- NEW services: `order_by(-rating, -review_count)` only (service_reads.py:506). ❌ **No relevance ranking** (startsWith/coverage/description/tag tiers all dropped).
- OLD taxonomies: prioritizes startsWith, subdivisions before subcategories (search-services.ts:125-146). NEW: `distinct()` over raw tuples, no relevance sort (service_reads.py:501-503). ❌

**Limits**
- OLD: taxonomies sliced to 5 (search-services.ts:146), services sliced to 5 after fetching 100 (search-services.ts:189,298). NEW: taxonomies `[:6]` (service_reads.py:502), services `[:5]` (service_reads.py:506). ⚠️ taxonomy cap 6 vs 5.

**Entities searched**
- OLD services where-clause fields (build-search-conditions.ts:45-85): titleNormalized, descriptionNormalized, profile.coverageNormalized, profile.displayNameNormalized, profile.username, tags(by id), service subcategory(by id), subdivision(by id), profile pro-subcategory(by id).
- NEW (service_reads.py:490-497): title_normalized, description_normalized, subcategory(slug icontains), profile.display_name_normalized, profile.username, profile.tagline_normalized.
- Differences: NEW **adds** profile.tagline_normalized; NEW **drops** coverageNormalized (location search), tag-id, subdivision-id, pro-subcategory-id, and the label/plural taxonomy fuzzy matches. ❌ Location-based search and taxonomy-label search are missing.

**"Used taxonomy" gating**
- OLD only surfaces taxonomy suggestions whose subcategory/subdivision is actually used by a published service (search-services.ts:28-55,82-110). NEW derives taxonomy tuples directly from the already-matched services, so it is inherently "used" — ✅ behaviorally equivalent for that aspect, but the tuple shape differs (below).

---

## Detailed gaps (per ❌/⚠️)

### G1 ❌ Search suggestion response shape mismatch (taxonomies + services) — HIGH
- OLD shape (types/search.ts): taxonomy = `{type:'taxonomy', id, label, category(label), subcategory(slug), subdivision(slug), url}`; service = `{type:'service', id, title, category(label), slug, url, location?, matchType}` (search-services.ts:94-119,229-238).
- NEW shape (service_reads.py:508-515): taxonomy = `{category, subcategory, subdivision}` (raw slugs, no `id/label/url/type`); service = `{id, slug, title, category}` (no `url`, no `type`, no `location`, no `matchType`).
- Consumer requires `taxonomy.url`, `taxonomy.label`, `taxonomy.category`, `service.url`, `service.category`, `item.label` (search-dropdown.tsx:77,104,112,118,121,136,144,152).
- FE search action does **no transformation** (search-services.ts:6-18) — it returns the raw backend object.
- **Impact**: Autocomplete dropdown renders blank/broken links; clicking a suggestion navigates to `undefined` URL.
- **Suggested fix**: In `search_suggestions` build full objects: taxonomy `url = /ipiresies/{subcategory}` or `/ipiresies/{subcategory}/{subdivision}`, add `type`,`label`(from taxonomy tree),`id`; service `url = /s/{slug or id}`, add `type:'service'`, `location`, `matchType`. Mirror OLD exactly.

### G2 ❌ Frontend search wrapper lost `{success,data}` envelope — HIGH (hard runtime bug)
- OLD `searchServiceSuggestions` returns `ActionResult` (`{success:true, data:{...}}`).
- NEW FE returns the raw `{taxonomies,services,hasResults}` (search-services.ts:11-17), but `home-search.tsx:52` checks `if (result.success && result.data)`.
- **Impact**: `result.success` is always `undefined` → suggestions never set → dropdown shows "no results" for every query. Search autocomplete is effectively dead on the homepage.
- **Suggested fix**: Either wrap FE return in `{success:true, data:...}` to match the consumer, or update consumer to read the raw object. Pick one and align all callers.

### G3 ❌ Search ranking dropped — HIGH
- OLD applies a 6-tier relevance sort for services and startsWith priority for taxonomies. NEW sorts only by rating/review_count.
- **Impact**: Best textual matches no longer surface at top; e.g. exact title prefix match buried under higher-rated irrelevant services. Worse autocomplete UX, regression vs production.
- **Suggested fix**: Re-implement ranking in Python after fetching a wider candidate set (OLD fetched 100, sorted, sliced 5). Compute matchType (coverage/title/description/tags) and sort with the same tier order.

### G4 ❌ Location / coverage search removed — HIGH
- OLD searches `profile.coverageNormalized` and extracts the matched county/area into `location` via `findMatchingLocationInCoverage` (search-services.ts:199-201; taxonomies/index.ts:399-424). Users can type a city/county and find services there.
- NEW `search_suggestions` never touches coverage.
- **Impact**: Location-based autocomplete (a core Greek-marketplace use case) is gone.
- **Suggested fix**: Add `Q(profile__coverage_normalized__icontains=tok)` to the filter and add a coverage→location-name extractor; populate `service.location`.

### G5 ❌ Taxonomy-label & tag fuzzy matching removed — MED/HIGH
- OLD turns a label match (subcategory/subdivision/pro-subcategory incl. plural, and tag labels) into ID `in` filters (build-search-conditions.ts:65-85).
- NEW only does `subcategory__icontains(slug)` — slugs are kebab/ascii, so a Greek-label query won't match the slug.
- **Impact**: Typing the Greek category/tag *name* returns nothing unless it also appears in a title/description.
- **Suggested fix**: Port the taxonomy label→id resolution server-side (or pass resolved ids from a taxonomy service) and add `subcategory__in`, `subdivision__in`, `tags__overlap`, `profile__subcategory__in` filters.

### G6 ❌ Featured-services selection rules diverge — HIGH
- OLD: per service-category top-8 where `featured=true` AND `media != null`, ordered `updatedAt desc`. NEW: global top-50 featured, backfill to 20 by rating, no per-category cap, no media filter, ordered by rating (service_reads.py:223-242).
- **Impact**: Homepage featured carousel content/quantity/grouping differs; services without media can appear (broken cards); per-category tabs under-filled or over-filled.
- **Suggested fix**: Loop service categories, fetch top-8 `featured=True, media is not null` ordered by `-updated_at` each; build `servicesByCategory` keyed by category id, `mainCategories` with an `all` pill, `allServices` = union.

### G7 ❌ Featured-profiles selection rules diverge — HIGH
- OLD: 16 profiles, `featured=true`, image NOT null, user role∈{freelancer,company} & confirmed & not blocked, order `updatedAt desc`, fallback to top-rated when none (home/get-home-data.ts:200-249). NEW: 12 by rating, no featured/image/role/confirmed/blocked gating, no fallback (home.py:41-46).
- **Impact**: Wrong/blocked/unconfirmed or imageless profiles can appear; count 12≠16; ordering differs.
- **Suggested fix**: Add a dedicated featured-profiles selector enforcing the same filters, take 16, fallback to top-rated.

### G8 ⚠️ Popular subcategories source mismatch — MED
- OLD popularSubcategories = top-8 SERVICE subcategories by published-service count. NEW pulls PRO directory popular subcats (home.py:49-53), limit 12.
- **Impact**: Hero chips show the wrong vocabulary (professions instead of services) and wrong count.
- **Suggested fix**: Compute from `Service` groupby subcategory (published), top 8; return id/label/slug/count/href.

### G9 ⚠️ categoriesWithSubcategories filtering moved to frontend — MED
- OLD computes `featured` cats, slice 8, top-3 subs, drop-empty server-side. NEW backend returns raw categories (up to 10 subs, no featured/8/top-3); FE `enrichCategoryTree`/sort/filter reconstructs it (FE get-home-data.ts:63-89,177-191) using local taxonomy + TOP_SUBS_PER_CARD=3.
- **Impact**: Mostly compensated on FE, but the `featured===true` category filter is **not** reproduced (FE just sorts alphabetically and keeps non-empty), so non-featured categories can show. Behavior differs from OLD.
- **Suggested fix**: Either have backend apply the `featured` + slice-8 + top-3 rules, or replicate the `featured` filter in FE enrichment.

### G10 ⚠️ Token threshold 3 vs 2 — MED (covered in Search section)
- **Suggested fix**: change `len(tok) >= 3` to `>= 2` in service_reads.py:484 to match OLD.

### G11 ⚠️ Search not cached / no taxonomy "used" pre-cache — LOW (perf)
- OLD caches published-taxonomy set 1h + per-term 5m. NEW uncached.
- **Suggested fix**: wrap `search_suggestions` in Django cache keyed by normalized query, short TTL.

---

## Response-shape mismatches (summary)

| Field/object | OLD | NEW backend | NEW FE compensates? | Status |
|---|---|---|---|---|
| Search result envelope | `{success, data}` | raw `{taxonomies,services,hasResults}` | No (consumer expects `.success`) | ❌ G2 |
| Suggestion `taxonomy` | `{type,id,label,category(label),subcategory,subdivision,url}` | `{category,subcategory,subdivision}` | No transform | ❌ G1 |
| Suggestion `service` | `{type,id,title,category(label),slug,url,location?,matchType}` | `{id,slug,title,category}` | No transform | ❌ G1 |
| Home `services.mainCategories` | `[{id,label,slug}]` incl `all` pill | flat string list of category ids/slugs | Yes (FE resolves + prepends `all`, get-home-data.ts:141-161) | ⚠️ ok via FE |
| Home `servicesByCategory` | keyed by category id, has `all` | keyed by category, no `all` | Yes (FE adds `all`, get-home-data.ts:162-166) | ⚠️ ok via FE |
| Home `popularSubcategories` items | DatasetItem `{id,label,slug,count,...}` | thin slugs from PRO directory | Partial (FE enriches via taxonomy, get-home-data.ts:171-176) but wrong source | ❌ G8 |
| Home `proSubcategoriesWithProfiles` | present, DatasetItem list | absent (key is `proCategoriesWithSubcategories`) | Yes (FE recomputes, get-home-data.ts:131-135) | ⚠️ ok via FE |
| Home `serviceSubcategoriesWithServices` | present | absent | Yes (FE recomputes, get-home-data.ts:126-130) | ⚠️ ok via FE |
| Service card (`_card`) dates | OLD select had no date serialization for home cards | `createdAt/refreshedAt` `.isoformat()`, nulls preserved | n/a | ✅ ok |

---

## Counts

- matched = 4  (search min-length guard, accent/case normalization, shared helpers (both empty), service-card date/null handling)
- partial (⚠️) = 8  (home bundle wrapper, categories-with-subcats, pro/service subcats keys derived on FE, mainCategories/servicesByCategory via FE, search endpoint exists, taxonomy "used" gating shape, token threshold, search caching)
- missing (❌) = 9  (G1 suggestion shape, G2 success-envelope runtime bug, G3 ranking, G4 location search, G5 taxonomy/tag fuzzy, G6 featured-services rules, G7 featured-profiles rules, G8 popular-subcats source, plus FE search wrapper shape row)
- needs_verification (❓) = 1  (whether any remaining FE caller of search suggestions reads the raw object vs `{success,data}`; only `home-search.tsx` confirmed)
