# Domain: Saved

Audit-only migration parity check. OLD = Next.js + Prisma + Better Auth (`app_before_migrations`).
NEW = Django/DRF backend + Next.js frontend that calls it.

OLD exposes exactly **3** server actions (no Supabase RLS for saved exists in this codebase — the
"who saved me" RLS policy named in scope is NOT present in OLD; see Authorization section):
1. `toggleSave(itemType, itemId)` — save/unsave service or profile (toggle semantics)
2. `getSavedItems({servicesPage, servicesLimit, profilesPage, profilesLimit})` — paginated lists + totals
3. `getUserSavedState(userId)` — is-saved sets for heart icons

No standalone "is-saved single check", "count", or "who-saved-me" operation exists in OLD; counts
are returned only inside `getSavedItems`.

---

## Parity matrix

| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Save/unsave service (toggle) | Endpoint | `app_before_migrations/src/actions/saved/toggle-save.ts:26-59` | `backend/apps/saved/views/public/saved.py:14-28` → `backend/apps/saved/services/toggle.py:13-28` | ✅ | POST `/api/saved/toggle`. Toggle semantics + dedupe preserved. |
| Save/unsave profile (toggle) | Endpoint | `toggle-save.ts:60-90` | `saved.py:14-28` → `toggle.py:30-40` | ✅ | Same endpoint, `itemType=profile`. |
| List saved services (paginated) | Endpoint | `get-saved-items.ts:70-90` | `saved.py:31-46` → `backend/apps/saved/selectors/saved_reads.py:29-50` | ⚠️ | Endpoint exists; **default limit 12→20**, **service card shape differs** (see gaps). |
| List saved profiles (paginated) | Endpoint | `get-saved-items.ts:80-90` | `saved.py:31-46` → `saved_reads.py:34-61` | ⚠️ | Endpoint exists; **profile card shape differs badly** (uses full profile summary, missing card fields). |
| Counts (servicesTotal/profilesTotal) | Endpoint | `get-saved-items.ts:77-89,180-192` | `saved_reads.py:30,35,63-69` | ✅ | Embedded in list response; keys + totalPages math match. |
| is-saved checks (heart state) | Endpoint | `get-saved-state.ts:24-39` | `saved.py:49-57` → `toggle.py:45-54` | ✅ | GET `/api/saved/state`. Returns `{serviceIds, profileIds}` arrays. |
| who-saved-me / saved-by count | Endpoint | (not present in OLD) | (not present in NEW) | ✅ | N/A in this codebase — scope hint does not apply. |
| Sort: newest first | Sort | `get-saved-items.ts:73,83` `orderBy createdAt desc` | `saved_reads.py:29,34` `order_by("-created_at")` | ✅ | Preserved both lists. |
| Pagination skip/take | Pagination | `get-saved-items.ts:64-65,74-75,84-85` | `saved_reads.py:31-32,36-37` | ✅ | Same `(page-1)*limit` offset slicing. |
| Pagination params casing | Pagination | `get-saved-items.ts:34-38` | `backend/apps/saved/serializers/saved.py:12-16` | ✅ | `servicesPage/servicesLimit/profilesPage/profilesLimit` preserved. |
| Default page size | Pagination | `get-saved-items.ts:60,62` = **12** | `saved.py:40-46` defaults via serializer `saved.py:14,16` = **20** | ⚠️ | Default mismatch; masked because frontend page always sends 12. |
| Table `saved_services` | Schema | `app_before_migrations/src/lib/prisma/schema/saved.prisma:4-17` | `backend/apps/saved/models/saved_service.py:9-24` | ✅ | cuid PK, `userId`,`serviceId`(int),`createdAt`; unique(user,service). |
| Table `saved_profiles` | Schema | `saved.prisma:19-32` | `backend/apps/saved/models/saved_profile.py:9-24` | ✅ | cuid PK, `userId`,`profileId`(str),`createdAt`; unique(user,profile). |
| FK cascade on delete | Schema | `saved.prisma:10-11,25-26` `onDelete: Cascade` | `saved_service.py:13`/`saved_profile.py:13` `on_delete=CASCADE`, `db_constraint=False` | ⚠️ | Django keeps CASCADE but `db_constraint=False` — no DB-level FK; relies on existing Prisma-created constraint. Low risk. |
| Indexes on userId/serviceId/profileId | Schema | `saved.prisma:14-15,28-31` | `saved_service.py` / `saved_profile.py` (none declared) | ⚠️ | NEW models declare no `@@index`; only unique_together. Perf-only, behavior unaffected. |
| Dedupe (unique constraint) | Business rule | `saved.prisma:13,28`; `toggle-save.ts:35-42,65-72` findUnique | `toggle.py:19,23-27,32,36-39` unique_together + IntegrityError catch | ✅ | NEW additionally guards race via IntegrityError; OLD does not (parity-safe). |
| Invalid service ID validation | Validation | `toggle-save.ts:30-32` `isNaN` | `toggle.py:14-17` int() try/except → `FieldErrors itemId` | ✅ | Equivalent. |
| Invalid itemType validation | Validation | (OLD branches on else=profile, no explicit reject) | `toggle.py:42` raises FieldErrors | ✅ | NEW stricter; harmless. |
| Auth required (toggle, list) | AuthZ | `toggle-save.ts:19-22`, `get-saved-items.ts:51-53` | `saved.py:17,34` `IsAuthenticated` | ✅ | 401 on anon. |
| State endpoint anon-safe | AuthZ | `get-saved-state.ts:15-20` returns empty if no userId | `saved.py:52-56` `AllowAny` + empty for anon | ✅ | Behavior preserved. |
| User sees only own saved | AuthZ | `where:{userId}` everywhere; `get-saved-state.ts:14` ignores passed userId? No—uses it | `toggle.py`/`saved_reads.py` filter `user=request.user` (JWT) | ✅ | NEW derives user from JWT; **safer** than OLD `getUserSavedState(userId)` which trusted a client-passed userId. |
| Service card payload shape | Response shape | `get-saved-items.ts:93-122` | `saved_reads.py:73-101` `_service_card` | ❌ | Missing/renamed fields the card reads (see Response-shape). |
| Profile card payload shape | Response shape | `get-saved-items.ts:125-177` | `saved_reads.py:57-58` reuses `serialize_profile_summary` (`backend/apps/profiles/selectors/profile_reads.py:36-84`) | ❌ | Wrong serializer — omits all card-specific computed fields. |
| Graceful empty on error | Response shape | `get-saved-items.ts:194-200` returns `{success:false,error}` | frontend `frontend/src/actions/saved/get-saved-items.ts:16-46` returns empty on 401, error otherwise | ⚠️ | 401 now silently empty (was auth error in OLD). Minor UX diff. |

