# Public profile pages + professional directory archives parity audit — 2026-11-05

Scope: public profile page `/profile/[username]`, directory landing `/directory`,
directory archives `/dir`, `/dir/[category]`, `/dir/[category]/[subcategory]`,
their data actions, the Django selectors behind them, and the dataset/breadcrumb
helpers they use. Zero code changes were made.

## 1. Coverage

### OLD files read (every one, with a 1-line role)
Actions
- `oldnext/src/actions/profiles/get-profiles.ts`: `getProfilesByFilters` (list + total + shuffle), `getProfilesCount` (minimal count), `getProfileArchivePageData` (archive bundle: taxonomy resolution, breadcrumbs, dropdown data, carousel pills), `getProTaxonomyPaths`.
- `oldnext/src/actions/profiles/get-directory.ts`: `getDirectoryPageData` (popular subcategories + category grid).
- `oldnext/src/actions/profiles/get-profile.ts`: `getProfileByUserId`, `getPublicProfileByUsername`, `getProfilePageData` (profile page bundle).

Pages / routes
- `oldnext/src/app/(profile)/layout.tsx`: HeaderRelative layout.
- `oldnext/src/app/(profile)/profile/[username]/page.tsx`: public profile page (section order, metadata, schema).
- `oldnext/src/app/(profile)/profile/[username]/loading.tsx`: skeleton.
- `oldnext/src/app/(profile)/profile/[username]/not-found.tsx`: 404 copy.
- `oldnext/src/app/(profile)/profile/sitemap.ts`: profiles sitemap (behaviour delegated, see below).
- `oldnext/src/app/(archives)/layout.tsx`: HeaderRelative layout.
- `oldnext/src/app/(archives)/(pro)/directory/page.tsx`: directory landing.
- `oldnext/src/app/(archives)/(pro)/dir/page.tsx`, `dir/[category]/page.tsx`, `dir/[category]/[subcategory]/page.tsx`: the archives.
- `oldnext/src/app/(archives)/(pro)/dir/not-found.tsx`, `dir/[category]/not-found.tsx`, `dir/[category]/[subcategory]/not-found.tsx`: 404 copy.
- `oldnext/src/app/(archives)/(pro)/dir/sitemap.ts`: dir sitemap.

Components, profile (`oldnext/src/components/profile/`)
- `profile-meta.tsx`: header card (avatar, name, verified, rating, subcategory badge, tagline, address, socials).
- `profile-metrics.tsx`: service-subdivision badges + "Περιοχές Εξυπηρέτησης".
- `profile-bio.tsx`: "Σχετικά" + "Δεξιότητες".
- `profile-features.tsx`: contact/payment/settlement/size/budget boxes.
- `profile-info.tsx`: sidebar contact card (rate, coverage, experience, website, phone, email, chat).
- `contact-reveal.tsx`: phone/email reveal + analytics.
- `profile-services.tsx`: services list (3 at a time).
- `profile-portfolio.tsx`: "Δείγμα Εργασιών".
- `profile-terms.tsx`: "Όροι Συνεργασίας".
- `profile-subdivisions-wrapper.tsx`: click scrolls to #services.
- `report-profile-dialog.tsx`: report dialog UI.
- `profile-rating.tsx`, `profile-skills.tsx`, `profile-breadcrumb.tsx`, `user-image.tsx`: not used by any page (dead code; `ProfileRating`/`UserImage` are missing in the new tree, which has no effect).
- `index.ts`: barrel.
- `skeletons/*` (9 files: bio, features, info, meta, metrics, portfolio, services, skills, terms, index): loading skeletons.
- `menu-user.tsx`, `menu-user-link.tsx`: header user menu (delegated).

