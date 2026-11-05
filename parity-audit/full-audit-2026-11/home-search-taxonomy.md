# Home / Search / Taxonomy & Navigation parity audit — 2026-11-05

Scope: home page data + UI, global search suggestions (hero + header), taxonomy
system (datasets layer, maps, Django taxonomy app, live-refresh mechanics),
mega-menu, /categories (+ drill-down), footer links, taxonomy submission flow
(user side + admin moderation backend).

## 1. Coverage

### OLD files read (oldnext/src unless noted)
- `actions/home/get-home-data.ts` — home bundle: featured services per category, featured profiles (+fallback), popular subcategories, featured category cards, bottom grids.
- `actions/search/search-services.ts` — autocomplete: taxonomy + service suggestions, ranking, 5-min cache.
- `actions/taxonomy-submission.ts` — user submits skill/tag; list my pending.
- `actions/admin/taxonomy-submission.ts` — admin list/stats/approve/reject/bulk (backend counterpart is in my scope: `apps/taxonomy/services/admin_submissions.py`).
- `actions/services/get-categories.ts` — `/categories` page data + `getNavigationMenuData` (mega-menu).
- `actions/services/get-services.ts` (only `getServiceTaxonomyPaths` :721-797 and breadcrumb call :1105-1118) — path-count source for menu and /categories.
- `lib/taxonomies/index.ts` — O(1) lookups, label matching (`findMatching*Ids`), `findMatchingLocationInCoverage`, `injectTaxonomyItem`.
- `lib/taxonomies/maps.generated.json` (inspected programmatically) + `oldnext/scripts/build-taxonomy-maps.ts` (location map builder :180-208).
- `lib/utils/datasets.ts` — diffed in full against new copy.
- `lib/utils/search/{build-search-conditions,build-search-filter,index}.ts` — search OR/AND builders.
- `lib/utils/text/normalize.ts` — `normalizeTerm`.
- `lib/utils/taxonomy-submission.ts`, `lib/validations/taxonomy-submission.ts` — pending_ id scheme, zod schema.
- `lib/types/datasets.ts`, `lib/types/search.ts`.
- `app/(home)/page.tsx`, `app/(home)/layout.tsx`.
- `app/(archives)/(services)/categories/page.tsx`, `categories/sitemap.ts`, `categories/[category]/page.tsx`.
- `components/home/*` (all 19 files, diffed), `components/shared/layout/header/*` (7), `components/shared/layout/footer/*` (3), `components/ui/search-dropdown.tsx`, `components/ui/server-search-combobox.tsx`, `components/archives/categories-grid.tsx`, `components/shared/category-icon.tsx`, `components/shared/taxonomy-tabs.tsx`, `components/shared/taxonomies-display.tsx`.
- `constants/datasets/*` (all 21, diffed): service-taxonomies, pro-taxonomies, tags, skills, locations, category-icons, footer, data, options, etc.
- Consumers of submission action: `components/forms/profile/form-basic-info.tsx:208-225`, `components/forms/service/steps/service-details-step.tsx:68-80`, `components/forms/service/form-service-edit.tsx:242-252`.
- Dead code in OLD (no importers found by grep): `lib/utils/taxonomy-routes.ts`, `lib/utils/navigation/{active,index,paths,sitemap}`, `components/shared/taxonomy-selector.tsx`, `constants/datasets/{tabs,collections,budgets,company-sizes,subscription-types}.ts` — not ported, no impact.

### NEW files read
- Backend: `apps/core/views/public/home.py`; `apps/core/taxonomy.py` (all); `apps/services/selectors/service_reads.py` (:27-95, :402-562, :864-1029); `apps/services/views/public/service.py` (:151-162, :292-298); `apps/services/urls/public.py`; `apps/taxonomy/` — `models/{taxonomy_node,taxonomy_submission}.py`, `signals.py`, `services/{cache,maps_builder,taxonomy_data,submissions,submission_ids,admin_submissions,dataset_ops}.py`, `views/public/{maps,submissions}.py`, `views/admin/{submissions,dataset}.py` (:120-156), `urls/{public,admin}.py`, `serializers/taxonomy.py`, `management/commands/seed_taxonomy.py` (order handling); `common/utils/normalize.py`; `common/throttling.py`; `config/settings/base.py` (throttle rates, CACHES); `apps/accounts/permissions/roles.py` (IsProfessional); `apps/profiles/selectors/profile_reads.py:80-130`; `Dockerfile` (single daphne process).
- Frontend: `actions/home/get-home-data.ts`, `actions/search/search-services.ts`, `actions/services/get-categories.ts`, `actions/services/get-services.ts:275-300`, `actions/taxonomy-submission.ts`, `actions/admin/taxonomy-submission.ts`, `lib/api/{core,services,taxonomy}.ts` (relevant fns), `lib/taxonomies/index.ts` (diffed), `lib/taxonomies/maps.generated.json` (inspected), `lib/utils/datasets.ts` (diffed), all home/header/footer/search/categories components & pages listed above (diffed).

