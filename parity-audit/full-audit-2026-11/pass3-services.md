# Services parity audit — pass 3 (fresh re-audit) — 2026-11-05

Domain: Services (CRUD, dashboard service UI, public service page, `/ipiresies` archives, pricing/addons/faq/media, status flow, counts).
Dedupe base: SUMMARY.md, services.md (pass 1), all pass2-*.md, and the pass3-*.md files already in this folder. Only NEW findings are listed below. Zero code changes. No git commands.

## 1. Coverage

### OLD files (re-derived with `find`/`ls` and read or diffed in full)
- `src/actions/services/*` (all 11): read in full this pass: create-service, update-service, delete-service, refresh-service, report-service, get-service, get-services (filters, count, taxonomy paths, `getServiceArchivePageData`), get-user-services, get-recent-services. get-categories was skimmed only (see §5).
- Pages: `app/(service)/s/[slug]/{page,loading,not-found}.tsx`, `s/sitemap.ts`, `app/(archives)/(services)/ipiresies/{page,sitemap}`, `[subcategory]/{page,not-found}`, `[subcategory]/[subdivision]/{page,not-found}`, `app/(dashboard)/dashboard/services/(list)/{page,loading}`, `create/page`, `create/success/page`, `edit/[id]/{page,not-found}`. All were diffed against the new copies with `diff -w`.
- Components, all diffed with `diff -w`: `components/service/*` + `skeletons/*`, `components/forms/service/*` + `steps/*`, `components/dashboard/services/*`, `components/archives/*`, `components/shared/*`, `dashboard-nav-services.tsx`, `no-service-dialog.tsx`, `services/service-delete-dialog.tsx`. The only files that differ are type-import shims, optional chaining, the intentional drawer/optimistic-select changes, and the items already in pass 1 (service-card coverage, featured star, table filters, success-page button text). `service-success.tsx` is dead code in old.
- Support code read: `lib/validations/service.ts` (update/report schemas), `lib/utils/text/{slug,sanitize,normalize}.ts`, `lib/utils/misc/shuffle.ts`, `lib/utils/search/build-search-conditions.ts`, `lib/taxonomies/index.ts` (`findLocationBySlugOrName`, `resolveToCountyId`, `findMatching*Ids`), `lib/database/selects/service.ts`, `lib/payment/pricing.ts`, `lib/subscription/feature-gate.ts`, `lib/seo/{fetch-entity,pages}.ts`, `lib/seo/schema/services-schema.tsx`, `app/api/cron/auto-refresh/route.ts`, `constants/datasets/service-taxonomies.ts`, `lib/taxonomies/maps.generated.json`.

### NEW files read
- Frontend: `src/actions/services/*` (all), `lib/api/services.ts`, `lib/api/client.ts` (204/error paths), `lib/cache/revalidation.ts`, `lib/taxonomies/{index,enrich}.ts`, `lib/subscription/feature-gate.ts`, `lib/utils/form.ts#populateFormData`, `lib/utils/datasets.ts#getBreadcrumbsForNewRoutes`, `lib/seo/*` (diffed), `components/archives/archive-layout.tsx`, `archive-sidebar-filters.tsx`, `components/shared/taxonomy-tabs.tsx`, `components/service/service-contact.tsx`, `components/forms/service/form-service-{create,edit}.tsx`, `components/dashboard/services/{service-table,service-refresh-button,featured-star-button}.tsx`, `components/service/report-service-dialog.tsx`, and every page listed above.
- Backend: `apps/services/{models/service.py, urls/public.py, views/public/service.py, views/public/cron.py, serializers/service.py, services/service_writes.py, selectors/service_reads.py (all 1028 lines), tasks.py, signals.py}`, `apps/core/{taxonomy.py (label/node/matcher helpers), locations.py}`, `apps/taxonomy/services/maps_builder.py` (bySlug tie-break), `apps/core/views/public/sitemaps.py`, `apps/billing/selectors/subscription_selectors.py`, `apps/profiles/selectors/profile_reads.py#serialize_profile_summary`, `common/throttling.py`, `common/utils/slug.py`, `config/settings/base.py` (REST_FRAMEWORK), and DRF 3.15.2 `rest_framework/throttling.py` (the version pinned in pyproject).

