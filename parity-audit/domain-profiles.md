# Domain: Profiles

AUDIT-ONLY migration parity check. OLD = Next.js + Prisma/Supabase. NEW = Django/DRF backend + Next.js frontend action shim.
Golden rule: NEW must do EVERYTHING OLD did. Every behavior/data/validation/filtering/sorting/pagination/response-shape difference is a bug.

Legend: ✅ matched · ⚠️ partial · ❌ missing/broken · ❓ needs verification

---

## Parity matrix

| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Get own profile by userId | read | get-profile.ts:48-84 (`getProfileByUserId`, `findUnique{uid}` + `PROFILE_DETAIL_INCLUDE`) | views/public/profile.py:161-170 (`MyProfileView`) → selectors/profile_reads.py:9-10, 87-104 (`serialize_profile_owner`) | ⚠️ | OLD includes `services` (published) + `reviews` (max 10, with author) on the payload via `PROFILE_DETAIL_INCLUDE` (selects/profile.ts:83-101). NEW owner payload has NO services/reviews. Frontend `getProfileByUserId` ignores arg and uses JWT. |
| Get public profile by username | read | get-profile.ts:89-113 (`getPublicProfileByUsername`, `findFirst{username, published, isActive}` + `PROFILE_DETAIL_INCLUDE`) | profile.py:173-182 (`PublicProfileByUsernameView`) → profile_reads.py:13-18, 36-84 | ⚠️ | OLD `where: username` is EXACT/case-sensitive; NEW uses `username__iexact` (case-insensitive) — behavior drift. OLD includes services+reviews; NEW summary omits them. |
| Profile detail PAGE bundle | read | get-profile.ts:224-438 (`_getProfilePageData`/`getProfilePageData`) | aggregations.py:73-82 (`ProfilePageView`) → profile_aggregations.py:392-481 (`profile_page_bundle`) | ⚠️ | Many computed fields shifted to frontend enrich (get-profile.ts FE:38-132). Gaps: `featuredCategories` (OLD proTaxonomies.slice(0,8)) returns `[]`; services orderBy differs (OLD `sortDate desc`→`createdAt desc` in INCLUDE; NEW `-sort_date`); `calculatedExperience` formula differs (see below); breadcrumb labels are raw slugs. |
| List profiles by filters (search) | read/list | get-profiles.ts:78-364 (`getProfilesByFilters`) | aggregations.py:30-39 (`ProfilesSearchView`) → profile_aggregations.py:127-162 | ⚠️ | Pagination/sort/role/taxonomy parity OK. BUGS: NATIONWIDE id mismatch, search-subcategory taxonomy mismatch, `online=false` not handled, card shape not pre-transformed (coverage/groupedCoverage). See gaps. |
| Count profiles by filters | read/count | get-profiles.ts:369-427 (`getProfilesCount`) | aggregations.py:42-51 (`ProfilesCountView`) → profile_aggregations.py:165-199 | ⚠️ | OLD count where-clause is MINIMAL: only published+isActive+user+category+subcategory (NO coverage/online/search) (get-profiles.ts:375-402). NEW count applies coverage+search filters too → counts will DIFFER for filtered queries. |
| Archive page data | read | get-profiles.ts:433-926 (`getProfileArchivePageData`) | aggregations.py:54-70 (`ProfilesArchiveView`) → profile_aggregations.py:284-378 | ⚠️ | Large gap. NEW returns empty `taxonomyData.categories`, empty `counties`, empty `subcategories`; no `filteredSubcategoryCounts` groupBy; no validation of category/subcategory existence (OLD returns 'Category not found'). availableSubcategories logic simplified. |
| Pro taxonomy paths (SSG) | read | get-profiles.ts:933-1028 (`getProTaxonomyPaths`) | profile.py:185-191 (`TaxonomyPathsView`) → profile_reads.py:21-33 | ❌ | OLD filters by **user.role** + user.blocked=false + user.confirmed=true, and converts category/subcategory IDs→slugs sorted by count. NEW filters by **Profile.type** (wrong field), NO user.blocked/confirmed guard, returns raw IDs (not slugs), unsorted, no count. |
| Directory page data | read | get-directory.ts:60-232 (`getDirectoryPageData`) | aggregations.py:17-27 (`ProfilesDirectoryView`) → profile_aggregations.py:205-278 | ⚠️ | NEW emits raw subcategory IDs as `label`/`slug` (no taxonomy resolution), `type:null`, no `image`/`description`/`icon`, no plural labels. Counts/grouping OK. Frontend `get-directory.ts` does NOT enrich → UI shows cuids. |
| Update basic info | write | basic-info.ts:26-165 | profile.py:57-76 (`MyBasicInfoView`) → services/profile_updates.py:49-80 | ⚠️ | Field map OK. BUGS: no min-length validation (tagline ≥10, bio ≥80 stripped) — see validation gaps. `image` write: NEW stores `secure_url` string; OLD stored whatever (string column too) — OK. |
| Update additional info | write | additional-info.ts:21-145 | profile.py:36-54 (`MyAdditionalInfoView`) → profile_updates.py:118-164 | ⚠️ | `experience` computed differently: OLD = `currentYear - parseInt(commencement)` (year only); NEW `_years_since` does full date-delta incl. month/day. Differing values. NEW skips fields when null (partial); OLD always writes all → e.g. clearing `rate` to null not possible in NEW (rate skipped when None). |
| Update billing | write | billing.ts:18-139 | profile.py:79-97 (`MyBillingView`) → profile_updates.py:170-201 | ⚠️ | OLD allows roles [freelancer, company, **admin**]; NEW `is_professional() or is_admin()` BUT then requires `user.is_professional()` to load profile → admin path always 404 (profile_updates.py:188). View permission is only `IsAuthenticated` (no role gate) vs OLD `hasAnyRole`. No cross-field invoice validation (see below). |
| Update coverage | write | coverage.ts:18-127 | profile.py:100-108 (`MyCoverageView`) → profile_updates.py:207-212 | ⚠️ | NEW has NO coverage validation (OLD `coverageSchema` requires ≥1 mode, onbase→address/zip/area/county, onsite→counties). `coverageNormalized` generated by different util (string concat of IDs vs OLD location-name resolution). |
| Update portfolio | write | portfolio.ts:18-132 | profile.py:111-119 (`MyPortfolioView`) → profile_updates.py:218-223 | ⚠️ | No max-10 validation (OLD zod max(10)). OLD stores `Prisma.DbNull` when empty; NEW stores `[]`. sanitize differs (`sanitize_resource` vs `sanitizeCloudinaryResources`). |
| Update presentation | write | presentation.ts:21-147 | profile.py:122-139 (`MyPresentationView`) → profile_updates.py:229-253 | ⚠️ | No URL/phone/viber/whatsapp regex validation (OLD zod 10-12 digits, url). OLD writes `Prisma.DbNull` for empty socials; NEW writes whatever passed. Defaults for visibility not applied. |
| Get presentation | read | presentation.ts:153-213 (`getProfilePresentation`) | profile.py:141-155 (`MyPresentationView.get`) | ✅ | Same shape `{id, phone, website, viber, whatsapp, visibility, socials}`. |
| Submit verification | write | verification.ts:21-231 | profile.py:232-248 (`MyVerificationView.post`) → services/verification.py:20-58 | ⚠️ | Core upsert OK (update_or_create, status PENDING). MISSING: admin email notification (OLD `sendNewVerificationEmail`; NEW is a TODO comment, verification.py:51-53). afm validation differs (OLD max 20 chars; NEW strict `^\d{9}$`). |
| Get verification status | read | verification.ts:236-312 (`getVerificationStatus`) | profile.py:250-251 (`MyVerificationView.get`) → verification.py:61-76 | ✅ | Shape matches `{status, afm, name, address, phone, createdAt, updatedAt}`. OLD returns `success:true,data:null` if none; NEW returns null body. FE maps both. |
| Lookup AFM | external | lookup-afm.ts:24-121 | profile.py:197-205 (`LookupAfmView`) → services/afm_lookup.py:33-98 | ❌ | RESPONSE SHAPE DIFFERS. OLD returns `{onomasia, doy_descr, firm_act_descr, postal_address, postal_address_no, postal_zip_code, postal_area_description}`. NEW returns `{afm, name, profession, address(joined), doy, active, registrationDate}` — entirely different keys. UI consuming the AFM result breaks. |
| Report profile | write/email | report-profile.ts:15-119 | profile.py:211-226 (`ReportProfileView`) → verification.py:82-106 | ⚠️ | MISSING email send (OLD `sendProfileReportEmail`; NEW TODO comment, verification.py:95-97). OLD has NO auth requirement on report? Actually OLD calls `requireAuth()` (line 44). NEW `IsAuthenticated` ✅. Validation: OLD requires profileId in body; NEW takes profile_id from URL path. |

