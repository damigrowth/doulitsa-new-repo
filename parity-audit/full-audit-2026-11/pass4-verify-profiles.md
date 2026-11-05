# Pass 4: adversarial verification of the PROFILES cluster (2026-11-05)

Inputs checked: profiles-dashboard.md (D1–D17), pass3-profiles-dashboard.md (P3-D1–D4, C1–C4), profiles-public-archives.md (D1–D18), pass3-profiles-public-archives.md (D1–D6, C1–C3), pass2-authz-security.md D2, pass2-payload-contracts.md (D1, plus its D10 re-confirmation), and the serializer privacy-leak group (archives D3, reviews-saved D5, home-search D4).

I re-derived every verdict from the code (OLD `oldnext/`, NEW `frontend/` + `backend/`). Live sources used: the AADE WSDL and xsd=1 (fetched), zeep `wsdl/messages/soap.py` (master, fetched), and the DRF `throttling.py` installed on this machine (3.17.1; `ScopedRateThrottle` is unchanged since 3.x). I also wrote a script that diffs OLD `getLocationName` over `constants/datasets/locations.ts` against NEW `_taxonomy_maps.json location.byId`; it lives only in the scratchpad.

No code changes and no git commands. This file is my only write.

Verdict key: **C** = CONFIRMED, **R** = REFUTED, **A** = ADJUSTED, **U** = UNVERIFIABLE-FROM-REPO.

---

## 1. Canonical groups (one fix each)

| Group | Root cause | Single fix |
|---|---|---|
| **PRIV-1** | Public/anonymous payloads built from `serialize_profile_summary` (profile_reads.py:80-131), and the page bundle attaching both emails (profile_aggregations.py:575-579). | 1. Add one public serializer: summary minus `firstName`, `lastName`, `email`, `user`. Use it for `/api/home` (home.py:70), `/api/saved` (saved_reads.py:59), `/profiles/by-username` (profile.py:182) and the service page (service_reads.py:335).<br>2. In `profile_page_bundle`, emit a single `email = profile.email or user.email` **only when `visibility.email is True`**, and never `user.email`.<br>3. Send avatar initials instead of first/last name (the page reads `firstName` only for initials, page.tsx:135). Phone/viber/whatsapp/terms may stay (see the notes: they are public in OLD too). |
| **AUTHZ-PUB** | `ProfileFiltersSerializer.published` is caller-controlled on AllowAny `/profiles/search` and `/profiles/count`. | Remove `published` from the serializer and hard-code `published=True` in `list_profiles_by_filters` / `count_profiles_by_filters`. |
| **AFM-1** | `afm_lookup.py`: wrong `afm_called_by`, `error_rec` ignored, `basic_rec` read one level too high. | `INPUT_REC={"afm_called_by": "", ...}`. Unwrap with `rt = getattr(result, "rg_ws_public2_result_rtType", None)`; if `rt.error_rec.error_code` is set, raise with `error_descr`; read `rt.basic_rec`. Also translate the English config/dependency errors to the OLD Greek texts. |
| **THR-1** | Every `ScopedRateThrottle` subclass is a no-op (DRF reads `view.throttle_scope`). | Subclass `SimpleRateThrottle` (keeping `ClientIPThrottleMixin`), or set `throttle_scope` on each view. Then decide per endpoint whether to keep a limit OLD didn't have (AFM). |
| **ERR-1** | DRF ValidationError → English `"One or more fields are invalid."` (exceptions.py:129-135). The actions toast `err.message` only. DRF CharField trims. | In the frontend profile actions, map `code==='validation_error'` to the OLD per-action Greek text (or the first `details` message). Give `IsProfessional.message` a Greek text. Set `trim_whitespace=False` on tagline/bio. |
| **COPY-1** | The new actions/views hard-code different success texts. | Restore the OLD strings (list in dashboard D4/D11). Verification needs `created` returned by the POST. |
| **CACHE-1** | Profile writes don't purge the owner's `service:page:{id}` (30 min Redis), `archive:services` or `services:all`. Billing `.update(featured=…)` bypasses the Profile post_save signal entirely. | Profile post_save signal: also delete `service:page:{id}` for the profile's services. Frontend profile actions: call `revalidatePublicService()`. Billing: use `save(update_fields=["featured","updated_at"])` or call `invalidate_profile_caches()`, which also fixes ORD-UPD. |
| **LOC-1** | `apps/core/locations._id_to_name` uses flat last-write-wins `byId`; county/area ids collide with postcodes and areas. | `_coverage_normalized` must resolve in OLD `getLocationName` order: all counties, then per county (its areas, then its zipcodes). Re-normalize every profile written by NEW. |
| **TAX-HIER** | Archive and directory aggregations ignore the taxonomy hierarchy. Pills carry a null category. The frontend `lookup()` is global (pro + service, any level). | 1. Backend `archive_data`/`directory_data`: resolve each subcategory's parent via the pro tree and emit `/dir/<parent>/<sub>`; drop unknown and uncategorized rows.<br>2. Frontend: validate the category as a pro category and the subcategory as a child of that category (type-scoped), else 404. |
| **PLURAL-1** | Frontend relabelling uses `.label` (singular) where OLD used `plural||label`. | Use `plural ?? label` for archive crumbs and pills. Pick the in-category variant for gender-duplicate slugs. |
| **DROP-1** | Filter-drawer dropdowns are borrowed from `/profiles/directory` (top-10, count order, no type scope). | Return `taxonomyData.categories`/`subcategories` from `archive_data`, built like OLD get-profiles.ts:770-814. |
| **SORT-1** | Featured shuffle only on default sort; `sortBy` is not validated in `archive_data`. | Validate `sortBy` (invalid or list → `'default'`) and always shuffle featured to the front, like OLD `shuffleFeatured`. |
| **ORD-1** | Unordered aggregation (Python `set`, `-count` ties). | Preserve first-seen order for subdivisions. Add a taxonomy-position tiebreak. |
| **RAW-ID-1** | Unknown or mismatched taxonomy values are rendered as raw ids. | Drop unresolved values (return null) and resolve hierarchically, as OLD did. |
| **SAVE-1** | Full-row `profile.save()` in basic/additional/presentation. | Pass `update_fields`. |

