# Home / Search / Taxonomy & Navigation, pass 3 (fresh re-audit), 2026-11-05

Dedupe baseline: SUMMARY.md, home-search-taxonomy.md (D1–D18), pass2-caching-matrix.md (D1–D8, C1–C3), pass2-routes-urls.md (D1: bad slugs return 200), services.md (D3, D15, D19, D23), profiles-public-archives.md (D5), admin.md (D7, D13, D17), lib-shared-sweep.md (D9, D12). Nothing below repeats them.

## 1. Coverage

### OLD files re-read (oldnext/)
- `src/actions/home/get-home-data.ts`: full home bundle.
- `src/actions/search/search-services.ts`: suggestions, taxonomy gating, ranking.
- `src/actions/services/get-categories.ts`: `/categories` data and the mega-menu.
- `src/actions/services/get-services.ts`: `getServiceTaxonomyPaths` :721-797 and archive slug resolution :852-900.
- `src/actions/taxonomy-submission.ts`, `src/actions/admin/taxonomy-submission.ts` :100-345 (approve/reject helpers).
- `src/lib/taxonomies/index.ts`: diffed in full. Re-read `resolveServiceHierarchy`, `resolveServiceHierarchyWithChildren` and the `findMatching*` matchers :700-860.
- `src/lib/utils/search/build-search-conditions.ts`, `src/lib/utils/text/normalize.ts`, `src/lib/utils/taxonomy-submission.ts`, `src/lib/validations/taxonomy-submission.ts`.
- `src/lib/utils/datasets.ts`: diffed. Re-read `findByField`/`findBySlug` :40-130 and `findTaxonomyBySubcategorySlug` :1671-1701.
- `scripts/build-taxonomy-maps.ts`: diffed. Location builder :180-208.
- `package.json`: the build regenerates the maps.
- `src/lib/taxonomies/maps.generated.json`: compared semantically with the new snapshot.
- `src/constants/datasets/{service-taxonomies,tags,locations,footer}.ts`.
- `src/app/(home)/{page,layout}.tsx`.
- `src/app/(archives)/(services)/categories/{page.tsx,sitemap.ts,[category]/page.tsx,[category]/not-found.tsx}`.
- Re-diffed against new: all 19 `src/components/home/*`, header (7), footer (3), `components/archives/{categories-grid,subdivisions-carousel,archive-banner}.tsx`, `components/shared/{taxonomy-tabs,category-icon,taxonomies-display}.tsx`, `components/ui/{search-dropdown,server-search-combobox}.tsx`, `lib/types/{search,datasets}.ts`.
- `src/lib/prisma/schema/{service,user}.prisma` (media/image column types).

### NEW files read
- Backend:
  - `apps/core/views/public/home.py`
  - `apps/core/taxonomy.py` (all)
  - `apps/services/selectors/service_reads.py` :1-240, :400-650, :735-750, :864-1029
  - `apps/services/views/public/service.py` :145-163, :294-298
  - `apps/services/models/service.py` (tags/media)
  - `apps/taxonomy/services/{maps_builder,submissions,taxonomy_data,admin_submissions}.py`
  - `apps/taxonomy/views/public/submissions.py`, `apps/taxonomy/serializers/taxonomy.py`
  - `apps/core/management/commands/canonicalize_taxonomies.py`
  - `apps/profiles/selectors/profile_reads.py` :80-135
  - `common/utils/normalize.py`
- Frontend:
  - `actions/home/get-home-data.ts`, `actions/search/search-services.ts`, `actions/services/get-categories.ts`, `actions/services/get-services.ts` :140-300, `actions/taxonomy-submission.ts`
  - `lib/api/{core,services}.ts` (home/categories/nav/suggestions)
  - `lib/taxonomies/{index.ts,enrich.ts,maps.generated.json}`, `lib/utils/datasets.ts` (diff), `lib/seo/{fetch-entity,pages}.ts` (category metadata)
  - `app/(home)/page.tsx`, `app/(archives)/(services)/categories/**`, `app/(archives)/(services)/ipiresies/[subcategory]/page.tsx`
  - `components/archives/archive-layout.tsx` (banner title/subtitle/image)
  - `app/(dashboard)/dashboard/services/create/page.tsx` (tag option value), `components/forms/service/steps/service-details-step.tsx` :377-420
  - `scripts/build-taxonomy-maps.ts`, `package.json`

### Delegated elsewhere
- N2b (subcategory archive banners): **services/archives domain**. Raised here because it has the same root cause as N2.
- N1's archive-search and dashboard-search call sites: **services domain**. The suggestions call site is mine.