Components, archives (`oldnext/src/components/archives/`)
- `archive-layout.tsx`: tabs, breadcrumb, banner, filters, result summary, carousel, pagination.
- `archive-profile-card.tsx`: pro result card.
- `archive-sidebar.tsx`: filter Sheet.
- `archive-sidebar-filters.tsx`: category/subcategory dropdowns, online, county, type radio, clear.
- `archive-filters.tsx`: top filter bar (search, county, online, sort).
- `archive-inputs.tsx`: Search/Online/Counties/Sort/Category/Subcategory/Subdivision/Type inputs.
- `archive-pagination.tsx`: pagination + per-page (10/20/50/100).
- `archive-banner.tsx`, `subdivisions-carousel.tsx`, `categories-grid.tsx`, `coverage-display.tsx`: banner, pills carousel, directory grid, card coverage line.
- `infinite-scroll.tsx`: unused.
- `index.ts`: barrel.
- `archive-service-card.tsx`: delegated (services archives).

Hooks / helpers / SEO
- `oldnext/src/lib/hooks/archives/use-archive-filters.ts`, `use-archive-pagination.ts`, `use-debounced-value.ts`.
- `oldnext/src/lib/utils/datasets.ts`, the parts these pages use: `filterTaxonomyByType`, `resolveTaxonomyHierarchy`, `findTaxonomyBySlugInContext`, `findAllSubcategoriesBySlug`, `getTaxonomyBreadcrumbs`, `getCoverageAddressWithLocation`, `hasOnsiteCoverage`, `hasOnbaseCoverage`, `getCoverageGroupedByCounty`, `getCountiesForArchiveFilters`, `NATIONWIDE_ID`.
- `oldnext/src/lib/taxonomies/index.ts`: `resolveToCountyId`, `findLocationBySlugOrName`, `findProBySlug`.
- `oldnext/src/lib/utils/search/build-search-filter.ts`, `build-search-conditions.ts` (profile part).
- `oldnext/src/lib/utils/misc/shuffle.ts` (`shuffleFeatured`), `misc/experience.ts` (`getYearsOfExperience`).
- `oldnext/src/lib/types/common.ts` (`ArchiveSortBy`, `isValidArchiveSortBy`), `constants/datasets/options.ts` (`archiveSortOptions`).
- `oldnext/src/lib/database/selects/profile.ts` (`PROFILE_ARCHIVE_SELECT`, `PROFILE_DETAIL_INCLUDE`).
- `oldnext/src/lib/seo/pages.ts` (profile/directory metadata), `seo/fetch-entity.ts` (profile/proCategory/proSubcategory), `seo/schema/{profile,profiles,directory}-schema.tsx`.
- Shared components the pages use, diffed against the new versions: `dynamic-breadcrumb`, `taxonomy-tabs`, `rating-display`, `user-avatar`, `profile-badges`, `save-button`, `coverage-display`, `social-links`, `icon-box`, `breadcrumb-buttons`, `hash-scroll`, `service-media-card`, `media-gallery`, `not-found-page`.

### NEW files read
- `frontend/src/actions/profiles/get-profile.ts`, `get-profiles.ts`, `get-directory.ts`
- `frontend/src/lib/api/profiles.ts`, `frontend/src/lib/taxonomies/enrich.ts`, `frontend/src/lib/taxonomies/maps.generated.json` (inspected for slug/id collisions)
- `frontend/src/app/(profile)/**` (page, loading, not-found, layout, sitemap)
- `frontend/src/app/(archives)/layout.tsx`, `(pro)/directory/page.tsx`, `(pro)/dir/**` (pages, not-found, sitemap)
- `frontend/src/components/profile/**`, `frontend/src/components/archives/**` (each one diffed against the old file)
- `frontend/src/lib/hooks/archives/*`, `frontend/src/lib/seo/{pages,fetch-entity}.ts`, `seo/schema/*`, `frontend/src/lib/utils/datasets.ts` (diff)
- `backend/apps/profiles/selectors/profile_aggregations.py`, `profile_reads.py`
- `backend/apps/profiles/urls/public.py`, `views/public/aggregations.py`, `views/public/profile.py` (by-username, taxonomy-paths)
- `backend/apps/profiles/serializers/profile_filters.py`
- `backend/apps/core/locations.py` (`NATIONWIDE_IDS`, `resolve_to_county_id`, `location_id_for_slug`), `backend/apps/core/taxonomy.py` (`taxonomy_node_ids`)
- `backend/apps/profiles/models/profile.py` (`updated_at`, `featured`)

