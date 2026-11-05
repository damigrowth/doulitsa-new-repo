# Pass 4: adversarial verification of SERVICES + HOME/SEARCH/TAXONOMY (2026-11-05)

Scope:
- Every numbered finding in services.md (D1–D24), pass3-services.md (P3-S1..S4, C1–C4), home-search-taxonomy.md (HST D1–D18) and pass3-home-search-taxonomy.md (N1–N4, C1–C3).
- The service and taxonomy items in pass2-authz-security.md, pass2-validation-matrix.md D2 and pass2-routes-urls.md D1.
- The throttle correction (pass3-profiles-dashboard C1).

Method: every verdict was re-derived from the code (OLD `oldnext/`, NEW `frontend/` + `backend/`). Measurements were re-run with my own scripts over `backend/apps/core/management/commands/_taxonomy_maps.json` and `frontend/src/lib/taxonomies/maps.generated.json`. The DRF behaviour was checked against the installed DRF 3.15.2 source. No code was changed and no git write was run.

Verdicts:
- **CONFIRMED**: the claim holds as written.
- **ADJUSTED**: the core holds, but a detail, scope or severity changed.
- **REFUTED**: the claim is wrong.
- **UNVERIFIABLE**: the claim needs a live or DB check.

---

## A. Canonical groups (same root cause, one fix each)

### CG-1. Taxonomy level resolved through the flat `bySlug` map (slug collisions)
**Members:**
- HST D1
- P3-S1 (+C4)
- N2
- N2b
- pass2-routes D1 (soft-404, same `enrich` stub)
- the "slug-stored data only" part of services D13

**Root cause, verified:**
- The service taxonomy has 21 slug collisions:
  - 20 subcategory↔subdivision collisions. In 19 of them the subdivision is a child of its same-slug subcategory, e.g. `/ipiresies/udraulika/udraulika`.
  - 1 category↔subcategory collision: `marketing` (category `5BTU2t`, subcategory `zzjBDA`).
- `service.bySlug` points all 20 subcategory slugs at the SUBDIVISION, and `marketing` at the SUBCATEGORY `zzjBDA`. The result is identical in the backend JSON and the frontend maps (my script).
- Any code that derives the *level* or *node* from `bySlug` is wrong for these 21 slugs.

**Two code sites, one rule:** never pick a taxonomy node by `bySlug` alone. Resolve it level-aware, like OLD's tree walk.
1. **Backend** `apps/core/taxonomy.py:43-81` `_service_indexes`:
   - Categories are "bySlug nodes whose id ∈ byCategory". That gives 73 "categories", 437 "subcategories" and 448 "subdivisions".
   - The real tree has 8 / 88 / 490.
   - Missing: all 8 Marketing subcategories and all 42 Marketing subdivisions. Re-measured, exact match with HST D1.
   - Fix: build the lists from `hierarchy` levels, or from `build_maps()["service"]["tree"]` (maps_builder.py:82). Note that `tree` is present only in the DB-built maps; the shipped JSON has no tree, so use `hierarchy` there.
2. **Frontend** `frontend/src/actions/services/get-services.ts:172-181`:
   - `lookup = findServiceBySlug(k) ?? findServiceById(k)`.
   - `enrich` returns a stub `{id:slug, slug, label:slug}` for unknown slugs.
   - Fix: resolve with `findTaxonomyBySubcategorySlug` (subcategory/subdivision routes, which also yields the parent `currentCategory`) and with a top-level-only lookup for `/categories/[category]`. Return `{success:false, error:'… not found'}` when nothing resolves. That one change fixes P3-S1, N2, N2b and the routes D1 soft-404s.

### CG-2. Tag search compares tag SLUGS against stored tag IDS
**Members:**
- N1
- pass3-HST C1
- the tag clause of services D19