## 2. Mapping
Unchanged from pass 1 §2.

## 3. NEW DIFFERENCES

### N1. Tag-label search never matches anything: the backend matches tag SLUGS, but `services.tags` stores numeric tag IDs — HIGH
- OLD:
  - `findMatchingTagIds(word)` returns tag **ids** whose normalized label contains the word. The condition is `{ tags: { hasSome: ids } }` (lib/utils/search/build-search-conditions.ts:19-27, :64-67).
  - It is used by the suggestion dropdown (search-services.ts:160-165) and by archive search (`buildSearchFilter`).
  - Service tags are stored as ids:
    - the form option `value: tag.id`
    - tags dataset ids are `'23'`, `'24'`, …
    - the frontend `enrich.ts:114-117` comment: "Tags are stored as Strapi integer IDs in the production dump (`{1259}`, `{1170}`)"
- NEW:
  - `taxonomy.matching_tag_slugs` (apps/core/taxonomy.py:244-259) returns `tags.bySlug` **keys**, e.g. `'2d-animation'`.
  - `_build_search_conditions` expands them with `taxonomy_value_candidates` (service_reads.py:83-85). That helper only knows the service/pro spaces (`_slug_to_ids`, taxonomy.py:106-115), not tags, so `'2d-animation'` stays `'2d-animation'`.
  - `Q(tags__overlap=['2d-animation'])` is then compared against `{'23', …}` and never matches.
  - The dashboard "my services" search has the same bug: `Q(tags__overlap=tag_slugs)` with no expansion (service_reads.py:743-745).
  - Nothing converts stored tag ids to slugs. `canonicalize_taxonomies.py:62` translates `s.tags` through the **service** byId map, so numeric tag ids pass through unchanged. New services are also saved with ids (`dashboard/services/create/page.tsx:49-52` → `value: tag.id`).