### Delegated elsewhere
- `actions/admin/{taxonomies,taxonomies-shared,taxonomy-helpers,taxonomy-git,taxonomy-publish,git-operations,pro-taxonomies,skills,tags,revalidate-taxonomies}.ts`, `app/actions/{taxonomy-file-manager,taxonomy-lock,shared-file-formatter}.ts`, `lib/taxonomy-drafts.ts`, `lib/taxonomy-tree-preview.ts`, admin taxonomy pages/components → **admin domain** (admin taxonomy CRUD). Two observations from `dataset_ops.py` are logged as D18 for that domain.
- `actions/profiles/get-directory.ts` (directory popular subcategories reused by home bottom grid) → **archives/directory domain**.
- Full archive search (`/ipiresies?search=`, `buildSearchFilter` + fallback fields) → **archives domain**. This report covers the shared condition builder and the taxonomy label matchers it uses (D1 affects it).
- Home featured-profile/service **card** field content (`serialize_profile_summary`, `_card`) → **profiles/services domains**. D4 is raised here because `/api/home` exposes it.

## 2. Mapping (old → new)

| OLD | NEW frontend | NEW Django | Page/UI |
|---|---|---|---|
| `getHomePageData` (get-home-data.ts) | `actions/home/get-home-data.ts` (enriches + calls categories/directory) | `GET /api/home` `HomePageView` (core/views/public/home.py) → `get_featured_services`, `_featured_profiles`, `get_popular_service_subcategories(8)`, `get_categories_page()["categories"]`, `directory_data` | `app/(home)/page.tsx` (identical UI) |
| `searchServiceSuggestions` / `performSearch` | `actions/search/search-services.ts` | `GET /api/services/search/suggestions?q=` → `search_suggestions` | `home-search.tsx`, `header-search.tsx`, `search-dropdown.tsx` (byte-identical) |
| `buildServiceSearchConditions` + `findMatching*Ids` | — | `_build_search_conditions` + `core/taxonomy.matching_*_slugs` | — |
| `getCategoriesPageData` | `actions/services/get-categories.ts:getCategoriesPageData` (rebuilds tree + path counts on FE) | `GET /api/services/categories` → `get_categories_page` | `/categories`, `/categories/[category]` |
| `getNavigationMenuData` | `actions/services/get-categories.ts:getNavigationMenuData` | `GET /api/services/navigation` → `get_navigation_menu_data` | `navigation-menu.tsx` (identical) |
| `lib/taxonomies` (static maps) | `lib/taxonomies/index.ts` (fetches `/api/taxonomy/maps`, 60s ETag poll, JSON fallback) | `GET /api/taxonomy/maps` (`TaxonomyMapsView`, `build_maps`) | — |
| `submitTaxonomySubmission` / `getUserTaxonomySubmissions` | `actions/taxonomy-submission.ts` | `POST /api/taxonomy/submissions`, `GET /api/taxonomy/submissions/me` | profile basic form, service create/edit forms |
| admin approve/reject/bulk/list/stats | `actions/admin/taxonomy-submission.ts` | `/api/admin/taxonomy/submissions[...]` → `admin_submissions.py` | admin |
| footer datasets | `constants/datasets/footer.ts` | — | `footer-global.tsx` |

## 3. DIFFERENCES