### Delegated elsewhere
- `components/profile/menu-user.tsx`, `menu-user-link.tsx` → header/navigation/auth domain
- `actions/profiles/report-profile.ts` (the action behind the dialog) → reports/moderation domain. The dialog UI is byte-identical.
- `ReviewsContainer` and `list_profile_reviews` / `get_profile_review_stats` (reviews section data, stats) → reviews domain
- `components/archives/archive-service-card.tsx` and the services archives → services-archives domain
- `app/(profile)/profile/sitemap.ts` → `/api/seo/sitemap-entries` (SEO/sitemaps domain). The `/dir` sitemap is identical.
- Other `actions/profiles/*` (basic-info, additional-info, billing, coverage, portfolio, presentation, verification, lookup-afm) → dashboard profile-editing domain
- `transformCoverageWithLocationNames` changes (it now accepts names as well as ids) → taxonomy/locations domain
- `normalizeTerm` / `normalize_term` equivalence → search domain
- Billing `featured` toggles (`apps/billing/services/*`) → billing domain (see D14)
- `get-home-data.ts` → home domain

## 2. Mapping (old → new)

| OLD | NEW frontend action | Django endpoint → selector | New page |
|---|---|---|---|
| `getProfilePageData(username)` | `get-profile.ts getProfilePageData` (+ frontend enrichment) | `GET /api/profiles/page/<username>` → `profile_page_bundle` | `(profile)/profile/[username]/page.tsx` |
| `getPublicProfileByUsername` | `getPublicProfileByUsername` | `GET /api/profiles/by-username/<u>` → `get_public_profile_by_username` + `serialize_profile_summary` | used by SEO `fetchEntity('profile')` |
| `getProfileByUserId` | `getProfileByUserId` | `GET /api/profiles/me` | (dashboard) |
| `getProfileArchivePageData` | `get-profiles.ts getProfileArchivePageData` (5-min `unstable_cache` + enrichment + dropdown merge from `/directory`) | `POST /api/profiles/archive` → `archive_data` (+ `list_profiles_by_filters`) | `dir/page.tsx`, `dir/[category]`, `dir/[category]/[subcategory]` |
| `getProfilesByFilters` | `getProfilesByFilters` | `POST /api/profiles/search` → `list_profiles_by_filters` | (no page caller, same as old) |
| `getProfilesCount` | `getProfilesCount` | `POST /api/profiles/count` → `count_profiles_by_filters` | (no page caller, same as old) |
| `getProTaxonomyPaths` | `getProTaxonomyPaths` | `GET /api/profiles/taxonomy-paths` → `get_taxonomy_paths` | generateStaticParams, `/dir` sitemap |
| `getDirectoryPageData` | `get-directory.ts getDirectoryPageData` (+ label/order enrichment) | `GET /api/profiles/directory` → `directory_data` | `(pro)/directory/page.tsx` |
| `getProfileMetadata`, `getDirectory*Metadata` | same functions (`lib/seo/pages.ts`) | by-username endpoint / local taxonomy | page `generateMetadata` |
| `datasets.getTaxonomyBreadcrumbs` (archive crumbs) | built in Django `archive_data`, relabelled on the frontend | — | ArchiveLayout |

## 3. DIFFERENCES (the deliverable)

