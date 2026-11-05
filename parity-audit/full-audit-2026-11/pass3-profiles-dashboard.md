# Profile dashboard — pass 3 fresh re-audit — 2026-11-05

Scope: the pro's own-profile management. Tabs: Λογαριασμός, Βασικά (and Portfolio), Τρόποι Παροχής, Επικοινωνία, Πρόσθετα, Πιστοποίηση. Also their write actions, AFM lookup and verification. This is the same OLD-side scope as profiles-dashboard.md §1.

Dedupe: I read SUMMARY.md, profiles-dashboard.md (D1–D17), pass2-payload-contracts.md, pass2-validation-matrix.md, and the finding titles of every other report. This file lists only NEW findings, plus corrections and re-verifications.

## 1. Coverage

### OLD files enumerated (`find`) and read
- `src/app/(dashboard)/dashboard/profile/{layout,page}.tsx` and `{account,basic,coverage,contact-details,additional,verification}/page.tsx`
- `src/components/forms/profile/*` (all 20 files). Each was diffed against new. Changed files: form-coverage (42 diff lines), form-account (56), form-basic-info (23), form-presentation-info (22), form-additional-info (13), form-delete-account (12), form-billing (8), form-verification/form-portfolio (4, import only), form-onboarding (119, delegated). Every other file is byte-identical.
- `src/actions/profiles/{basic-info,additional-info,coverage,portfolio,presentation,billing,verification,lookup-afm}.ts`
- `src/actions/auth/update-account.ts`, plus `requireProUser` and `getCurrentUser` in `src/actions/auth/server.ts`
- `src/actions/taxonomy-submission.ts` (`getUserTaxonomySubmissions`)
- Supporting: `src/lib/validations/profile.ts` (diffed), `src/lib/utils/form.ts` (diffed), `src/lib/utils/datasets.ts` (`getLocationName`, `generateCoverageNormalized`), `src/lib/taxonomies/index.ts` (`getLocations`), `src/constants/datasets/locations.ts`, `src/lib/utils/cloudinary.ts` (sanitize, processImageForDatabase), `src/lib/utils/text/normalize.ts`, `src/lib/cache/revalidation.ts`, `src/lib/seo/pages.ts` (`getDashboardMetadata`), `src/lib/prisma/schema/user.prisma` (ProfileVerification)

### NEW files read
- frontend: the same pages and forms; `src/actions/profiles/*.ts` (all 8 write actions); `src/actions/auth/{update-account,delete-account,server}.ts`; `src/actions/taxonomy-submission.ts`; `src/lib/api/{profiles,taxonomy}.ts`; `src/lib/cache/revalidation.ts`; `src/lib/taxonomies/index.ts` (`getSkills`, `getLocations`); `src/lib/utils/form.ts`
- backend: `apps/profiles/{urls/public.py, views/public/profile.py, serializers/profile_updates.py, services/{profile_updates,verification,afm_lookup}.py, selectors/profile_reads.py, models/profile_verification.py}`; `apps/accounts/{permissions/roles.py, models/user.py (is_professional), services/account.py, views/public/account.py}`; `apps/core/locations.py`; `apps/taxonomy/{models/location.py, management/commands/seed_taxonomy.py, services/submissions.py}`; `apps/core/management/commands/_taxonomy_maps.json` (location.byId); `apps/services/selectors/service_reads.py` (coverage_normalized readers); `common/throttling.py`; `common/utils/{cloudinary,normalize}.py`; `config/settings/base.py` (AADE, REST_FRAMEWORK throttles)
- External: the AADE RgWsPublic2 WSDL and its xsd=1 schema (fetched live), and DRF 3.15.2 `rest_framework/throttling.py` (installed copy found on this machine; pyproject pins `>=3.15,<3.16`)

### Delegated elsewhere (unchanged from pass 1)
form-onboarding / onboarding-form-skeleton → auth/onboarding. The server logic for change-password, change-username, upgrade and delete → auth (the delete 500 is already pass2-schema-db D2). The checkout/promote pages that embed BillingForm → billing. The `adminMode` branches → admin. get-profile, get-profiles, get-directory, report-profile → public profiles/archives.

## 2. Mapping
Unchanged from profiles-dashboard.md §2. I re-checked each row against urls/views: method, path, permission classes and the service each view calls.

## 3. NEW DIFFERENCES