**Verified:**
- OLD `findMatchingTagIds` returns ids (`build-search-conditions.ts:19-27, :64-67`).
- NEW `matching_tag_slugs` returns `tags.bySlug` keys (`core/taxonomy.py:244-259`), e.g. `'2d-animation'`, whose id is `'23'`.
- `taxonomy_value_candidates` expands only service/pro ids (`_slug_to_ids`, taxonomy.py:93-111), so the slug stays a slug.
- The create form saves `value: tag.id` (`dashboard/services/create/page.tsx:49-52`).
- `canonicalize_taxonomies.py:62` maps tags through the *service* byId, which leaves numeric ids unchanged.

**Fix:** return tag ids (`node["id"]`) from the matcher, or expand to both slug and id. Apply it to `_build_search_conditions` (service_reads.py:83-85). The dashboard caveat is under N1 below.

### CG-3. Location resolver: area → own id instead of parent county; unresolvable → filter instead of ignore
**Members:**
- services D16
- P3-S2 (+C2)
- the `περιοχή` part of D21
- profiles-public-archives D7 (same function, other surface)

**Verified:**
- `core/locations.py:111-137`: `resolve_to_county_id = location_id_for_slug`. It returns the area's own id, and the docstring admits it does not walk to the county.
- `service_reads.py:135` uses `resolve_to_county_id(county) or str(county)`, so an unresolvable value is used as the raw filter.
- `_county_coverage_q` (:31-45) adds `coverage.area` and `coverage.areas`, plus `county == nationwide`.
- OLD:
  - `resolveToCountyId` walks area → parent county (`lib/taxonomies/index.ts:359-376`).
  - The filter is only county, `counties ∋ id` or `counties ∋ '54'` (get-services.ts:73-103).
  - It is skipped entirely when the value is unresolvable (`if (countyId)`, get-services.ts:446-514).
- Auto-location from search uses the same resolver (:153-158).

**Fix:**
- A services/profiles helper that maps area → parent county (from `Location.parent_id`) and returns None when the value is unresolvable.
- Filter only when an id resolves.
- Drop the area/areas clauses so the filter matches OLD.

### CG-4. All `ScopedRateThrottle` subclasses are no-ops
**Members (throttle parts only):**
- services D2 (throttle-slot claim)
- D6 (English throttle text)
- D10 (5/hour report limit)
- D17 bullet 2
- HST D3 (5/day submission throttle)
- pass3-services C1 and pass3-profiles-dashboard C1 (both already correct)

**Verified:**
- DRF 3.15.2 `ScopedRateThrottle.allow_request` sets `self.scope = getattr(view, 'throttle_scope', None)` and returns True when it is unset (rest_framework/throttling.py:219-225).
- `grep throttle_scope` over apps/common/config finds nothing, and `common/throttling.py` does not override `allow_request`.
- So `ServiceDraftThrottle`, `ReportThrottle` and `TaxonomySubmissionThrottle` never fire.
- Because these views set `throttle_classes = [...]`, they also drop the global anon/user throttles (`config/settings/base.py:240-246`), so these endpoints have **no** DRF rate limit at all.
- The service-layer limits still apply: the 30 s draft cooldown via `last_service_draft`, and 5 submissions per 24 h counted on created rows.

### CG-5. Public search/count accept `status` override
**Members:**
- services D1
- pass2-authz §1 note

See D1 below. Same family as pass2-authz D2 (profiles `published`), which is a separate code path.

### CG-6. Archive base crumb `baseHref:'/categories'` dropped
**Members:**
- services D15
- HST D13 (duplicates; merge)

### CG-7. Error text plumbing (English / generic)
**Members:**
- services D6
- HST D2
- HST D3 texts
- lib-shared-sweep D3 cluster

HST D2 is the one structural bug in this group: `error` vs `message`.

### CG-8. Taxonomy live-refresh cache gaps
**Members:**
- HST D5
- HST D6
- HST D15
- related pass2-caching D3 (stale ETag/lru race)

---

## B. Verdict table

