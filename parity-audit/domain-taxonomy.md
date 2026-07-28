# Domain: Taxonomy

AUDIT-ONLY parity check. Golden rule: NEW (Django/DRF) must do EVERYTHING OLD (Next.js + Prisma) did. Any difference = BUG.

Scope: `taxonomy_submissions` table (user-submitted skills/tags + admin moderation) + static taxonomy datasets (categories/skills/tags/locations). NOTE: the admin "git/publish/dataset-CRUD" workflow (taxonomy-git.ts, taxonomy-publish.ts, dataset_ops.py) is tangential to this domain and only audited where it intersects approval side-effects.

Legend: ✅ match · ⚠️ partial · ❌ missing/broken · ❓ needs verification

---

## Parity matrix

| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Submit taxonomy request (skill/tag) | Endpoint | `app_before_migrations/src/actions/taxonomy-submission.ts:22-122` | `backend/apps/taxonomy/views/public/submissions.py:15-31` + `services/submissions.py:31-82` | ⚠️ | Behaviorally close but **returns raw cuid instead of `pending_<cuid>`** + dropped dataset dup-check (see gaps). |
| List my submissions | Endpoint | `taxonomy-submission.ts:128-165` | `views/public/submissions.py:34-43` + `services/submissions.py:85-98` | ⚠️ | NEW returns raw cuid `pendingId`; OLD returns `pending_<cuid>`. NEW adds `type`/`createdAt` keys. |
| Admin list submissions | Endpoint | `app_before_migrations/src/actions/admin/taxonomy-submission.ts:24-111` | `views/admin/submissions.py:30-34` + `services/admin_submissions.py:26-51` | ⚠️ | NEW response key is `submissions`; OLD is `items`. NEW drops `categoryLabel` + `submitterProfile` enrichment. sortBy whitelist differs. searchQuery scope differs. |
| Admin submission stats | Endpoint | `admin/taxonomy-submission.ts:113-143` | `views/admin/submissions.py:37-41` + `admin_submissions.py:54-61` | ✅ | total/pending/approved/rejected all present, same keys. |
| Approve submission | Endpoint | `admin/taxonomy-submission.ts:242-360` | `views/admin/submissions.py:44-48` + `admin_submissions.py:64-93` | ❌ | NEW does NOT replace `pending_<id>` with real id in profiles.skills[]/services.tags[], does NOT inject into runtime cache, does NOT revalidate caches, does NOT exclude already-assigned ids from collision set. Returns different shape. |
| Reject submission | Endpoint | `admin/taxonomy-submission.ts:366-421` | `admin_submissions.py:96-109` | ❌ | NEW does NOT remove `pending_<id>` from profiles.skills[]/services.tags[]; does NOT revalidate caches. |
| Bulk approve | Endpoint | `admin/taxonomy-submission.ts:427-443` | `admin_submissions.py:112-120` | ⚠️ | Logic present; inherits the approve gaps. Response shape differs (`{approved, errors}` vs `{success, approved, error}`). |
| Bulk reject | Endpoint | `admin/taxonomy-submission.ts:445-462` | `admin_submissions.py:123-131` | ⚠️ | Logic present; inherits reject gaps. NEW additionally requires `reason` (views/admin/submissions.py:80-84); OLD reason optional. |
| Rate limit 5/24h per user | Business rule | `taxonomy-submission.ts:47-61` (DB count, 429-equiv message) | throttle `5/day` `backend/common/throttling.py:27-28` + `config/settings/base.py:228`; AND per-user DB count `services/submissions.py:51-61` | ⚠️ | Double-enforced. DRF throttle is per-IP-scope rolling, not per-user-per-day DB count → semantics differ; throttled returns 429 before service runs. |
| Pro-only authorization (freelancer/company) | AuthZ | `taxonomy-submission.ts:30-33` (`hasAnyRole(['freelancer','company'])`) | `views/public/submissions.py:18` `IsProfessional` + `services/submissions.py:38-43`; `accounts/permissions/roles.py:52`, `models/user.py:178` | ✅ | Equivalent role gate. |
| Dataset duplicate detection (skill in category / tag) | Business rule | `taxonomy-submission.ts:63-86` (`getSkillsByCategory`, `getTags`, `normalizeTerm`) | — (`services/submissions.py:11-14` comment says NOT implemented) | ❌ | NEW omits static-dataset dup check entirely. |
| Pending-submission duplicate detection | Business rule | `taxonomy-submission.ts:88-102` (any user, `type`+`status=pending`+label iexact) | `services/submissions.py:64-74` (scoped to `submitted_by=user.id`) | ⚠️ | NEW narrowed to same-user only → cross-user duplicate pendings now allowed. |
| Validation (label 2-60, category required for skill) | Validation | `lib/validations/taxonomy-submission.ts:6-24` (max 60, trim) | `serializers/taxonomy.py:7-11` (min 2, **max 255**) + `services/submissions.py:46-49` | ⚠️ | NEW max length 255 vs OLD 60. category-required enforced in both. |
| Schema: columns + enums | Schema | `lib/prisma/schema/taxonomy-submission.prisma:1-30` | `models/taxonomy_submission.py:14-46` | ✅ | All columns + camelCase db_columns + both enums (skill/tag, pending/approved/rejected) + table `taxonomy_submissions` match. |
| `pending_` prefix ID scheme | Business rule | `lib/utils/taxonomy-submission.ts:9-32` (createSubmissionId/get/is) used at `taxonomy-submission.ts:116,156`, `admin/taxonomy-submission.ts:187,211` | — (not in backend; `frontend/src/lib/utils/taxonomy-submission.ts:9` still expects it) | ❌ | Backend never prefixes. Frontend still has `PENDING_PREFIX`. Core scheme broken. |
| Static datasets (categories/skills/tags/locations) | Dataset | `app_before_migrations/src/constants/datasets/*.ts` + `src/lib/taxonomies/maps.generated.json` | `frontend/src/constants/datasets/*.ts` (byte-identical) + `backend/.../_taxonomy_maps.json` (byte-identical) | ✅ | md5-identical; pro=8 cats/360 sub, service=8/88/490, skills=604, tags=1298, locations=53/917/1488. No drift. |
| Admin notification email on submit | Side-effect | none found in OLD taxonomy actions | none in NEW | ✅ | Scope mentioned this but OLD has NO email side-effect — nothing to port. |

