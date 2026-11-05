# Services parity audit — 2026-11-05

Domain: Services — CRUD, dashboard service UI, public service page, `/ipiresies` archives.
Method: every old file in scope read (or diffed line-by-line against its new copy when the new file is a near-verbatim port), every new counterpart read. Zero code changes. No git commands other than read-only `git log/show`.

## 1. Coverage

### OLD files read (oldnext/src/…)
Actions — `actions/services/` (all 11):
- `create-service.ts` — createServiceAction (pending) + saveServiceAsDraftAction (draft, 30 s cooldown), plan-limit gate, slug, admin email, Brevo first-service hook.
- `update-service.ts` — updateServiceMedia, updateServiceInfo (partial update, draft→pending, car.gr refresh-on-edit, slug regen), invalidation helper.
- `delete-service.ts` — deleteService (freelancer/company owner) + archiveService (→inactive); Brevo `handleUserStateChange`.
- `refresh-service.ts` — manual refresh (24 h per service, plan daily cap).
- `report-service.ts` — report form → `sendServiceReportEmail`.
- `get-service.ts` — getServiceBySlug, `_getServicePageData` (page bundle, related, additional, reviews), getServiceForEdit.
- `get-services.ts` — getFeaturedServices (unused in old), getServicesWithPagination (unused), getServicesByFilters, getServicesCount, getServiceTaxonomyPaths, getServiceArchivePageData.
- `get-categories.ts` — getCategoriesPageData, getNavigationMenuData.
- `get-user-services.ts` — dashboard list + stats.
- `get-recent-services.ts` — dashboard sidebar recent 5.
- `index.ts` — barrel.

Support code read for semantics: `lib/validations/service.ts` (all user-facing schemas), `lib/prisma/json-types.ts` (cloudinary/type/addon schemas), `lib/prisma/schema/service.prisma`, `lib/utils/text/slug.ts`, `lib/utils/text/greek-latin.ts`, `lib/utils/text/sanitize.ts`, `lib/subscription/feature-gate.ts`, `lib/payment/pricing.ts` (SUBSCRIPTION_PLANS), `lib/utils/search/*` (archive search), `lib/utils/misc/shuffle.ts`, `lib/types/common.ts` (sort guard), `lib/utils/datasets.ts#getBreadcrumbsForNewRoutes`, `lib/seo/{meta,fetch-entity,format-template,get-entity-values,pages}.ts`, `lib/hooks/archives/use-archive-filters.ts`, `app/api/cron/auto-refresh/route.ts`, `vercel.json`, `lib/email/services/service-emails.ts#sendServiceCreatedEmail` (call contract only).

Pages:
- `app/(service)/layout.tsx`, `s/[slug]/{page,loading,not-found}.tsx`, `s/sitemap.ts`
- `app/(archives)/(services)/ipiresies/{page,sitemap}.tsx|ts`, `[subcategory]/{page,not-found}.tsx`, `[subcategory]/[subdivision]/{page,not-found}.tsx`
- `app/(dashboard)/dashboard/services/(list)/{page,loading}.tsx`, `create/page.tsx`, `create/success/page.tsx`, `edit/[id]/{page,not-found}.tsx`

Components:
- `components/service/*` (index, report-service-dialog, service-about, -additional, -addons, -buy, -calculated-price, -contact, -faq, -info, -media, -meta, -order-fixed, -related) + `skeletons/*` (8 files)
- `components/forms/service/*` (form-service-create, -delete, -edit, -edit-media, index, service-success [dead in old — not imported anywhere]) + `steps/*` (addons-faq, create-service-steps-help, index, media, oneoff-subscription, onsite-onbase, presence-online, service-details)
- `components/dashboard/services/*` (create-service-button, featured-star-button, service-limit-sheet, service-pagination, service-refresh-button, service-status-badge, service-table-filters, service-table-header-sort, service-table), `components/dashboard/dashboard-nav-services.tsx`, `components/dashboard/no-service-dialog.tsx`, `components/services/service-delete-dialog.tsx`
- `components/shared/service-card.tsx`, `components/shared/service-media-card.tsx`
- `components/archives/*` (archive-banner, -filters, -inputs, -layout, -pagination, -profile-card, -service-card, -sidebar-filters, -sidebar, categories-grid, coverage-display, index, infinite-scroll, subdivisions-carousel)