---

## Detailed gaps (per ❌/⚠️)

### G1 ❌ NATIONWIDE coverage ID mismatch — county filter returns wrong results
- OLD: `NATIONWIDE_ID = '54'` (datasets.ts:1880), used in coverage `array_contains` checks (get-profiles.ts:156-159, 196-203).
- NEW: `NATIONWIDE_COUNTY_ID = "_all"` (profile_aggregations.py:27), used in `coverage__counties__contains=["_all"]` (profile_aggregations.py:75, 81).
- Impact: Nationwide ("Πανελλαδικά") professionals stored with county id `54` in `coverage.counties` are NEVER matched by county filters in NEW. Directory/county-filtered listings silently drop nationwide pros.
- Fix: set `NATIONWIDE_COUNTY_ID = "54"` to match the production taxonomy.

### G2 ❌ County filter: NEW does not resolve area slug → parent county ID
- OLD: `resolveToCountyId(filters.county)` maps an area slug/name to its parent county ID before matching (get-profiles.ts:123-205; taxonomies/index.ts:359-376). Handles slug collisions (e.g. "thessaloniki").
- NEW: `_apply_coverage_filters` uses `county_id=filters.get("county")` **raw** (profile_aggregations.py:57-85, 135-139). No slug→ID resolution.
- Impact: Frontend passes a county **slug** (searchParams.county), but coverage JSON stores **IDs**. `coverage__county=<slug>` will never match → county filtering returns 0 results. This is a hard break for the entire directory filter UI.
- Fix: port `resolveToCountyId` (needs the locations dataset on the Django side) and resolve before filtering.