### D1. Backend taxonomy index drops the whole "Μάρκετινγκ" category and misclassifies 66 subcategories as categories → search suggestions and search label matching miss all Marketing taxonomy — HIGH
- OLD: `performSearch` walks `getServiceTaxonomies()` (the real 8-category tree) — search-services.ts:74-122; `findMatchingServiceSubcategoryIds`/`findMatchingSubdivisionIds` walk the same tree (lib/taxonomies/index.ts:745-805).
- NEW: `apps/core/taxonomy.py:_service_indexes` (:45-81) builds its category list from `service.bySlug` nodes whose id is a key of `byCategory`. Two defects:
  1. `bySlug['marketing']` resolves to the **subcategory** `zzjBDA` ("Μάρκετινγκ"), not the category `5BTU2t` (slug collision; same in DB build since `slug_primary` reproduces bySlug). So the real Marketing category is never seen.
  2. `byCategory` also has keys for every subcategory that has subdivisions (86 of 94 keys), so 66 subcategories are treated as "categories" and their subdivisions end up in the `subcategories` list.
  Measured on the shipped maps: OLD walk = 88 subcategories / 490 subdivisions; NEW walk = 437 "subcategories" / 448 "subdivisions". Missing from NEW: all 8 Marketing subcategory URLs (`/ipiresies/branding`, `/digital-marketing`, `/social-media`, `/pr`, `/promotion`, `/diafimisi`, `/epikoinonia`, `/marketing`) and 42 Marketing subdivisions (e.g. `/ipiresies/digital-marketing/seo`, `/social-media/diaxeirisi-social-media`).
- Effects:
  - `_suggest_taxonomies` (service_reads.py:896-951): typing "seo", "branding", "social media", "digital marketing" returns no taxonomy suggestions. Mis-levelled entries can also show up as subcategory suggestions with a wrong `/ipiresies/<subdivision-slug>` URL wherever a subdivision slug collides with a used subcategory slug (e.g. `sxolika-mathimata`).
  - `matching_service_subdivision_slugs` (taxonomy.py:228) never returns Marketing subdivisions, and `matching_service_subcategory_slugs` (:211) never returns Marketing subcategories (it returns subdivision slugs instead). Services are then found only when the word is in the title, description or another field, both in suggestions and in the archive full-text search (`_build_search_conditions`, service_reads.py:53-95).
  - `get_featured_services` (service_reads.py:541-562) runs ~73 per-"category" queries. The tab result happens to be right only because the subcategory slug `marketing` equals the category slug.
- Impact: users searching for Marketing services get no category suggestions and fewer service hits.
- Possibly intentional?: no.
- Fix hint: build the category list from `hierarchy` (levels) or from `service.tree`/`byId` top-level nodes in dataset order, never from `bySlug`+`byCategory`.

### D2. Taxonomy submission errors never reach the user (`error` vs `message`) — HIGH
- OLD: action returns `{success:false, message:'…'}` with specific Greek texts: 'Έχετε φτάσει το μέγιστο όριο υποβολών (5) για σήμερα', 'Η δεξιότητα "X" υπάρχει ήδη', 'Το tag "X" υπάρχει ήδη', 'Η υποβολή "X" εκκρεμεί ήδη για έγκριση', 'Δεν έχετε δικαίωμα υποβολής', zod messages (actions/taxonomy-submission.ts:32-101). Forms show `toast.error(result.message || 'Σφάλμα κατά την υποβολή')`.
- NEW: `frontend/src/actions/taxonomy-submission.ts:16` returns `{success:false, error: err.message}`. The forms are unchanged (form-basic-info.tsx:230, service-details-step.tsx:77, form-service-edit.tsx:245) and read `result.message`, which is always undefined → every failure shows the generic 'Σφάλμα κατά την υποβολή'.
- Impact: users never learn why a skill/tag was refused (duplicate, already pending, daily limit).
- Possibly intentional?: no.

### D3. Extra DRF throttle `taxonomy_submission: 5/day` counts every request, including failed ones; English permission/validation texts — MEDIUM
- OLD: the limit counts only **created** records in the last 24h (`taxonomySubmission.count` since oneDayAgo, :47-61). Duplicates and validation failures do not use up quota. Non-pro users get 'Δεν έχετε δικαίωμα υποβολής'. Label errors are Greek ('Το tag πρέπει να είναι τουλάχιστον 2 χαρακτήρες' / '…60 χαρακτήρες').
- NEW: `SubmitTaxonomyView` (taxonomy/views/public/submissions.py:20) adds `TaxonomySubmissionThrottle` with rate "5/day" (config/settings/base.py:257) on top of the service-level count. Five attempts of any outcome (duplicates, too-short labels) lock the user out for 24h with DRF's English "Request was throttled…". `IsProfessional` at view level (accounts/permissions/roles.py:55) answers "Professional account required." before the Greek service message can run. Serializer min/max errors are DRF English defaults (serializers/taxonomy.py:10).
- Edge: OLD validates `min(2)` **before** trimming (zod `.min().transform(trim)`), so " a " is accepted as "a". NEW trims first and rejects it.
- Impact: pros get locked out of adding skills/tags after a few rejected attempts. (Messages are currently hidden anyway by D2.)
- Possibly intentional?: throttle maybe (abuse protection), but it changes the business rule. The texts are not intentional.