### NEW files read
- frontend `src/actions/services/*` (all 11), `src/lib/api/services.ts`, `src/lib/api/client.ts` (ApiError / error envelope), `src/lib/subscription/feature-gate.ts`, `src/lib/taxonomies/{index#resolveServiceHierarchy,enrich#enrichServiceCard}.ts`, `src/lib/seo/*` (full diff vs old), `src/lib/utils/form.ts#populateFormData`, `src/lib/utils/datasets.ts#getBreadcrumbsForNewRoutes`, `src/lib/hooks/archives/use-archive-filters.ts` (identical to old)
- frontend pages: all counterparts above (diffed); components: all counterparts above (diffed — only the files listed in §3/§4 differ)
- backend `apps/services/`: `models/service.py`, `urls/public.py`, `views/public/service.py`, `views/public/cron.py`, `serializers/service.py`, `services/service_writes.py`, `selectors/service_reads.py`, `tasks.py`, `signals.py`; plus `apps/accounts/permissions/roles.py`, `common/throttling.py`, `common/exceptions.py`, `common/utils/{slug,greek_latin,cloudinary}.py`, `apps/billing/selectors/subscription_selectors.py#has_active_subscription`, `apps/messaging/tasks.py#send_service_created_email`, `apps/profiles/selectors/profile_reads.py#serialize_profile_summary` (field list), `config/settings/base.py` (throttle rates, beat schedule), `config/urls.py`.

### Delegated elsewhere
- `actions/subscription/toggle-featured-service.ts` (featured star backend) → subscription/billing domain
- `actions/admin/services*`, `app/(admin)/admin/services/**`, `components/admin/*service*`, `apps/services/views/admin/*`, `services/admin_services.py` (publish/reject/approve — who publishes) → admin domain
- `app/(admin)/admin/taxonomies/service/**`, `app/(archives)/(services)/categories/**` pages, `components/archives/categories-grid.tsx` page usage → taxonomies/categories domain (I did audit the `getCategoriesPageData`/`getNavigationMenuData` actions that feed them)
- `actions/search/*` search-services / `search_suggestions` endpoint → search domain
- `actions/home/get-home-data.ts`, `components/home/*services*` (home featured services; new `/services/featured`) → home domain
- reviews on service page (`getServiceReviews`, stats, other reviews) → reviews domain
- `lib/email/**` templates (SERVICE_CREATED, service report email) → emails domain
- `app/(service)/s/sitemap.ts` data source `/api/seo/sitemap-entries` → SEO domain
- `components/profile/profile-services.tsx` → profiles domain

## 2. Mapping (old → new)

