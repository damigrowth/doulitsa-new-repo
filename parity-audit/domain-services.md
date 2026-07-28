# Domain: Services

Audit-only migration parity check. OLD = Next.js + Prisma server actions (`app_before_migrations/src/actions/services/**`). NEW backend = Django/DRF (`backend/apps/services/**`). NEW frontend = `frontend/src/actions/services/**` + `frontend/src/lib/api/services.ts`.

GOLDEN RULE: NEW must reproduce EVERYTHING OLD did. Any behavior/data/validation/filter/sort/pagination/response-shape difference is a BUG.

---

## Parity matrix

| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Create service (submit→pending) | endpoint | create-service.ts:42 (`createServiceAction`) | views/public/service.py:28 `CreateServiceView.post`; service_writes.py:90 `create_service` | ⚠️ | Endpoint exists. Missing: subscription `canCreateService` gate, admin notify email, first-service Brevo list move, cache revalidation (acceptable), richer Zod validation. Sets `status=pending`. |
| Save as draft | endpoint | create-service.ts:52 (`saveServiceAsDraftAction`) | views/public/service.py:44 `CreateServiceDraftView`; service_writes.py:114 `save_service_as_draft` | ⚠️ | Exists with 30s rate limit (via `last_service_draft`). Missing `canCreateService` plan gate. Draft creates slug? NO — see gap. |
| Update service info (+draft→pending transition, +refresh-on-edit) | endpoint | update-service.ts:190 `updateServiceInfo` | views/public/service.py:67 `ServiceDetailView.patch`; service_writes.py:141 `update_service_info` | ⚠️ | Owner check + draft→pending transition present. MISSING: "refresh-on-edit" (car.gr boost) logic, slug regeneration on title change, admin email, first-service Brevo. |
| Update service media | endpoint | update-service.ts:81 `updateServiceMedia` | views/public/service.py:87 `UpdateServiceMediaView`; service_writes.py:171 | ✅ | Owner check, cloudinary sanitize, pending-resource filter. Parity OK (10-file max not enforced server-side — see Validation gaps). |
| Delete service (hard) | endpoint | delete-service.ts:20 `deleteService` | views/public/service.py:63 `ServiceDetailView.delete`; service_writes.py:187 | ⚠️ | Owner check + cascade delete present. Missing Brevo list re-sync. Role gate slightly different (see Authorization). |
| Archive service (soft→inactive) | endpoint | delete-service.ts:133 `archiveService` | views/public/service.py:77 `ArchiveServiceView`; service_writes.py:180 | ✅ | Sets `status=inactive`, owner check. Parity OK (missing Brevo re-sync only). |
| Refresh service (boost) | endpoint | refresh-service.ts:15 | views/public/service.py:102 `RefreshServiceView`; service_writes.py:193 | ✅ | 24h/service + 10/day rate limits + daily reset replicated. Returns `{refreshedAt, remainingRefreshes}`. Parity OK. |
| Report service | endpoint | report-service.ts:14 | views/public/service.py:111 `ReportServiceView` | ⚠️ | Endpoint + throttle exist but **admin email is a TODO (not sent)** — see Detailed gaps. Permission is `IsAuthenticated` only (OLD requires auth too). |
| Get service by slug | endpoint | get-service.ts:134 `getServiceBySlug` | views/public/service.py:155 `ServiceBySlugView`; service_reads.py:105 | ⚠️ | Returns `_card(service)` only. OLD returned full SERVICE_DETAIL_SELECT incl. addons/faq/duration + full profile. `_card` includes most but profile fields differ (see Response-shape). Profile-published gate missing. |
| Get service page bundle (detail page) | endpoint | get-service.ts:495 `getServicePageData` | views/public/service.py:166 `ServicePageView`; service_reads.py:116 `get_service_page_bundle` | ⚠️ | Big partial: returns `{service, relatedServices, reviews, reviewStats}`. MISSING: resolved taxonomy/coverage/breadcrumbs, additionalServices (promoted-sub), tagsData, budget/size/contact/payment/settlement data, profileSubcategory. Related uses subcategory not category; takes 6 not 5. |
| Get service for edit (owner) | endpoint | get-service.ts:513 `getServiceForEdit` | views/public/service.py:178 `ServiceForEditView`; service_reads.py:109 | ✅ | Owner-only via `profile__user_id`. Returns `{service:_card}`. Parity OK. |
| Featured services (home) | endpoint | get-services.ts:159 `getFeaturedServices` | views/public/service.py:189; service_reads.py:223 | ❌ | Response shape AND logic differ substantially — see Detailed gaps. OLD: take 8, reviewCount>0 priority, multi-fallback, mainCategories=taxonomy objects. NEW: take 50/20, by raw category slug, mainCategories=slug strings. |
| Services paginated (home "more") | endpoint | get-services.ts:291 `getServicesWithPagination` | views/public/service.py:196 `ServicesListView`; service_reads.py:245 | ⚠️ | GET `/services` + `/services/list`. Default limit OLD=4 / NEW=20. Sort differs: OLD `[featured desc, rating desc, reviewCount desc, updatedAt desc]`; NEW `-sort_date` only. |
| Services by filters (archive search) | endpoint | get-services.ts:378 `getServicesByFiltersInternal` | views/public/service.py:210 `ServicesSearchView` (POST); service_reads.py:257 `search_services` | ❌ | Major filter/sort gaps — see dedicated section. |
| Services count | endpoint | get-services.ts:668 `getServicesCount` | views/public/service.py:220 `ServicesCountView` (POST); service_reads.py:273 | ⚠️ | NEW counts via `_apply_filters` (full filter set). OLD count used ONLY category/subcategory/subdivision (ignores search/county/online). Behavior differs — NEW is arguably more correct but DIFFERENT → flag. Cached 30 min both. |
| Taxonomy paths (SSG) | endpoint | get-services.ts:721 `getServiceTaxonomyPaths` | views/public/service.py:230; service_reads.py:285 | ⚠️ | Both groupBy(cat,subcat,subdiv)+count. OLD converts IDs→slugs & sorts by count desc; NEW returns RAW values ordered by cat/subcat/subdiv (no count sort, no slug conversion). |
| Archive page data bundle | endpoint | get-services.ts:803 `getServiceArchivePageData` | views/public/service.py:237 `ServicesArchiveView` (POST); service_reads.py:302 | ⚠️ | Heavy logic gap — NEW returns thin slugs, empty `categories`/`counties`, no breadcrumb i18n, no filtered subdivision counts logic parity. Frontend re-enriches via taxonomy (get-services.ts:88). Functional but lossy. |
| My services (dashboard) | endpoint | get-user-services.ts:49 `getUserServices` | views/public/service.py:254 `MyServicesView`; service_reads.py:380 | ⚠️ | Filters/sorts mostly mapped. Differences: default limit OLD=12/NEW=20; search drops description+tags match (OLD had both); sort omits `status`/`category` options & `sortDate` default (OLD default=`updatedAt`→sortDate); `canCreateMore` hardcoded true. |
| My service stats | endpoint | get-user-services.ts:194 `getUserServiceStats` | views/public/service.py:265; service_reads.py:448 | ✅ | `{total,draft,pending,published,rejected}` exact match. |
| Recent services (5) | endpoint | get-recent-services.ts:13 | views/public/service.py:148; service_reads.py:215 | ⚠️ | Returns `{services:[{id,title}]}`. OLD orders by `sortDate desc`; NEW orders by `updated_at desc` → ordering mismatch. OLD returns bare array `[{id,title}]`, NEW wraps in `{services:[...]}` → shape mismatch. |
| Categories page data | endpoint | get-categories.ts:64 `getCategoriesPageData` | views/public/service.py:128; service_reads.py:150 | ⚠️ | Same intent. NEW returns raw slug+count rows, no taxonomy enrichment (label/href/image/description), no nested subcategory→subdivision tree. Frontend must enrich. |
| Navigation menu data | endpoint | get-categories.ts:370 `getNavigationMenuData` | views/public/service.py:141; service_reads.py:191 | ⚠️ | NEW builds counts but raw slugs, no top-3 subdivision limiting / top-6 subcat / hasMore flags / icon. |
| Search suggestions (autocomplete) | endpoint | (no dedicated OLD action found in services/**) | views/public/service.py:272; service_reads.py:462 | ❓ | NEW-only addition (row 74). No OLD services/** counterpart — likely lived elsewhere (search domain). Out of strict scope; verify in search-domain audit. |
| Admin: list/detail/update/taxonomy/basic/pricing/settings/addons/faq/media/toggle-published/toggle-featured/status/delete/stats/create-for-profile | endpoint | (admin actions live under src/actions/admin/** — not in services/**) | views/admin/service.py + urls/admin.py | ❓ | NEW admin surface is comprehensive (rows 189-204). OLD admin counterparts are outside this scope (src/actions/admin). Mark for admin-domain audit. |

---

## Filter / sort / pagination parity (CRITICAL)

### FILTERS — archive search (`getServicesByFiltersInternal` → `search_services`/`_apply_filters`)

| OLD filter | OLD impl (get-services.ts) | NEW impl (service_reads.py) | Status |
|---|---|---|---|
| `status` (default published) | :392 `status: filters.status \|\| 'published'` | `_public_qs` hardcodes `status=PUBLISHED` :27 | ❌ Cannot query other statuses via search (OLD allowed `filters.status` override). |
| `category` | :396 `where.category = filters.category` | :31 `qs.filter(category=...)` | ✅ |
| `subcategory` | :399 (single string) | :34 supports list OR single | ✅ (NEW superset) |
| `subdivision` | :402 | :36 | ✅ |
| `county` coverage (single `county` + array `counties` + NATIONWIDE) | :73 `buildCountyCoverageFilter` (county OR counties OR NATIONWIDE_ID) | :38 `Q(coverage__county) \| Q(coverage__counties__contains)` | ❌ **NATIONWIDE (Πανελλαδικά) pros dropped**; no onbase/onsite gating. |
| `online` + `county` combo | :445 (online OR [county AND (onbase OR onsite)]) | online & county applied independently (AND) :38-47 | ❌ Combined OR semantics lost → results differ. |
| `online` only | :483 `type.path['online'] equals` | :45 `type__online=True` | ⚠️ NEW ignores `online=false` (only filters when truthy); OLD filtered both true & false. |
| `county` only (onbase OR onsite) | :489 county AND (onbase OR onsite) | :38 county coverage only, no onbase/onsite | ❌ onbase/onsite presence gating dropped. |
| auto location-from-search (slug/Greek name → county) | :408-441 `findLocationBySlugOrName` | none | ❌ Missing entirely. |
| `search` (multi-field, accent-insensitive, multi-word AND, tags/subcat/subdiv/pro-subcat/coverage/username/displayName) | :519 `buildSearchFilter`+`buildServiceSearchConditions` (build-search-conditions.ts:41) | :48-55 only `title_normalized`, `description_normalized`, `subcategory` icontains | ❌ **Major search regression** — drops tags, subdivision, pro-subcategory, profile coverage/displayName/username matching, and accented-fallback fields. |
| `excludeFeatured` | (only in getServicesWithPagination :334) | :56 in `_apply_filters` | ✅ |

### SORTS — archive (`filters.sortBy` switch :531 → `_SORT_MAP` :15)

| OLD sortBy | OLD orderBy | NEW order_by | Status |
|---|---|---|---|
| `recent` | `[{sortDate desc}]` | `(-sort_date,)` | ✅ |
| `oldest` | `[{sortDate asc}]` | `(sort_date,)` | ✅ |
| `price_asc` | `[{price asc}]` | `(price,)` | ✅ |
| `price_desc` | `[{price desc}]` | `(-price,)` | ✅ |
| `rating_high` | `[{rating desc},{reviewCount desc}]` | `(-rating,-review_count)` | ✅ |
| `rating_low` | `[{rating asc},{reviewCount asc}]` | `(rating,review_count)` | ✅ |
| `default`/unset | `[{featured desc},{sortDate desc}]` + `shuffleFeatured` | `(-featured,-sort_date)` + in-page shuffle :265 | ⚠️ NEW shuffles only the current page's featured rows AFTER pagination; OLD shuffled the full featured set pre-slice. Page-1 ordering roughly equivalent; deeper pages differ. |
| `popular` | (not in OLD) | `(-review_count,-rating)` | ➕ NEW-only (harmless superset). |

`isValidArchiveSortBy` (OLD) restricted accepted values; NEW `ServiceFiltersSerializer.sortBy` ChoiceField enumerates the 7 — OK, but OLD also accepted `default` keyword which NEW rejects (must send null/omit).

### PAGINATION

| Aspect | OLD | NEW | Status |
|---|---|---|---|
| archive default limit | 20 (get-services.ts:387) | 20 (serializer default :56 / read :261) | ✅ |
| archive page default | 1 | 1 | ✅ |
| `hasMore` calc | `total > offset + limit` :624 | `offset + len(rows) < total` :270 | ⚠️ Subtle: OLD uses `limit`, NEW uses actual `len(rows)`. On a full last page both agree; equivalent in practice. |
| paginated-home default limit | **4** (:301) | **20** (:206 default) | ❌ Default page size mismatch. |
| my-services default limit | **12** (:74) | **20** (:403) | ❌ Default page size mismatch. |
| max limit cap | none (OLD) | 100 (serializer + reads) | ⚠️ New cap (defensive; behavior diff if caller sent >100). |

---

## Detailed gaps (per ❌ / ⚠️)

### G1 ❌ Archive search field coverage (HIGH)
- OLD: `buildServiceSearchConditions` (build-search-conditions.ts:41-88) searches titleNormalized, descriptionNormalized, profile.coverageNormalized, profile.displayNameNormalized, profile.username, tags(hasSome matching IDs), service subcategory IDs, subdivision IDs, pro subcategory IDs — plus accented fallback (title/description/displayName). Multi-word = AND of ORs.
- NEW: `_apply_filters` (service_reads.py:48-55) ANDs each normalized word over only `title_normalized | description_normalized | subcategory(icontains)`.
- Impact: Users searching tag terms, subdivisions, location/coverage, or a pro's name get drastically fewer/no results. Core marketplace discoverability regression.
- Suggested Django fix: port the multi-condition builder — add `Q(tags__overlap=[...])`, `Q(subdivision__icontains)`, `Q(profile__coverage_normalized__icontains)`, `Q(profile__display_name_normalized__icontains)`, `Q(profile__username__icontains)`, and accented-fallback on raw fields, preserving multi-word AND-of-OR.

### G2 ❌ County coverage filter — NATIONWIDE + onbase/onsite + online-combo (HIGH)
- OLD `buildCountyCoverageFilter` (get-services.ts:73-103) always ORs in `counties array_contains NATIONWIDE_ID`; county-only path also requires `(onbase OR onsite)`; online+county produces an OR of (online) and (county-coverage AND (onbase OR onsite)) (:445-514).
- NEW (:38-47): plain `coverage__county OR coverage__counties__contains`; online/county combined with AND; no NATIONWIDE, no onbase/onsite gating.
- Impact: Πανελλαδικά (nationwide) pros never appear in county-filtered results; "online OR in my county" toggle returns wrong set; services without onbase/onsite leak in.
- Suggested fix: replicate `build_county_coverage_filter` Q-helper (county | counties__contains | counties__contains=NATIONWIDE), gate by onbase/onsite, and branch the online+county combined OR exactly as OLD.

### G3 ❌ Featured services shape & algorithm (HIGH)
- OLD (get-services.ts:159): take 8; prioritize featured+published+reviewCount>0, then non-featured w/ reviews, then any published (3-tier fallback); `mainCategories` = `[{id,label,slug}]` from taxonomies (first 6 + "all"); `servicesByCategory` keyed by taxonomy id with `all`; cards via `transformServiceForComponent`.
- NEW (service_reads.py:223): take 50 featured then top up to 20 by rating; `mainCategories` = list of raw category SLUG strings; `servicesByCategory` keyed by raw category slug; no reviewCount>0 priority; no "all" bucket.
- Impact: Home page tabs/labels break (slugs vs labels, no "all"), wrong count (8 vs ~20), different selection.
- Suggested fix: align take=8, 3-tier fallback w/ reviewCount>0, emit taxonomy objects for mainCategories incl. "all", key servicesByCategory by taxonomy id.

### G4 ❌ Service-page bundle completeness (HIGH)
- OLD `_getServicePageData` (get-service.ts:196) returns resolved category/subcategory/subdivision, transformed coverage, featuredCategories, breadcrumbSegments, breadcrumbButtons, budget/size/contact/payment/settlement Data, tagsData, relatedServices (same **category**, take 5, featured-first), additionalServices (promoted-subscriber's other services), serviceReviews, profileOtherReviews, reviewStats. Profile-published gate enforced.
- NEW `get_service_page_bundle` (service_reads.py:116) returns `{service, relatedServices(same **subcategory**, take 6), reviews, reviewStats}` only.
- Impact: Detail page missing About-section data (methods/budget/size), tags, breadcrumbs, additionalServices, profileOtherReviews; related set differs (subcategory vs category, 6 vs 5, no featured-first). Unpublished-profile services still shown.
- Suggested fix: expand bundle; relate by category w/ featured-first ordering take 5; add additionalServices gated on active promoted subscription; add profile-published guard; include resolved option datasets + tagsData (likely resolved on frontend, confirm).

### G5 ❌ services/count semantics differ (MEDIUM)
- OLD `getServicesCount` (:668) counts using ONLY category/subcategory/subdivision (ignores search/county/online), cached 30min keyed by category/subcategory.
- NEW `count_services` (:273) applies the FULL filter set.
- Impact: Any caller using count as a "total in this taxonomy" badge will now see a smaller, filter-dependent number. Different cache key.
- Suggested fix: decide intended semantics; to match OLD, count only taxonomy fields. (NEW behavior may be preferable but it is a divergence to confirm.)

### G6 ❌ Report service email not sent (MEDIUM)
- OLD report-service.ts:78 calls `sendServiceReportEmail` to admin.
- NEW views/public/service.py:121 has `# TODO(messaging): trigger Brevo admin email task` and returns success without sending.
- Impact: Admin never notified of reports. Silent functional loss.
- Suggested fix: implement the Brevo/admin email task and call it before returning.

### G7 ⚠️ Update-service "refresh-on-edit" boost lost (MEDIUM)
- OLD updateServiceInfo (:255-278, :342, :383) applies car.gr logic: if user has refresh credits & service >24h since refresh, editing also sets refreshedAt+sortDate (boost) and increments daily counter.
- NEW update_service_info (service_writes.py:141) only sets fields + draft→pending; no boost-on-edit.
- Impact: Editing no longer bumps listing position; pros lose an expected boost path.
- Suggested fix: port the refresh-credit check + conditional refreshedAt/sortDate/counter update into update_service_info.

### G8 ⚠️ Slug generation gaps (MEDIUM)
- OLD: create (draft + pending) both generate slug from title+id (create-service.ts:284,362); updateServiceInfo regenerates slug whenever title changes (:351).
- NEW: `create_service` generates slug (service_writes.py:103); `save_service_as_draft` (:130) does NOT generate a slug (draft saved with slug=null); `update_service_info` only generates slug if currently empty (:161), NOT on title change.
- Impact: Draft services have null slug until first edit; renaming a published service leaves a stale slug (URL/title drift). OLD kept slug in sync.
- Suggested fix: generate slug in draft create; regenerate slug in update when title changes.

### G9 ⚠️ Subscription `canCreateService` / `canFeatureService` plan gates (MEDIUM)
- OLD: create (:102), draft (via update wasDraft :245), getUserServices returns `canCreateMore`/`canFeatureMore` from `canCreateService`/`canFeatureService` (get-user-services.ts:167).
- NEW: create/draft have NO plan-limit gate; dashboard `canCreateMore` hardcoded `True` (service_reads.py:415), `canFeatureMore` uses a conservative <5 heuristic (:436).
- Impact: Users can exceed plan service limits; UI gate inaccurate.
- Suggested fix: integrate billing selectors for create/feature limits.

### G10 ⚠️ my-services search & sort options reduced (MEDIUM)
- OLD (get-user-services.ts:104) search ORs title+description+tags; sort options include `title,status,category,createdAt,updatedAt(default→sortDate)`.
- NEW (service_reads.py:388) search only `title_normalized`; sort map only `createdAt,updatedAt,rating,title` (no `status`,`category`; default→`updated_at` not `sortDate`).
- Impact: Dashboard search misses description/tag matches; status/category column sort unavailable; default ordering differs (updated_at vs sortDate).
- Suggested fix: add description/tags to search; add status/category sorts; default sort by sort_date.

### G11 ⚠️ Recent services ordering & shape (LOW)
- OLD orders `sortDate desc`, returns bare `[{id,title}]`. NEW orders `updated_at desc`, returns `{services:[{id,title}]}`.
- Impact: Different order; consumer must unwrap `.services` (frontend get-recent-services should be checked).
- Suggested fix: order by sort_date; return array directly (or align frontend).

### G12 ⚠️ Create-service side effects omitted (LOW–MEDIUM)
- Admin "new service" email (create-service.ts:379), first-service Brevo PROS-list move (:395), delete/archive Brevo `handleUserStateChange` (delete-service.ts:104,197) all absent in NEW.
- Impact: CRM/admin notifications no longer fire on create/delete/archive.
- Suggested fix: enqueue equivalent messaging tasks.

---

## Response-shape mismatches

| Field/area | OLD shape | NEW shape | Impact |
|---|---|---|---|
| Card `profile` (archive) | id, uid, displayName, username, image, portfolio, coverage(transformed), groupedCoverage, verified, top, rating, reviewCount (get-services.ts:606) | id, username, displayName, image, verified, rating, reviewCount (service_reads.py:90) | ❌ Missing `uid, portfolio, coverage, groupedCoverage, top`. Cards can't link by uid / show coverage badges / portfolio. (Frontend enrich at get-services.ts:156 partly compensates for taxonomy but NOT for profile coverage/uid.) |
| Card `taxonomyLabels` | OLD adds resolved `taxonomyLabels` + `category` label (get-services.ts:594) | NEW `_card` returns raw `category/subcategory/subdivision` slugs, no `taxonomyLabels` | ⚠️ Frontend re-derives via `enrichServiceCard` (get-services.ts:157) — covered for archive bundle, but `searchServices`/`featured`/`bySlug` responses are NOT enriched by those actions → raw slugs leak. |
| Date fields | JS `Date` objects serialized by Next | ISO strings (`.isoformat()`) e.g. createdAt/refreshedAt/updatedAt (service_reads.py:88-89) | ⚠️ Casing preserved (camelCase). Consumers expecting Date must parse (refresh-service action does:17). Generally OK. |
| `getServiceBySlug` | full SERVICE_DETAIL_SELECT object (addons, faq, duration, subscriptionType, full profile w/ 24 fields) | `_card` (has addons/faq/duration/subscriptionType but slim 7-field profile) | ⚠️ Slim profile (no coverage/website/socials/budget/etc.) on by-slug. |
| Featured `mainCategories` | `[{id,label,slug}]` incl `all` | `["slug", ...]` strings | ❌ Type/shape break (see G3). |
| Recent services | `[{id,title}]` | `{services:[{id,title}]}` | ⚠️ Wrapped (see G11). |
| Archive bundle taxonomy/counties | rich taxonomy objects, counties list, breadcrumb labels, filtered subdivision counts | thin `{slug}` refs, `categories:[]`, `counties:[]`, slug breadcrumbs | ⚠️ Frontend enriches (get-services.ts:88-165); counties remain empty → county dropdown may break unless sourced elsewhere. |
| Update/create responses | `{success, message, serviceId, serviceTitle}` (ActionResponse) | `{serviceId, serviceTitle}` (201) / `{message, serviceId}` | ✅ Frontend wraps into ActionResponse (create-service.ts:41). OK. |
| `hasMore`/`total`/`services` keys | camelCase | camelCase | ✅ |

---

## Counts

- matched (✅): 7  — updateMedia, archive, refresh, getForEdit, myServiceStats, sort-options(archive 6/6 mapped), most pagination defaults equal for archive
- partial (⚠️): 16 — create, draft, updateInfo, delete, report, bySlug, pageBundle, paginated-home, count, taxonomyPaths, archiveBundle, myServices, recent, categoriesPage, navigationMenu, response-shapes
- missing/broken (❌): 6 — featuredServices(shape+algo), archive search filters (search-fields), county coverage(NATIONWIDE/onbase/onsite/online-combo), status-override in search, card profile fields, page-size defaults (home=4, my=12)
- needs_verification (❓): 3 — searchSuggestions (no OLD services/** source), admin surface (OLD admin actions out of scope), whether non-archive responses (featured/bySlug/search) get frontend taxonomy enrichment

### Top gaps to fix first
1. G1 archive search field coverage (tags/subdivision/pro-name/coverage) — discoverability.
2. G2 county coverage (NATIONWIDE pros + onbase/onsite + online-combo) — location filtering correctness.
3. G3 featured services shape+algorithm — home page broken.
4. G4 service-page bundle completeness — detail page data loss.
5. Profile card fields (uid/coverage/portfolio/top) + page-size defaults (4/12 vs 20).
6. G6 report email TODO; G7 refresh-on-edit; G8 slug sync; G9 plan gates.