### D4. `/api/home` publicly exposes private contact fields of featured profiles — HIGH (privacy; verify with profiles domain)
- OLD: `HOME_PROFILE_SELECT` (lib/database/selects/profile.ts:47-75) selects only card fields. The data is rendered server-side and never exposed as an API.
- NEW: `_featured_profiles` (core/views/public/home.py:70) returns `serialize_profile_summary(p)` for 16 profiles. This includes `phone`, `viber`, `whatsapp`, `website`, `socials`, `firstName`, `lastName`, `bio`, `terms`, `portfolio`, `visibility` (profile_reads.py:85-130). `/api/home` is `AllowAny` and cached, so anyone can read it, even for profiles whose `visibility` hides the phone.
- Impact: personal data leak from an anonymous endpoint.
- Possibly intentional?: no.

### D5. Taxonomy live-refresh is incomplete: several in-process caches are never invalidated — MEDIUM
- OLD: static maps. After approving a submission, `injectTaxonomyItem` updates the in-memory maps immediately (index.ts:901-910).
- NEW:
  - `invalidate_taxonomy_caches` (taxonomy/services/cache.py:24-29) clears `_maps`, `_slug_to_ids`, `_id_to_slug`, `_service_indexes`, but **not** `core/taxonomy._pro_subcategories` (:265) or `_location_id_to_name` (:302). Pro-subcategory label/plural edits and location edits never reach search matching until the process restarts.
  - `apps/taxonomy/services/taxonomy_data.py:33` `_maps()` reads only the static `_taxonomy_maps.json` and is never DB-backed or cleared. Submission duplicate detection (`submissions.py:73-90`) and admin `categoryLabel` (`admin_submissions.py:331`) therefore ignore approved/new DB skills and tags. A user can submit a label that was already approved and created, and it becomes a second pending/approved duplicate.
  - Invalidation only runs in the process that performed the write. Celery workers, or any extra daphne replica, keep stale `lru_cache`s with no TTL.
  - `core:home` (5 min) and `services:suggest:*` (5 min) Redis entries are not purged on taxonomy writes. OLD tagged both with `search.taxonomies`. This is bounded by the TTL, so it is LOW on its own.
- Impact: contradicts the "admin edits live within ~60s" contract, and duplicate skills/tags can slip in.
- Possibly intentional?: no.

### D6. Submission approve/reject cache purge is a no-op — MEDIUM
- OLD: approve/reject revalidate `/admin/taxonomies`, `/dashboard` and the tags `collections.services|profiles`, `archive.*`, `directory.all`, `home`, `search.all` (admin/taxonomy-submission.ts:323-341, :398-408).
- NEW: `_revalidate_caches` (admin_submissions.py:284-301) calls `cache.delete_many(["profiles:directory:*", …])`. Django/django-redis treat these as literal keys, so nothing is deleted (`AdminRevalidateTaxonomyCachesView`, dataset.py:145-147, documents exactly this bug and uses `delete_pattern`). `profile:page:*` / `service:page:*` are not touched by the signal path either. The frontend `actions/admin/taxonomy-submission.ts` calls no `revalidateTag`/revalidation helper.
- Impact: after approve/reject, profile and service pages keep showing the `pending_…` skill/tag (orange pending style), or a rejected tag, until Redis TTL (service page 30 min) plus Next Data Cache TTL expire.
- Possibly intentional?: no.