### P3-D1. AFM lookup reads `basic_rec` at the wrong level of the AADE response, so even a correct call returns "ΑΦΜ δεν βρέθηκε" — HIGH
- OLD: `lookup-afm.ts:85-114` regex-scans the whole response XML for `<onomasia>`, `<error_code>` and so on, wherever they are nested. Nesting doesn't matter.
- NEW: `backend/apps/profiles/services/afm_lookup.py:78-85` does `basic = getattr(result, "basic_rec", None)` on the object that zeep returns from `client.service.rgWsPublic2AfmMethod(...)`.
- The live AADE schema puts `basic_rec` deeper:
  - The WSDL output `rgWsPublic2AfmMethodResponse` has a single child `result`.
  - `result` contains `rg_ws_public2_result_rtType` (optional).
  - `rg_ws_public2_result_rtType` contains `call_seq_id`, `error_rec`, `afm_called_by_rec`, `basic_rec` and `firm_act_tab` (xsd=1).
- So `basic_rec` is not a direct attribute of the returned value. Depending on how far zeep unwraps, it lives at `result.rg_ws_public2_result_rtType.basic_rec` or at `result.result.rg_ws_public2_result_rtType.basic_rec`. A zeep CompoundValue raises AttributeError for a missing key, so `getattr(..., None)` returns None, `onomasia` is `""`, and the function raises 404 `ΑΦΜ δεν βρέθηκε` every time.
- This is a second, independent cause on top of pass-1 D1 (`afm_called_by` = username, `error_rec` ignored). Fixing D1 alone will not make the lookup work.
- Impact: the billing form's AFM autofill (form-billing.tsx:138-169, used on checkout and promote) never fills name, ΔΟΥ, profession or address. Every valid AFM gets the error toast and the fields are cleared, so the user has to type every invoice field by hand.
- Fix: walk the wrapper. Something like `rt = getattr(getattr(result, "result", result), "rg_ws_public2_result_rtType", result)`, then read `rt.error_rec` (D1) and `rt.basic_rec`. Confirm the exact path once in a Django shell with real credentials (`print(result)`).
- Possibly intentional?: no.

### P3-D2. `coverageNormalized` is built from the wrong location names (834 county/area ids collide). Saving Τρόποι Παροχής breaks location text search for the pro's services — MEDIUM
- OLD:
  - `generateCoverageNormalized` (`lib/utils/datasets.ts:940-992`) resolves each id with `getLocationName(getLocations(), id)` (`datasets.ts:817-850`).
  - `getLocations()` walks the hierarchical `locationOptions` tree (`lib/taxonomies/index.ts:70-75`).
  - The lookup tries counties first, then each county's areas, then that area's postcodes, so a county id always resolves to the county name.
  - Example: `counties:['2']` → `"αττικης"`.
- NEW:
  - `_coverage_normalized` (`apps/profiles/services/profile_updates.py:186-229`) calls `apps/core/locations.location_name_for_id`.
  - `location_name_for_id` uses `_id_to_name()` (`locations.py:26-52`), a flat `{id: name}` built from the `Location` table. `seed_taxonomy.py:193-215` seeds that table from `_taxonomy_maps.json` `location.byId`, the depth-first, last-write-wins map that home-search-taxonomy D12 describes.
  - Location ids are not unique across levels. The dataset has 2458 ids, of which 917 are duplicated. I diffed old tree resolution against byId resolution for every id: 834 ids resolve to a different name, and all 834 are county or area ids.
  - Examples: `2` Αττικής → `"12351"`; `4` Λάρισας → `"40003"`; `6` Ηρακλείου → `"70003"`; `12` Θεσσαλονίκης → `"Αγία Τριάδα"`; `21` Βοιωτίας → `"Άγιος Αθανάσιος Δράμας"`.
- Readers of the column:
  - The public service search `Q(profile__coverage_normalized__icontains=word)` (`apps/services/selectors/service_reads.py:65`, port of OLD build-search-conditions.ts:50).
  - Search-suggestion match typing (`service_reads.py:971-975`).
- Impact:
  - Once a pro saves the Τρόποι Παροχής tab on the new stack, or an admin saves their coverage (`admin_profiles.py:242-247` uses the same helper), the profile's `coverageNormalized` holds postcodes or unrelated place names.
  - Searching "αττικη", "θεσσαλονικη", "λαρισα" and similar no longer matches their services through coverage, and searches for random place names do.
  - Rows last written by the old app are still correct, so the damage spreads one save at a time.
- Note the asymmetry: home-search D12 says the new suggestion path (`core/taxonomy._location_id_to_name`) was fixed to resolve county-first. The writer was not. NEW is internally inconsistent.
- Fix: resolve ids by walking the tree county → area → postcode, as `core/taxonomy._location_id_to_name` already does (or reuse it). Then re-run normalization for every profile that has coverage, since rows written since the cutover/test period are corrupted.
- Possibly intentional?: no. This also corrects pass-1 §4, which said the coverage write uses the "same algorithm".