### G3 ⚠️ Search: subcategory matching semantics differ
- OLD: search term resolved against pro-subcategory taxonomy via `findMatchingProSubcategoryIds`, then `subcategory: { in: [ids] }` (build-search-conditions.ts:100-130). Also matches normalized fields + falls back to accented original fields.
- NEW: `subcategory__icontains=word` matches the raw stored subcategory ID/slug against the literal search word (profile_aggregations.py:99). No taxonomy resolution, no accented-original fallback.
- Impact: Searching by a profession label (e.g. "υδραυλικός") won't match profiles whose `subcategory` holds an ID, and profiles lacking normalized columns won't be found.
- Fix: resolve search term to subcategory IDs (taxonomy app) and use `subcategory__in`; add accented fallback on `display_name`/`tagline`/`bio`.

### G4 ⚠️ Count endpoint applies MORE filters than OLD → wrong totals
- OLD `getProfilesCount` where-clause deliberately omits coverage/online/search (get-profiles.ts:375-402) — counts category/subcategory totals only.
- NEW `count_profiles_by_filters` applies coverage + search too (profile_aggregations.py:172-184).
- Impact: Any UI relying on count semantics (category badge counts, "X professionals") gets different numbers when location/search filters are active.
- Fix: mirror OLD — count only published+isActive+user+role+category+subcategory; ignore coverage/online/search.

### G5 ❌ taxonomy-paths uses wrong field + missing guards + raw IDs
- OLD: filter by `user.role` (+ blocked=false, confirmed=true); group by category+subcategory; convert IDs→slugs; sort by count desc (get-profiles.ts:933-1028).
- NEW: filter by `Profile.type` (profile_reads.py:26-28); NO user.blocked/confirmed; returns raw category/subcategory **IDs** not slugs; no count sort.
- Impact: SSG path generation produces wrong/duplicate/blocked-inclusive paths with ID values (not URL slugs) → broken static routes. `Profile.type` is often null/seed-set differently from `user.role`.
- Fix: filter `user__role`, `user__blocked=False`, `user__confirmed=True`; resolve IDs→slugs; sort by count.