---

## 2. Verdict table

### profiles-dashboard.md (pass 1)

| ID | Verdict | Evidence (OLD ↔ NEW) | Group |
|---|---|---|---|
| D1 AFM `afm_called_by`=username, error_rec ignored | **C** in code; impact **U** | OLD lookup-afm.ts:57 `<ns3:afm_called_by/>`, :92-97 `error_descr` ↔ NEW afm_lookup.py:66 `{"afm_called_by": creds["USERNAME"]}`; `error_rec` is never read (:78-85) | AFM-1 |
| D2 profile edits don't purge service pages | **C** (citation nit) | OLD revalidation.ts:146-151 tags `user.services`, `profile.services`, `service.byProfile`, `collections.services` (tags only; there is no `revalidatePath('/s/..')` there, contrary to the report). Every own-profile action passes `includeServices: true` (default true, :134) ↔ NEW cache.py:23-31 has no `service:page:*`; service_reads.py:281 caches the 30-min bundle embedding `serialize_profile_summary` (:335); frontend actions call only `revalidateMyPublicProfile` | CACHE-1 |
| D3 English validation toast | **C** | OLD basic-info.ts:82-85 `'Μη έγκυρα δεδομένα προφίλ'` ↔ NEW exceptions.py:129-135, client.ts:413-420 → `err.message`, basic-info.ts:33. roles.py:52 `"Professional account required."` | ERR-1 |
| D4 success toasts changed (7 flows) | **C** | OLD additional-info.ts:139, coverage.ts:121, presentation.ts:139, portfolio.ts:126, billing.ts:133, verification.ts:159/224, update-account.ts:164 ↔ NEW frontend actions (additional-info.ts:32, coverage.ts:20, presentation.ts:29, portfolio.ts:20, billing.ts:22, verification.ts:19, update-account.ts:29) | COPY-1 |
| D5 verification admin email stripped | **C** | OLD email-config.ts:126-134 subject `Νέο Αίτημα Πιστοποίησης - {displayName} ({email})` ↔ NEW messaging/emails.py:171-178 (raw profile id + AFM, no links); verification.py:52 | (email) |
| D6 skill-proposal errors generic | **C** | NEW taxonomy-submission.ts:16 returns `error`, not `message`; form-basic-info.tsx:230 toasts `result.message \|\| 'Σφάλμα κατά την υποβολή'`. The backend already has the right Greek texts (submissions.py:67-101), and they are dropped | ERR-1 (contract) |
| D7 AFM texts + "new 10/min throttle" | **A** | Text part C: frontend lookup-afm.ts:25; afm_lookup.py:45 English, :55 English. Throttle part **R**: see C1, the throttle never fires (matches OLD's "no limit") | AFM-1 / THR-1 |
| D8 bio whitelist + normalization | **C** LOW | OLD sanitize.ts:4-8, html.ts:5-6 (`''` + trim) ↔ NEW profile_updates.py:40-44 (`' '`, no trim), :172-183 bleach adds a/u/h1-6/blockquote, drops img. The bio editor has no image button (no `onInsertImage` passed), so dropping img has no practical loss | — |
| D9 afm varchar(16) vs max 20 | **C** in code; DB **U** | models/profile_verification.py:17 and 0001_initial.py:83 `max_length=16` ↔ serializer `afm max_length=20`. `managed=True`. Check with `\d verifications` | — |
| D10 owner payload lacks `email` | **C** | profile_reads.py:148-165 has no email; form-presentation-info.tsx:111 falls back to `user.email` | PRIV-1 (do NOT fix by adding email to the public summary; add it to the owner payload only) |
| D11 Λογαριασμός sub-flow texts | **C** | OLD change-password.ts:62, upgrade-to-pro.ts:105, delete-account.ts:15/49 ↔ NEW auth.py:123, account.py:156, frontend delete-account.ts:16 | COPY-1 |
| D12 account image unvalidated | **C** LOW | OLD cloudinary.ts:494-525 ↔ NEW accounts/services/account.py:46-48 | — |
| D13 rate 0 stored | **C** LOW | OLD additional-info.ts:101 `data.rate \|\| null`; the schema allows 0 (validations/profile.ts:489) ↔ NEW frontend additional-info.ts:22 `rate ? Number(rate)` ("0" is truthy), profile_updates.py:253 | — |
| D14 coverage server texts | **C** LOW (masked by ERR-1) | OLD validations/profile.ts:151,164 ↔ serializers/profile_updates.py:174,182 | ERR-1 |
| D15 laxer payload sanitization | **C** LOW | cloudinary.py:43-55 key whitelist; presentation default visibility: OLD presentation.ts:106-108 `{email:false}` ↔ NEW profile_updates.py:386. Unread fields, so no visible effect | — |
| D16 coverage restore-on-recheck / page guard | **C** (likely intentional) | coverage/page.tsx diff: `requireProUser()` plus the `step==='DASHBOARD'` guard → `/dashboard` | — |
| D17 account form onBlur | **C** (likely intentional) | form-account.tsx `mode: 'onChange'` → `'onBlur'` | — |

### pass3-profiles-dashboard.md

| ID | Verdict | Evidence | Group |
|---|---|---|---|
| P3-D1 `basic_rec` read at the wrong level | **C** (high confidence; one live shell call settles the exact path) | WSDL: `rgWsPublic2AfmMethodResponse` → single child `result` (anonymous type) → `ref rg_ws_public2_result_rtType` → {`call_seq_id`, `error_rec`, `afm_called_by_rec`, `basic_rec`, `firm_act_tab`} (xsd=1). zeep `SoapMessage.deserialize` unwraps the body part, then unwraps once more only when the value has exactly one child and no attributes. That returns the `result` value, whose only attribute is `rg_ws_public2_result_rtType`. NEW afm_lookup.py:78 `getattr(result, "basic_rec", None)` → None → always 404 | AFM-1 |
| P3-D2 coverageNormalized from colliding ids | **C** | My diff over all 1489 tree ids: **834** ids resolve differently between OLD `getLocationName` (datasets.ts:817-850) and NEW `byId`; 29 of them are **county** ids. Examples: `2` Αττικής → `12351`, `4` Λάρισας → `40003`, `12` Θεσσαλονίκης → `Αγία Τριάδα`. NEW locations.py:26-52 reads the `Location` table, which seed_taxonomy.py:192-214 fills from `byId`. Writers: profile_updates.py:342 and admin_profiles.py:246. Reader: service_reads.py:65 | LOC-1 |
| P3-D3 DRF trims CharFields | **C** LOW, one nit | serializers/profile_updates.py:30-34 etc. (default `trim_whitespace=True`). Nit: a whitespace-only tagline is stored as `''` (the service writes the validated `''`, tagline_normalized=None), not null | ERR-1 |
| P3-D4 full-row save reverts concurrent writes | **C** LOW | profile_updates.py `update_basic_info` `profile.save()` (~:168), `update_additional_info` (:262), `update_presentation` (:388) ↔ OLD Prisma partial `update` | SAVE-1 |
| C1 scoped throttles are no-ops | **C** | common/throttling.py:68-105 sets class `scope`. DRF `ScopedRateThrottle.allow_request` does `self.scope = getattr(view, 'throttle_scope', None)` and returns True when it is unset. grep for `throttle_scope` in apps/common/config: 0 hits. 11 views set `throttle_classes=[XThrottle]`, which also removes anon/user | THR-1 |
| C2 "same algorithm" claim wrong | **C** | see P3-D2 | LOC-1 |
| C3 D1 fix not sufficient | **C** | see P3-D1 | AFM-1 |
| C4 page diffs (requireProUser → /login) | **C**, no user impact | frontend server.ts:273 `redirect('/login')` ↔ OLD server.ts:601-605 | — |

### profiles-public-archives.md (pass 1)

| ID | Verdict | Evidence | Group |
|---|---|---|---|
| D1 `/dir` pills → `/dir/<sub>` | **C** HIGH | OLD get-profiles.ts:862-876 `href: /dir/${cat.slug}/${subcat.slug}` ↔ NEW profile_aggregations.py:448-450 `categorySlug: None` → `/dir/<sub>`; get-profiles.ts:119,129 | TAX-HIER |
| D2 subcategory dropdown ≤10 | **C** HIGH | OLD get-profiles.ts:774-799 (all children with profiles, type-matched) ↔ NEW profile_aggregations.py:361 `[:10]`, get-profiles.ts:205-216 | DROP-1 |
| D3 page bundle exposes email (+ summary contact fields) | **A**: email part **C HIGH**; phone/viber/whatsapp part **R** as a privacy regression; firstName/lastName **C** LOW-MED | Email: OLD profile-info.tsx:165 renders `ContactReveal` (the client component that receives the value) only when `visibility.email===true` ↔ NEW profile_aggregations.py:577-578 always sends `profile.email` and `user.email` on AllowAny `/profiles/page/<u>` (aggregations.py:73-82). Phone etc.: OLD profile-info.tsx:124-159 renders phone **always** (`ContactReveal value={phone}`, a client prop, so it is in the RSC payload), and viber/whatsapp in `href`/`title`. No `visibility.phone` reader exists | PRIV-1 |
| D4 crumbs base href + singular labels | **C** | OLD get-profiles.ts:744-767 (`baseHref:'/directory'`, `usePlural:true`, `/dir` base crumb unlinked) ↔ NEW profile_aggregations.py:456 `href "/dir"` always; get-profiles.ts:137 `.label` | PLURAL-1 / TAX-HIER |
| D5 wrong/unknown slugs no 404 | **C** | NEW get-profiles.ts:80-95 global `findProBySlug ?? findProById ?? findServiceBySlug ?? findServiceById` ↔ OLD hierarchical, type-filtered lookup → `'Category not found'` | TAX-HIER |
| D6 shuffle only on default sort | **C** | OLD get-profiles.ts:276 unconditional `shuffleFeatured` (shuffle.ts: featured moved to the front) ↔ NEW profile_aggregations.py:238 | SORT-1 |
| D7 county resolution | **C** (with pass-3 C1 precision) | OLD taxonomies/index.ts:359-376 (slug or name, area → parent county; unresolved → no filter, or online-only) ↔ NEW locations.py:111-137, profile_aggregations.py:78-87 (raw string OR nationwide when unresolved) | — |
| D8 carousel membership/labels | **C** | OLD get-profiles.ts:838-904 (plural, subcategory filter included in the groupBy → no pills on a filtered subcategory page, fallback to directory when there are 0 groups) ↔ NEW profile_aggregations.py:421-453, get-profiles.ts:125 | PLURAL-1 / TAX-HIER |
| D9 category dropdown order/type | **C** | OLD get-profiles.ts:812-814 ↔ NEW get-profiles.ts:202-204 (directory dict order = most-popular-sub order, no type scope) | DROP-1 |
| D10 directory raw grouping | **C** | profile_aggregations.py:312-365 (`_uncategorized`, raw ids, slug params only in the cache key) | TAX-HIER |
| D11 subdivision badges random order | **C** | profile_aggregations.py:596-602 set comprehension; no `PYTHONHASHSEED` in Dockerfile/entrypoint/config ↔ OLD get-profile.ts:360-367 `new Set` (insertion order) | ORD-1 |
| D12 raw ids rendered | **C** | NEW get-profile.ts:150-170 (`{label: slug}` fallback) ↔ OLD get-profile.ts:255-267 (`findProById` / `.filter(non-null)`) | RAW-ID-1 |
| D13 limit validation | **C** (C2 refines the page outcomes) | serializers/profile_filters.py:26 min1/max100; pages `parseInt(...)` → NaN → JSON null → 400. OLD `params.limit \|\| 20`, unbounded | SORT-1 (archive param hardening) |
| D14 `updatedAt` not bumped on featured toggles | **A** (scope wider) | OLD webhooks/worldline/route.ts:347-349, 471-473, 536-538 `prisma.profile.update` with `@updatedAt` (user.prisma) ↔ NEW subscription_ops.py:288,743,760, renewals.py:293 `.update(featured=…)`. **Also**: `.update()` bypasses the Profile post_save signal, so no Redis purge of `profile:page`, `profiles:directory`, `core:home`. signals.py:3-6 wrongly claims services never use `.update()` | CACHE-1 |
| D15 JSON-LD `?type=companies` | **C** (intentional fix) | OLD dir/page.tsx:60 casts the raw `'companies'` ↔ NEW page.tsx:60 maps it | — |
| D16 subjectTitle fallback | **C** trivial | OLD get-profile.ts:371 ↔ profile_aggregations.py:617 | — |
| D17 count cache key includes role | **C** (bug fix). **New side note:** the key omits `published`, so a `published:false` count call (AUTHZ-PUB) poisons the shared 30-min count cache | profile_aggregations.py:277-288 | AUTHZ-PUB |
| D18 gender-duplicate variant | **C** LOW | 13 duplicate pro slugs confirmed in maps.generated.json; NEW `node()` → `findProBySlug` global | PLURAL-1 |

### pass3-profiles-public-archives.md

| ID | Verdict | Evidence | Group |
|---|---|---|---|
| D1 search expands to sibling variants | **C** MEDIUM→LOW-MED | OLD taxonomies/index.ts:825-853 returns the matched node **ids** ↔ NEW core/taxonomy.py:292-301 returns slugs; profile_aggregations.py:126-139 expands each slug through `taxonomy_value_candidates` to all ids. 13 dup slugs confirmed (e.g. `ekfonites`: Voice-over Artist / Εκφωνητής) | — (return node ids) |
| D2 tie order arbitrary | **C** | profile_aggregations.py:321 `.order_by("-count")` only, :440 `[:5]` ↔ OLD stable sort over taxonomy walk | ORD-1 |
| D3 `/dir/null/<sub>` pills | **C** (data-dependent; DB count **U**) | profile_aggregations.py:329 `categorySlug: row["category"]` (None) → get-directory.ts:81-92 `` `/dir/${catSlug}/…` `` | TAX-HIER |
| D4 invalid/list `sortBy` | **C** | profile_aggregations.py:413 raw; :204 `sort_by in _SORT_MAP` raises TypeError for a list; :238 skips the shuffle for an unknown string ↔ OLD get-profiles.ts:580-583 | SORT-1 |
| D5 contact-reveal analytics | **C** (probably intentional) | OLD contact-reveal.tsx:33-38 `window.gtag` (never defined, layout loads no gtag) ↔ NEW contact-reveal.tsx:36 `trackEvent`. GTM container **U** | — |
| D6 global taxonomy lookups on service cards | **C** LOW | NEW get-profile.ts:185-204 `svcLabel` per level; service-media-card.tsx:80 falls back to raw `service.category`, which `_brief_service` ships (:652) ↔ OLD `resolveTaxonomyHierarchy` gives `''` | RAW-ID-1 |
| C1 county garbage → nationwide only | **C** | profile_aggregations.py:78-87 ↔ OLD get-profiles.ts:163-200 | — |
| C2 limit outcomes /dir 500, cat 404, sub 500 | **C** | dir/page.tsx:45-46 throws; [category]/page.tsx:80-81 notFound; [subcategory]/page.tsx:80-87 throws unless the message is "not found" | — |
| C3 taxonomy-paths uncached | **C** (no user impact) | profile.py:185-191 | — |

### pass2 + privacy group

| ID | Verdict | Evidence | Group |
|---|---|---|---|
| pass2-authz **D2** unpublished profiles listable | **C** HIGH in code (public reachability of the Django host **U**) | profile_filters.py:13 `published = BooleanField(default=True)`; profile_aggregations.py:216, :265 `published=filters.get(...)`; aggregations.py:30-51 AllowAny. OLD: `getProfilesByFilters`/`getProfilesCount` are not imported by any `'use client'` file (I grepped), so they were unreachable. Exposed fields = `serialize_profile_card` (no phone/names). Plus the D17 cache-poisoning side note | AUTHZ-PUB |
| archives **D3** | see above (**A**) | | PRIV-1 |
| reviews-saved **D5** `/api/saved` PII | **A** MEDIUM→LOW | saved_reads.py:55-60 uses the summary (C). But phone/viber/whatsapp/terms are rendered publicly on the OLD profile page for every published profile, and "even if the pro hid them via visibility" is **R**: there is no phone visibility toggle and no reader. Real delta = firstName/lastName (OLD used them only server-side for initials: user-avatar.tsx:81-104, no 'use client'). Note: OLD saved items also had no published filter, so that part is the same | PRIV-1 |
| home-search **D4** `/api/home` PII | **A** HIGH→LOW-MED | home.py:70 summary on AllowAny (C). Same reasoning: phone/viber/whatsapp/bio/socials/terms/portfolio are public on OLD profile pages. The new anonymous exposure is firstName/lastName (plus bulk scrapability). "visibility hides the phone" is **R** | PRIV-1 |
| pass2-payload **D1** article author picker empty | **C** HIGH (admin) | admin_profiles.py:316-321 `len(query)<2 → []`; articles/create/page.tsx:28 `adminProfiles.search('')`; article-form.tsx:345 local `options` only | (admin) |
| pass2-payload §4 re-confirm of dashboard D10 | **C** | as D10 | PRIV-1 note |

---

## 3. Notes on every non-CONFIRMED verdict

- **dashboard D7 (A).** The throttle sentence is refuted by C1: `AfmLookupThrottle` never fires, and because `throttle_classes` replaces the defaults, `LookupAfmView` has **no** throttle at all. That equals OLD (no limit). The English DRF throttle text can't occur. The text differences remain valid (LOW).
- **archives D3 (A).**
  - The email leak is real and is the most serious item in this cluster. Both `profile.email` and the **login** `user.email` are sent to anyone, cached 30 min, regardless of `visibility.email`.
  - The listed phone/viber/whatsapp fields are not a regression: OLD put them in the public page HTML/RSC payload unconditionally (`profile-info.tsx:124-159`).
  - firstName/lastName are a real but minor new exposure.
- **reviews-saved D5 (A) and home-search D4 (A).**
  - Both rest on "hidden via visibility". That premise is false: `visibility` only ever governs email (`profile-info.tsx:165`; profiles-dashboard D15 already found no phone/address reader).
  - Neither payload carries `email`.
  - The residual issue is firstName/lastName (+ bulk API scraping of data that is otherwise public per-page). Severity LOW (saved: login required) / LOW-MEDIUM (home: anonymous).
  - The fix is folded into PRIV-1. Do not "fix" by switching home/saved to `serialize_profile_card` blindly without checking consumers: the home featured card is fine with card fields, and the service page needs `terms`/`rate`/etc.
- **archives D14 (A).** The ordering claim is confirmed, and the scope is wider: the same `.update()` calls skip the post_save cache purge. The featured badge/order on the profile page bundle, directory and `core:home` therefore wait for the TTL. Whether OLD's webhook revalidated those tags is owned by billing. The `updatedAt` part is a confirmed parity diff either way.
- **dashboard D2 (C, citation nit).** OLD `revalidateProfile` has no `revalidatePath('/s/<slug>')`. It purges service data through tags (`service.byProfile`, `collections.services`, revalidation.ts:146-151). The conclusion (NEW narrowed the purge scope) stands.
- **P3-D3 (C, nit).** A whitespace-only tagline is stored as `''`, not null.
- **P3-D2 fix nuance.** The pass-3 suggestion "reuse `core/taxonomy._location_id_to_name`" is NOT exact parity. That helper registers all counties, then all areas, and skips postcodes. OLD `getLocationName` checks counties first, then **per county**: its areas, then its zipcodes. So for a colliding area id, OLD can return an earlier county's **zipcode** name (e.g. id `100` → `'11502'` in OLD). To match `coverageNormalized` exactly, port `getLocationName` literally. 805 area-level and 29 county-level ids differ today.
- **UNVERIFIABLE items and the live check that settles each.**
  - D1 / P3-D1: on test.doulitsa.gr, run `python manage.py shell` → `lookup_afm('094014201')` with `print(result)` before parsing. That confirms the unwrap path and whether AADE rejects a non-AFM `afm_called_by`.
  - D9: `\d verifications` (`afm` text vs varchar(16)).
  - pass3-archives D3: `select count(*) from profiles where published and "isActive" and coalesce(subcategory,'')<>'' and coalesce(category,'')=''`.
  - AUTHZ-PUB: `curl -XPOST https://<public-api-host>/api/profiles/search -d '{"published":false}'`. Is the Django host publicly routed?
  - P3-D2 sizing: count of profiles with `coverage` written since the new stack started.

## 4. Nothing REFUTED outright at finding level
Every finding has a real code basis. Refutations are partial:
- the D7 throttle clause;
- the "hidden by visibility" premise in reviews-saved D5 and home-search D4;
- the phone part of archives D3;
- the D2 revalidatePath citation.

Severity changes:
- home-search D4: HIGH → LOW-MED
- reviews-saved D5: MEDIUM → LOW
- archives D3: HIGH, narrowed to email
- pass3-archives D1: MEDIUM → LOW-MED
