# Public profile pages + /dir directory archives: pass 3 (fresh re-audit), 2026-11-05

Read first: `_INSTRUCTIONS.md`, `SUMMARY.md`, `profiles-public-archives.md` (pass 1, D1-D18), and the
profile/archive parts of `pass2-caching-matrix.md`, `pass2-authz-security.md`, `pass2-payload-contracts.md`,
`lib-shared-sweep.md` (D9, D18), `home-search-taxonomy.md`, `services.md` and `reviews-saved.md`.
This report lists only NEW findings, then corrections to earlier findings, then pass-1 "confirmed same"
claims that I re-checked. Zero code changes. No git commands were run.

## 1. Coverage

### OLD files read (re-derived scope; every one diffed or read in full)
- `oldnext/src/actions/profiles/get-profiles.ts` (all 1031 lines): `getProfilesByFilters`, `getProfilesCount`, `getProfileArchivePageData`, `getProTaxonomyPaths`.
- `oldnext/src/actions/profiles/get-directory.ts`: `getDirectoryPageData`.
- `oldnext/src/actions/profiles/get-profile.ts`: `getProfileByUserId`, `getPublicProfileByUsername`, `transformProfileService`, `getProfilePageData`.
- Pages: `app/(profile)/layout.tsx`, `profile/[username]/{page,loading,not-found}.tsx`, `profile/sitemap.ts`, `app/(archives)/layout.tsx`, `(pro)/directory/page.tsx`, `(pro)/dir/{page,not-found,sitemap}.tsx`, `dir/[category]/{page,not-found}.tsx`, `dir/[category]/[subcategory]/{page,not-found}.tsx`.
- `components/profile/*`: all 19 files plus the 10 `skeletons/*`.
- `components/archives/*`: all 15 files.
- `lib/hooks/archives/{use-archive-filters,use-archive-pagination,use-debounced-value}.ts`.
- `lib/utils/search/{build-search-filter,build-search-conditions}.ts`.
- `lib/taxonomies/index.ts`: `findMatchingProSubcategoryIds`, `findLocationBySlugOrName`, `resolveToCountyId`.
- `lib/utils/datasets.ts`: `resolveTaxonomyHierarchy`, `transformCoverageWithLocationNames`, `getCountiesForArchiveFilters`, `getCoverageGroupedByCounty`, `hasOnsiteCoverage`, `hasOnbaseCoverage`, `getCoverageAddressWithLocation`, `NATIONWIDE_ID`.
- `lib/utils/misc/experience.ts`.
- `lib/seo/{pages,fetch-entity}.ts`, `lib/seo/schema/{profile,profiles,directory}-schema.tsx`.
- Shared components: `shared/{service-card,service-media-card,taxonomy-tabs,dynamic-breadcrumb,profile-badges,save-button,rating-display,social-links,breadcrumb-buttons,hash-scroll,taxonomies-display,icon-box,media-carousel}.tsx`.
- `app/layout.tsx`, `types/global.d.ts`: these show where `window.gtag` comes from (see D5).

### NEW files read
- Frontend actions and API: `actions/profiles/{get-profile,get-profiles,get-directory}.ts`, `lib/api/profiles.ts`, `lib/taxonomies/enrich.ts`, `lib/taxonomies/index.ts` (`getLocations`), `lib/analytics/consent.ts` (`trackEvent`).
- Frontend pages: every page, loading and not-found file under `app/(profile)` and `app/(archives)/(pro)`.
- Frontend components: `components/profile/*`, `components/archives/*`, the shared components listed above, `lib/hooks/archives/*`, `lib/seo/*`, `lib/utils/datasets.ts` (the same functions as on the old side).
- Backend profiles: `apps/profiles/selectors/{profile_aggregations,profile_reads}.py` (full), `views/public/aggregations.py`, `views/public/profile.py` (by-username, taxonomy-paths), `serializers/profile_filters.py`, `urls/public.py`.
- Backend core: `apps/core/taxonomy.py` (full), `apps/core/locations.py`.
- Data: `frontend/src/lib/taxonomies/maps.generated.json`. I analysed it with scripts for id/slug collisions, duplicate pro slugs, plural/type/image presence and slug lengths.