### D7. Mega-menu shows orphan/raw-id entries and can duplicate categories — MEDIUM
- OLD: `getNavigationMenuData` builds from `getServiceTaxonomies()`. Groups pass through `resolveServiceHierarchy` (context-aware, get-services.ts:758-771). Unknown categories are skipped. A subcategory must be a child of its category, and subdivisions are only those under `subcategory.children` (get-categories.ts:386-447).
- NEW: `get_navigation_menu_data` (service_reads.py:499-520) groups raw column values, including `"_uncategorized"` and `"_"` placeholders for empty category/subcategory. The frontend (get-categories.ts:305-355) maps every row. Unresolved values render with `label = raw value` (e.g. "_", or a cuid) and hrefs like `/ipiresies/_`. Subdivisions outside the subcategory are listed and counted in `totalSubdivisions`. If a category is stored under both its id and its slug, two menu columns appear (no aggregation, unlike getCategoriesPageData). Unknown categories sink to the end instead of being dropped.
- Impact: junk items in the header mega-menu whenever data has empty or orphan taxonomy values.
- Possibly intentional?: no.

### D8. Mega-menu / home ordering tie-breaks differ from dataset order — MEDIUM
- OLD: every ranking is a stable sort over dataset order, so ties keep dataset order. This covers menu subcategories by count (get-categories.ts:436), menu subdivisions (:416-423), home popular subcategories (get-home-data.ts:334-350), and home category card subs (:358-370).
- NEW: ties follow backend row order. `get_navigation_menu_data` has no `order_by` at all (arbitrary Postgres order). `get_popular_service_subcategories` and `_categories_with_counts` use `order_by("-count")` only, so ties are arbitrary. The frontend sorts those arrays (get-categories.ts:327,343; get-home-data.ts:73-75) with stable sorts, but over a nondeterministic input.
- Impact: with small counts (frequent ties) the menu's top-6 subcategories, top-3 subdivisions, hero chips and home card chips can differ from production and change between renders.
- Possibly intentional?: no.
- Fix hint: tie-break by taxonomy node `order`.

### D9. Home "Δημοφιλείς Αναζητήσεις": top-8 sliced before orphan filtering; resolution can fall into the PRO taxonomy — LOW/MEDIUM
- OLD: only subcategories present in the service tree are ranked, then top 8 (get-home-data.ts:332-350).
- NEW: Django slices 8 raw `(subcategory, category)` groups (service_reads.py:480-487). The frontend then drops unresolvable entries (get-home-data.ts:229-234), so fewer than 6 chips can show. Grouping by the pair means a subcategory stored with two category values (or as id and slug) is split, which lowers its rank and can produce duplicate chips (same `key`). `resolve()` (get-home-data.ts:44-48) falls back to `findProById/BySlug`, so an unresolved service value matching a pro slug renders a chip linking to `/ipiresies/<pro-slug>` (404).
- Possibly intentional?: no.

### D10. Home category cards: ordering and subcategory counts — LOW
- OLD: featured categories in dataset order, `.slice(0,8)`. Per-sub counts come from the global `groupBy subcategory` map (get-home-data.ts:353-377).
- NEW: Django `_categories_with_counts` groups `(category, subcategory)` raw pairs. The frontend filters featured, slices 8 **from backend order** (first appearance by count, which may include orphan/duplicate category values), then sorts by Greek label `localeCompare('el')` (get-home-data.ts:237-260). For current data the alphabetical order equals dataset order, but admin reordering (node `order`) would not be reflected. Duplicate raw category forms can produce two cards or push a real category out of the 8-slice.
- Possibly intentional?: partially (the comment says it matches production today).

### D11. Featured-services tabs hide categories without featured services — LOW
- OLD: tabs = "Όλες" + all 8 service categories (get-home-data.ts:277-284). Empty ones show "Δεν βρέθηκαν υπηρεσίες σε αυτήν την κατηγορία".
- NEW: tabs filtered to categories with ≥1 featured service (frontend get-home-data.ts:182-187).
- Possibly intentional?: yes probably (the comment says no dead tabs), but it is not in the intentional list. Confirm with the user.