---

## Detailed gaps

### ❌ GAP 1 — `pendingId` returns raw cuid, not `pending_<cuid>` (CRITICAL, breaks the whole pending-tag/skill flow)
- **OLD:** submit returns `{ pendingId: createSubmissionId(record.id) }` = `pending_<cuid>` (`taxonomy-submission.ts:116`); list-mine maps the same (`:156`). The frontend form stores this exact `pendingId` as the selected option's `id` in `Profile.skills[]` / `Service.tags[]` (e.g. `frontend/src/components/forms/profile/form-basic-info.tsx:228`, `service/form-service-edit.tsx:248`). The `pending_` prefix is the contract that lets approval/rejection later find and swap those array entries, and lets the UI style them as "pending" (`isTaxonomySubmissionId`).
- **NEW:** `SubmitTaxonomyView` returns `{"pendingId": submission.id}` — the bare cuid, no prefix (`views/public/submissions.py:31`). `list_my_submissions` returns `"pendingId": s.id` (`services/submissions.py:91`). The NEW frontend still ships `PENDING_PREFIX='pending_'` and `isTaxonomySubmissionId` (`frontend/src/lib/utils/taxonomy-submission.ts:9-32`).
- **Impact:** Pending skills/tags get stored in profiles/services as bare cuids that no longer satisfy `isTaxonomySubmissionId()` → they won't be styled as pending, and (combined with GAP 2/3) will NEVER be reconciled to real numeric IDs on approval, leaving permanent dangling cuids in `profiles.skills[]` / `services.tags[]` that resolve to nothing on render.
- **Suggested Django fix:** In `services/submissions.py`, return `pendingId = f"pending_{submission.id}"` from both `submit_taxonomy` (via the view) and `list_my_submissions`; and have admin approve/reject strip the prefix before matching DB rows. Mirror `createSubmissionId`/`getSubmissionRecordId` server-side.