### G6 ❌ AFM lookup response shape completely different (UI break)
- OLD keys: `onomasia, doy_descr, firm_act_descr, postal_address, postal_address_no, postal_zip_code, postal_area_description` (lookup-afm.ts:9-17, 104-114).
- NEW keys: `afm, name, profession, address (pre-joined), doy, active, registrationDate` (afm_lookup.py:85-98).
- Impact: The verification/billing autofill form reads `onomasia`/`postal_*`; it will read `undefined`. Address is pre-concatenated in NEW so the form cannot split into fields.
- Fix: return the OLD key names and keep address parts separate.

### G7 ⚠️ Card response shape not pre-transformed (coverage/groupedCoverage/role missing)
- OLD list rows are `ArchiveProfileCardData` with: `coverage` REPLACED by `transformCoverageWithLocationNames` output, `groupedCoverage` (countyAreasMap), `role` (from user.role), `taxonomyLabels`, `skillsData`, `specialityData` (get-profiles.ts:294-345).
- NEW `serialize_profile_summary` returns RAW coverage JSON, no `groupedCoverage`, no `role`, no `taxonomyLabels` (profile_reads.py:36-84). Frontend `enrichProfileCard` adds `skillsData/specialityData/categoryData/subcategoryData` (enrich.ts:78-93) but NOT `coverage` transformation, `groupedCoverage`, `role`, or `taxonomyLabels`.
- Impact: Profile cards that render coverage location names / grouped county-areas / the freelancer-vs-company role badge get raw IDs or undefined.
- Fix: either transform coverage + add role/groupedCoverage server-side, or extend `enrichProfileCard`.

### G8 ⚠️ Validation rules dropped across all update endpoints
- basic-info: OLD requires tagline ('' or ≥10 chars ≤100), bio ≥80 ≤5000 stripped, category/subcategory required (validations/profile.ts:458-487). NEW serializer only enforces max_length (profile_updates serializer:7-19). Min-length + business rules gone.
- coverage: OLD `coverageSchema` (≥1 mode; onbase→address+zip+area+county; onsite→counties≥1) (validations/profile.ts:111-167). NEW: none (JSONField passthrough).
- billing: OLD cross-field refines (receipt|invoice required; invoice→all fields; afm 9 digits) (validations/profile.ts:367-421). NEW serializer validates afm regex only, no cross-field (profile_updates serializer:32-39).
- presentation: OLD phone/viber/whatsapp regex `\d{10,12}`, website url, socials per-platform url validation (validations/profile.ts:319-361, 226-293). NEW: website URLField only.
- portfolio: OLD max(10). NEW none.
- additional-info: OLD rate min(10) max(50000) in additionalProfileInfoSchema (but updateSchema uses min(0)); experience int≥0. NEW rate min_value=0 only.
- Impact: Invalid data now persists; forms that relied on server rejection no longer get errors; data quality + UI display regressions.
- Fix: port each Zod schema's rules into the DRF serializers / `validate()` methods.

### G9 ⚠️ `experience` computation differs
- OLD: `currentYear - parseInt(commencement)` — pure year subtraction (additional-info.ts:71-74).
- NEW: `_years_since` does full date arithmetic including month/day comparison (profile_updates.py:153-164).
- Impact: Off-by-one differences (e.g. commencement "2020" mid-year gives different value). Profile detail page experience display drifts. Also OLD page recomputes via `getYearsOfExperience(commencement, experience)` (get-profile.ts:303) — NEW page bundle just returns stored `experience` as `calculatedExperience` (profile_aggregations.py:452).
- Fix: match OLD `currentYear - parseInt(commencement)` semantics.