### Delegated elsewhere (unchanged from pass 1)
- Toggle-featured backend → billing. Admin service pages/actions → admin. `/categories` pages and get-categories ranking → home/taxonomy. Search suggestions → search. Reviews on the service page → reviews. Email templates → emails. Sitemap data source → SEO. `components/profile/profile-services.tsx` → profiles.

## 2. Mapping
Unchanged from services.md §2. Re-checked endpoint by endpoint against `urls/public.py`, and it is accurate.

## 3. NEW DIFFERENCES

### P3-S1. Service archives resolve the taxonomy context without its parent and with a flat slug lookup. The parent category is lost, and 20 subcategory pages show a subdivision's banner text and image — MEDIUM
- OLD (`actions/services/get-services.ts:860-883`): `findTaxonomyBySubcategorySlug(getServiceTaxonomies(), subcategorySlug, subdivisionSlug)` walks the tree. It returns `{category, subcategory, subdivision}`, all at the right level, and `taxonomyData.currentCategory` is the PARENT category of the subcategory.
- NEW:
  - Backend `get_archive_bundle` returns `currentCategory: None` unless `categorySlug` is posted (`service_reads.py:710`). The `/ipiresies/[subcategory]` and `[subcategory]/[subdivision]` pages never have one: `params.category` doesn't exist on those routes.
  - Frontend `_getServiceArchivePageDataUncached` enriches `currentSubcategory`/`currentSubdivision` with a flat `findServiceBySlug(k) ?? findServiceById(k)` (`frontend/src/actions/services/get-services.ts:168-177, 203-205`).
  - In the service taxonomy, 20 subcategory slugs are reused by a subdivision with the same slug, for example `udraulika`, `katharismoi`, `episkeues`, `ilektrologika`, `egatastasi`, `programmatismos`, `diktua`, `digital-marketing`, `mathimata-xorou`, `sxolika-mathimata`, `upostirixi-pelaton`. The maps' `bySlug` (byte-exact with old `maps.generated.json`) points every one of them at the SUBDIVISION node. Verified with a script over the dataset and both maps files.
- Impact:
  1. On every subcategory and subdivision archive, the mobile "Κατηγορίες Υπηρεσιών" menu (`TaxonomyTabs activeItemSlug={taxonomyData.currentCategory?.slug}`, archive-layout.tsx:283) highlights "Όλες οι Κατηγορίες" instead of the parent category.
  2. The JSON-LD `ItemList.name` drops the category segment (`services-schema.tsx:33-37`). Example: "Υπηρεσίες - Τεχνικά - Υδραυλικά - Υδραυλικά" becomes "Υπηρεσίες - Υδραυλικά - Υδραυλικά".
  3. Banner subtitle and image no longer fall back to the category's (archive-layout.tsx:229-276).
  4. On the 20 colliding subcategory pages (e.g. `/ipiresies/udraulika`), the banner shows the subdivision's description and image instead of the subcategory's. For `udraulika`, old shows "Βρες άμεσα λύσεις για υδραυλικά προβλήματα στο σπίτι σου με εξειδικευμένες υπηρεσίες επισκευής." with `subcategories/udraulika_vd7zoz.webp`; new shows "…για κάθε υδραυλικό πρόβλημα…" with `497_6674a551e9.webp`.
- Listings, counts and breadcrumbs are NOT affected. The backend filters with the level-aware `taxonomy_node_ids`, and `getBreadcrumbsForNewRoutes` is hierarchical.
- Fix: in the frontend action, build `currentCategory`/`currentSubcategory`/`currentSubdivision` with `findTaxonomyBySubcategorySlug` (already exported in `frontend/src/lib/utils/datasets.ts`, which the breadcrumb util uses), exactly like old.
- Possibly intentional?: no.

### P3-S2. Services archive county filter and auto-location: an area resolves to itself instead of its county, and an unresolvable value filters to 0 instead of being ignored — MEDIUM
- Pass 1 services D16 only said the county filter is "broader". The resolver change it missed narrows results, and it also hits the search auto-location. Same root cause as profiles-public-archives D7, but on a different surface.
- OLD:
  - `resolveToCountyId` (taxonomies/index.ts:359-376) maps an area slug to its PARENT county. `buildCountyCoverageFilter` then matches `coverage.county`/`counties`/nationwide.
  - Unresolvable `county`, county-only: no location filter (get-services.ts:491-514).
  - Unresolvable `county` with online+county: NO filter at all, not even online (`if (countyId)` guards the whole OR, :446-489).
  - Auto-location from a search term that is a location slug: the area resolves to its parent county too (:406-441).