### D1. Popular-subcategory pills on `/dir` (no category) link to a broken `/dir/<subcategory>` URL. HIGH
- OLD: on `/dir`, pills come from `getDirectoryPageData()` (no filters) or from the filtered groupBy (with filters). Either way `href = /dir/${cat.slug}/${subcat.slug}` (get-directory.ts:146, get-profiles.ts:872).
- NEW: `archive_data` builds the pills with `"categorySlug": category_slug`, which is `None` on `/dir`, and `href = f"/dir/{row['subcategory']}"` (profile_aggregations.py:442-453). The frontend keeps `categorySlug=null` and rebuilds `href: cat ? /dir/${cat}/${slug} : /dir/${slug}` (get-profiles.ts:117-130).
- Impact: every pill on `/dir` goes to `/dir/<subcategory-slug>`. Because the not-found check is global (D5), that route renders as a *category* page, and the backend filter `category_node_id__in=_pro_node_ids("category", <subslug>)` is empty, so the user sees 0 results: "Δεν βρέθηκαν επαγγελματίες στην κατηγορία "<sub>"".
- Fix hint: group by `("subcategory","category")` (or resolve the parent from the pro taxonomy) and emit `/dir/<cat>/<sub>`.
- Possibly intentional?: no.

### D2. Subcategory dropdown in the filter drawer shows at most 10 subcategories. HIGH
- OLD: `taxonomyData.subcategories` lists **all** children of the current category that have ≥1 matching profile (type-matched), in taxonomy order (get-profiles.ts:774-799).
- NEW: the backend ships `subcategories: []`. The frontend fills the list from `/profiles/directory` → `categories[].subcategories` (get-profiles.ts:205-216), and `directory_data` truncates that to `[:10]` by count (profile_aggregations.py:361).
- Impact: in categories with more than 10 populated subcategories, the rest can't be picked from the dropdown. On a subcategory page outside the top 10, the dropdown shows "Όλες οι υποκατηγορίες" instead of the current one. `typeFilterOptions` (the disabling of the Μόνο Επαγγελματίες/Επιχειρήσεις radios) also stops working, because `currentSubcategory` is looked up in that list (archive-sidebar-filters.tsx). The order also changes from taxonomy order to count desc.
- Possibly intentional?: no. A side effect of reusing the directory payload.

### D3. The `/api/profiles/page/<username>` payload exposes the account email (and other contact fields) whatever the visibility setting. HIGH (privacy)
- OLD: the email reached the page only as a server-component prop, and was rendered only when `visibility.email === true` (profile-info.tsx:165). It was never in a public JSON API.
- NEW: `profile_page_bundle` always returns `profile.email` and `profile.user.email` (profile_aggregations.py:575-579). The view is `AllowAny` and the payload is cached. `GET /api/profiles/by-username/<u>` (`serialize_profile_summary`) also returns phone/viber/whatsapp/firstName/lastName publicly.
- Impact: anyone can read a pro's login email from the API, even when they chose "hide email".
- Fix hint: drop the email fields server-side unless `visibility.email` is true.
- Possibly intentional?: no. Flag to the security domain as well.

### D4. Archive breadcrumbs: wrong base href and singular labels. MEDIUM
- OLD (`getTaxonomyBreadcrumbs` with `basePath:'/dir', baseHref:'/directory', usePlural:true`, get-profiles.ts:744-768, datasets.ts:1543-1622):
  - `/dir`: `[Αρχική →/, Επαγγελματικός Κατάλογος (no link)]`
  - `/dir/cat`: `[Αρχική →/, Επαγγελματικός Κατάλογος →/directory, <cat.plural||label> (no link)]`
  - `/dir/cat/sub`: `[…, <cat plural> →/dir/cat, <sub.plural||label> (no link)]`
- NEW: `archive_data` gives the base crumb `href "/dir"` on **every** level, including `/dir` itself (profile_aggregations.py:456). The frontend relabels the crumbs with `lookup(seg.label)?.label`, which is the **singular** label, not the plural (get-profiles.ts:137).
- Impact: "Επαγγελματικός Κατάλογος" goes to the flat `/dir` archive instead of the `/directory` landing, and is a self-link on `/dir`. Subcategory crumbs show singulars (e.g. "Δάσκαλος"/"Δασκάλα" instead of "Δάσκαλοι"); 356 of 368 pro nodes have a distinct plural.
- Possibly intentional?: no. Category/subcategory hrefs and no-link-on-current behaviour already match.