### G10 ⚠️ Partial-update writes skip null fields → cannot clear values
- OLD update actions always write every field in `data: {...}` (basic/additional/presentation), so passing null clears a column.
- NEW services use `if x is not None:` guards (profile_updates.py:130-148, 240-251). additional-info & presentation views pass `partial=True`; `rate`/`commencement`/etc skipped when null.
- Impact: User cannot clear `rate`, `budget`, `terms`, `phone`, etc. via the form (sending null/empty is ignored).
- Fix: align nullability handling — write the field when the key is present (mirror OLD always-write).

### G11 ⚠️ Email side-effects missing (verification + report)
- OLD sends admin emails: `sendNewVerificationEmail` (verification.ts:122,187) and `sendProfileReportEmail` (report-profile.ts:99-104).
- NEW: both are `# TODO(messaging)` comments (verification.py:51-53, 95-97). No email sent.
- Impact: Admins receive no notification of new verification requests or profile reports — operational regression.
- Fix: wire the messaging tasks.

### G12 ⚠️ Billing admin path broken + permission gate weaker
- OLD allows admin to update billing (billing.ts:28 `['freelancer','company','admin']`).
- NEW: service checks `is_professional() or is_admin()` but loads profile only `if user.is_professional()` else None → admin → 404 (profile_updates.py:182-190). Also view permission is `IsAuthenticated` only (no IsProfessional), unlike other update views.
- Impact: admin billing update always fails; also any authenticated non-pro reaches the service before the role check (minor).
- Fix: decide intended admin semantics; load the correct profile for admin (which profile? OLD also updates `where: { uid: user.id }`, so admin edits own — replicate that and drop the broken branch).

### G13 ⚠️ Profile-page bundle: missing/empty computed fields
- `featuredCategories`: OLD = first 8 pro taxonomies (get-profile.ts:257); NEW returns `[]` (frontend get-profile.ts:123 defaults to []).
- services in bundle: OLD `transformProfileService` returns `taxonomyLabels`, nested `profile{uid,displayName,username,image}`, `type` (get-profile.ts:118-148); NEW `_brief_service` returns flat `{id,slug,title,category,subcategory,subdivision,rating,reviewCount,price,media}` (profile_aggregations.py:484-496) — missing taxonomyLabels + profile object + type.
- services cap: OLD no cap (all published); NEW caps at 50 (profile_aggregations.py:425).
- Impact: ServiceCard on profile page may miss profile attribution + taxonomy labels; >50 services truncated.
- Fix: enrich service shape; remove/raise cap to match.

### G14 ⚠️ `online=false` filter case dropped
- OLD: `coverage = { path:['online'], equals: filters.online }` so `online=false` actively filters to non-online profiles (get-profiles.ts:170-174). Also archive maps `online===''→true` (get-profiles.ts:597).
- NEW: `_apply_coverage_filters` only acts `if online:` (truthy) (profile_aggregations.py:83-84); `online=false`/None both treated as "no filter". Serializer default leaves online unset.
- Impact: edge case — explicit "only non-online" filtering not supported. (OLD UI likely only sends online=true, so low severity, but a behavior difference.)
- Fix: distinguish None (no filter) from False (filter online=false).

### G15 ⚠️ username lookup case-sensitivity flip
- OLD `getPublicProfileByUsername`/`getProfileByUsername` use exact `username:` match (get-profile.ts:95, 196).
- NEW uses `username__iexact` (profile_reads.py:16; profile_aggregations.py:408).
- Impact: NEW resolves profiles for differently-cased usernames OLD would 404 on. Could surface a profile under an unexpected URL casing; minor but a behavior change.
- Fix: use exact match (`username=`) if parity required.

---

## Response-shape mismatches (camelCase audit)

The NEW selectors manually emit camelCase keys (good — matches OLD Prisma camelCase). Confirmed correct casing: `displayName, reviewCount, contactMethods, paymentMethods, settlementMethods, createdAt, updatedAt, isActive, lastServiceDraft, lastServiceRefreshDate, dailyServiceRefreshCount` (profile_reads.py:36-104). Remaining mismatches:

1. **AFM lookup** (G6): all keys renamed (`onomasia`→`name`, `postal_*` collapsed into `address`). HARD UI BREAK.
2. **Profile summary missing keys vs full Prisma Profile**: NEW `serialize_profile_summary` omits `taglineNormalized, bioNormalized, displayNameNormalized, coverageNormalized, authorBio` (intentional, internal) — but also omits `published`/`isActive` from the PUBLIC summary while OLD public profile (`PROFILE_DETAIL_INCLUDE`) returned the FULL Profile row including those + `services` + `reviews` arrays. Consumers expecting `profile.services` / `profile.reviews` on the by-username payload get undefined.
3. **Card rows** (G7): missing `coverage`(transformed), `groupedCoverage`, `role`, `taxonomyLabels`, `top` is present ✅. `enrichProfileCard` adds `categoryData/subcategoryData` (NEW naming) but OLD cards used `taxonomyLabels` — verify card components read the new keys ❓.
4. **Directory** (G_dir): `label`/`slug` are raw IDs, `type:null`, no `image` — cards expecting human labels render cuids.
5. **Archive bundle**: `taxonomyData.categories=[]`, `counties=[]`, `subcategories=[]` — OLD populated these. Filter sidebar + category nav render empty.
6. **Verification submit** response: NEW adds `status` to the message body (`{message, status}`, profile.py:248); OLD returned only `{success,message}`. Additive, harmless.

---

## Authorization comparison

| Endpoint | OLD rule | NEW rule | Status |
|---|---|---|---|
| basic/additional/coverage/portfolio/presentation update | `requireAuth` + `hasAnyRole(['freelancer','company'])` | `IsAuthenticated, IsProfessional` + `_require_pro_owner` | ✅ (own-profile enforced by `user_id=user.id`) |
| billing update | `hasAnyRole(['freelancer','company','admin'])` | `IsAuthenticated` only; service `is_professional() or is_admin()` but admin path 404s | ⚠️ G12 |
| verification submit | `requireAuth` + `hasAnyRole(['freelancer','company'])` | `IsAuthenticated` + service `is_professional()` | ✅ |
| report profile | `requireAuth` | `IsAuthenticated` + ReportThrottle | ✅ (NEW adds throttle — improvement) |
| lookup AFM | `requireAuth` | `IsAuthenticated` + AfmLookupThrottle | ✅ |
| reads (by-username/page/search/count/archive/directory/taxonomy-paths) | public | `AllowAny` | ✅ |
| get own profile / presentation / verification status | `requireAuth` | `IsAuthenticated` | ✅ |

Ownership: all writes target `Profile where user_id == request.user.id` — a user cannot edit another's profile. ✅ Matches OLD (`where: { uid: user.id }`).

---

## Computed-fields / business-rules summary
- ratings/reviewCount/stars: read-through from stored columns in both — OK (not recomputed here).
- featured: returned as-is; default-sort shuffles featured bucket in both (get-profiles.ts:276 `shuffleFeatured` vs profile_aggregations.py:152-156). ✅ behavior parity (shuffle scope: NEW shuffles only current page's featured rows — same as OLD which shuffles the fetched page). 
- coverage transformation (location-name resolution + groupedCoverage): MISSING in NEW (G7).
- coverageNormalized: OLD `generateCoverageNormalized` resolves IDs→location NAMES then normalizes (coverage.ts:86); NEW `_coverage_normalized` concatenates the raw IDs and normalizes (profile_updates.py:97-112) → search index content differs ❓ (search-by-location-name may break).
- experience: differing formula (G9).
- taxonomy label resolution: deferred to frontend enrich for cards; missing for directory/archive/page-breadcrumbs.

---

## Counts
- matched (✅): 4  (get presentation, get verification status, archive auth/ownership model overall, default-sort shuffle)
- partial (⚠️): 15  (own-profile read, public-profile read, page bundle, list/search, count, archive, directory, basic-info, additional-info, billing, coverage, portfolio, presentation update, verification submit, report)
- missing/broken (❌): 4  (NATIONWIDE id G1, county slug resolution G2, taxonomy-paths G5, AFM shape G6)
- needs_verification (❓): 3  (coverageNormalized search content, card components reading new `categoryData`/`subcategoryData` keys, profile-card `taxonomyLabels` consumption)

Total capabilities audited: 19 rows.