- NEW:
  - `resolve_to_county_id` = `location_id_for_slug` (core/locations.py:111-137) returns the AREA's own id.
  - `_apply_filters` uses `resolve_to_county_id(county) or str(county)` (service_reads.py:135) and filters on the raw string when unresolved.
  - Auto-location uses the same area-id resolver (:153-158).
- Impact:
  - `/ipiresies?county=glyfada` (legacy or area links), and a search for an area slug such as "glyfada", show only pros whose coverage lists that exact area. Old showed every pro covering the whole county.
  - `?county=<garbage>` shows 0 services. Old showed all; with `&online` old also ignored the online flag.
- Fix: same as profiles D7. Walk area → county in `resolve_to_county_id` (or in a services-specific helper), and skip the filter when the value is unresolvable.
- Possibly intentional?: partly (the docstring admits the area gap). The empty-result behaviour is not intentional.

### P3-S3. The daily refresh quota resets at UTC midnight (02:00/03:00 Athens), not at Athens midnight — LOW
- OLD: `refresh-service.ts:93-101` and `update-service.ts:256-265` compute `today = new Date(y, m, d)` in the server's local time. The Node TZ was forced to Europe/Athens (lib-shared D1), so the free plan's 3/day manual refreshes, and the car.gr refresh-on-edit eligibility, reset at 00:00 Athens.
- NEW: `refresh_service` and `update_service_info` use `datetime.now(timezone.utc).date()` and `profile.last_service_refresh_date.date()` on a UTC-aware value (service_writes.py:340-347, 473-476).
- Impact: refreshes made between 00:00 and 02:00/03:00 Athens count against the previous day. A free pro who used 3 refreshes in the evening gets "Όριο 3 ανανεώσεων ανά ημέρα" right after midnight, and edits made in that window don't boost the service.
- Setting `TZ` on the frontend (the lib-shared D1 fix) does NOT fix this, because the backend is explicit UTC.
- Fix: use `timezone.localdate()`, or convert with `astimezone(ZoneInfo(settings.TIME_ZONE))` before `.date()`.
- Possibly intentional?: no.

### P3-S4. Archive URLs that old tolerated now show the error page: bad `?limit=` and repeated `?sortBy=` — LOW
- OLD:
  - The archive pages (identical in both apps) do `limit = parseInt(searchParams.limit || '20')`. The action then uses `params.limit || 20`, so `?limit=abc` or `?limit=0` fall back to 20, and any other number (e.g. 500) is honoured.
  - `sortBy` goes through `isValidArchiveSortBy`, so an array or unknown value becomes `'default'` (get-services.ts:893-896).
- NEW:
  - `ServiceArchiveRequestSerializer.limit = IntegerField(default=20, min_value=1, max_value=100)`, not nullable (serializers/service.py:443). `NaN` is serialized as `null`, so `?limit=abc`, `?limit=0` and `?limit=101` all return 400. The page only calls `notFound()` for errors containing "not found" and otherwise throws, which renders the error page.
  - A repeated `?sortBy=a&sortBy=b` reaches `_SORT_MAP.get(<list>)` (service_reads.py:170) and raises `TypeError: unhashable type` → 500 → error page.
- Impact: shared or crawled URLs with these params break, where old rendered results. Same class as pass3-profiles-public-archives D4 and pass3-reviews-saved N1, but on the services archives.
- Fix: coerce limit (fallback 20, clamp) and accept only a scalar, whitelisted sortBy before calling the backend, or make the backend tolerant.
- Possibly intentional?: the 100 cap maybe. The crashes are not intentional.

## 4. Corrections to earlier reports

- **C1 — services D2, D6, D10, D17 (throttle parts).** `ServiceDraftThrottle` and `ReportThrottle` never fire. The root cause is already filed as pass3-profiles-dashboard C1: DRF 3.15.2 `ScopedRateThrottle.allow_request` replaces the class `scope` with `view.throttle_scope`, which no view sets. Corrected statements for services:
  - D6: the English "Request was throttled…" draft text can't occur. The only draft cooldown is the service-layer Greek `"Περίμενε λίγο πριν αποθηκεύσεις ξανά"` (429). The text still differs from old's `"…ξανά σε N δευτερόλεπτα."`, so D6's copy point stands.
  - D2 / D17 bullet 2: a failed draft POST does NOT consume a cooldown slot. Only a successful draft, or a successful submit (D17 bullet 1), stamps `last_service_draft`.
  - D10: there is no 5/hour report limit, which matches old (no limit). Template and length differences still stand.
  - Side note: because these two views set `throttle_classes = [...]` explicitly, they also skip the global anon/user throttles, so neither endpoint has any rate limit.
