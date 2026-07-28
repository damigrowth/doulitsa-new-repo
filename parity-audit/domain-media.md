# Domain: Media

Audit-only migration parity check. Scope: the MEDIA RECORDS layer — the `media`
table/model, attach/detach to profiles & services, ordering, and upload
bookkeeping. (Cloudinary signing/storage was covered broadly in a separate
report; here the focus is the records layer.)

Codebases:
- OLD: `/home/sereth1/Desktop/doulitsa-new-repo/app_before_migrations` (Next.js + Prisma + Cloudinary)
- NEW backend: `/home/sereth1/Desktop/doulitsa-new-repo/backend` (Django/DRF)
- NEW frontend: `/home/sereth1/Desktop/doulitsa-new-repo/frontend`

## Key architectural fact (read first)

In the **OLD** app the Prisma `Media` model exists (`media.prisma:1-26`) with all
columns, **but it is NEVER used** — no `prisma.media.create/find/delete` anywhere
in the codebase. The actual displayed media is stored as **JSON** on the owning
rows:
- `Service.media Json?` (`service.prisma:49`)
- `Profile.image String?` + `Profile.portfolio Json?` (`user.prisma:78,80`)

So in OLD the `media` table is dead schema; all real media bookkeeping is the
JSON-field create/update/delete on services & profiles, plus two Cloudinary
signing helpers.

In the **NEW** backend the `Media` model is mirrored 1:1 (`models/media.py:9-50`)
**and is actually written** by a new `POST /api/media/upload` endpoint
(`views/public/upload.py`, `services/cloudinary_upload.py:83-97`). NEW therefore
does *more* than OLD at the records layer (it populates the table OLD left
empty), but it inherits OLD's gaps (no list/delete/reorder, no temp cleanup) and
**loses two server-side guarantees** OLD had on the JSON path (max-10 cap,
`_pending`/`blob:` stripping).

## Parity matrix

| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Sign arbitrary upload params (`POST /api/sign-cloudinary-params`) | endpoint | `src/app/api/sign-cloudinary-params/route.ts:12-39` | `views/public/sign.py:17-26`; route alias `config/urls.py:69-73` (also `media/sign-cloudinary-params` `urls/public.py:15`) | ✅ matched | Auth-only in both. Legacy top-level path preserved. |
| Media-library token (admin) (`getMediaLibraryToken`) | endpoint | `src/actions/cloudinary/get-media-library-token.ts:24-65` | `views/public/sign.py:29-35`, `services/cloudinary_signing.py:32-58`, route `urls/admin.py:11` | ✅ matched | Admin-gated both sides. Response keys `{signature,timestamp,apiKey,cloudName}` identical. |
| Frontend action: media-library token | fe action | `src/actions/cloudinary/get-media-library-token.ts` | `frontend/src/actions/cloudinary/get-media-library-token.ts:12-22` + `frontend/src/lib/api/media.ts:118-121` | ✅ matched | Same `{success,data,error}` envelope. |
| Frontend action: sign params | fe action | inline `fetch('/api/sign-cloudinary-params')` (widget) | `frontend/src/lib/api/media.ts:115-116` `signCloudinaryParams()` | ✅ matched | |
| Register uploaded media row (persist `media` table) | endpoint+schema | ❌ none (OLD never touches `media` table) | `views/public/upload.py:28-57`, `services/cloudinary_upload.py:39-99` | ➕ NEW-only (no regression) | NEW actually persists a `Media` row per upload; OLD did not. Behavior superset. |
| Media table schema (columns) | schema | `media.prisma:1-26` | `models/media.py:9-50` + migration `0001_initial.py` | ✅ matched | All columns + db_columns + indexes match (see Schema section). |
| List a user's media | endpoint | ❌ none | ❌ none (`selectors/__init__.py`, `views/admin/__init__.py` empty) | ✅ matched (both absent) | Neither side has a list endpoint. |
| Delete a media row / asset | endpoint | ❌ none (`delete-service.ts:83` comment: media is JSON, no separate delete) | ❌ none | ✅ matched (both absent) | No standalone media delete in either. |
| Reorder media | endpoint | ❌ none (ordering = array position in JSON, set by client) | ❌ none | ✅ matched (both absent) | Ordering is implicit array order on the owning row's JSON in both. |
| Temp-media cleanup (`isTemporary`) | business rule | ❌ none (no cron, table unused) | ❌ none (no mgmt command / celery task / signal) | ✅ matched (both absent) | NEW sets `is_temporary` but never cleans it up — same net effect as OLD. |
| Cloudinary asset destroy on delete/replace | business rule | ❌ none (no `cloudinary.uploader.destroy`) | ❌ none | ✅ matched (both absent) | Orphaned assets in both; out of records-layer scope but noted. |
| Attach media → Service (`media` JSON) | attach + validation | `create-service.ts:207,270,348`; `update-service.ts:147-160`; server Zod `.max(10)` `service.ts:1023-1029`; `sanitizeCloudinaryResources` strips `_pending`+`blob:` | `services/service_writes.py:171-177` `sanitize_resource()`; serializer `serializers/service.py:33,45` | ⚠️ partial | NEW keeps key-whitelist sanitize but DROPS the `.max(10)` cap and the `_pending`/`blob:` filter. |
| Attach media → Profile portfolio (`portfolio` JSON) | attach + validation | `profiles/portfolio.ts:52` (`updateProfilePortfolioSchema.safeParse`, `.max(10)`) + `:64` `sanitizeCloudinaryResources` | `profiles/services/profile_updates.py:218-223` `sanitize_resource()`; serializer `profile_updates.py:46-47` | ⚠️ partial | Same gap: NEW lacks `.max(10)` cap and `_pending`/`blob:` rejection. |
| Attach avatar → Profile `image` (string URL) | attach + validation | `complete-onboarding.ts:96-105` `processImageForDatabase` rejects `blob:`, requires `https://` | `profiles/services/profile_updates.py:49-80` (extracts `image.secure_url`, stores in `URLField`) | ⚠️ partial | NEW stores into `URLField` but does NOT explicitly reject `blob:` or require `https://` at the service layer. |
| Owner-only attach (service/profile) | authz | `update-service.ts:113-114` `pid !== profile.id`; `portfolio.ts:28` role + `where uid:user.id` | service/profile update views (owner-scoped) | ✅ matched | Attach paths owner-scoped in both (per profiles/services audits). |
| Owner-only media read/delete (media table) | authz | n/a (table unused) | n/a (no media read/delete endpoint) | ✅ matched (both absent) | No owner-only media-row endpoint to protect in either. |
| Upload-file content/size limits | validation | server schemas `avatarUploadSchema`(3MB)/`portfolioUploadSchema`(25MB) NOT used server-side (widget-only); blob/https checks server-side | `cloudinary_upload.py:26-55` 10 MiB flat + image/video MIME allowlist + usage_context allowlist | ⚠️ partial | OLD never server-enforced per-context byte caps; NEW adds a flat 10 MiB + MIME check. Minor shape diff, not a strict regression. |
| Upload response shape (Cloudinary-shaped) | response | n/a (OLD widget gets shape from Cloudinary directly) | `cloudinary_upload.py:99` returns raw Cloudinary JSON; `local_upload.py:139-161` Cloudinary-shaped | ✅ matched | NEW returns `{public_id,secure_url,width,height,format,bytes,...}` consumed by FE `MediaResource` (`media.ts:66-84`). |

## Schema parity (media table columns)

OLD `media.prisma` vs NEW `models/media.py` — exact match including DB column
names and indexes:

| Column (db) | OLD `media.prisma` | NEW `models/media.py` | Status |
|---|---|---|---|
| `publicId` (unique) | `:3` | `:12` | ✅ |
| `secureUrl` | `:4` | `:13` | ✅ |
| `width` Int? | `:5` | `:14` | ✅ |
| `height` Int? | `:6` | `:15` | ✅ |
| `format` String? | `:7` | `:16` | ✅ |
| `bytes` Int? | `:8` | `:17` (BigInteger) | ✅ (wider, compatible) |
| `resourceType` | `:9` | `:18` | ✅ |
| `folder` String? | `:10` | `:19` | ✅ |
| `originalName` String? | `:11` | `:20` | ✅ |
| `userId` FK→User (cascade) | `:12,19` | `:22-29` (`db_constraint=False`) | ✅ (FK constraint disabled in NEW — soft FK) |
| `isTemporary` default true | `:13` | `:31` | ✅ |
| `usageContext` String? | `:14` | `:32-34` | ✅ |
| `usageId` String? | `:15` | `:35` | ✅ |
| `createdAt`/`updatedAt` | `:16-17` | `:37-38` | ✅ |
| indexes publicId / isTemporary / (usageContext,usageId) | `:21-24` | `:43-46` | ✅ |