### P3-D3. DRF `CharField` trims whitespace on profile text fields. Length rules now count the trimmed value and stored text is trimmed — LOW
- OLD: zod `z.string()` with no `.trim()` (validations/profile.ts:455-487, 424-441). Tagline, bio, speciality, the verification fields and so on are checked and stored exactly as typed.
- NEW: every `serializers.CharField` in `serializers/profile_updates.py` uses DRF's default `trim_whitespace=True`: tagline/bio/speciality (:30-34), additional-info commencement/budget/terms (:103-109), billing (:120-124), presentation phone/website/viber/whatsapp (:220-223), and verification afm/name/address/phone (:276-279).
- Impact:
  - A tagline of 10 characters ending in a space passes the client check (`val.length >= 10`) but fails on the server with 9. Because of pass-1 D3 the user sees the English "One or more fields are invalid.".
  - A whitespace-only tagline (≥10 spaces) was stored by old and is now stored as null.
  - Leading and trailing spaces are dropped from every stored value.
  - pass2-validation D1 covers the same mechanism for passwords only.
- Possibly intentional?: probably benign, but it differs from old. Set `trim_whitespace=False` on tagline (at least) to keep client and server in agreement.

### P3-D4. Own-profile writes do a full-row `profile.save()`, so a concurrent write to the same row can be silently reverted — LOW
- OLD: Prisma `profile.update({ data: { only the tab's fields } })` writes only the listed columns: basic-info.ts:118-131, additional-info.ts:100-113, presentation.ts:100-113.
- NEW: `update_basic_info` (:168), `update_additional_info` (:262) and `update_presentation` (:388) call `profile.save()` with no `update_fields`. That writes every column from the instance loaded at the start of the request, including `rating`, `review_count`, `verified`, `featured`, `published` and `top`. (coverage, portfolio and billing correctly pass `update_fields`.)
- Impact: if a review approval recalculates the rating, an admin approves verification or toggles published/featured, or a payment webhook flips `featured` (the first and last use `.update()`/`.save()` on the same row) between the load and the save, the pro's save puts the old values back. The window is small, but the result is a silent revert, for example a "verified" badge lost right after approval.
- Fix: pass `update_fields=[...]` with the tab's columns plus `category_node`/`subcategory_node` and `updated_at`.
- Possibly intentional?: no.

## 4. Corrections

### C1. All `ScopedRateThrottle` subclasses are no-ops. No scoped rate limit fires anywhere in the backend
- `common/throttling.py:68-105` defines `LoginThrottle`, `RegisterThrottle`, `PasswordResetThrottle`, `VerificationResendThrottle`, `ServiceDraftThrottle`, `TaxonomySubmissionThrottle`, `AfmLookupThrottle`, `ContactFormThrottle` and `ReportThrottle` by setting a class attribute `scope = "..."`.
- DRF 3.15.2 `ScopedRateThrottle.allow_request` (throttling.py:219-225) starts with `self.scope = getattr(view, 'throttle_scope', None)` and returns True when that is falsy. It overwrites the class `scope`, and no view defines `throttle_scope` (grep over apps/, common/ and config/ found 0 hits). The `"common.throttling.ScopedRateThrottle"` entry in `DEFAULT_THROTTLE_CLASSES` does nothing for the same reason.
- Views that set `throttle_classes = [XThrottle]` also replace the default Anon/User throttles, so those endpoints have no throttling at all: `LookupAfmView` (profile.py:197-199), `ReportProfileView` (:211-213), and every other view that uses these classes.
- Prior findings affected:
  - profiles-dashboard **D7** ("a new 10/min throttle was added"): wrong. AFM lookup has no rate limit, which happens to match old. The English throttle text can't occur.
  - home-search-taxonomy **D3** ("5/day throttle counts every request, including failed ones"): the DRF throttle never fires. Only the service-level DB count limit applies (`taxonomy/services/submissions.py`).
  - lib-shared-sweep **D11** / auth-accounts **D13** (forgot-password per-IP 3/10min): no such limit fires at all. If old had a per-email 1/10min cooldown in app code, new may now have no limit. The auth owner should re-check.
  - services **D10** / **D17** (report and draft throttles), the throttle part of messaging/support contact findings, and pass2-authz-security §4 if it relies on the login/register throttles: login, register, verification-resend and contact are not rate-limited by DRF. Re-assess them as security items. This is likely MEDIUM: brute force and email flooding.
  - The global `anon`/`user` throttles (lib D12) still work on views that don't override `throttle_classes`.
- Fix: set `throttle_scope = "<scope>"` on each view, or override `allow_request`/`__init__` in the subclasses so the class `scope` is used (subclass `SimpleRateThrottle` instead of `ScopedRateThrottle`).