### D5. Unknown, mismatched or wrong-type taxonomy slugs no longer 404. MEDIUM
- OLD: the category must exist in the type-filtered pro taxonomy, and the subcategory must be a child of **that** category (`findAllSubcategoriesBySlug` then fallback). Otherwise `'Category not found'`/`'Subcategory not found'` → `notFound()` (get-profiles.ts:516-570). With `?type=pros`, a company-only subcategory (or a category with no type-matching children) also 404s (`filterTaxonomyByType`).
- NEW: `lookup()` is a **global** search across pro **and service** bySlug/byId (get-profiles.ts:80-95).
- Impact: these all render empty archive pages instead of 404: `/dir/<pro-subcategory-slug>`, `/dir/<service-slug>`, `/dir/<cat>/<subcategory-of-another-category>`, and `/dir/<cat>/<company-sub>?type=pros`. That means soft-404s for SEO, and it is what turns D1 into an empty page instead of an error.
- Possibly intentional?: no.

### D6. Featured shuffle is applied only on the default sort. MEDIUM
- OLD: `getProfilesByFilters` always runs `shuffleFeatured(profiles)` (get-profiles.ts:276). For **every** sortBy (recent/oldest/price/rating), the featured profiles of the page move to the top in random order.
- NEW: shuffles only when `sortBy in (None,'','default')` (profile_aggregations.py:238-242). Other sorts keep strict DB order.
- Impact: result order on non-default sorts differs from old whenever a page contains featured profiles.
- Possibly intentional?: maybe. Old behaviour looks like a bug, but parity says to match it. Confirm with the owner.

### D7. County filter: area slugs and Greek names resolve differently, and unresolvable values filter to 0. MEDIUM
- OLD `resolveToCountyId` (taxonomies/index.ts:359-376): slug **or Greek name** (`findLocationBySlugOrName`) → if it's an area, walk up to the **parent county id**. It then matches `coverage.county == id`, `coverage.counties ∋ id`, or `counties ∋ '54'`. If it can't resolve: county-only → **no location filter** (all profiles); online+county → falls back to the online-only filter (get-profiles.ts:121-206).
- NEW `_county_coverage_q` (profile_aggregations.py:71-87) with `resolve_to_county_id` = `location_id_for_slug` (core/locations.py:112-137):
  - slug only, no name lookup, and an area resolves to the **area id** (not its county);
  - matches county/counties/area/areas, plus `_all` and `54` in counties **or** county;
  - an unresolved value falls back to `str(county)`, which filters on the raw string.
- Impact:
  - `?county=<area-slug>` or `?περιοχή=<Greek name>` (legacy links) give different or empty results.
  - `?county=<garbage>` shows 0 results instead of everything.
  - For a slug shared by a county and an area (old comment: "thessaloniki"), whichever id wins in `slug_to_id` decides whether the county filter works.
  - Nationwide matching is a superset of old (`coverage.county=='54'` and `'_all'`).
- Possibly intentional?: partly. The docstring admits the area→county gap. The other points look unintentional.

### D8. Pill carousel membership and labels differ. MEDIUM
- OLD (get-profiles.ts:629-907):
  - Labels are `subcat.plural || subcat.label`.
  - With active filters on a **subcategory page**, the groupBy includes the subcategory filter, so the only group is the current subcategory. It is then excluded, so **no carousel**.
  - If the filtered groupBy returns no groups at all, it falls back to unfiltered directory popular.
  - Without filters it uses `getDirectoryPageData` popular (no user blocked/confirmed filter; type via `subcat.type`; ties in taxonomy order).
  - The filtered-count search is the *simplified* `displayName/tagline/bio contains` (≥2 chars), not the full search.