Note: OLD also has `@@index([userId])`; NEW relies on the FK index implicitly
(FK `db_constraint=False` still creates a btree index on `userId` in Django).
Cosmetically equivalent.

## Detailed gaps

### GAP 1 (⚠️ partial) — Server-side `max 10` media/portfolio cap dropped
- **OLD behavior:** Service media and profile portfolio are validated
  server-side with Zod `.array(...).max(10, ...)`:
  - service: `src/lib/validations/service.ts:1023-1029` (and other step schemas
    `:940,1202,1382,1486`), invoked in create/update actions.
  - portfolio: `src/lib/validations/profile.ts:303-309`, invoked at
    `src/actions/profiles/portfolio.ts:52` and admin `:62`.
  Onboarding portfolio capped too (`profile.ts:577-581`).
- **NEW behavior/gap:** No max-count check. `CreateServiceSerializer.media` is a
  bare `JSONField` (`serializers/service.py:33`); `UpdateServiceMediaSerializer`
  is `ListField(child=JSONField())` (`:45`) with no `max_length`. Portfolio
  serializer `ListField(child=JSONField(), allow_empty=True)`
  (`profile_updates.py:46-47`) — no `max_length`. Service-layer
  `sanitize_resource` (`common/utils/cloudinary.py:43-54`) only key-filters; it
  does not count.
- **Impact:** A client (or a tampered request) can attach >10 images to a
  service or portfolio, exceeding the product limit OLD enforced. Bloats payloads
  and UI.
- **Suggested Django fix:** Add `max_length=10` to the `ListField`s (or a
  `validate_media` / `validate_portfolio` method raising
  `ValidationError("Μπορείτε να ανεβάσετε έως 10 αρχεία")`) in
  `apps/services/serializers/service.py` and
  `apps/profiles/serializers/profile_updates.py`.

### GAP 2 (⚠️ partial) — `_pending` / `blob:` resources not stripped server-side
- **OLD behavior:** Before persisting, OLD runs `sanitizeCloudinaryResources`
  (`src/lib/utils/cloudinary.ts:471-481`) which (a) filters out resources with
  `_pending: true` or `public_id` starting `pending_`, and (b) filters out any
  `secure_url` starting `blob:`. Used in `create-service.ts:207`,
  `update-service.ts` clean step, `profiles/portfolio.ts:64`, and admin
  `services.ts:956-961`. Avatar path rejects `blob:` and requires `https://`
  (`complete-onboarding.ts:99-105`, `cloudinary.ts:494-530`).
- **NEW behavior/gap:** NEW `sanitize_resource` (`common/utils/cloudinary.py:43-54`)
  only whitelists keys; it does NOT drop `_pending`/`pending_` items nor reject
  `blob:` URLs. The avatar path (`profile_updates.py:49-80`) extracts
  `image.get("secure_url")` but does not reject `blob:` or require `https://`.
- **Impact:** A half-finished/optimistic client upload (blob URL or pending
  placeholder) can be persisted into `Service.media` / `Profile.portfolio` /
  `Profile.image`, producing broken `<img src="blob:...">` after reload.
- **Suggested Django fix:** Extend `sanitize_resource` (or wrap it in a list
  sanitizer) to drop items where `_pending` is truthy, `public_id` starts with
  `pending_`, or `secure_url` starts with `blob:`; and in `update_basic_info`
  reject avatar values that are `blob:` / non-`https://`. Mirror
  `sanitizeCloudinaryResources` + `processImageForDatabase`.

### GAP 3 (minor ⚠️) — usage_id/is_temporary is write-once; no lifecycle
- **OLD behavior:** N/A at table level (table unused), so OLD never relied on
  `isTemporary`/`usageId` flips. There is also no temp cleanup in OLD.