- Impact:
  - A service that matches only through a tag (e.g. tagged "WordPress" or "3D Rendering", without the word in its title, description, coverage or the pro's name) no longer appears in the header/home suggestion dropdown, in `/ipiresies?search=` results, or in the pro's dashboard search.
  - Multi-word searches lose the tag branch for every word.
  - The `matchType: 'tags'` ranking tier (service_reads.py:980-991) only ever fires through its `bool(s.tags)` fallback, as in OLD.
- Fix:
  - Make `matching_tag_slugs` return tag **ids** (iterate `tags.byId`, return the key or `node['id']`), or add the tag space to the candidate expansion: `{slug, id}` for each matched tag.
  - Apply the same change at service_reads.py:743.
- Possibly intentional?: no. The docstring states the opposite assumption ("NEW `services.tags` is a slug/text array"), which is false for production data.

### N2. `/categories/marketing` banner shows the "Μάρκετινγκ" SUBCATEGORY's description and image instead of the category's — LOW/MEDIUM
- OLD:
  - `getServiceArchivePageData({categorySlug})` resolves with `findBySlug(getServiceTaxonomies(), slug)`, a depth-first walk that checks top-level items first (get-services.ts:885-893; datasets.ts:40-55). `'marketing'` therefore resolves to category `5BTU2t`.
  - Banner subtitle: "Ανάπτυξε την επιχείρησή σου με Στρατηγική Μάρκετινγκ, Digital Marketing Ads και Social Media."
  - Banner image: `digital_agencies_ellada_3389c8ec8e`.
- NEW:
  - `enrich(taxonomyData.currentCategory)` uses `lookup = findServiceBySlug(k) ?? findServiceById(k)` (frontend actions/services/get-services.ts:172-181).
  - `service.bySlug['marketing']` is the subcategory `zzjBDA` (same slug collision as pass-1 D1).
  - `categories/[category]/page.tsx:118-125` therefore renders that subcategory's subtitle "Ανακάλυψε στρατηγικές μάρκετινγκ που ενισχύουν την επιχείρησή σου…" and image `marketing_449289d8e0`.
  - The title is unchanged (the labels are equal). The `<meta>` description is unchanged too, because OLD's SEO fetch also used `findServiceBySlug`.
- Impact: one of the 8 top-level category pages shows different copy and a different hero image from production.
- Fix: resolve `currentCategory` among top-level nodes only (`getServiceTaxonomies().find(c => c.slug === slug)`), then fall back to an id lookup.
- Possibly intentional?: no.

### N2b. (for services/archives domain) Same root cause on 20 subcategory archive pages: the banner shows the colliding SUBDIVISION's description and image — MEDIUM
- OLD: `findTaxonomyBySubcategorySlug` finds the subcategory by walking the level (datasets.ts:1671-1701).
- NEW:
  - `enrich(currentSubcategory)` uses the same global `findServiceBySlug` (get-services.ts:172-181).
  - For 20 slugs, `bySlug` points to the **subdivision** that shares the subcategory's slug: `diktua`, `sxolika-mathimata`, `upostirixi-pelaton`, `anaptuxi-logismikou`, `programmatismos`, `egatastasi`, `katharismoi`, `udraulika`, `mathimata-pliroforikis`, `sumvouleutikes-upiresies`, `panepistimiaka-mathimata`, `digital-marketing`, `analusi-dedomenon`, `anaptuxi-efarmogon`, `diaxeirisi-akiniton`, `ilektrologika`, `upostirixi-it`, `episkeues`, `mathimata-xorou`, `mathimata-texnon`.
  - `archive-layout.tsx:226-276` builds the banner subtitle and image from `currentSubcategory.description` and `.image`.
  - In the shipped maps, 18 of the 20 descriptions and 20 of the 20 images differ from the subcategory's own. Example `/ipiresies/diktua`:
    - OLD: "Σύνδεσε τις συσκευές σου με ασφάλεια και ταχύτητα…"
    - NEW: "Ανακάλυψε αξιόπιστες λύσεις για εγκατάσταση και συντήρηση δικτύων…"
  - Labels match, so titles look right.
- Fix: resolve `currentSubcategory` level-aware (walk `getServiceTaxonomies()` children), as OLD did.
- Possibly intentional?: no.

### N3. `/categories` "Πιο δημοφιλείς εργασίες" carousel and home "Κατηγορίες Υπηρεσιών" grid build subdivision hrefs from the STORED subcategory, not the subdivision's real parent — LOW (data-dependent)
- OLD:
  - Each subdivision's context comes from `getServiceTaxonomyPaths`. Paths are resolved with `resolveServiceHierarchy`, so a subdivision stored under a subcategory that isn't its parent gets no context there.
  - `getCategoriesPageData` then falls back to walking the tree and finding the subdivision's real parent (get-categories.ts:136-197).
  - The href is always tree-valid: `/ipiresies/<real-parent>/<div>`.
- NEW:
  - The href uses the `subcategorySlug` of the first backend row for that subdivision: frontend get-categories.ts:231-262 and get-home-data.ts:131-146.
  - A row stored with a stale parent therefore yields `/ipiresies/<stored-sub>/<div>`.
  - Real trigger: taxonomy moves. The current dataset moved `Q8VeiC` ("UGC Video", formerly "Social Media") from Digital Marketing (`iLB1Bi`) to Βίντεο (`lt86Vq`), and `UInpMs`/`0syncL`/`gAn97n`/`6CgzmM` to the new `q5F8Ns`. NEW moves don't re-sync services either (admin.md D7).
- Impact: carousel and grid chips can link to a non-canonical subcategory/subdivision URL (which still renders, per pass2-routes D1), where OLD linked to the canonical one.
- Check:

  ```sql
  SELECT subcategory, subdivision, count(*) FROM services
  WHERE status = 'published' AND subdivision <> ''
  GROUP BY 1, 2;
  ```

  Join the result against `taxonomy_nodes` parents.
- Fix: derive the parent from the taxonomy tree (`divParent` map, as get-services.ts:225-233 already does), not from the row.

### N4. `GET /api/services/categories?limit=<non-int>` → 500 — LOW
- NEW: `int(request.query_params.get("limit", 15))` has no guard (services/views/public/service.py:154). This is a public AllowAny endpoint, so a junk value raises an unhandled ValueError (HTML 500).
- OLD: an internal server action; there was no public parameter.
- Fix: use `_safe_int` or a serializer.

## 4. Corrections to earlier reports

- **C1, home-search-taxonomy §4 "Suggest backend logic … AND of per-word ORs over title/…/tags/… [confirmed same]".**
  - Wrong for the **tags** branch: it never matches (N1).
  - The other branches of that claim re-verified OK (see §5).
- **C2, home-search-taxonomy D12 evidence.**
  - Pass 1 measured `oldnext/src/lib/taxonomies/maps.generated.json`. That is a **stale** snapshot (generatedAt 2026-03-18). OLD prod regenerated it at build (`"build": "yarn build:taxonomies && …"`, oldnext/package.json:8) from `constants/datasets/locations.ts`.
  - Re-running OLD's `buildLocationMaps` last-write-wins on that dataset gives **329** (not 330) of 917 county/area ids resolving to another node:
    - `2` → "12351" and `12` → "Αγία Τριάδα" still hold.
    - `54` resolves to "Πανελλαδικά" (correct), not "Σε όλη την Ελλάδα".
  - D12's conclusion stands; only the 54 example and the count change.
- **C3, the stale old snapshot is not a taxonomy data drift.**
  - The OLD-vs-NEW `maps.generated.json` diff (326 paths) looks like test-DB taxonomy edits: the new `q5F8Ns` "Social Media", `Q8VeiC` renamed to "UGC Video", 4 subdivisions moved, tags 1331-1335 added, and "Πανελλαδικά".
  - All of these are already in OLD's `constants/datasets/*` (identical files), so OLD prod ran the same taxonomy. No finding. Future comparisons should regenerate OLD maps from the datasets instead of reading the committed JSON.

## 5. Re-verified same (pass-1 "Confirmed matching", checked again)

- **Home UI:** all home/header/footer components are byte-identical, except the known `href ??`/key fallbacks and the D17 footer changes. Hero chips use `/ipiresies/${sub.slug}` and slice 6. Home page fallback cards are 5 subs per category, in both OLD and NEW.
- **Home featured services:**
  - `featured`, media not null, `-updated_at`, 8 per category.
  - The NEW category iteration order (bySlug walk) gives the dataset order of the 8 categories, with the Marketing slot filled by the `marketing` subcategory entry, which filters the correct category node.
  - `allServices` is the concatenation in that order, as in OLD.
- **Home featured profiles:** gating, 16, `-updated_at`, `rating>=0` fallback. `role` is carried. Card labels come from `enrichProfileCard`.
- **Home bottom services grid:** subdivisions aggregated by resolved node, top 100 by count (href caveat in N3).
- **Suggestions:**
  - Min-length guard on the trimmed query.
  - `normalize_term` is identical (NFD + strip U+0300–036F + lower; final-sigma handling is the same in JS and Python).
  - Taxonomy gating ("sub used directly or via a used subdivision", id/slug candidate sets).
  - Subdivisions before subcategories, startsWith-first stable sort, limit 5.
  - Services: words ≥2 chars, no accented fallback in autocomplete, order `-rating,-review_count`, take 100.
  - matchType precedence coverage > title > description > tags. The 6-key `rank_key` is equivalent to OLD's comparator.
  - Top 5; `category` label fallback 'Υπηρεσία'; `/s/{slug|id}`.
  - Pro-subcategory label/plural matching walks the same 360 subcategories as OLD (computed).
- **`/categories`:**
  - Card and chip ranking by path count with dataset-order tie-break.
  - Categories need ≥1 subcategory with services.
  - Carousel is all subdivisions by service count, top 15. The frontend correctly ignores the backend's featured-based `popularSubdivisions`.
  - Drill-down filters by category on both sides (`categorySlug` query key matches the view).
  - Breadcrumbs and banner texts are identical. `categories-grid` differs only in string-or-Cloudinary image handling.
- **Mega-menu:** category order = dataset order, top-6 subcategories and top-3 subdivisions by count, flags and hrefs identical (apart from known D7/D8).
- **Submissions (user side):**
  - Pro-only, label 2–60, skill needs category, 5 per 24h counting all statuses (OLD also counted all created records, not only successful outcomes).
  - Dataset duplicate check (category-scoped for skills), global pending duplicate check (iexact), `pending_<id>`.
  - My-pending list ordered newest first.
- **Submissions (admin side):** approve id = max numeric + 1 including approved `assignedId`s; `array_replace`/`array_remove` SQL; error strings; bulk messages.
- **Still present, as described:** pass-1 D2, D9, D11, D13 (no `baseHref` anywhere in frontend datasets/get-services), D14, D16, D17 (footer).

## 6. Open questions

- N1 severity depends on how many published services are reachable only through tags. Check:

  ```sql
  SELECT count(*) FROM services
  WHERE status = 'published' AND cardinality(tags) > 0;
  ```

- N3 needs the stale-parent query shown in N3.
- Whether production `services.category/subcategory` were ever canonicalized to slugs. All new code assumes ids. If slugs were stored, the frontend's slug-first resolves would also hit `bySlug` collisions:
  - Category `marketing` would resolve to the subcategory in the home cards' `featured` check and in the mega-menu icon.
  - The 20 sub/div collisions would be affected the same way.