- NEW `archive_data` (profile_aggregations.py:419-453) + frontend relabel (get-profiles.ts:117-131):
  - Labels are `r.label`, the **singular** form.
  - On a subcategory page with filters, it still shows the other subcategories of the category.
  - There is no fallback when the filtered set is empty.
  - It applies the user blocked/confirmed and `user.role` filters, and the full search conditions.
- Impact: pills read "Κηπουρός" instead of "Κηπουροί". The carousel shows up where old showed none, and vice versa.
- Possibly intentional?: no.

### D9. Category dropdown order (and type scoping). LOW-MEDIUM
- OLD: `categories = filteredTaxonomies.filter(hasProfiles).slice(0,10)` (get-profiles.ts:812-814). That is taxonomy order, scoped by `?type` (role-filtered taxonomy paths and `filterTaxonomyByType`), and it includes categories whose profiles have a null subcategory.
- NEW: taken from `/profiles/directory` `categories` in backend dict order, which is ordered by each category's most popular subcategory count (profile_aggregations.py:338-365, get-profiles.ts:202-204). There is no `?type` scoping and no user blocked/confirmed filter, and categories whose profiles all have a null subcategory are missing. (The 10 cap doesn't matter, since there are only about 8 pro categories.)
- Possibly intentional?: no.

### D10. `/directory` landing data built from raw DB values instead of walking the taxonomy. LOW-MEDIUM
- OLD (get-directory.ts:105-199): groups by subcategory id only. It walks `proTaxonomies` → children, so a subcategory appears under its **taxonomy parent**, and orphan/unknown ids are dropped.
- NEW (`directory_data`, profile_aggregations.py:312-365): groups by `(subcategory, category)` columns. A subcategory is listed under the profile's stored `category`. Profiles with no category form a `_uncategorized` card (href `/dir/_uncategorized`). Unknown ids appear with their raw id as the label (the frontend falls back to the raw value). Counts of one subcategory split across categories show up as separate rows in "popular". The `categorySlug`/`subcategorySlug` query params are accepted but **ignored** in the query; they only change the cache key.
- Impact: visible only with inconsistent data. The grid order and the plural labels were restored on the frontend (get-directory.ts:55-99).
- Possibly intentional?: no.

### D11. Profile page: service-subdivision badges come in random order. LOW-MEDIUM
- OLD: `Array.from(new Set(services.map(s=>s.subdivision)))`, which keeps first-appearance order of services sorted by `sortDate desc` (get-profile.ts:361-367).
- NEW: a Python `set` comprehension (profile_aggregations.py:596-602). Hash order of strings is randomised per process, so the "Υπηρεσίες" badges in ProfileMetrics reorder between workers and restarts.
- Possibly intentional?: no.

### D12. Profile page: unresolved taxonomy values are rendered as raw ids instead of being dropped. LOW-MEDIUM
- OLD: skills via `batchFindSkillsByIds(...).filter(non-null)`. The speciality via `findSkillById`. Category/subcategory via `findProById` (null when unknown). Subdivisions filtered non-null.
- NEW `get-profile.ts`: `enrichSlugList` returns `{label: slug}` for unknown skills and subdivisions, and `enrichOne` does the same for category/subcategory (lines 150-170). Breadcrumb labels fall back to the raw id. The speciality also falls back to the pro/tag datasets; archive-card skills fall back to tags (enrich.ts:96-97).
- Impact: a stale or unknown id shows as a badge like "YtDWfH" in Δεξιότητες/Υπηρεσίες/the subcategory chip/breadcrumb, where old showed nothing.
- Possibly intentional?: no.

### D13. Archive request validation is stricter (limit), and the invalid sortBy is echoed back. LOW
- OLD: `limit = parseInt(?limit||'20')`, then `filters.limit || 20`, so NaN or 0 becomes 20, and there is no upper bound. An invalid `sortBy` becomes `'default'` in the returned `filters`.
- NEW: `ArchiveRequestSerializer.limit` has min 1 and max 100. NaN is serialised as `null`, which fails validation → 400. The page then throws a 500 on `/dir` and a 404 on the category/subcategory pages. `filters.sortBy` is returned raw, so the Sort select shows no selection for invalid values. (A non-numeric `?page` is handled better than old, since `_safe_page` returns 1.)
- Possibly intentional?: no.