| Id | Title (short) | Verdict | Sev (final) | Evidence (OLD / NEW) |
|---|---|---|---|---|
| svc D1 | `status` override on public search/count → drafts listable | CONFIRMED | HIGH | OLD `get-services.ts:392` default only; file is `'use server'` (line 1) but `getServicesByFilters`/`getServicesCount` have **zero importers** outside the file (grep), so on Next 15.5 no client action ID exists. NEW `views/public/service.py:226-243` AllowAny; `serializers/service.py:425` free `status` CharField; `service_reads.py:580,611` `_public_qs(filters.get("status") or PUBLISHED)`. See note. |
| svc D2 | Draft fails with empty duration | CONFIRMED (one sub-claim refuted) | HIGH | OLD `create-service.ts:191` `duration || undefined`. NEW FE `actions/services/create-service.ts:25` `Number(''\|\|0)=0`; `DraftServiceSerializer.duration min_value=1` (serializers/service.py:349-355). The "consumes the throttle slot" sub-claim is refuted by CG-4. |
| svc D3 | `?search=` lost from filter state | CONFIRMED | HIGH | NEW backend bundle has no `filters` key (`service_reads.py:713-730`); FE `get-services.ts:296` `filters: bundle.filters` (undefined); `use-archive-filters.ts` (identical to OLD) never parses `search`. OLD returns `filters` incl. `search` (`get-services.ts:917-929, :1351`). |
| svc D4 | Subdivision dropdown/carousel truncated (8, filtered, current not excluded) | CONFIRMED (+extension) | HIGH | NEW `service_reads.py:672-678` `[:8]` under active filters with `subdivision: None`; FE uses it for both lists (`get-services.ts:209, :236-258`). OLD `:1174-1190` (all populated children of current sub), `:1222-1255` (siblings excl. current, top 5), `:1258-1329`. Extension: on root `/ipiresies` OLD `subdivisions=[]`, NEW passes 8. |
| svc D5 | Service meta description `" -  - …"` | CONFIRMED | HIGH | NEW `_card` sets `category` = Greek label (`service_reads.py:204`); `fetch-entity.ts:83-85` → `resolveServiceHierarchy(label,…)` → `findServiceById(label)` null → all null (`taxonomies/index.ts:575-597`); same template both (`pages.ts:17/18`); reused for JSON-LD (`s/[slug]/page.tsx:125-126`). |
| svc D6 | Greek messages replaced | ADJUSTED | MEDIUM | Envelope `common/exceptions.py:133`; `IsProfessional.message` English (`roles.py:53`); FE success texts `create-service.ts:45,60`, `update-service.ts:20,61`, `report-service.ts:20`. Corrections in note. |
| svc D7 | PATCH skips description ≥80 | CONFIRMED | LOW (was MEDIUM) | OLD `validations/service.ts:1505-1515` both refines. NEW `serializers/service.py:246-252` ≤5000 only. Reachable only by direct API calls; the edit form validates with `createServiceSchema` (`form-service-edit.tsx:118`). |
| svc D8 | Draft→pending conditional | CONFIRMED | MEDIUM (possibly intentional) | NEW `service_writes.py:314-327` gates on title≥5/desc≥20/taxonomy. |
| svc D9 | Delete/archive skip Brevo resync | CONFIRMED | MEDIUM | OLD `delete-service.ts:104, :197` `handleUserStateChange`. NEW `service_writes.py:441-452` nothing. |
| svc D10 | Report email/limits/throttle | ADJUSTED | MEDIUM | Email: NEW `views/public/service.py:120-135` generic `send_contact_admin_email`, no URL; OLD `report-service.ts:78` `sendServiceReportEmail`. Length 10–4000 vs 10–500 (`serializers/service.py:450` / `validations/service.ts:345-348`). The throttle part is refuted (CG-4): there is no limit, the same as OLD. |
| svc D11 | Shared card coverage from profile | CONFIRMED | MEDIUM | `diff` shared/service-card.tsx:121-123: OLD `service.type?.online`, NEW `service.profile?.coverage?.online`. |
| svc D12 | Auto-refresh actually runs | CONFIRMED (product decision) | MEDIUM | OLD `app/api/cron/auto-refresh/route.ts:14` exports only `POST`; `vercel.json:8-9` cron (Vercel sends GET) → 405. NEW beat `base.py:327-330`. |
| svc D13 | Sidebar subcategory list filtered/count-ordered | CONFIRMED | MEDIUM | OLD `get-services.ts:1125-1172` (all with services, taxonomy order, children filtered). NEW `service_reads.py:680-696` filtered and `-count`; the `parent_row` lookup uses a slug against id-stored rows, so it never narrows on live data; FE spreads the full node (`get-services.ts:189-205`). |
| svc D14 | Service breadcrumb uses plural | ADJUSTED | LOW | NEW `get-service.ts:220` `r.plural ?? r.label`, but **0 of 586** service nodes have a plural different from the label (script), so there is no visible copy change today. What remains: flat resolution with a pro fallback, and raw-id labels instead of an omitted crumb. |
| svc D15 = HST D13 | Base crumb → /ipiresies not /categories | CONFIRMED (merged CG-6) | LOW | OLD `get-services.ts:1112-1116` `baseHref:'/categories'`. NEW `grep baseHref frontend/src` = 0 hits; `get-services.ts:285`. |
| svc D16 | County filter broader | CONFIRMED (merged CG-3) | MEDIUM | NEW `service_reads.py:31-45` adds area/areas/`county==nw`. |
| svc D17 | Draft side effects | ADJUSTED | LOW | Bullet 1 CONFIRMED: NEW `service_writes.py:200` stamps on submit; OLD stamps only inside `if (status==='draft')` (`create-service.ts:223-296`). Bullet 2 REFUTED (CG-4). Bullet 3 CONFIRMED ('Untitled' `:246` vs OLD `''` `:227`). Bullet 4 CONFIRMED (OLD `canCreateService` at `:102` before the draft branch; NEW draft has no gate). Bullet 5 CONFIRMED (OLD filters `:253-269`; NEW `_common_service_fields:141-142` stores as sent). |
| svc D18 | Dashboard category Select no-op | CONFIRMED | LOW | NEW `(list)/page.tsx:27-34, 44-51` never reads `category`; Select at `service-table-filters.tsx:123-137`. OLD has no Select (only a chip at `:154`). |
| svc D19 | Dashboard search semantics | CONFIRMED | LOW | OLD `get-user-services.ts:104-110` (phrase OR, `tags hasSome [term]`). NEW `service_reads.py:736-746`. The tag branch never matches in either app (see N1). |
| svc D20 | Archive tokenisation | CONFIRMED | LOW | OLD `build-search-filter.ts:26-48` (len<2 → null, words≥2, original only for single word). NEW `service_reads.py:160-163`. |
| svc D21 | Query params (`online=false`, `περιοχή`, `popular`) | CONFIRMED | LOW | OLD `get-services.ts:920-924`, `types/common.ts:101-110` (no `popular`). NEW `service_reads.py:128-130, :663`, `_SORT_MAP` has `popular`. |
| svc D22 | Role gates on owner actions | CONFIRMED | LOW | OLD `create-service.ts:73` (blocks only `user`), `delete-service.ts:33`. NEW all write views `IsProfessional` (`views/public/service.py:32-106`). |
| svc D23 | Taxonomy paths/sitemap/nav raw values | CONFIRMED (data-dependent) | LOW | NEW `service_reads.py:633-647` `.get(v, v)`; `ipiresies/sitemap.ts` emits as-is. |
| svc D24 | Smaller deltas | CONFIRMED | LOW | Media `ListField(JSONField)` (`serializers/service.py:182-188, 393-398`); bleach `strip=True` (`service_writes.py:60-66`); by-slug view has no profile-published gate (`service_reads.py:250-251`); button text (`success/page.tsx:96` both); `usePaymentsAccess` gate (`featured-star-button.tsx:40-49`); auto-refresh `.update()` (`tasks.py:43-46`) skips the `post_save` purge (`signals.py:20`). |
| P3-S1 (+C4) | Archive context lost / colliding banners | CONFIRMED (CG-1) | MEDIUM | NEW `service_reads.py:710` `currentCategory` None without `categorySlug`; subcategory route never has one (`[subcategory]/page.tsx:62-71`); `archive-layout.tsx:229-283`; `services-schema.tsx:31-37`. Script: 18/20 descriptions and 20/20 images differ. |
| P3-S2 (+C2) | Area→self, garbage→0 | CONFIRMED (CG-3) | MEDIUM | See CG-3. |
| P3-S3 | Refresh quota day boundary UTC | CONFIRMED | LOW | NEW `service_writes.py:340-347, 473-476` `datetime.now(timezone.utc).date()` (ignores `TIME_ZONE=Europe/Athens`, base.py:52). OLD `refresh-service.ts:88-95` local midnight with `instrumentation.ts:25` `TZ=Europe/Athens`. |
| P3-S4 | Bad `?limit` / repeated `?sortBy` → error page | CONFIRMED | LOW | Page `parseInt` → NaN → JSON `null` → `ServiceArchiveRequestSerializer.limit` (not nullable, 1–100, `serializers/service.py:443`) → 400 → `throw` (`ipiresies/page.tsx:43-45`). OLD `params.limit \|\| 20` (`get-services.ts:903`). List sortBy → `_SORT_MAP.get(list)` TypeError (`service_reads.py:170`). |
| HST D1 | Marketing missing from search index | CONFIRMED (CG-1) | HIGH | Measured exactly 73/437/448 vs 8/88/490; 8 subs and 42 divs missing. The sub-claim "wrong `/ipiresies/<div-slug>` URL" is ADJUSTED, see note. |
| HST D2 | Submission errors never shown | CONFIRMED | HIGH | NEW FE `actions/taxonomy-submission.ts:16` returns `error`; forms read `result.message` (`service-details-step.tsx:76`, `form-basic-info.tsx:230`, `form-service-edit.tsx:244`). OLD returns `message` (`actions/taxonomy-submission.ts:32-101`). |
| HST D3 | 5/day throttle + English texts | ADJUSTED | LOW (was MEDIUM) | Throttle part REFUTED (CG-4). Remaining: `IsProfessional` English before the Greek service check (`submissions.py:19`, `roles.py:53`); DRF default min/max texts (`serializers/taxonomy.py:10`); trim order (OLD `.min().max().transform(trim)`, `validations/taxonomy-submission.ts:8-12`). All currently masked by HST D2. |
| HST D4 | /api/home leaks contact PII | CONFIRMED (dup of P0b #6) | HIGH | `home.py:69` `serialize_profile_summary`; `profile_reads.py:98-126` phone/viber/whatsapp/first/last/visibility. |
| HST D5 | Live-refresh misses caches | CONFIRMED (CG-8) | MEDIUM | `taxonomy/services/cache.py:24-38` clears neither `core.taxonomy._pro_subcategories` nor `_location_id_to_name`; `taxonomy_data._maps` is static JSON (`taxonomy_data.py:33-35`) and feeds the duplicate checks (`submissions.py:73-90`). |
| HST D6 | Approve/reject purge no-op | CONFIRMED (CG-8) | MEDIUM | `admin_submissions.py:284-301` `delete_many(["…*"])` literal keys; the FE admin action has 0 `revalidat*` calls; the approve SQL (`array_replace`) fires no `post_save`. |
| HST D7 | Mega-menu junk entries | CONFIRMED (data-dependent) | MEDIUM | `service_reads.py:499-520` (`_uncategorized`, `_`, no order_by); FE `get-categories.ts:305-355` maps everything. |
| HST D8 | Tie-break order | CONFIRMED | MEDIUM | No `order_by` in nav; `-count` only in `:420-425, :463, :480-486`. |
| HST D9 | Popular subs sliced before resolve; pro fallback | CONFIRMED | LOW/MEDIUM | `service_reads.py:480-486` `[:limit]` on `(subcategory,category)` pairs; FE `get-home-data.ts:44-49` service→pro resolve chain, `:229-234` filter after slice. |
| HST D10 | Home category cards order/counts | CONFIRMED | LOW | FE `get-home-data.ts:237-260` featured filter → slice(8) → `localeCompare('el')`. |
| HST D11 | Featured tabs hide empty categories | CONFIRMED (possibly intentional) | LOW | FE `get-home-data.ts:182-187`. |
| HST D12 | Location boost now fires | CONFIRMED (with pass3 C2 correction) | MEDIUM/decision | OLD `findMatchingLocationInCoverage` uses `findLocationById` = last-write-wins `byId` (`scripts/build-taxonomy-maps.ts:186-207`); in the regenerated maps id `2` → "12351", `12` → "Αγία Τριάδα", `54` → "Πανελλαδικά" (not "Σε όλη την Ελλάδα"). NEW county-first (`core/taxonomy.py:302-347`). |
| HST D14 | Drill-down cards inherit category image/icon | ADJUSTED | LOW→MEDIUM (copy/visual) | NEW `get-categories.ts:159-160`. Only **3/88** subs lack an image, but **88/88** lack an icon, so every subcategory card on `/categories/[cat]` now renders the parent's icon via `CategoryIcon` (`categories-grid.tsx:83`). OLD has the icon commented out (`get-categories.ts:267`), so CategoryIcon returned null. The bigger effect is the icon, not the image. |
| HST D15 | byId children frozen | CONFIRMED (CG-8) | LOW/MEDIUM | `maps_builder.py:30-50` `merge(n.raw, …)` keeps raw `children`; `byCategory` comes from raw children too; `_service_indexes` walks those. |
| HST D16 | Home profiles exclude `image=""` | CONFIRMED | LOW (likely intentional) | `home.py:65`. |
| HST D17 | Footer cookies link/button | CONFIRMED (consent feature) | LOW | `constants/datasets/footer.ts:12`, `footer-global.tsx:152`. |
| HST D18 | Taxonomy CRUD slug/order semantics | CONFIRMED (admin-owned) | LOW | NEW `dataset_ops.py:60, 89/130 order=0, :101/141/245` 409. OLD `taxonomies-shared.ts:206, 281` `generateUniqueSlug`. |
| N1 | Tag search never matches | ADJUSTED (CG-2) | HIGH (archive + suggestions) | Archive/suggestions CONFIRMED. The dashboard part is REFUTED as a regression, see note. |
| N2 / N2b | `/categories/marketing` + 20 subcategory banners | CONFIRMED (CG-1) | LOW/MEDIUM | Script: `bySlug['marketing']` = `zzjBDA`; image `marketing_449289d8e0` vs `digital_agencies_ellada_3389c8ec8e`; description differs. |
| N3 | Hrefs from stored subcategory | CONFIRMED (data-dependent) | LOW | FE `get-categories.ts:231-262` (first row's `subcategorySlug`), `get-home-data.ts:51-65` `enrichLeaf`. Needs the stale-parent SQL. |
| N4 | `/services/categories?limit=x` → 500 | CONFIRMED (+extension) | LOW | `views/public/service.py:154` bare `int()`. Same in `ServicesListView` (`:223-226`, `page`/`limit`) and the dashboard selector (`service_reads.py:761-763`, authenticated). |
| pass2-val D2 | >3 addons / >5 FAQ services uneditable | CONFIRMED + UNVERIFIABLE (count) | MEDIUM | OLD `updateServiceInfoSchema` `:1541-1542` and `createServiceSchema` addons/faq (`:1079`, `:1146`) have no `.max`. NEW `serializers/service.py:170-181` `max_length=3/5` inherited by Update; the edit form re-sends them (`form-service-edit.tsx:289`). Live: `SELECT count(*) FROM services WHERE jsonb_array_length(coalesce(addons,'[]'))>3 OR jsonb_array_length(coalesce(faq,'[]'))>5;` |
| pass2-routes D1 | Unknown archive slugs → 200 | CONFIRMED (CG-1, FE site) | MEDIUM | OLD `get-services.ts:860-893` returns "not found". NEW `enrich` stub (`get-services.ts:175-181`) never errors; `[subcategory]/page.tsx:74-78` `notFound()` unreachable; `categories/[category]/page.tsx:103-106` `!currentCategory` never true. |
| pass2-authz §4 "by-slug … profile-published gate" | Claim of parity | REFUTED | — | `get_by_slug` = `_public_qs().filter(slug=)` only (`service_reads.py:250-251`); `ServiceBySlugView` AllowAny (`views/public/service.py:172-180`). services D24 is right, the pass2-authz §4 line is wrong. Unused by the FE, LOW. |
| pass3-svc C1 / CG-4 | Throttles no-op | CONFIRMED | — | See CG-4. |
| pass3-HST C2 | D12 evidence from stale snapshot | CONFIRMED | — | `54` → "Σε όλη την Ελλάδα" in the old committed JSON vs "Πανελλαδικά" in the regenerated maps (script). |
| pass3-HST C3 | Snapshot drift isn't taxonomy drift | Not re-verified (no finding attached) | — | — |

---

## C. Notes for non-CONFIRMED verdicts and extensions

**svc D1 (CONFIRMED). Adjacent defect not reported anywhere: count cache poisoning.**
- `count_services` caches under `services:count:<category>|<subcategory>` (`service_reads.py:604-617`). The key ignores **status** and **subdivision**.
- One anonymous `POST /api/services/count {"status":"draft"}` stores the draft count under the published key for 30 min. It is purged only by a Service write (`signals.py:34`).
- Any subdivision-scoped count also returns the subcategory's cached total.
- Today no frontend code calls `getServicesCount` (grep), so the impact is limited to API consumers. Fix it together with D1: force `published` and add `subdivision` to the key.

**svc D2 (CONFIRMED, one sub-claim refuted).** The claim that "the failed POST consumes the 1/30 s draft throttle slot" is false (CG-4). A failed draft does not stamp `last_service_draft` either; the stamp happens after validation (`service_writes.py:232-246`).

**svc D6 (ADJUSTED).**
1. The English DRF "Request was throttled…" draft text cannot occur (CG-4). The only draft cooldown text is `'Περίμενε λίγο πριν αποθηκεύσεις ξανά'` (`service_writes.py:239`), which still differs from OLD `'Μπορείτε να αποθηκεύσετε προσχέδιο ξανά σε N δευτερόλεπτα.'` (`create-service.ts:124`).
2. Missed copy: draft success is OLD `'Η υπηρεσία αποθηκεύτηκε ως προσχέδιο!'` (`create-service.ts:442`) → NEW `'Draft αποθηκεύτηκε'` (`frontend/src/actions/services/create-service.ts:60`).
3. The remaining bullets were spot-checked and hold.

**svc D7 (severity LOW).** The difference is real, but no UI path reaches it: the edit form enforces ≥80 on the client with the same zod schema as OLD.

**svc D10 (ADJUSTED).** There is no 5/hour limit (CG-4); in effect there is no rate limit at all, which matches OLD. The other report gaps still stand: template, no service URL, 4000 vs 500. A small extra: NEW never checks that `service_id` exists before mailing the admin.

**svc D14 (ADJUSTED to LOW).** The plural branch changes nothing today: no service node has a plural different from its label. The plurals are admin-editable, though, so keep the fix (`r.label`). The residual difference is flat lookup instead of hierarchical lookup. Orphan values show raw-id crumbs where OLD omitted the crumb.

**svc D17 (ADJUSTED).** Bullet 2 is refuted (CG-4). The other four bullets are confirmed.

**HST D1 (CONFIRMED, one sub-claim adjusted).**
- The "wrong `/ipiresies/<subdivision-slug>` URL" effect is not a broken URL: for the colliding slugs, the subdivision slug *equals* the subcategory slug.
- The real effect is a **duplicate** suggestion: the real subcategory entry plus a mis-levelled subdivision entry with the same URL. The mis-levelled one carries a wrong `category` label (the subcategory's label).
- One of the pairs has a casing-different label: `sumvouleutikes-upiresies` ("…υπηρεσίες" vs "…Υπηρεσίες").
- `get_featured_services` results are still correct, because `_node_ids("category", …)` is level-aware. The cost is 73 queries instead of 8.

**HST D3 (ADJUSTED to LOW).** The throttle is a no-op (CG-4), so nobody gets locked out. The service-layer 5/24 h counts created rows, the same as OLD (`submissions.py:56-66` vs OLD `:47-61`). What remains is English permission and validation texts, which are hidden today by HST D2.

**HST D14 (ADJUSTED).** The reporter focused on the image (3/88 subcategories affected). The `icon: sub.icon ?? cat.icon` fallback affects **all 88** subcategory cards: each now shows the parent category's icon next to its title. In OLD, `icon` was commented out and `CategoryIcon` returned null.

**N1 (ADJUSTED).**
- Archive search (`_build_search_conditions`) and suggestions are CONFIRMED broken for tag-only matches. OLD matched there by label → id (`build-search-conditions.ts:64-67`).
- The claim that "the dashboard has the same bug" is not a parity regression. OLD dashboard search used `tags: { hasSome: [search.trim()] }` (`get-user-services.ts:108`), an exact match of the raw term against stored ids, so it never label-matched either.
- If the fix is applied to the dashboard (`service_reads.py:743`) too, that is an improvement over OLD, not a parity fix. Decide explicitly.
- Severity depends on the data. Live check: `SELECT count(*) FROM services WHERE status='published' AND cardinality(tags)>0;`

**svc D4 (extension).** On root `/ipiresies` OLD set `taxonomyData.subdivisions = []` (only filled `if (subcategory)`, `get-services.ts:1174`). NEW feeds the 8-item filtered list there too.

**svc D13 (extension, CG-1).** With slug-stored data, `enrichLeafList` → `findServiceBySlug(<colliding sub slug>)` returns the subdivision node, so the dropdown option carries the subdivision's id/description. Live (id-stored) data is not affected.

**N4 (extension).** The same unguarded `int()` exists on public `GET /api/services` (`page`, `limit`). `?page=x` → 500.

**pass2-authz §4 (REFUTED line).** "Service by-slug … use `_public_qs` plus the profile-published gate" is false for by-slug; only the page bundle has the gate (`service_reads.py:286-288`).

---

## D. UNVERIFIABLE-FROM-REPO items (live checks)

| Finding | Check |
|---|---|
| pass2-val D2 | `SELECT count(*) FROM services WHERE jsonb_array_length(coalesce(addons,'[]'))>3 OR jsonb_array_length(coalesce(faq,'[]'))>5;` |
| N1 severity | `SELECT count(*) FROM services WHERE status='published' AND cardinality(tags)>0;`, plus a spot-check that tags are numeric strings: `SELECT tags FROM services WHERE cardinality(tags)>0 LIMIT 20;` |
| CG-1 on prod data | `SELECT slug, array_agg(level) FROM taxonomy_nodes WHERE space='service' GROUP BY slug HAVING count(*)>1;` (confirms the 21 collisions survive admin edits) |
| N3 / HST D7 / D9 / D10 / svc D23 | `SELECT category, subcategory, subdivision, count(*) FROM services WHERE status='published' GROUP BY 1,2,3;` joined to `taxonomy_nodes` (orphans, wrong parents, empty values) |
| pass2-routes D1 | Live: `curl -sI https://test.doulitsa.gr/ipiresies/zz-nope` → expect 404 after the fix (the reporter observed 200) |
| svc D12 | Product decision: keep the nightly promoted auto-refresh or not |
| HST D11 / D16 / D17, svc D8 | Product confirmation of possibly-intentional deltas |
