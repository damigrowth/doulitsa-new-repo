# Taxonomy → Database migration (status, design, and problems)

Moving the taxonomy (service + pro categories/subcategories/subdivisions, skills,
tags, locations) out of the static 4.7 MB `maps.generated.json` files and into
proper Django tables — so it's a single DB source of truth, editable at runtime
(no redeploy), and not shipped to the browser. **Every step is gated on proving
behaviour is 1000% identical before the old path is removed.**

Full plan: `~/.claude/plans/merry-jingling-owl.md`. This doc tracks **status** and
the **problems** found in the data (the reason it's not a trivial migration).

---

## Status by phase

| Phase | What | State |
|---|---|---|
| **A** | `TaxonomyNode` / `Location` / `Skill` / `Tag` tables + lossless idempotent `seed_taxonomy` | ✅ done & verified (counts match source exactly, re-runnable) |
| **B** | FK columns on Service/Profile + `backfill_taxonomy_fks` + null-audit | ✅ done & verified (every value mapped, nothing lost) |
| **C** | Switch live **filter** sites to the FK + `parity_taxonomy_fks` harness | ✅ done & verified (**936 slugs, 0 mismatches**; identical page counts) |
| **D** | Backend **DB-sourced** (`_maps()`→DB via `maps_builder`, byte-exact service/pro) + cached `/api/taxonomy/maps` API | ✅ done & verified |
| **E** | FE loads the maps from the API (top-level await + 60s refresh, JSON fallback) + **browser bundle killed** | ✅ done & verified (3.5 MB chunk gone; **no-redeploy proven** — DB label edit reflects in the API with no rebuild) |
| **F** | Django-admin CRUD for the 4 models + **signal auto-invalidation** of all caches on write | ✅ done & verified (admin save → caches cleared → API reflects → FE picks up in ≤60s) |
| **F2** | **Custom admin write path (`/admin/taxonomies/*`) retired off GitHub → writes to DB.** `dataset_ops` (skill/tag/service/pro CRUD + multi-change) and the submission **approve** flow now write to `taxonomy_*` tables; the model signals invalidate the cache. **No GitHub creds, no redeploy.** | ✅ done & verified (create/update/delete + approve land in the DB + maps instantly; `commitSha` now always `None`) |
| **G** | Retire old path (keep CharFields as `legacy_value`) + tree FK-reconstruction + location bySlug | 🚧 in progress |

### Production deployment — what YOU need to do (step by step)

The local DB is **not** prod. Do these **in order**. Everything is additive and
reversible; the legacy CharFields + the shipped JSON fallback are never touched,
so you can roll back at any point.

> **Status:** all code + seed files are committed as **`e7eec3d "hugeupdate"`** on
> branch **`test`** and pushed to **`origin/test`** — this includes the coverage fix,
> the migrations (through `0006_locationtree`), and the 4 seed sources
> (`_taxonomy_maps.json`, `_location_options.json`, `_skills.json`, `_tags.json`).
> Nothing else needs committing for this deploy.

**1. Deploy the BACKEND with commit `e7eec3d`** (Dokploy → `doulitsa` → `production` →
   **backend** → **Deployments** → Redeploy).
   - ⚠️ Make sure the running/finished build is commit **`e7eec3d`** (the latest) — an
     older commit would still have the Άθυρα coverage bug + lack the seed files.
   - No new env vars are required (`DJANGO_INTERNAL_URL` already exists).

**2. Open the backend container shell** (Dokploy → backend → **General** →
   *Docker Terminal* → Bash) and run these **one at a time, in order**:
   ```bash
   cd /app                                          # where manage.py lives (if not: find / -name manage.py 2>/dev/null)

   python manage.py migrate                         # creates the 5 taxonomy tables (incl. LocationTree) + the *_node FK columns. CREATE TABLE / ADD COLUMN only — safe.

   python manage.py seed_taxonomy                   # loads service/pro/locations/skills/tags + the location display tree from the committed JSON. Ends with "Lossless check passed". Idempotent — safe to re-run.

   python manage.py backfill_taxonomy_fks --dry-run # REVIEW the null-audit (how many rows resolve, any orphans/empties). Writes nothing. Orphans/empty profiles are expected & fine.

   python manage.py backfill_taxonomy_fks           # populates category_node/subcategory_node/subdivision_node FKs from the existing category/subcategory columns.

   python manage.py parity_taxonomy_fks             # ⛔ GATE — must print "PARITY OK". On ANY mismatch it exits 1: STOP and send me the output.
   ```
   If a command errors, paste the output before continuing — do not run the next step.

**3. Redeploy the FRONTEND** (Dokploy → frontend app → **Redeploy**).
   - It then fetches `/api/taxonomy/maps` (DB taxonomy) and no longer ships the 4.7 MB
     map to browsers. (The coverage fix itself is backend-side and already live once
     `e7eec3d` is deployed; this redeploy aligns the FE with the DB taxonomy.)

**4. Verify on prod**
   - `python manage.py parity_taxonomy_fks` → **PARITY OK** (re-run; idempotent).
   - Open a few pages and check coverage renders correctly:
     `/s/<slug>` (a Πανελλαδικά service → "Πανελλαδικά" not "Άθυρα"; an onbase service →
     full "Διεύθυνση: …"), plus `/categories`, `/ipiresies/<sub>`, `/dir/<cat>`, `/profile/<user>`.
   - **No-redeploy test:** `/admin/` → Taxonomy nodes → edit a category label → Save →
     it appears on the public site within ~60s, **with no redeploy**.

**5. Ongoing — editing taxonomy (the whole point)**
   - Add/edit/rename categories, subcategories, subdivisions, skills, tags at
     **`/admin/`** (Django admin **or** the custom `/admin/taxonomies/*` UI — both
     write to the DB now; the submission **approve** button writes the new tag/skill
     straight to the DB too, **no GitHub creds**). A signal clears the caches; the
     site reflects it in ≤60s. **No git redeploy ever again** for taxonomy changes.
   - All FE consumers read the DB: coverage display, the area/skills pickers, the
     service-category filter, onboarding — every one resolves via the maps API
     (`getServiceTaxonomies`/`getProTaxonomies`/`getLocations`/`getSkills`/`getTags`),
     static datasets only as an offline fallback.
   - **Locations/areas are live-editable too** — the resolver (`resolve_to_county_id`,
     `location_name_for_id`) reads the DB (`Location.slugs`/`.parent_id`), verified
     byte-identical to the JSON (0 slug/name diffs), and the same signal clears its
     caches. Editing/adding an area in `/admin/` goes live with no redeploy.

**Rollback:** redeploy the previous commit. The new tables/FK columns are unused by
the old code (harmless), and the old code reads the CharFields + JSON exactly as
before. No data is lost.

---

## The problems found in the data (why this is non-trivial)

The taxonomy data is messy. These are the concrete issues uncovered, and how each
is handled:

### 1. Dual slug/id storage on Service/Profile  *(handled)*
`services/profiles.category/subcategory/subdivision` store **either a slug** (demo
data) **or a cuid id** (live/restored data). The old code papered over this with
`taxonomy_value_candidates()` (expand a value to slug + all ids) + `__in`.
→ The FK columns resolve each row to one node (`backfill_taxonomy_fks`); filtering
is now `*_node_id__in`. Proven row-for-row identical by `parity_taxonomy_fks`.

### 2. Slug collisions — same slug, **different concepts**  *(handled)*
38 slugs map to 2+ different nodes. Some are the same name at different levels
(`sxolika-mathimata` is both a subcategory **and** a subdivision). **Worse**, some
collisions are genuinely different concepts sharing a slug, e.g. pro `kathigites`
→ "Καθηγήτρια" *and* "Δάσκαλος Φωνητικής"; `xoreutes` → "Χορεύτρια" / "Χορευτής".
→ Uniqueness is the `id` PK, not the slug. `bySlug` (which must pick one) is
reproduced via a `slug_primary` flag recording the source's tie-break, so the
DB→maps rebuild is **byte-exact** for service + pro. FK filtering is level-scoped,
so collisions never cross-match.

### 3. Orphan taxonomy value `q5F8Ns`  *(documented, parity-correct)*
16 published services store `subcategory = "q5F8Ns"`, which **exists in no map**
(`byId`/`bySlug` both miss it; the old `candidates("q5F8Ns")` returned just itself,
label `None`). So those services were already unreachable via subcategory nav.
→ Their `subcategory_node` is `NULL` — the parity-correct outcome (the old path
couldn't resolve it either). Nothing is lost: `q5F8Ns` stays in the legacy column.

### 4. The location tree is tangled  *(partially handled — residual documented)*
`location` is 1,489 nodes (counties → areas → postcodes). Problems:
- **No clean roots / region super-nodes**: even counties are children of region
  super-nodes, and the flattened parent map has **cycles** (a node 989-deep chain)
  and **orphans**. So depth-based county/area typing is unreliable.
- **Derived slugs**: 359 named nodes carry **no `slug`** on their `byId` node — the
  build script only generated the greeklish slug as the `bySlug` **key**
  (`Παπαδιάνικα` → `papadianika`). Recovered during seeding from the `bySlug`
  reverse-map.
- **Multi-slug-per-node**: a location can appear under several `bySlug` keys.
→ **RESOLVED:** added a `Location.slugs` array capturing **every** bySlug key per
node (seeded from the bySlug map). The backend resolver (`resolve_to_county_id`,
`location_name_for_id` in `apps/core/locations.py`) now reads the DB
(`Location.slugs`/`.name`/`.parent_id`) — **verified byte-identical to the JSON
(0 id→name diffs, 0 slug→id diffs, 0 missing slugs)**, and the cache-invalidation
signal clears its lru_caches too. So **areas/counties are now live-editable** with
no redeploy, same as categories. (Derived greeklish slugs are captured via the
bySlug reverse-map; the messy region tree didn't need byte-exact `bySlug` after
all — the `slugs` array + `parent_id` give exact resolution.)

#### 4b. Coverage **display** tree (FE `locationOptions`) — also DB-sourced now
The coverage display (the "Εξυπηρετεί: περιοχές…" badge) and the coverage
**pickers** (onboarding, admin profile edit) use the FE `locationOptions` — a
**separate, fuller** nested tree (53 counties / 2,395 edges) than the backend's
maps data (7 / 1,482), with the **same 1,489 ids** but different nesting. Worse,
it **reuses the same id for different nodes** (id 23 is both county `Μαγνησίας`
and area `Άγιος Βλάσιος`), so "id→name" isn't even a function — an id-keyed
overlay can't reproduce it.
→ **RESOLVED:** stored the whole `locationOptions` tree **verbatim** in a
singleton DB table (`taxonomy_location_tree`, seeded from `_location_options.json`,
a one-time export). `build_maps` serves it as `location.tree`; the FE
`getLocations()` reads it (dataset fallback). **Verified byte-exact to
`locationOptions`** (deep equality). Profiles + services coverage display and both
pickers now read the DB tree. The per-id `Location` table (filtering / backend
labels) is untouched and still 0-diff. *(No id-keyed name overlay — it would
collapse the reused ids; the structure is DB-owned and editable via the blob.)*

### Performance — the 3 MB maps payload (Redis + ETag/304)

The maps payload is ~3.66 MB and the frontend polls it on a 60s background
refresh. Pulling 3.66 MB every minute (×each FE instance) would be wasteful, so:

- **Backend caches the built maps in Redis** (`django_redis`, the configured
  `CACHES` backend) — `build_maps()` runs once, then served from Redis (1h TTL,
  busted on any taxonomy write). No per-request DB rebuild.
- **Conditional requests (ETag → 304):** the maps response carries a weak ETag =
  a version string bumped only on a taxonomy write. The frontend sends
  `If-None-Match`; unchanged → **304 Not Modified, empty body**. A 304 costs the
  backend a single Redis GET of the version key — no `build_maps()`, no
  serialization, no transfer.
- **Frontend holds one in-memory singleton** (top-level await + 60s refresh), so
  page requests never re-fetch; only the background poll revalidates.

Net: the 3.66 MB transfers **once per FE instance at boot, and once per actual
edit** — never on the per-minute poll, never per visitor. Verified: `200`(full)
→ `304`(empty) → `200`(after version bump); and 4 repeat page hits triggered
exactly 1 (304) maps fetch. *(Optional future win: gzip the on-change 200 — the
proxy can do `Content-Encoding: gzip`, ~3.66 MB → ~430 KB.)*

### 5. `skills.byCategory` ordering  *(cosmetic)*
Rebuilt skill-per-category lists are **set-identical** (0 missing/extra) but differ
in **order** (6 categories). Order is display-only; no functional impact.

### 6. Backend reads a JSON copy that can drift from the FE copy  *(being removed)*
Two 4.7 MB files (`backend/apps/core/management/commands/_taxonomy_maps.json` and
`frontend/src/lib/taxonomies/maps.generated.json`). Phase D/E collapse both to the
DB via `maps_builder.build_maps()` + a tree API.

---

## Safety / rollback
- Phases A–C are additive: new tables + new FK columns; the legacy CharFields are
  **never dropped** (Phase G keeps them as `legacy_value`).
- All migrations are `CREATE TABLE` / `ADD COLUMN` only (verified with `sqlmigrate`);
  FKs use `db_constraint=False` to tolerate stray restored-dump values.
- The DB is a restored prod dump and **is not** the live production DB — the seed +
  backfill commands are designed to run on production via the deploy, idempotently.

## Key files
- Models: `backend/apps/taxonomy/models/{taxonomy_node,location,skill,tag}.py`
- Seed/backfill/parity: `backend/apps/taxonomy/management/commands/{seed_taxonomy,backfill_taxonomy_fks,parity_taxonomy_fks}.py`
- DB→maps rebuild: `backend/apps/taxonomy/services/maps_builder.py`
- FK resolver: `apps/core/taxonomy.py::taxonomy_node_ids`
- Switched filter sites: `apps/services/selectors/service_reads.py`, `apps/profiles/selectors/profile_aggregations.py`