### Delegated elsewhere (same as pass 1)
- Reviews section data → reviews domain.
- Report action → reports domain.
- `menu-user*` → header domain.
- Services archives and the `archive-service-card` → services domain.
- Profile sitemap endpoint → SEO.
- Billing `featured` toggles → billing.

## 2. Mapping (old → new)
Pass-1 §2 is accurate. I re-checked every row. One addition: the `/dir` filter-drawer dropdowns come from a second call, `GET /profiles/directory?limit=1`, which is merged outside `unstable_cache` (`get-profiles.ts:193-220`).

## 3. NEW DIFFERENCES

### D1. Directory search on a gender/variant subcategory label also returns every sibling variant that shares its slug. MEDIUM
- OLD: `findMatchingProSubcategoryIds(word)` (`taxonomies/index.ts:825-853`) returns the **ids** of the subcategory nodes whose singular label or plural contains the word. The profile search then ORs `subcategory IN (those ids)` (`build-search-conditions.ts:133-136`). Only the node that actually matched is included.
- NEW: `matching_pro_subcategory_slugs(word)` returns **slugs** (`core/taxonomy.py:292-311`). `_pro_subcategory_value_candidates` then expands each slug through `taxonomy_value_candidates` into **all ids carrying that slug** (`profile_aggregations.py:126-139`, `core/taxonomy.py:122-139`).
- The pro taxonomy has 13 duplicate slugs whose variants have different singular labels but a shared plural (checked in `maps.generated.json`):
  - `digital-marketing-agencies`: Digital Marketing Agency / SEO Agency / Social Media Agency
  - `grafeia-diorganosis-ekdiloseon`: Γραφείο Διοργάνωσης Γάμων / Εκδηλώσεων
  - `ekfonites`: Voice-over Artist / Εκφωνητής
  - `kathigites`: Δάσκαλος Φωνητικής / Καθηγητής / Καθηγήτρια
  - `daskaloi`: Δασκάλα / Δάσκαλος
  - `etaireies-diaxeirisis`: Ακινήτων / Κοινοχρήστων / Πολυκατοικιών
  - and others.
- Impact: when a term matches one variant's singular label but not the shared plural, the result list widens. Examples:
  - "seo" also returns Digital Marketing and Social Media agencies.
  - "γάμων" also returns general event offices.
  - "voice" also returns every Εκφωνητής.
  - "καθηγήτρια" or "φωνητικ" return every Καθηγητής.
  - "δασκάλα" returns male teachers too.
  
  These affect both the `/dir` list and its total. The service search's pro-subcategory OR (`buildServiceSearchConditions`) probably has the same effect if it uses the same helper (services owner to confirm).