### ❌ GAP 2 — Approve does not replace `pending_<id>` with real numeric ID in profiles/services
- **OLD:** `approveTaxonomySubmission` runs `replaceSubmissionIdInRecords` — raw SQL `array_replace("skills"/"tags", 'pending_<id>', '<realNumericId>')` across `profiles`/`services` (`admin/taxonomy-submission.ts:182-202,320`). Also injects into runtime taxonomy cache (`injectTaxonomyItem`, `:324`) and revalidates many caches (`:327-341`), and seeds the collision set with already-assigned ids of other approved-but-unpublished submissions (`:277-287`).
- **NEW:** `approve()` only flips status + sets reviewer/reviewedAt/assignedId and optionally calls `dataset_ops.create_skill/create_tag` to push to GitHub (`admin_submissions.py:64-93`). NO array_replace, NO runtime cache injection, NO cache revalidation, NO cross-submission collision seeding.
- **Impact:** After approval the user's saved skill/tag stays as the old pending id forever; the new item exists in the dataset under a fresh numeric id but is never linked back to the records that requested it. Users lose their submitted skill/tag on the profile/service.
- **Suggested Django fix:** After `sub.save`, run an UPDATE mirroring `array_replace` on `profiles.skills` / `services.tags` (Postgres `array_replace`), keyed by `pending_<id>` → `assigned_id`. Add cache invalidation equivalent to the OLD `revalidateTag` set. Seed the dataset-id collision set with other approved submissions' `assigned_id`.

### ❌ GAP 3 — Reject does not remove `pending_<id>` from profiles/services
- **OLD:** `rejectTaxonomySubmission` runs `removeSubmissionIdFromRecords` — `array_remove("skills"/"tags", 'pending_<id>')` (`admin/taxonomy-submission.ts:207-226,396`) + cache revalidation (`:399-408`).
- **NEW:** `reject()` only flips status + reviewer/reviewedAt/rejectReason (`admin_submissions.py:96-109`). No array_remove, no revalidation.
- **Impact:** Rejected pending skills/tags remain stuck in `profiles.skills[]` / `services.tags[]` as dangling pending ids that never resolve to a label.
- **Suggested Django fix:** After `sub.save`, run `array_remove` UPDATE on the relevant table keyed by `pending_<id>`; add cache invalidation.

### ❌ GAP 4 — Static-dataset duplicate detection on submit dropped
- **OLD:** before creating, checks the live dataset: for skills, `getSkillsByCategory(category)` + `normalizeTerm`; for tags, `getTags()` (`taxonomy-submission.ts:63-86`) — rejects with a localized "already exists" message.
- **NEW:** explicitly not implemented; a code comment defers it to admin review (`services/submissions.py:11-14`). Only DB dup is checked.
- **Impact:** Users can submit skills/tags that already exist in the canonical dataset; pollutes the moderation queue and risks duplicate dataset entries on approval.
- **Suggested Django fix:** Load the taxonomy maps (already present at `backend/.../_taxonomy_maps.json`) and replicate `getSkillsByCategory`/`getTags` + `normalizeTerm` dedupe before create.

### ⚠️ GAP 5 — Pending-duplicate check narrowed from global to per-user
- **OLD:** dup check is global across all users (`where: { type, status:'pending', label iexact }`) — `taxonomy-submission.ts:89-95`.
- **NEW:** scoped to `submitted_by=user.id` (`services/submissions.py:64-69`).
- **Impact:** Two different users can now create duplicate pending submissions for the same label/type; OLD blocked the second one. Queue duplication.
- **Suggested fix:** Drop the `submitted_by` filter to match OLD global dedupe.

### ⚠️ GAP 6 — Rate-limit semantics changed (DRF throttle vs per-user DB count)
- **OLD:** DB count of this user's submissions in trailing 24h ≥ 5 → friendly Greek message, success:false (HTTP 200 with error) (`taxonomy-submission.ts:47-61`).
- **NEW:** both a per-user DB count (`services/submissions.py:51-61`, raises 429) AND a DRF `ScopedRateThrottle` `taxonomy_submission: 5/day` (`throttling.py:27`, `base.py:228`). DRF scoped throttle keys on user/IP cache, not a DB window.
- **Impact:** Edge-case divergence (throttle cache TTL vs rolling DB window; throttle may 429 before the view runs; OLD returned 200+message). Mostly equivalent in spirit; flag for behavior/response-code parity.