### D14. `updatedAt` ordering may diverge for featured toggles. LOW (verify)
- OLD: Prisma `@updatedAt` bumped `updatedAt` on every `profile.update`, including `featured` toggles.
- NEW: billing uses `Profile.objects.filter(...).update(featured=...)` (billing/services/subscription_ops.py:288,743,760; renewals.py:293). `auto_now` does not fire on queryset `.update()`.
- Impact: "Πιο Πρόσφατα"/"Πιο παλιά" and the default sort's secondary key can order featured/unfeatured pros differently from old. (Rating recalcs do bump `updated_at`.)
- Possibly intentional?: unknown. Billing domain should confirm whether old touched the profile row on these paths.

### D15. JSON-LD ItemList name with `?type=companies`. LOW
- OLD passes `filters.type` raw ('companies') to `ProfilesSchema`, so `type==='company'` is never true and the name is always "Επαγγελματίες".
- NEW maps it to 'company', so the name becomes "Επιχειρήσεις" (dir pages, `profileType`).
- Possibly intentional?: yes, looks like a deliberate bug fix. Listed only so it is a conscious choice.

### D16. Breadcrumb "save/share" subject title fallback. LOW
- OLD `subjectTitle: profile.displayName || ''`. NEW `display_name or username` (profile_aggregations.py:617).
- Possibly intentional?: likely harmless.

### D17. `getProfilesCount` cache key includes role. LOW
- OLD keys on category + subcategory[0] only (role omitted, so pro/company counts could collide), and an array subcategory errors in Prisma. NEW keys on category|subcategory|role and supports arrays.
- No page calls it in either app.
- Possibly intentional?: yes (bug fix). Noted for completeness.

### D18. Archive currentSubcategory node for gender-duplicate slugs. LOW
- OLD picks the first child with that slug **within the category** (`findAllSubcategoriesBySlug[0]`). NEW picks `pro.bySlug[slug]`, a global single entry.
- For duplicate slugs (daskaloi, kathigites, parousiastes, xoreutes, tattoo-piercing-studios, …, 13 in total), the empty-state text `"…στην υποκατηγορία "<label>""` and the banner description may come from a different variant (e.g. "Δασκάλα" vs "Δάσκαλος"). The banner title uses the plural, which is shared, so it is unaffected.