---

## Detailed gaps

### ❌ GAP 1 — Saved SERVICE card response shape mismatch (broken/incomplete cards)
- **OLD behavior** (`get-saved-items.ts:93-122`): for each saved service returns
  `{id, title, category (RESOLVED LABEL via findServiceById), slug, type, price, rating, reviewCount, media,
  profile:{id, uid, displayName, username, image, coverage (TRANSFORMED to location names), groupedCoverage (countyAreasMap)}}`.
- **NEW behavior** (`saved_reads.py:73-101`): returns
  `{id, slug, title, category (RAW id, not label), subcategory, subdivision, tags, rating, reviewCount, price,
  fixed, media, profile:{id, uid, username, displayName, image, rating, reviewCount, verified, coverage (RAW), category, subcategory}}`.
- **Diffs that break the card** (NEW frontend `service-card.tsx` reads them):
  - `service.taxonomyLabels` (read at lines 33-37) — **not produced by NEW** → category label falls back to raw `service.category` id.
  - `service.profile.groupedCoverage` (read at line 119) — **not produced by NEW** → coverage UI empty/undefined.
  - `service.profile.coverage` is RAW (county/area IDs) in NEW vs transformed location-name objects in OLD.
  - NEW omits `service.type` consumption parity? `type` IS present in NEW (`profile`?) — actually `type` is NOT in `_service_card` top-level (OLD had `type`). Card reads `type` at lines 7-10 → undefined in NEW.
- **Impact**: saved-service cards render with wrong/blank category labels, missing coverage chips, and possibly wrong `type` badge. Visual regression, not a crash.
- **Suggested Django fix**: build the service card in the selector to match OLD `ServiceCardData`:
  resolve `category` to its taxonomy label, add top-level `type`, transform `profile.coverage` to location
  names and add `profile.groupedCoverage` (countyAreasMap). Move taxonomy/coverage resolution server-side
  (constants/datasets equivalents) or expose `taxonomyLabels` + `groupedCoverage` keys.

### ❌ GAP 2 — Saved PROFILE card uses wrong serializer (missing all card fields)
- **OLD behavior** (`get-saved-items.ts:125-177`): returns `ArchiveProfileCardData`-shaped object:
  `{id, uid, username, displayName, tagline, category, subcategory, speciality, skills, rating, reviewCount,
  verified, featured, top, rate, coverage (TRANSFORMED), groupedCoverage, image, role (from user.role),
  taxonomyLabels (resolved), skillsData (resolved DatasetItem[]), specialityData (resolved DatasetItem)}`.
- **NEW behavior** (`saved_reads.py:57-58`): calls `serialize_profile_summary` (`profile_reads.py:36-84`), a
  PUBLIC PROFILE DETAIL payload with `bio, portfolio, socials, phone, website, viber, whatsapp, contactMethods,
  paymentMethods, settlementMethods, budget, size, firstName, lastName, terms, createdAt, updatedAt`, etc.
- **Missing keys the card requires** (NEW frontend `archive-profile-card.tsx` reads): `taxonomyLabels`
  (lines 105-115), `skillsData` (154-162), `specialityData` (155-175), `groupedCoverage` (147), `role`
  (OLD set `role` from `user.role`; NEW summary has no `role`, only `type`). `coverage` is RAW vs transformed.