### ⚠️ GAP 7 — Admin list: missing enrichment + filter/sort differences
- **OLD:** items include `categoryLabel` (resolved via `findProById`) and `submitterProfile {id,displayName,image}` joined from `profiles` (`admin/taxonomy-submission.ts:80-95`). sortBy whitelist = `['createdAt','status','label','type']`, default limit 10 (`validations/admin.ts:546,548-549`). searchQuery matches `label` only (`:46`).
- **NEW:** rows have NO `categoryLabel`, NO `submitterProfile` (`admin_submissions.py:134-148`). sortBy only maps `createdAt`/`updatedAt`, everything else silently falls back to `created_at` (`admin_submissions.py:35-40`) — `status`/`label`/`type` sorts are broken/ignored. Default limit 20 vs OLD 10. searchQuery matches `label` OR `category` (`:32-33`) — broader than OLD.
- **Impact:** Admin table loses submitter name/avatar + category label columns; sorting by status/label/type no-ops; default page size differs; search behavior differs.
- **Suggested fix:** Join profile + resolve categoryLabel in `_row`/`list_submissions`; extend `sort_col` map to include `status`/`label`/`type`; default limit 10; restrict search to label (or confirm intentional widening).

---

## Response-shape mismatches

| Endpoint | OLD shape | NEW shape | Mismatch |
|---|---|---|---|
| Submit | `{ pendingId: "pending_<cuid>" }` (`taxonomy-submission.ts:116`) | `{ pendingId: "<cuid>" }` (`views/public/submissions.py:31`) | **Missing `pending_` prefix** (GAP 1) |
| List mine | `[{ pendingId:"pending_<cuid>", label, category }]` (`:155-159`) | `[{ pendingId:"<cuid>", label, category, type, createdAt }]` (`services/submissions.py:90-97`) | prefix missing; NEW adds `type`,`createdAt` (additive, OK) |
| Admin list | `{ items:[...], total, limit, offset }`, each item = full row + `categoryLabel` + `submitterProfile` (`admin/taxonomy-submission.ts:77-100`) | `{ submissions:[...], total, limit, offset }`, row = bare fields camelCased (`admin_submissions.py:46-51,134-148`) | **`items`→`submissions` key rename**; rows lose `categoryLabel`+`submitterProfile` |
| Stats | `{ total,pending,approved,rejected }` (`:124-132`) | same (`admin_submissions.py:56-61`) | ✅ match |
| Approve | `{ success, assignedId, draft:{taxonomyType,item} }` (`:345-349`) | full submission `_row(sub)` dict (`admin_submissions.py:93`) | shape entirely different; NEW has no `draft` (OLD client saves draft to localStorage then publishes via /admin/git) |
| Reject | `{ success }` / `{ success:false, error }` (`:410`) | full `_row(sub)` (`admin_submissions.py:109`) | shape different |
| Bulk approve | `{ success, approved, error? }` (`:435-442`) | `{ approved, errors:[] }` (`admin_submissions.py:113`) | keys differ (`error`→`errors`, no `success`) |
| Bulk reject | `{ success, rejected, error? }` (`:454-461`) | `{ rejected, errors:[] }` (`admin_submissions.py:124`) | keys differ |

Dates: NEW emits ISO strings via `.isoformat()` (`admin_submissions.py:143,146-147`); OLD returns Prisma `Date` objects serialized by Next (ISO). Nulls preserved on both. Casing: both camelCase keys.

---

## Counts

- **matched = 6** (schema/columns+enums, stats endpoint, pro-only authZ, static datasets, no-email side-effect confirmation, submission-stats shape)
- **partial = 6** (submit, list-mine, admin-list, bulk-approve, bulk-reject, rate-limit, validation length — clustered around shape/enrichment/dedupe-scope)
- **missing = 4** (pending_ prefix scheme broken; approve array_replace + cache; reject array_remove + cache; dataset dup-check)
- **needs_verification = 0** (all claims cited; one open question: whether broadened admin search + per-user dup scope are intentional product changes vs accidental — flagged as ⚠️)

NB: counting capabilities, not endpoints; several "partial" rows share the single root cause (GAP 1 prefix). The prefix + approve/reject reconciliation gaps (GAP 1-3) are the highest-impact and functionally linked.