| OLD | NEW frontend action | Django endpoint | Page/UI |
|---|---|---|---|
| createServiceAction | `create-service.ts#createServiceAction` | POST `/api/services/` (CreateServiceView, CreateServiceSerializer, `create_service`) | dashboard/services/create (FormCreateService, identical UI) |
| saveServiceAsDraftAction | `#saveServiceAsDraftAction` | POST `/api/services/draft` (ServiceDraftThrottle 1/30s, DraftServiceSerializer, `save_service_as_draft`) | same form, draft dialog |
| updateServiceInfo / updateServiceAction | `update-service.ts#updateServiceInfo` | PATCH `/api/services/{id}` (UpdateServiceSerializer, `update_service_info`) | edit/[id] FormServiceEdit (identical) |
| updateServiceMedia | `#updateServiceMedia` | PATCH `/api/services/{id}/media` | FormServiceEditMedia (identical) |
| deleteService / archiveService | `delete-service.ts` | DELETE `/api/services/{id}`, POST `/{id}/archive` | ServiceDeleteDialog (identical) |
| refreshService | `refresh-service.ts` | POST `/{id}/refresh` | ServiceRefreshButton (identical) |
| reportService | `report-service.ts` | POST `/{id}/report` (ReportThrottle 5/h) | ReportServiceDialog (identical) |
| getServicePageData | `get-service.ts#getServicePageData` (+FE enrichment) | GET `/{id}/page` (Redis `service:page:{id}` 30 min) | s/[slug] (identical layout) |
| getServiceBySlug (unused) | `#getServiceBySlug` (unused) | GET `/by-slug/{slug}` | — |
| getServiceForEdit | `#getServiceForEdit` | GET `/{id}/edit` → `{service}` | edit/[id] (unwraps `.service`) |
| getServiceArchivePageData | `get-services.ts#getServiceArchivePageData` (+FE enrichment, 5-min cache) | POST `/archive` (`get_archive_bundle`) | ipiresies/** (identical pages) |
| getServicesByFilters / getServicesCount / getServiceTaxonomyPaths | same names | POST `/search`, POST `/count`, GET `/taxonomy-paths` | sitemap / generateStaticParams |
| getServicesWithPagination (unused) | same | GET `/services` (see §5) | — |
| getFeaturedServices (unused in old) | same | GET `/featured` (ports get-home-data) | home (delegated) |
| getCategoriesPageData / getNavigationMenuData | `get-categories.ts` (heavy FE recomposition) | GET `/categories`, GET `/navigation` | /categories, header |
| getUserServices / getUserServiceStats | `get-user-services.ts` | GET `/me`, GET `/me/stats` | dashboard/services list (identical + new category Select) |
| getRecentServices | `get-recent-services.ts` | GET `/recent` | dashboard-nav-services |
| /api/cron/auto-refresh | — | Celery beat `auto_refresh_promoted` 00:00 + `/api/cron/auto-refresh` | — |

## 3. DIFFERENCES

### D1. Public search/count endpoints accept a `status` override → anyone can list drafts / pending / rejected services — HIGH (security / data exposure)
- OLD: `getServicesByFilters`/`getServicesCount` default `status: filters.status || 'published'` (get-services.ts:392, :675) but are only invoked server-side by `getServiceArchivePageData`, which always passes `status: 'published'` (get-services.ts:916). Not reachable by a client with another status.
- NEW: `ServicesSearchView`/`ServicesCountView` are `AllowAny` (views/public/service.py:216-235) and `ServiceFiltersSerializer.status` is a free CharField (serializers/service.py:427); `search_services` does `_public_qs(filters.get("status") or PUBLISHED)` (service_reads.py:582), same in `count_services` (:610).
- Impact: `POST /api/services/search {"status":"draft"}` (or pending/rejected/inactive) returns full cards (title, description, media, addons, faq, profile username/coverage) of every user's unpublished services.
- Possibly intentional?: no — comment claims parity, but the old override was never externally reachable. Fix: drop/ignore `status` on public endpoints (force published).

### D2. "Αποθήκευση ως προσχέδιο" fails when Διάρκεια is empty (the default) — HIGH
- OLD: create form leaves `duration` undefined → not in FormData; action reads `duration` default 0 and passes `duration: extractedData.duration || undefined` to `createServiceDraftSchema` (create-service.ts:191), so the draft schema's `.min(1)` never triggers.
- NEW: `formToService` sends `duration: Number(getStr('duration') || 0)` = 0 (frontend actions/services/create-service.ts:24); `DraftServiceSerializer.duration` has `min_value=1` (serializers/service.py:349) → 400 "One or more fields are invalid." (details: "Η διάρκεια πρέπει να είναι τουλάχιστον 1 ημέρα"). The toast shows the English envelope message.
- Impact: saving any draft without a duration is impossible. (Submit path is fine: Create serializer min is 0.) Also the failed POST consumes the 1/30 s draft throttle slot (D18).
- Possibly intentional?: no.

### D3. Archive search term is lost on landing (`?search=`) and dropped on the next filter/sort change — HIGH
- OLD: `getServiceArchivePageData` returns `filters` incl. `search` (get-services.ts:915-929, :1351) → page passes `initialFilters={filters}` → `useArchiveFilters` keeps `search` in state, so the archive search input is pre-filled and `updateURL` re-emits `search=` on every county/online/sort/page change.
- NEW: backend bundle has no `filters` key; the FE action passes `filters: bundle.filters` (= undefined) (frontend get-services.ts:296). `useArchiveFilters` (identical to old) does NOT parse `search` from the URL, so state has no search.
- Impact: header/home search lands on `/ipiresies?search=X` (header-search.tsx:65, home-search.tsx:86); the search box is empty and choosing a county/sort/page navigates without `search`, silently widening results to the whole catalogue.
- Possibly intentional?: no. Fix: return/compose `filters` (county|περιοχή, online, search, sortBy, page, limit) in the FE action like old.

### D4. Archive subdivision lists (sidebar "Υποκατηγορία" dropdown + chip carousel) are truncated/filtered differently — HIGH
- OLD (get-services.ts:1120-1330):
  - `taxonomyData.subdivisions` (sidebar dropdown) = ALL subdivisions of the current subcategory that have published services, in taxonomy order, unaffected by search/county/online.
  - `availableSubdivisions` (carousel): on a subdivision page = sibling subdivisions EXCLUDING the current one, top 5 by count (unfiltered); on root/subcategory pages without filters = `getCategoriesPageData(...).popularSubdivisions` top **5**; with active filters = filtered counts top 5.
- NEW: backend returns one list `availableSubdivisions` = top **8** by count under the active filters (incl. search/county/online), with the current subdivision NOT excluded (service_reads.py:672-678); the FE uses it for BOTH the carousel and `taxonomyData.subdivisions` (frontend get-services.ts:215, :236-258).
- Impact: in subcategories with >8 populated subdivisions the dropdown cannot select the others; on a subdivision page whose subdivision is outside the top 8 (or filtered out) the dropdown shows nothing selected (archive-sidebar-filters.tsx:114 looks it up in this list); carousel shows 8 instead of 5 and repeats the current subdivision.
- Possibly intentional?: no.

### D5. Service page meta description (and JSON-LD description) loses subcategory/subdivision — HIGH (SEO, every service page)
- OLD: `fetchEntity('service')` reads raw `service.category/subcategory/subdivision` ids from Prisma and resolves labels with `resolveServiceHierarchy` (old fetch-entity.ts:88-135); template `'%subcategory% - %subdivision% - %description%'` (pages.ts getServiceMetadata).
- NEW: `fetchEntity` uses `/services/{id}/page` and passes `bundle.service.category` — but `_card` replaces `category` with the Greek LABEL (service_reads.py:204). `resolveServiceHierarchy` does `findServiceById(label)` → null, so subcategory and subdivision also resolve null (frontend taxonomies/index.ts:585-595).
- Impact: `<meta name=description>` becomes `" -  - <description…>"` on every service page; the page reuses it for `ServiceSchema` description (s/[slug]/page.tsx:125-126).
- Possibly intentional?: no. Fix: use `bundle.category.slug`/raw ids or `taxonomyLabels`.

### D6. User-visible Greek messages replaced by English/different texts across the CRUD flows — MEDIUM
All shown to users via `err.message` in toasts (form-service-create.tsx:246/270, form-service-edit.tsx:195-200, service-refresh-button.tsx, report dialog):
- Any validation failure: OLD create `'Μη έγκυρα δεδομένα υπηρεσίας'` (create-service.ts:200); OLD update/media `'Αποτυχία: ' + <Greek issue messages joined>` (update-service.ts:128-133, :326-333) → NEW `'One or more fields are invalid.'` (common/exceptions.py:133). The Greek per-field messages in the serializers are never surfaced (actions don't read `details`).
- Role gate: OLD `'Μόνο επαγγελματίες και επιχειρήσεις μπορούν να δημιουργήσουν υπηρεσίες'` → NEW `'Professional account required.'` (roles.py IsProfessional.message; fires before service code).
- Missing profile: OLD `'Δεν βρέθηκε το προφίλ σας. Παρακαλώ ολοκληρώστε πρώτα τη ρύθμιση του προφίλ σας.'` → NEW `'Πρέπει να ολοκληρώσεις το προφίλ σου πρώτα'`.
- Plan limit (create + draft→pending): OLD `'Έχει φτάσει το μέγιστο όριο υπηρεσιών για το δωρεάν πακέτο προβολής.'` → NEW `'Έχετε φτάσει το μέγιστο όριο υπηρεσιών για το πλάνο σας.'` (service_writes.py:175, :334).
- Draft cooldown: OLD `'Μπορείτε να αποθηκεύσετε προσχέδιο ξανά σε ${n} δευτερόλεπτα.'` → NEW DRF throttle English `'Request was throttled. Expected available in N seconds.'` (ServiceDraftThrottle) or `'Περίμενε λίγο πριν αποθηκεύσεις ξανά'` (service_writes.py:239).
- Create success toast: OLD `'Η υπηρεσία υποβλήθηκε για έγκριση!'` → NEW `'Η υπηρεσία υποβλήθηκε προς έλεγχο'`.
- Edit success toast: OLD `'Η υπηρεσία υποβλήθηκε για έγκριση επιτυχώς!'` (was draft) / `'Η υπηρεσία ενημερώθηκε επιτυχώς!'` → NEW always `'Η υπηρεσία ενημερώθηκε'`.
- Edit not-owner/not-found: OLD `'Η υπηρεσία δεν βρέθηκε.'` / `'Η πρόσβαση δεν επιτρέπεται.'`; generic `'Η ενημέρωση της υπηρεσίας απέτυχε'` → NEW `'Service not found'` / `'Σφάλμα δικτύου'`.
- Media: OLD success `'Τα πολυμέσα ενημερώθηκαν επιτυχώς!'`, failure `'Η ενημέρωση των πολυμέσων απέτυχε.'` → NEW `'Τα media ενημερώθηκαν'`.
- Refresh: OLD cooldown `'Η υπηρεσία μπορεί να ανανεωθεί μόνο μία φορά κάθε 24 ώρες. Διαθέσιμο σε ${h} ώρα|ώρες'`, daily `'Έχετε φτάσει το ημερήσιο όριο των ${max} ανανεώσεων υπηρεσιών. Δοκιμάστε ξανά αύριο.'`, not owner `'Δεν έχετε δικαίωμα να ανανεώσετε αυτή την υπηρεσία'` → NEW `'Αυτή η υπηρεσία ανανεώθηκε πρόσφατα'`, `'Όριο ${n} ανανεώσεων ανά ημέρα'`, `'Service not found'` (service_writes.py refresh_service).
- Report: OLD success `'Η αναφορά σας υποβλήθηκε επιτυχώς. Θα την εξετάσουμε άμεσα.'`, validation `'Μη έγκυρα δεδομένα αναφοράς'` → NEW `'Η αναφορά υποβλήθηκε'` / English envelope.
- Possibly intentional?: no.

### D7. Edit (PATCH) no longer enforces description ≥ 80 chars — MEDIUM
- OLD: `updateServiceInfoSchema.description` keeps both refines (≥80 and ≤5000 stripped chars) when provided (validations/service.ts:1505-1515).
- NEW: `UpdateServiceSerializer.validate_description` only checks ≤5000; its docstring wrongly claims OLD had no min (serializers/service.py:246-252).
- Impact: API/clients bypassing the form can save short descriptions; UI is still gated by the identical zod form schema.
- Possibly intentional?: no (based on a misreading).

### D8. Draft → pending transition is conditional in NEW — MEDIUM
- OLD: any successful info update of a draft sets `status: 'pending'` unconditionally, then fires admin email + first-service Brevo (update-service.ts:341, :423-466).
- NEW: transitions only if effective title ≥5, stripped description ≥20, and category/subcategory/subdivision non-empty (service_writes.py:320-327); otherwise stays draft, no email.
- Impact: a partial draft PATCH (API or future UI) stays draft where old published it to moderation. Through today's edit form (fully validated) it is usually equivalent.
- Possibly intentional?: maybe (safer), but differs from old.

### D9. Delete / archive do not resync Brevo lists — MEDIUM
- OLD: both call `brevoWorkflowService.handleUserStateChange(user.id)` (delete-service.ts:101, :193) — moves a pro with no services back to NOSERVICES.
- NEW: `delete_service` / `archive_service` (service_writes.py:441-452) enqueue nothing (`brevo_state_change` task exists and is used elsewhere).
- Possibly intentional?: no.

### D10. Report service: different email, limits, throttle — MEDIUM
- OLD: zod 10–500 chars (validations/service.ts:345-348); dedicated `sendServiceReportEmail(serviceInfo, reporterInfo, {details}, servicePageUrl=/s/{slug})`; no throttle.
- NEW: 10–4000 chars (serializers/service.py:450); generic `send_contact_admin_email(name, email, "Αναφορά υπηρεσίας: …", "Service ID/Slug/description")` (views/public/service.py:120-135) — different template, no service URL; `ReportThrottle` 5/hour.
- Possibly intentional?: no (throttle maybe).

### D11. Shared ServiceCard shows coverage flags from the PROFILE instead of the SERVICE type — MEDIUM
- OLD: `CoverageDisplay online={service.type?.online} onbase={service.type?.onbase} onsite={service.type?.onsite}` (shared/service-card.tsx:121-123).
- NEW: `online/onbase/onsite={service.profile?.coverage?.…}` (same lines). Archive cards still use `service.type` (unchanged).
- Impact: related services, "additional services", home carousel and saved-services cards label a presence-only service as Online (or vice versa) when the pro's profile coverage differs. Introduced in "first commit", not in the PR #490 port.
- Possibly intentional?: unclear — no commit rationale.

### D12. Promoted auto-refresh actually runs in NEW (it was effectively dead in OLD) — MEDIUM
- OLD: Vercel cron hits `GET /api/cron/auto-refresh` (vercel.json) but the route exports only `POST` (app/api/cron/auto-refresh/route.ts) → 405; promoted services were never auto-bumped. Response shape `{refreshed, profiles}`.
- NEW: Celery beat `services-auto-refresh-promoted` at 00:00 (config/settings/base.py:327-330) bumps `refreshedAt/sortDate` of all promoted subscribers' published services; endpoint accepts GET+POST and returns `{refreshed}` only.
- Impact: archive default order (`featured desc, sortDate desc`) and "recent" sort change daily in favour of promoted pros, unlike prod.
- Possibly intentional?: possibly (it implements the documented intent) — flag for decision.

### D13. Archive sidebar "Κατηγορία" (subcategory) dropdown content/order — MEDIUM
- OLD: `taxonomyData.subcategories` = every service subcategory (across all categories) that has published services, in taxonomy order, each with `children` filtered to populated subdivisions; independent of search/county/online (get-services.ts:1125-1172).
- NEW: backend `availableSubcategories` = subcategories under the active search/county/online filters, ordered by count desc (service_reads.py:683-696); FE spreads the full taxonomy node (children unfiltered) (frontend get-services.ts:189-203). On demo/slug data it is limited to siblings of the current category.
- Impact: with a county/online/search filter the dropdown loses options (and the current subcategory may not be selectable/selected); order differs.
- Possibly intentional?: no.

### D14. Service-page breadcrumb uses plural labels — MEDIUM (copy)
- OLD: segments use `category.label`, `subcategory.label`, `subdivision.label` (get-service.ts:236-255).
- NEW: `label: r.plural ?? r.label` (frontend get-service.ts:220).
- Impact: crumbs read e.g. plural forms where prod shows singular labels. Resolution is also flat (`findServiceBySlug/ById`, pro fallback) instead of hierarchical; unresolved values fall back to raw ids instead of the crumb being omitted.
- Possibly intentional?: no.

### D15. Archive base crumb "Υπηρεσίες" links to /ipiresies instead of /categories — LOW
- OLD: `getBreadcrumbsForNewRoutes(..., {basePath:'/ipiresies', baseLabel:'Υπηρεσίες', baseHref:'/categories'})` (get-services.ts:1108-1117); util supports `baseHref`.
- NEW: util has no `baseHref` option and the call omits it (frontend lib/utils/datasets.ts, get-services.ts:285) → href `/ipiresies`.
- Possibly intentional?: no.

### D16. County coverage filter is broader — MEDIUM
- OLD `buildCountyCoverageFilter`: `coverage.county == id` OR `coverage.counties ∋ id` OR `coverage.counties ∋ NATIONWIDE_ID` (get-services.ts:73-103).
- NEW `_county_coverage_q`: additionally `coverage.area == id`, `coverage.areas ∋ id`, and `coverage.county == <nationwide>` for every id in `NATIONWIDE_IDS` (service_reads.py:31-45).
- Impact: extra services appear under county filters (incl. area/county id collisions such as the documented 54 Πανελλαδικά/Άθυρα case).
- Possibly intentional?: possibly a fix, but changes result sets/counts.

### D17. Draft-related side effects: cooldown triggered by submit, throttle counts failures, title "Untitled", no plan gate, blank addons kept — LOW
- `create_service` sets `profile.last_service_draft = now` on normal submit (service_writes.py:200); OLD only on draft (create-service.ts:294) → a draft within 30 s after a submit is refused.
- DRF `ServiceDraftThrottle` (1/30 s) counts every POST, including validation failures (e.g. D2); OLD only stamped successful drafts.
- Blank draft title stored as `'Untitled'` (service_writes.py:246); OLD stored `''` (slug `untitled-{id}` in both). Dashboard list shows "Untitled".
- OLD ran `canCreateService` before drafts too (create-service.ts:102); NEW draft has no plan gate (UI already blocks at limit via ServiceLimitSheet).
- OLD filtered out addons lacking title/description/price and FAQs lacking Q/A before saving (create-service.ts:254-269); NEW stores them as sent.

### D18. Dashboard: new "Κατηγορία" filter Select is a no-op — LOW
- OLD: no category filter UI.
- NEW: service-table-filters.tsx adds a category Select (slug values) but the list page never reads `params.category` into `filters` (dashboard/services/(list)/page.tsx:43-50), so selection has no effect and the chip never shows; backend would compare the slug against stored cuid ids anyway (`qs.filter(category=…)`, service_reads.py:732), and does not treat `'all'` specially (OLD skipped `category === 'all'`, get-user-services.ts:95).

### D19. Dashboard search semantics — LOW
- OLD: OR of `title contains <term>` / `description contains <term>` (case-insensitive, accent-sensitive, whole phrase) / `tags hasSome [term]` (exact tag id) (get-user-services.ts:104-110).
- NEW: per-word AND over `title_normalized/description_normalized` + tag-label slug match (service_reads.py:736-746).

### D20. Archive search tokenisation — LOW
- OLD `buildSearchFilter`: ignores searches <2 chars, drops words <2 chars, original-term fallback only for single-word searches (build-search-filter.ts).
- NEW: no length guard, keeps 1-char words, always ORs the full original phrase on title/description/displayName for each word (service_reads.py:160-163).

### D21. Archive query params — LOW
- `?online=false`: OLD → no filter (only `'true'`/`''` = true, get-services.ts:921-924); NEW → filters `type.online = false` (service_reads.py:132-147).
- `?περιοχή=`: OLD county = `county || περιοχή`; NEW backend only reads `county` (service_reads.py:663) while the UI hook shows the county as selected → UI/result mismatch on legacy links.
- Invalid `sortBy` and `popular`: OLD → `default`; NEW maps `popular` to review-count order.

### D22. Role/permission gates on owner actions — LOW
- OLD: archive, refresh, media/info update, get-for-edit check only ownership; create blocked only `role === 'user'` (admin could create); delete required freelancer/company.
- NEW: all write/edit endpoints require `IsProfessional` (freelancer/company) — admins get 403 "Professional account required.".

### D23. Taxonomy paths / sitemap / nav include unresolved values — LOW
- OLD `getServiceTaxonomyPaths` resolves hierarchically and skips groups whose category is not in the taxonomy (get-services.ts:758-772); nav menu built from taxonomy tree only.
- NEW returns raw values when not resolvable (`_id_to_slug().get(v, v)`, service_reads.py:633-647); `/ipiresies/sitemap.ts` can emit URLs with raw ids (they 404 via metadata); nav keeps unknown categories with raw-id labels (frontend get-categories.ts:300-354).

### D24. Smaller backend validation/shape deltas — LOW
- Media items not validated against `cloudinaryResourceSchema` (public_id/secure_url/resource_type required) — any JSON accepted then key-whitelisted (serializers `ListField(JSONField)`); `type` not required to contain all 6 booleans.
- NEW server enforces addons ≤3 / faq ≤5 (+ uniqueness on update); OLD server `createServiceSchema`/`updateServiceInfoSchema` had no max (client step schema did).
- Sanitizer: bleach `strip=True` keeps text inside `<script>/<style>` while sanitize-html drops it.
- `GET /api/services/by-slug/{slug}` (unused) has no profile-published gate (OLD getServiceBySlug had one).
- Create-success page button: OLD "Δημιουργία Νέας Υπηρεσίας" → NEW "Προσθήκη Νέας Υπηρεσίας" (create/success/page.tsx:96).
- FeaturedStarButton hidden for non-admins when payments are in test mode (`usePaymentsAccess`) — possibly intentional (test-mode gating).
- `getCategoriesPage` backend `popularSubdivisions` is featured-based (service_reads.py:441-460) — FE `getCategoriesPageData` correctly ignores it and rebuilds the OLD count-based list, but the backend field is misleading.
- `auto-refresh` `.update()` bypasses post_save → Redis `service:page:*` not purged (sortDate not shown, harmless).

## 4. Confirmed same
- Client-side validation: `lib/validations/service.ts` identical (only enum import shim); all 5 create steps, edit form, media form, delete form, step components identical; create/edit/success/list/edit pages structurally identical (edit unwraps `{service}` defensively).
- Create serializer mirrors `createServiceSchema` field-for-field (title 10–100, description 80–5000 stripped, taxonomy required, tags ≤10, price int ≤10000, fixed→price required & ≥5, duration 0–365, type refinements, subscriptionType required for subscription, addon 5–100/10–500/5–5000€ + uniqueness, FAQ 10–200/2–1000 + uniqueness, media ≤10).
- Slug: `generate_service_slug` = OLD `generateServiceSlug` (`createSlug(title)-{id}`; Greek→Latin map verified key-for-key and order-identical, 97 entries); regenerated on title change; draft slug from "untitled".
- Status machine: create → pending, draft → draft, draft→pending on edit (see D8 nuance), published/rejected stay as-is on edit, archive → inactive, delete hard-deletes; users cannot publish.
- Plan limits: free 3 / promoted 15 (published+pending), featured 0/3, daily manual refresh 3 / unlimited, refresh 24 h per service, refresh-on-edit (credits + 24 h) updates counters; `remainingRefreshes` math identical (0 for promoted).
- Sanitization of description (same tag/attr/scheme whitelist), normalized title/description, media pending/blob stripping on create/draft/media update; media never touched by info update.
- Admin "service created" email on submit and on draft→pending; first non-draft service → Brevo ACTIVEPROS.
- Service page: published + profile.published gate; ID parsed from slug tail; related = same category, featured/rating/reviews/updatedAt, take 5, shuffled; additional services only for active promoted subscriber (featured, rating, take 5); breadcrumb buttons (save/owner); about-section budget/size/contact/payment/settlement/tags resolution; coverage resolution; all service-page components (gallery, ServiceOrderFixed/addons/price calc, FAQ, info, meta, contact) identical apart from types.
- Archive listing: taxonomy filter, online/county combination logic, auto-location-from-search, search fields (title/description/coverage/displayName/username/tags/subcategory/subdivision/pro-subcategory), sort map (recent/oldest/price/rating), default `featured desc, sortDate desc`, `shuffleFeatured` on the page slice, page/limit defaults 1/20, `hasMore`, counties list (FE dataset), not-found for bad slugs (both 404 via `generateMetadata`→`Meta`→`notFound()`), empty-state copy, archive card, pagination, results summary, ArchiveLayout/banner (drawer change is intentional).
- `getServicesCount` (taxonomy-only, cached), dashboard list defaults (limit 12, sortBy updatedAt→sortDate desc, status filter, canFeatureMore/canCreateMore/hasPromotedPlan/maxFeaturedServices), stats counts, recent services (5, sortDate desc, all statuses), `getCategoriesPageData` and `getNavigationMenuData` FE ports reproduce OLD ranking (path counts, top-3/top-6, taxonomy order).
- Metadata templates for subcategory/subdivision archives and `/ipiresies` identical; services sitemap URL structure identical.

## 5. Open questions / couldn't verify
- `getServicesWithPagination` → `api.get('/services')`: Django only has POST on `/api/services/` (list is at `/api/services/list`), so it would 405 — but the function is unused in both apps; left as note.
- `ServiceDraftThrottle` throttled message text: assumed DRF default English; no custom handler found in the services frontend action.
- Email bodies (`send_service_created_email` vs `SERVICE_CREATED` template, incl. OLD `publicUrl=/ipiresies/{slug}` and adminProfileUrl) — delegated to emails domain; only call sites compared.
- Whether `serialize_profile_summary` returns `published`/`portfolio`/`terms` exactly as OLD `SERVICE_DETAIL_SELECT` — field names present; values belong to profiles domain.
- D12 needs a product decision (old auto-refresh never effectively ran in prod).