### D12. Suggestion ranking: location boost now fires where OLD never did (OLD location lookup was broken for 330/917 ids) — MEDIUM (parity) / old bug
- OLD: `findMatchingLocationInCoverage` uses `maps.location.byId`. That map is built depth-first with last-write-wins over counties→areas→**postcodes** (scripts/build-taxonomy-maps.ts:191-206). 330 of 917 county/area ids resolve to another node, often a postcode: id `2` (Αττικής) → "12351", `12` (Θεσσαλονίκης) → "Αγία Τριάδα", `54` → "Σε όλη την Ελλάδα". So searching "αττικη" in OLD gave no `location` for Attica-coverage services, and they got no Priority-0 boost.
- NEW: `_location_id_to_name` (core/taxonomy.py:302-347) resolves county-first, then area, skipping postcodes. Location matches, and therefore the ranking (`rank_key` key 3) and the `location` field, differ for those ids.
- Impact: different top-5 service suggestions for location searches. (The `location` field is not rendered in the dropdown.)
- Possibly intentional?: probably an improvement, but against the parity rule. Decide explicitly.
- Also minor: NEW ranks by the stored `title_normalized` column, while OLD normalized `title` at query time (search-services.ts:236-246). These differ only if the column is stale or uses another normalizer.

### D13. Service archive breadcrumb base crumb "Υπηρεσίες" links to `/ipiresies` instead of `/categories` — MEDIUM (archives domain to confirm)
- OLD: `getBreadcrumbsForNewRoutes(..., {basePath:'/ipiresies', baseLabel:'Υπηρεσίες', baseHref:'/categories'})` (get-services.ts:1107-1116). `datasets.ts:1719-1730` supports `baseHref`. The directory equivalent uses `baseHref:'/directory'` (get-profiles.ts:747).
- NEW: `baseHref` was removed from `getTaxonomyBreadcrumbs`/`getBreadcrumbsForNewRoutes` (frontend lib/utils/datasets.ts:1548-1558, 1714-1724). get-services.ts:281-286 passes no baseHref, so the crumb links to `/ipiresies`.
- Possibly intentional?: no (commit 2bda8e92 "fix breadcrumb links" may have touched this; verify).

### D14. `/categories/[category]` drill-down cards inherit the category image/icon — LOW
- OLD: subcategory cards use `image: subcategory.image` only, with icon commented out (get-categories.ts:246-252).
- NEW: `icon: sub.icon ?? cat.icon, image: sub.image ?? cat.image` (frontend get-categories.ts:159-160). Subcategories without an image now show the parent category's image.
- Possibly intentional?: maybe a design choice. Confirm.

### D15. Frontend DB tree vs byId children drift (live-edit semantics) — LOW/MEDIUM
- NEW `build_maps` (maps_builder.py:30-79): `byId` nodes keep the frozen `raw.children` (no adds/renames below the top level), while `tree` is rebuilt from FKs. Helpers that read `findServiceById(x).children` (`resolveServiceHierarchy`, `resolveProHierarchy`, `getServiceSubdivisions` via byCategory from raw) will not see admin-added children or label edits of children. A node whose DB children were all deleted keeps stale `raw.children` in the tree too (`_subtree` only overrides when kids exist). `TaxonomyNode.active` is ignored by `build_maps`.
- OLD: a single consistent dataset.
- Possibly intentional?: no (the new feature is half-applied).

### D16. Home profiles additionally exclude `image = ""` — LOW
- OLD: `NOT: { image: null }` only (get-home-data.ts:207).
- NEW: also `.exclude(image="")` (home.py:65).
- Possibly intentional?: likely (avoids blank avatars). Report only.

### D17. Footer: new "Πολιτική Cookies" link + cookie-settings button — LOW
- NEW constants/datasets/footer.ts:12 adds `{label:'Πολιτική Cookies', slug:'cookies'}`. footer-global.tsx:151 adds `<CookieSettingsButton/>`. Otherwise links, labels and category slugs are identical.
- Possibly intentional?: yes (consent feature). Not in the intentional list, so listed.

### D18. (for admin domain) taxonomy CRUD semantics changed — LOW
- OLD service/pro node ids = 6-char nanoid, skills/tags numeric. Update with a taken slug auto-generates a unique variant (`generateUniqueSlug`, taxonomies-shared.ts:206-213, 281).
- NEW node ids = slug-based (`_unique_node_id`, dataset_ops.py:56). Update with a taken slug raises 409 'Slug already used' (dataset_ops.py:94-97, 136-139, 240-243). New/approved skills and tags get `order=0`, so they sort at the **top** of `getSkills()/getTags()` (build_maps orders by `order,id`). OLD appended them at the end of the dataset.