## 4. Confirmed same (verified)
- Listing filter: `published` (default true), `isActive`, `user.blocked=false`, `user.confirmed=true`, role via `user.role` (directory `?type=pros|companies` → freelancer/company).
- Sort map: `default`=featured desc, updatedAt desc. `recent`/`oldest`=updatedAt. `price_*`=rate. `rating_high`=rating desc, reviewCount desc. `rating_low`=asc,asc. The 7 Greek labels (Προεπιλογή, Πιο Πρόσφατα, Πιο παλιά, Αύξουσα/Φθίνουσα αμοιβή, Υψηλότερη/Χαμηλότερη βαθμολογία) and the default `'default'` are identical.
- Online semantics: `?online` or `?online=true` → coverage.online=true; online + county → online OR county.
- Search: ≥2 chars, multi-word AND of ORs over displayName/tagline/bio normalized + username + pro-subcategory label match, with an accented-field fallback for a single word. It is applied to the list and to the total.
- Total and pagination: `total` honours all filters. Default page size 20, options 10/20/50/100, "Εμφανίζονται X-Y από N αποτελέσματα", "Καθαρισμός φίλτρων (n)" (search not counted), pagination ellipsis logic, URL serialisation (`online` bare flag, `county=`, sortBy omitted when default, page omitted when 1). The hooks are byte-identical.
- `getProfilesCount` is minimal (no coverage/online/search filters), matching old.
- Archive card contents (avatar, blurred backdrop, verified/top badges, rating only if reviewCount>0, subcategory chip, speciality + 2 skills + "+N", coverage line), whole-card link `/profile/<username>`, save button. Byte-identical component.
- Empty states: "Δεν βρέθηκαν επαγγελματίες" / "…στην κατηγορία "X"" / "…στην υποκατηγορία "X"" + hints. The 404 pages and their copy are identical.
- ArchiveLayout: banner title (Όλες οι Κατηγορίες / cat plural / sub plural), subtitle fallback text, no image for directory, TaxonomyTabs active category.
- Counties dropdown: same ordering (Αττική, Θεσσαλονίκη first, Cyprus last, no Πανελλαδικά) from the same local dataset.
- Sidebar: labels (Κατηγορία, Υποκατηγορία, Περιοχές Εξυπηρέτησης, Τύπος: Όλοι/Μόνο Επαγγελματίες/Μόνο Επιχειρήσεις), dedupe by slug, query preservation on taxonomy navigation. The drawer persistence and optimistic selects are the listed intentional change.
- Profile page: same section order (Meta → Metrics → Bio+skills → Features → mobile Info → Portfolio → Services → Terms → Reviews → Report button; sticky desktop Info). All profile components are byte-identical except the analytics call in contact-reveal (GTM `trackEvent`, consent architecture).
- Profile page data:
  - lookup by exact username + published + isActive + user not blocked/confirmed + role ∈ {freelancer, company}, else 404;
  - all published services ordered by sortDate desc; reviews page 1, limit 10;
  - `calculatedExperience` = stored experience, else currentYear − commencement, else 0; "Έτη Εμπειρίας" shown only when commencement exists;
  - profile breadcrumb `Επαγγελματικός Κατάλογος →/directory`, then category plural → `/dir/cat`, then subcategory plural → `/dir/cat/sub`;
  - email = profile.email || user.email, shown only when visibility.email===true;
  - isOwner check, rating display, ProfileSchema.
- Service/pro taxonomy id collisions: 0. Slug collisions: 5, all category-level with identical labels, so the service-first lookup on the profile page has no visible effect.
- SEO: `getProfileMetadata` template (`%displayName% - %type% - %subcategorySingular%. %tagline%`, bio 160) and the directory/category/subcategory templates and URLs are unchanged. `fetchEntity` profile/proCategory/proSubcategory logic is the same (new by-username adds an isActive guard, which is harmless because the page 404s anyway).
- `/directory` landing: breadcrumb, banner copy, carousel title "Πιο δημοφιλείς επαγγελματικές κατηγορίες", popular limit 15 sorted by count, plural subcategory labels, top 10 subcategories per category, grid shows 6 + "Δες όλες τις υποκατηγορίες (N+)", categories in pro-taxonomy order (restored on the frontend). Counts ignore the user blocked/confirmed filter, as in old.
- `get_taxonomy_paths` (static params + `/dir` sitemap): same filters, id→slug, count order.

## 5. Open questions / couldn't verify
- FK backfill: the archive filters use `category_node_id`/`subcategory_node_id` FKs (an intentional difference). Profiles with null FKs would vanish from category archives. I couldn't check DB coverage; `parity_taxonomy_fks` is claimed to prove equivalence.
- D7 slug collisions: which id `location_id_for_slug` returns for shared county/area slugs depends on the seeded `Location.slugs` iteration order. Needs a DB check (e.g. `thessaloniki`).
- D14: whether old billing/admin featured toggles went through `prisma.profile.update` (bumping updatedAt) on the same code paths. Owned by the billing domain.
- The reviews section payload (`list_profile_reviews`, stats, moderation filters) was not compared here; owned by the reviews domain.
- The `normalize_term` vs `normalizeTerm` equivalence (accent/final-sigma handling) affects search results; owned by the search domain.