- **Impact**: saved-profile cards lose category labels, skill chips, speciality, coverage chips, and role —
  significant visual regression; over-fetches private-ish contact fields the card never uses.
- **Suggested Django fix**: introduce a dedicated `serialize_saved_profile_card` (or reuse the directory/archive
  card serializer) returning the `ArchiveProfileCardData` shape, including resolved `taxonomyLabels`,
  `skillsData`, `specialityData`, transformed `coverage` + `groupedCoverage`, and `role` (from related user).

### ⚠️ GAP 3 — Default page size 12 → 20
- **OLD** (`get-saved-items.ts:60,62`): default limit **12**. **NEW** (`serializers/saved.py:14,16`): default **20**.
- **Impact**: masked today because both saved pages send explicit `12` (`page.tsx:28,30`). But any direct API
  consumer or future caller that omits the limit gets 20, changing pagination math vs OLD.
- **Suggested Django fix**: set serializer defaults `servicesLimit=12`, `profilesLimit=12` to match OLD.

### ⚠️ GAP 4 — Missing DB indexes on `userId/serviceId/profileId`
- **OLD** (`saved.prisma:14-15,28-31`) declares `@@index([userId])`, `@@index([serviceId])`,
  `@@index([profileId])`. NEW models (`saved_service.py`, `saved_profile.py`) declare only `unique_together`.
- **Impact**: performance only; `get_saved_state` and list queries filter by `user` (covered by the
  unique_together's leading column) so userId lookups are fine, but `serviceId`/`profileId` standalone
  indexes are gone. Behavior identical.
- **Suggested Django fix**: add `indexes = [models.Index(fields=["service_id"])]` / `["profile_id"]` in Meta
  if matching OLD's index set is desired.

### ⚠️ GAP 5 — 401 on list now returns empty success instead of error
- **OLD** server action returned `{success:false, error:'Authentication required'}` for unauthenticated.
- **NEW** frontend action (`frontend/src/actions/saved/get-saved-items.ts:38-40`) maps backend 401 to
  `{success:true, data: empty()}`. Page renders "no saved items" instead of an error state.
- **Impact**: minor UX divergence on expired session. Acceptable but flagged per golden rule.

---

## Response-shape mismatches (keys / casing / nesting / dates / nulls)

Casing is camelCase in both OLD and NEW (✅ consistent). Top-level list envelope keys match exactly:
`services, profiles, servicesTotal, profilesTotal, servicesTotalPages, profilesTotalPages`
(OLD `get-saved-items.ts:185-192` vs NEW `saved_reads.py:63-69`). `toggle` returns `{isSaved}` in both
(`toggle-save.ts:49` vs `saved.py:28`). `state` returns `{serviceIds, profileIds}` in both — but OLD action
hands back JS `Set`s (`get-saved-state.ts:36-39`); NEW returns arrays (`toggle.py:47-53`) and the NEW
frontend action re-wraps them into Sets (`frontend/.../get-saved-state.ts:12-16`) → net parity ✅.

Per-card key diffs (the real problem):

**Service card** — keys OLD produces but NEW does NOT: `taxonomyLabels` (label), top-level `type`,
`profile.groupedCoverage`; and `category` semantics differ (OLD = resolved label string, NEW = raw id).
Keys NEW adds that OLD lacks: `subcategory, subdivision, tags, fixed`, plus extra `profile.{rating,
reviewCount, verified, category, subcategory}`. `coverage` nesting differs (OLD transformed location-name
objects vs NEW raw JSON).

**Profile card** — keys OLD produces but NEW does NOT: `taxonomyLabels, skillsData, specialityData,
groupedCoverage, role`; `coverage` transformed vs raw. NEW (via summary) adds many unused detail keys
(`bio, portfolio, socials, phone, website, viber, whatsapp, contactMethods, paymentMethods,
settlementMethods, budget, size, firstName, lastName, terms, createdAt, updatedAt, visibility, stars,
experience`).

**Dates**: OLD card payloads carry no dates; NEW profile summary leaks `createdAt/updatedAt` as ISO strings
(`profile_reads.py:82-83`). `createdAt` on the saved rows themselves is used only for ordering in both —
not returned. No date-format mismatch on returned card fields.

**Nulls**: OLD `profile.rating||0`, `reviewCount||0`, `verified||false` defaulting (`get-saved-items.ts:163-167`);
NEW passes raw model values (may be null). Card-side defaulting differs — low risk.

---

## Counts

- matched (✅) = **17**
- partial (⚠️) = **6**  (default limit, FK db_constraint, missing indexes, 401-empty UX, + the two ⚠️ on list rows reflecting the ❌ shape gaps)
- missing (❌) = **2**  (service card shape, profile card shape)
- needs_verification (❓) = **0**

(Capability-row tally in matrix: ✅ 17, ⚠️ 7 rows, ❌ 2 rows; gap count above groups the two list ⚠️ rows under the ❌ shape gaps.)