## 4. Confirmed same
- All home UI components (hero, popular searches slice 6, categories, features, services carousel, profiles, testimonials, bottom taxonomy tabs), header, mega-menu component, search dropdown, server-search-combobox, taxonomy tabs (static 8 categories), category-icon, `lib/types/{search,datasets}.ts` are byte-identical. home-categories differs only in `href ?? …`/key fallbacks.
- Search UI: debounce 300 ms, min 2 trimmed chars, "Αναζήτηση για «q»" action, submit → `/ipiresies?search=`, empty → `/ipiresies`, groups "Κατηγορίες"/"Υπηρεσίες", texts "Αναζήτηση...", "Δεν βρέθηκαν αποτελέσματα".
- Suggest backend logic (other than D1/D12): min-length guard, `normalize_term` = NFD + strip U+0300–036F + lower; taxonomy gating on "used by a published service" (subcategory used directly or via a used subdivision); subdivisions before subcategories; startsWith-first stable sort; limit 5. Services: words ≥2 chars, AND of per-word ORs over title/description/coverage/displayName/username/tags/subcategory/subdivision/pro-subcategory (label + plural); order `-rating,-review_count`; take 100; matchType precedence coverage>title>description>tags; the 6-tier comparator is equivalent; top 5; `category` label fallback 'Υπηρεσία'; url `/s/{slug|id}`; 5-min cache.
- Home featured profiles: gating, `-updated_at`, 16, fallback with `rating>=0`. Featured services: `featured`, media not null, `-updated_at`, 8 per category. Tab order matches dataset order for current data.
- Home bottom grids: services grid = subdivisions with services top 100 by count, href `/ipiresies/{sub}/{div}`. Pros grid = directory `popularSubcategories` limit 100.
- `/categories`: top-level cards and chips ranked by OLD "path count" (distinct (sub,div) paths) with dataset-order tie-break. Category cards need ≥1 subcategory with services. Carousel = all subdivisions by service count, top 15. Drill-down shows subcategory cards with subdivisions in dataset order. Breadcrumb 'Αρχική › Κατηγορίες'. Banner texts identical.
- Mega-menu: category order = dataset order, subcategories top 6 by summed count, subdivisions top 3, `totalSubdivisions`/`hasMore*` flags, hrefs `/categories/{cat}`, `/ipiresies/{sub}`, `/ipiresies/{sub}/{div}`.
- Taxonomy datasets: service-taxonomies, pro-taxonomies, tags, skills, locations, category-icons byte-identical. The DB tree keeps dataset order (`order` = source byId index, seed_taxonomy.py:100-127). Labels/plurals/icons/featured overlay from typed columns. bySlug collision tie-break kept via `slug_primary`. The ETag/304 poll is correct.
- Submission flow core: pro-only, label 2–60 trimmed, skill requires category ('Η κατηγορία είναι υποχρεωτική για δεξιότητες'), 5 created/24h, dataset duplicate (normalized equality), global pending duplicate (iexact), `pending_<cuid>` id, my-pending list newest first.
- Admin submissions: list filters/sort whitelist/default limit 10/`items` key/categoryLabel/submitterProfile; stats; approve id = max numeric + 1 including approved assignedIds; array_replace/array_remove SQL; 'Record not found' / 'Record is not pending'; bulk messages "Approved X of Y items". NEW additionally writes the Skill/Tag to the DB on approve (intentional: DB is the source of truth).

## 5. Open questions / couldn't verify
- No DB access: could not check whether live services store taxonomy ids, slugs, or a mix, or whether rows with empty/orphan category/subcategory exist. D7, D9 and D10 severity depends on that. A query on `services` grouping `category, subcategory` against `taxonomy_nodes` ids would settle it.
- OLD `media: { not: Prisma.JsonNull }` vs NEW `.exclude(media__isnull=True)`: if media is stored as JSON `null` rather than SQL NULL (or `[]`), the featured-service sets differ. Needs a DB check.
- Intentional-differences list says the home categories change is "5 subcategories, old 3", but the OLD code on main already uses `.slice(0, 5)` (get-home-data.ts:370; page.tsx fallback :59). There is no diff either way. Flagged only for accuracy of the list.
- Whether `serialize_profile_summary` leaking contact fields (D4) is also present on `/api/profiles/by-username/*` is a profiles-domain question.