- **C2 — services D16.** It is not only "broader". Area-slug and unresolvable values now narrow the results or empty them. See P3-S2.
- **C3 — services §4 "Plan limits … daily manual refresh 3 / unlimited … refresh 24 h per service".** The counts and the 24 h window are correct, but the day boundary moved to UTC. See P3-S3.
- **C4 — services §4 "Archive listing: taxonomy filter … ArchiveLayout/banner".** The listing filter is right. The banner and tabs inputs are not, see P3-S1.

## 5. Re-verified same (pass-1 §4 claims re-checked against code this pass)
- Create serializer = `createServiceSchema` field for field, including the fixed→price ≥5 rule, the type refinements, and the subscription→subscriptionType rule. Update serializer refinements = `updateServiceInfoSchema` refines, except the ≥80 description floor (pass-1 D7) and the added addon/faq caps and uniqueness (pass-1 D24 / pass2 D2).
- Edit form transport is identical: `populateFormData` with `skipEmpty`. `subscriptionType` is never cleared on edit in either app, and media is never sent by the info form and is ignored by the backend.
- Slug: `create_slug`/`generate_service_slug` reproduce `createSlug` (longest-first stable sort, same regexes, same hyphen collapse). Regenerated on title change. Draft slug `untitled-{id}`.
- Status flow: create → pending, draft → draft, published/rejected/pending unchanged on edit, plan gate on any draft edit (even when not transitioning), archive → inactive (no UI calls archive in either app), hard delete.
- Plan limits 3/15, featured 0/3, refresh 3/∞, `remainingRefreshes` math (0 for promoted), per-service 24 h check before the daily check. `has_active_subscription` = active AND promoted.
- Refresh-on-edit applies to any status and consumes a credit, as in old.
- Service page: published + profile-published gate. ID parsed from the slug tail, no canonical redirect (both). Related = same raw `category`, `featured, rating, reviewCount, updatedAt` desc, take 5, shuffled. Additional = active promoted, `featured, rating`, take 5. Every field the page components read (`profile.uid/firstName/lastName/rate/commencement/experience/terms/socials/website`) is present in `serialize_profile_summary` (its PII exposure is already known). service-contact/meta/info/order/faq/media are identical.
- Archive listing: the online/county combination logic and the auto-location gate (`search` ≥2 chars, no explicit county) are structurally the same (resolver aside, P3-S2). Default order is `featured desc, sortDate desc` plus `shuffleFeatured` on the page slice for every sort (old selected `featured`, so the shuffle is live in both). `hasMore` is equivalent.
- `taxonomyData.categories` is `[]` in new, but the services sidebar never renders the category dropdown (`archiveType === 'profiles'` only), so there's no visible effect.
- Dashboard: limit 12, sort map (`updatedAt` → `sortDate`), status `all`, stats (inactive excluded in both), recent 5 by `sortDate`. The table only reads id, title, media, taxonomyLabels, status, refreshedAt, featured and slug, and `_dashboard_card` supplies them all.
- Delete returns 204, and the client handles 204. The delete dialog and refresh button use fixed Greek toasts in both apps.
- The report endpoint requires auth in both, and the dialog prompts login.
- The auto-refresh task selects the same rows as the old route (active+promoted pids, published).
- Archive/subcategory/subdivision metadata is identical and hierarchical, so wrong-parent URLs still 404.

## 6. Open questions / couldn't verify
- `get-categories.ts` (FE recomposition of the `/categories` and nav data) was only skimmed this pass. It belongs to the categories/home domain, and pass 1's ranking claims there were not re-verified.
- P3-S1 counts collisions from the bundled dataset and maps. If admins have since renamed slugs in the Django DB, the affected set may differ. Check with `SELECT slug, array_agg(level) FROM taxonomy_nodes WHERE space='service' GROUP BY slug HAVING count(*)>1;`.
- P3-S3 assumes old prod's server actions ran with `TZ=Europe/Athens` from `instrumentation.ts` (as lib-shared D1 establishes).