- Fix hint: return node ids from the matcher (or keep only the matched node's id and its own slug form), not every id of the slug.
- Possibly intentional?: no.

### D2. `/directory` landing (and the unfiltered archive carousel): ties in profile counts are ordered arbitrarily instead of in taxonomy order. LOW-MEDIUM
- OLD (`get-directory.ts:121-187`):
  - Popular subcategories are built by walking `proTaxonomies` → `children` in dataset order, then stable-sorted by count desc and cut to 15.
  - Each category card's subcategories are stable-sorted by count desc and cut to 10, with the first 6 visible.
  - Equal counts therefore keep the canonical taxonomy order.
- NEW:
  - `directory_data` orders the `GROUP BY (subcategory, category)` result by `-count` only (`profile_aggregations.py:318-336`). Postgres returns ties in hash-aggregate order.
  - Popular is sliced `[:limit]` and each category list is sliced `[:10]` on the backend, before the frontend's stable re-sort (`get-directory.ts:55-59, 93-96`). The frontend sort keeps the backend's arbitrary tie order.
  - The archive carousel has the same issue: `archive_data`, `.order_by("-count")[:5]`, at `profile_aggregations.py:435-441`.
- Impact: low counts (1-3 profiles) are very common, so these can differ from old and change between deploys/plans:
  - which subcategories make the top 15 "Πιο δημοφιλείς επαγγελματικές κατηγορίες";
  - which 6 show on each category card;
  - which ones fall past the per-category 10 cap.
- Fix hint: add a secondary order by taxonomy position, or sort and slice on the frontend after mapping to dataset order.
- Possibly intentional?: no. Pass-1 D10 covered grouping and D8 described old ties for the carousel, but none of this was reported as a difference for the landing page.

### D3. Popular-subcategory pills for profiles stored without a category link to `/dir/null/<sub>` (or `/dir//<sub>`). LOW (new symptom of pass-1 D10's root cause)
- OLD: the subcategory is placed under its **taxonomy parent**, so the href is always `/dir/<parent>/<sub>` (`get-directory.ts:131-147`).
- NEW:
  - The backend gives the row `categorySlug: row["category"]`, which is `None` or `""` (`profile_aggregations.py:324-336`).
  - The frontend then rebuilds `href: /dir/${catSlug}/${subSlug}` with `catSlug = resolve(null)?.slug ?? sub.categorySlug`, which is `null` (`get-directory.ts:80-92`).
  - Result: `/dir/null/<sub>`. Because of pass-1 D5 it renders an empty "category" page instead of a 404.
- Impact: the pill is dead whenever profiles with a subcategory but an empty category rank in the top 15. Needs a DB count: `select count(*) from profiles where published and "isActive" and subcategory is not null and subcategory<>'' and (category is null or category='')`.
- Possibly intentional?: no.

### D4. `sortBy` from the archive URL is no longer validated server-side: an invalid value skips the featured shuffle, and a repeated param crashes the page. LOW
- OLD: `sortBy = isValidArchiveSortBy(sp.sortBy) ? sp.sortBy : 'default'` (`get-profiles.ts:580-583`). Invalid values, and arrays such as `?sortBy=a&sortBy=b`, become `'default'`, so the query uses the default order plus `shuffleFeatured`.
- NEW: `archive_data` passes `sp.get("sortBy")` raw (`profile_aggregations.py:413`), because `searchParams` is an unvalidated `JSONField` (`profile_filters.py:27`).
  - An unknown string falls through to the default order in `_apply_sort`. But the shuffle runs only for `None/''/'default'` (`:238`), so `?sortBy=foo` gives a non-shuffled default order.
  - A list value raises `TypeError: unhashable type: 'list'` at `sort_by in _SORT_MAP` (`:204`). That is a 500 from Django, which becomes a 500 page on `/dir` and `/dir/c/s` and a 404 on `/dir/c`.
- Impact: hand-edited or crawler URLs only. Pass-1 D13 noted that the invalid sortBy is echoed back, but not these two effects.
- Possibly intentional?: no.

### D5. Contact-reveal analytics event changed payload, and probably changed from never firing to firing. LOW (possibly intentional)
- OLD: `contact-reveal.tsx:31-39` calls `window.gtag('event','reveal_contact',{event_category:'Contact', event_label:type, value:1})` only when `window.gtag` exists. Nothing in the old app defines `window.gtag`: `app/layout.tsx:69` deliberately doesn't load gtag.js, and GTM does not create a global `gtag`. So the event was most likely never sent.
- NEW: `trackEvent('reveal_contact', { contact_type: type })` pushes `{event:'reveal_contact', contact_type}` to the dataLayer (`lib/analytics/consent.ts:249-252`) whenever GTM is loaded after opt-in.
- Impact: GA/GTM sees a new event, with `contact_type` instead of `event_label`/`event_category`/`value`. A GTM trigger or GA report built for the old parameter names won't match. Pass 1 waved this through as "consent architecture".
- Possibly intentional?: probably (it is part of the consent rework). Confirm the GTM container has a matching trigger/variable.

### D6. Profile-page service cards and taxonomy chips use global taxonomy lookups instead of hierarchical ones. On inconsistent data this shows raw ids or labels the old app hid. LOW (new instances of pass-1 D12)
- OLD:
  - `transformProfileService` → `resolveTaxonomyHierarchy(serviceTaxonomies, cat, sub, div)` (`get-profile.ts:123-153`, `datasets.ts:766-804`). The subcategory must be a child of the category, and the subdivision a child of the subcategory; otherwise the label is `''`.
  - The card data had no raw `category` field, so `ServiceMediaCard`'s fallback `taxonomyLabels.subcategory || service.category || ''` rendered nothing.
  - Archive cards: `resolveCategoryLabels` (pro, hierarchical) gives no chip when the subcategory is not under the stored category.
- NEW:
  - `svcLabel()` resolves each level independently by slug or id (`get-profile.ts:185-204`).
  - `_brief_service` ships the raw `category` id (`profile_aggregations.py:647-659`). When the subcategory doesn't resolve, the badge falls back to the **raw category id** (e.g. "YtDWfH") in `service-media-card.tsx:80`.
  - Archive/home cards resolve the subcategory globally (`enrich.ts:96-111`), so they show a chip for a mismatched category/subcategory pair.
- Impact: only rows whose stored category/subcategory/subdivision don't nest, or are stale ids.
- Possibly intentional?: no.

## 4. Corrections to earlier findings

- **C1 (pass-1 D7, county filter).** "`?county=<garbage>` shows 0 results" is not exact.
  - The real behaviour: for an unresolvable value, `_county_coverage_q` filters on the raw string **OR the nationwide sentinels** (`profile_aggregations.py:78-87`). So the page shows **only the nationwide pros** (`coverage.counties ∋ '54'|'_all'` or `coverage.county ∈ {'54','_all'}`). Old showed **all** pros.
  - With `online` plus an unresolvable county, NEW gives online **OR nationwide**; OLD gave online only (`get-profiles.ts:163-169`).
  - Also new: a bare numeric id (`?county=4`) is accepted as-is (`locations.py:126-127`, `isdigit`) and filters that county. OLD's `resolveToCountyId('4')` returned undefined, so there was no filter.
- **C2 (pass-1 D13, invalid `limit`).** "500 on `/dir` and 404 on the category/subcategory pages" is only half right.
  - `/dir/[category]/page.tsx:80-82` turns **any** failure into `notFound()`.
  - `/dir/[category]/[subcategory]/page.tsx:80-88` only does so for `'Category not found'`/`'Subcategory not found'`. The DRF 400 message from `ArchiveRequestSerializer.limit` does not match, so the page **throws, giving a 500**.
  - So: `/dir` → 500, category → 404, subcategory → 500.
- **C3 (minor, comment only).** The `get-profiles.ts:18-21` header says Django caches taxonomy-paths for 24h. It doesn't: `TaxonomyPathsView` calls `get_taxonomy_paths` uncached (`views/public/profile.py:185-191`). OLD cached it for 24h with `unstable_cache`. Its only callers are `generateStaticParams` and the `/dir` sitemap (the sitemap fetch itself revalidates hourly), so there is no user-visible effect. It is a load note, not a parity bug.

## 5. Re-verified same (pass-1 §4 claims re-checked against code)
- **Listing filter:** `published=True`, `is_active=True`, `user.blocked=False`, `user.confirmed=True`; role from `?type` → `user.role`; directory with no type → no role filter (`profile_aggregations.py:38-43, 213-226, 386-397`).
- **Sort map:** identical to old `get-profiles.ts:222-259`, including the default `featured desc, updatedAt desc`. Postgres NULL placement is the same in both (neither sets `nulls`).
- **Online semantics:** `?online` / `?online=true` → `online=true`; `?online=false` → no filter. Online + resolvable county → `online OR county OR nationwide-in-counties`. NEW also matches `county∈{54,_all}` and area/areas; that part is already pass-1 D7.
- **Search:**
  - ≥2 chars, `normalize_term`, split on whitespace, words ≥2 chars;
  - single word gets the accented-field fallback, multi-word is an AND of ORs over displayName/tagline/bio normalized plus username;
  - pro-subcategory label/plural match, applied to list and total.
  - Apart from D1, this matches `build-search-filter.ts` and `buildProfileSearchConditions`.
- **Pagination:** `hasMore` is equivalent, page clamped to ≥1, default limit 20. The hooks (`use-archive-filters`, `use-archive-pagination`, `use-debounced-value`) are byte-identical, and so are URL serialisation, active-filter count and "Καθαρισμός φίλτρων". The backend's `online:null`/`sortBy:null` echoes are harmless: `value || 'default'`, and nulls are skipped in `updateURL`.
- **`getProfilesCount`:** minimal where-clause.
- **`get_taxonomy_paths`:** filters, id→slug and count sort match old.
- **Archive card:** component byte-identical. Card data (`serialize_profile_card` + `enrichProfileCard`) supplies the same fields: `taxonomyLabels.subcategory` (singular label), `skillsData`, `specialityData`, coverage transformed with the same static `locationOptions` (`getLocations()` returns it), `groupedCoverage = countyAreasMap`, `uid` for SaveButton. Exceptions are the known D12 fallbacks and D6 above.
- **Pages and layout:** the 4 archive/directory pages differ only in `force-dynamic` and the `?type=companies` schema fix (pass-1 D15). The not-found pages, loading page, route-group layouts, `ArchiveLayout`, `ArchiveBanner`, `ArchiveFilters`, `ArchiveInputs`, `ArchivePagination`, `CoverageDisplay` and `ArchiveProfileCard` are byte-identical. The sidebar diffs are only the intentional drawer persistence and optimistic selects.
- **Shared components:** the coverage helpers differ only by null guards. `getCountiesForArchiveFilters` and `getCoverageAddressWithLocation` are identical. Of the shared components, `taxonomy-tabs`, `profile-badges`, `save-button`, `rating-display`, `breadcrumb-buttons`, `hash-scroll`, `taxonomies-display`, `icon-box` and `media-carousel` are byte-identical. `dynamic-breadcrumb` and `social-links` differ only by a null guard or a type rename.
- **Profile page:** section order, props and the ownership check are identical (page diff = session helper, `force-dynamic`, null guards).
  - 404 gates: published, active, not blocked, confirmed, role ∈ {freelancer, company}. Any action failure → `notFound()`, as in old.
  - `calculatedExperience` matches `getYearsOfExperience(...)||0`; the helper file is identical and `parseInt` vs regex give the same result on garbage.
  - Visibility default `{}` vs old `{email:false,phone:true,address:true}`: only `visibility?.email===true` is read, so the output is identical.
  - Coverage null → default object (the new transform keeps the old null branch).
  - Services: all published, ordered by `-sort_date`. `ServiceMediaCard` portfolio fallback is undefined in both, since old `service.profile` had no `portfolio`.
  - Contact/payment/settlement/budget/size lookups keep the profile's order.
  - Breadcrumb: `/directory`, then category plural → `/dir/<cat>`, then subcategory plural → `/dir/<cat>/<sub>`. Every pro node has a non-empty plural, so `plural ?? label` equals old `plural || label`.
- **Taxonomy collisions:** service/pro id collisions 0; slug collisions 5, all pro **categories** with identical labels (ekdiloseis, marketing, pliroforiki, texnika, ypostiriksi), so the service-first lookups have no visible effect. All pro slugs are ≤39 chars, so the 64-char caps on `categorySlug`/`subcategorySlug` never reject a real URL. The pro `bySlug` keeps all 8 categories (the Marketing index loss in home-search D1 is service-side only).
- **Directory:**
  - counts ignore user blocked/confirmed in both;
  - popular limit 15;
  - plural labels;
  - top 10 per category;
  - grid 6 + "Δες όλες τις υποκατηγορίες (N+)";
  - categories in pro-taxonomy order;
  - gender variants appear as separate entries with the same plural label in both.
- **SEO:** `getProfileMetadata` / directory metadata templates are unchanged. In `fetchEntity`, profile/proCategory/proSubcategory resolve with the same lookups. `ProfilesSchema`/`ProfileSchema` are identical except the base-URL env chain (lib-shared D14).
- **Still true in the current code:** pass-1 D1, D2, D3 (`profile_aggregations.py:575-579` still emits both emails), D4, D5, D6, D8, D9, D10, D11, D12, D15, D16, D17, D18.

## 6. Open questions / couldn't verify
- There is no Django environment or DB access in this checkout (no venv, no reachable DB), so the D3 count and the FK-backfill coverage (pass-1 open question) are still unverified.
- D1: whether `buildServiceSearchConditions`' pro-subcategory branch in NEW uses the same slug-expanding helper (services domain).
- D5: the GTM container contents (is there a `reveal_contact` trigger, and on which parameters?).