### C2. Pass-1 §4 claim "coverage writes coverage and coverageNormalized … same algorithm" is wrong
The steps match (areas → counties → legacy, dedup, space-join), but id→name resolution differs. See P3-D2.

### C3. Pass-1 D1 is not the only blocker for the AFM lookup
See P3-D1. The fix described in D1 is necessary but not sufficient.

### C4. Pass-1 §4 "All 8 dashboard profile pages … The only difference is D16" is slightly off (no user impact)
`basic/page.tsx` and `account/page.tsx` also differ:
- `getCurrentUser()` no longer takes `{revalidate:true}`. New always re-reads the session.
- Skills come from `getSkills()`, which reads DB maps with a fallback to the static dataset. That is the intentional taxonomy-live design, and the shape (`DatasetItem` with category) is the same.
- `requireProUser` now sends a logged-out user straight to `/login`. Old went to `/dashboard/profile/account` first, which then bounced to login.

## 5. Re-verified same (pass-1 "Confirmed same" items, each re-checked)
- **Forms and validation:** form field sets, labels, Greek messages and client validation are the same. I diffed every form, and `lib/validations/profile.ts` differs only at :116 (address nullable) and :508-509 (visibility booleans), both already known. `lib/utils/form.ts` differs only in the JsonValue type. `populateFormData`/`skipEmpty` semantics are identical, so omitted fields are cleared in both apps: old extractFormData defaults vs new `d.get()` → None → written.
- **Byte-identical files:** profile-sidebar, account-page-actions, verification-status, form-change-username, form-change-password, form-upgrade-to-pro, documents-interface, index.ts, layout.tsx, page.tsx, and the verification/contact-details/additional pages. `getDashboardMetadata` is identical.
- **Role gates:**
  - `IsProfessional` and `user.is_professional()` check `role ∈ {freelancer, company}`, the same as old `hasAnyRole(['freelancer','company'])` for basic/additional/coverage/portfolio/presentation/verification.
  - Billing allows freelancer/company/admin on the caller's own row.
  - `requireProUser` checks `type==='pro'` and redirects to `/dashboard/profile/account`.
  - The hasProfile guard is the same on every tab.
- **Write semantics:** I re-read each service against the old action.
  - Tagline: taglineNormalized is null when empty.
  - Bio: written only when non-empty, normalized (D8 already covers the whitelist/spacing differences).
  - category, subcategory and speciality are written.
  - Skills are stored as `|| []`.
  - Additional-info: every field is written, and experience is `currentYear − parseInt(commencement)`, a leading-integer parse (rate 0 is D13).
  - Billing snapshot: `''` defaults.
  - Portfolio: pending and blob items are filtered, `_pending` is stripped, and an empty result is stored as null (key whitelist is D15).
  - Presentation: `X || null`, and socials `{}`→null. The form always sends the full socials object, so this behaves the same.
  - Account: displayName and image are synced to the Profile. When the avatar is removed, `image` is omitted in both apps (skipEmpty), so neither app clears it, which is consistent.
- **normalize_term:** same as old `normalizeTerm` (NFD, strip U+0300–U+036F, lowercase).
- **Verification:**
  - Upsert keyed on profile resets status to PENDING on every submit. It doesn't touch `Profile.verified`, and neither did old.
  - The model has no extra fields to clobber.
  - GET returns the same 7 keys.
  - The no-record case still renders the "no verification" state through the error path (pass-1 §5).
- **Pending-skills list:** `getUserTaxonomySubmissions` / `list_my_submissions` returns pending submissions only, by user and type, newest first, with `pendingId = pending_<cuid>`. Same as old.
- **Location dataset on the coverage page:** `getLocations()` still serves the static `locationOptions` tree, so the dashboard coverage form shows the same county/area options as old.
- **Owner payload keys:** re-checked, and they match pass2-payload-contracts §4.

## 6. Open questions / couldn't verify
- P3-D1: confirm the exact zeep unwrapping path, and the D1 `afm_called_by` effect, with one live call on test.doulitsa.gr (`python manage.py shell`, real `AADE_*` env). zeep isn't installed locally.
- P3-D2: run `SELECT count(*) FROM profiles WHERE "updatedAt" > '<new-stack start>' AND coverage IS NOT NULL` to size how many rows need re-normalizing. Also check whether any other new code reads `apps/core/locations._id_to_name` for display. I found only the coverage writer.
- C1: owners of auth, services, messaging and security should re-grade the findings that assumed these throttles were active. Check what old better-auth rate-limited by default (sign-in, sign-up, forget-password) to judge the regression.