- **NEW behavior:** `cloudinary_upload.py:94-96` sets
  `usage_context = usage_context or "general"`, `usage_id = usage_id`,
  `is_temporary = usage_id is None` **only at create time**. Nothing ever flips
  `is_temporary→False` or sets `usage_id` after the fact when the resource is
  actually attached to a profile/service (the attach happens on the JSON field,
  independent of the Media row). No cleanup job removes stale
  `is_temporary=True` rows.
- **Impact:** Low (parity-neutral): OLD had no cleanup either, so no regression.
  But NEW's `media` table will accumulate orphan `is_temporary=True` rows with no
  reaper, and the `usageContext`/`usageId` bookkeeping is effectively cosmetic
  (never reconciled with the JSON attach). Flag as a latent issue, not a parity
  break.
- **Suggested Django fix (optional, exceeds OLD):** If the team wants the
  bookkeeping to mean anything, on service/profile attach update the matching
  `Media` rows (`is_temporary=False`, set `usage_id`), and add a management
  command/celery beat task deleting `is_temporary=True` rows older than N hours
  (also `cloudinary.uploader.destroy`). Not required for OLD parity.

### NON-GAP — sign route path
- OLD frontend hit `/api/sign-cloudinary-params` (top-level). NEW preserves this
  exact path as a legacy alias (`config/urls.py:69-73`) in addition to the
  namespaced `/api/media/sign-cloudinary-params`. ✅ No mismatch.

### NON-GAP — upload endpoint is additive
- NEW's `POST /api/media/upload` + persisted `Media` row have no OLD counterpart
  (OLD uploaded straight to Cloudinary from the browser via signed params). This
  is a behavior superset, not a regression. The response is Cloudinary-shaped so
  the FE `MediaResource` contract is preserved.

## Response-shape mismatches

| Endpoint | OLD shape | NEW shape | Mismatch? |
|---|---|---|---|
| sign params | `{ signature }` (`route.ts:39`) | `{ signature }` (`cloudinary.py:40`) | none |
| media-library token | `{ success, data:{ signature, timestamp, apiKey, cloudName }, error }` (`get-media-library-token.ts:13-22`) | same envelope rebuilt in FE action (`frontend/.../get-media-library-token.ts:12-22`) over backend `{ signature, timestamp, apiKey, cloudName }` (`cloudinary_signing.py:53-58`) | none — keys + camelCase preserved |
| upload (NEW only) | n/a (Cloudinary raw JSON to browser) | raw Cloudinary JSON / Cloudinary-shaped local (`cloudinary_upload.py:99`, `local_upload.py:139-161`) | n/a — FE `MediaResource` (`media.ts:66-84`) reads snake_case `public_id`/`secure_url`/`width`… ✅ |
| persisted media item keys (service.media / portfolio) | snake_case Cloudinary keys (`public_id`,`secure_url`,…) via `cloudinaryResourceSchema` | same snake_case keys, key-whitelisted by `sanitize_resource` (`cloudinary.py:49-53`) | none — both snake_case; both drop write-only fields. NEW additionally fails to drop `_pending` (Gap 2). |

Casing note: media RESOURCE objects use **snake_case** (`public_id`,
`secure_url`) in both OLD and NEW — these are Cloudinary's own keys, distinct
from the DB column camelCase (`publicId`,`secureUrl`) which is internal only.
No casing drift on the wire.

## Counts

- matched = 13
- partial = 4  (Gap 1 service cap, Gap 1/2 portfolio cap+filter, Gap 2 avatar blob/https, Gap 3 lifecycle / + upload size-limit shape)
- missing = 0  (every OLD media operation has a NEW equivalent; the "missing"
  capabilities — list/delete/reorder/temp-cleanup — were absent in OLD too, so
  they are matched-absent, not regressions)
- needs_verification = 0

### ❓ / verification notes
- Service/profile owner-scoping on attach was taken from the parallel
  profiles/services audits, not re-derived here line-by-line; treated as matched
  but flagged as cross-domain.
- OLD per-context byte caps (3MB avatar / 25MB portfolio in
  `validations/media.ts:70-98`) were confirmed **client/widget-only** (no
  server-side usage found outside `validations/media.ts`), so NEW's flat 10 MiB
  server cap is not a strict regression — recorded as a minor shape difference.
