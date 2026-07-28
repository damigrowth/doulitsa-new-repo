# Prisma Removal — Frontend

Date: 2026-06-21
Scope: `frontend/` (Next.js app). Backend is the Django REST API (the only data
source). No runtime behaviour changes — this is a type-level + build-config
cleanup.

## Why Prisma was still here

The app was migrated **Supabase + Prisma → Django**. Prisma was already dead at
runtime (Django owns every read/write; there are no `prisma.x.y()` queries left).
What lingered was purely **type plumbing**:

- `@prisma/client` was imported only for its generated model **types**
  (`User`, `Profile`, `Service`, …) and `Prisma.XGetPayload<…>` helper types.
- `@prisma/client/runtime/library` was imported only for the `JsonValue` type.
- `prisma` + `prisma-json-types-generator` (devDeps) and a `prisma generate`
  step in the `build` script existed only to (a) regenerate those types and
  (b) populate the global `PrismaJson` namespace declared in
  `src/lib/prisma/json-types.ts`. That namespace is **app-owned** (backed by Zod
  schemas), not something Prisma supplies — the generator just hosted it.

A compatibility shim already existed at `src/lib/prisma-types.ts`, re-exporting
the model interfaces and all enum values with identical names/values. The job
was to point everything at the shim (and plain TS types) and delete Prisma.

## Hard rule honoured

No `any` / `as any` / `as unknown as` / `@ts-ignore` / `@ts-expect-error` /
non-null `!` was added to silence anything. All fixes are real interfaces and
real `Base & { rel: Pick<…> }` shapes derived from the Django serializers.

---

## Changes made

### 1. `@prisma/client` import replacements

| File | Before | After |
|------|--------|-------|
| `src/actions/services/get-service.ts` | `import type { Service, Profile } from '@prisma/client'` | `from '@/lib/prisma-types'` |
| `src/lib/types/auth.ts` | `import('@prisma/client').Profile/Service/Review/User` + `Prisma.ProfileGetPayload` | shim types (see §2) |
| `src/lib/types/components.ts` | 9× inline `import('@prisma/client').Service/Profile/User` | top-level `import type { Profile, Service, User } from '@/lib/prisma-types'` + bare names |
| `src/lib/utils/form.ts` | `import { JsonValue } from '@prisma/client/runtime/library'` | local `type JsonValue = string \| number \| boolean \| null \| {…} \| […]` |
| `src/lib/utils/cloudinary.ts` | `import { JsonValue } from '@prisma/client/runtime/library'` | removed (was unused) |
| `src/lib/validations/subscription.ts` | stale `@prisma/client` comment | comment updated; enums already from shim |
| `src/lib/types/reviews.ts` | stale `@prisma/client` comment | comment updated; types already from shim |

### 2. `Prisma.XGetPayload<>` → plain `Base & { rel: … }` conversions

Followed the exact pattern already used in `services.ts` / `blog.ts`.

- `src/lib/types/auth.ts`
  - `ProfileWithRelations` → `Profile & { services?: Service[]; reviews?: Review[]; portfolio?: AppJson.CloudinaryResource[] }`
  - `AdminUserForTable` → `User`
  - `AdminProfileWithRelations` → `Profile & { user: Pick<User,'id'|'email'|'role'|'banned'|'blocked'|'name'>; verification: unknown; _count: { services: number; reviews: number } } & { taxonomyLabels?: {category;subcategory} }`
- `src/components/forms/service/form-service-edit.tsx` and
  `src/components/forms/service/form-service-edit-media.tsx`
  - `Prisma.ServiceGetPayload<{include:{profile:{select:{id:true}}}}>` → `Service & { profile: Pick<Profile,'id'> }`
- `src/app/(admin)/admin/subscriptions/[id]/page.tsx`
  - `Prisma.SubscriptionGetPayload<{include:{profile:{include:{user:…}}}}>` → a
    full `Subscription & { …provider/worldline/stripe ids, billing snapshot,
    payment + discount aggregates, profile: Pick<Profile,…> & { user: Pick<User,…> | null } }`.
    The exact field set was taken from the Django serializer
    `backend/apps/billing/services/subscription_ops.py::_row` (the endpoint the
    page actually consumes). `User` is imported `as UserModel` to avoid colliding
    with the `User` lucide-react icon already imported in that file.

### 3. `PrismaJson` global namespace → `AppJson`

`src/lib/prisma/json-types.ts` is a **type-only, app-owned** namespace (Zod
schemas → `z.infer`), nothing to do with the Prisma client. To drop the Prisma
naming:

- Renamed `declare global { namespace PrismaJson { … } }` → `namespace AppJson`.
- Mechanically renamed every `PrismaJson.` reference → `AppJson.` across
  `src/**` (16 files: service/shared/ui/admin/profile components, plus
  `lib/types/components.ts`, `lib/types/cloudinary.ts`, `lib/utils/service.ts`,
  `lib/stores/use-service-order-store.ts`, `actions/services/get-service.ts`).
- Updated the two prose comments that still said "PrismaJson" /
  "prisma-json-types-generator".
- The file kept its location (`src/lib/prisma/json-types.ts`) because several
  files import its **runtime** Zod schemas (`cloudinaryResourceSchema`, etc.);
  moving it would have churned those import paths with no benefit. It's now a
  plain `declare global { namespace AppJson {…} }` with no Prisma reference.

### 4. Shim hardening (`src/lib/prisma-types.ts`)

Removing `@prisma/client` also removed the `prisma-json-types-generator`
augmentation that had been typing the model JSON columns as `PrismaJson.*`.
The shim previously typed those as `Json = unknown`, which would have **widened**
several fields and broken consumers (`profile.coverage?.online`,
`service.type?.online`, etc.). To preserve the exact original types (and avoid
any `any`), the shim's JSON columns now use the global `AppJson` types, matching
the schema's old `/// [Type]` annotations:

- `Profile.coverage: AppJson.Coverage | null`, `portfolio: AppJson.Portfolio | null`,
  `visibility: AppJson.VisibilitySettings | null`, `socials: AppJson.SocialMedia | null`,
  `billing: AppJson.BillingInfo | null`, `stars: AppJson.StarBreakdown | null`.
- `Service.type: AppJson.ServiceType | null`, `addons: AppJson.ServiceAddon[]`,
  `faq: AppJson.ServiceFAQ[]`, `media: AppJson.Media | null`.
- `BlogArticle.coverImage: AppJson.CloudinaryResource | null`.
- Added `Profile.firstName` / `Profile.lastName` (`string | null`) — the Django
  profile selector returns them (`profile_reads.py`) and components like
  `service-contact.tsx` read them.
- Removed the now-dead loose `Prisma = {}` namespace export and the unused
  `type Json = unknown` alias.

### 5. Build, deps, schema removal

- `package.json`
  - `build`: `yarn build:taxonomies && prisma generate && next build` →
    `yarn build:taxonomies && next build`.
  - Removed scripts: `db:pull`, `db:push`, `db:migrate`, `db:generate`,
    `db:studio`, `db:reset`.
  - Removed deps: `@prisma/client` (dependencies), `prisma` +
    `prisma-json-types-generator` (devDependencies).
- Ran `corepack yarn install` → `yarn.lock` updated (379 lines / ~40 prisma
  packages removed; `@prisma/*` and `prisma` are gone from `node_modules`).
- Deleted `src/lib/prisma/schema/` (all `*.prisma` + migrations) and
  `prisma.config.ts`.
- Kept `src/lib/prisma/json-types.ts` (now the `AppJson` source) and
  `src/lib/prisma/client.ts` (a harmless loud-failure Proxy guard that throws on
  any leftover `prisma.x.y()` access; nothing imports it now, left as a safety
  net).

---

## Before/after TypeScript error count

Measured with:
`docker exec django-backend-frontend-1 sh -lc "cd /app && ./node_modules/.bin/tsc --noEmit --pretty false 2>&1 | grep -cE 'error TS'"`

| Metric | Before | After |
|--------|-------:|------:|
| Total `error TS` | **481** | **449** |
| `TS2503 Cannot find namespace 'Prisma'` | **3** | **0** |
| `@prisma/client` import-resolution errors | 0* | 0 |
| Prisma-attributable errors total | **3** | **0** |

\* Before the change `@prisma/client` was still installed, so the
`import('@prisma/client').X` references resolved; only the 3 `Prisma.` namespace
references (which the shim never provided) errored.

**Net: 32 pre-existing errors resolved, 0 genuinely new errors introduced.**

A naive line diff showed 7 "new" errors in
`src/components/admin/admin-articles-data-table.tsx`, but those are the **same 7
pre-existing errors** — only the property-key ordering inside the type-display
string changed (e.g. `Pick<Profile, "id" | "username" | "displayName" | "image">`
→ `Pick<Profile, "image" | "id" | "username" | "displayName">`) because adding a
top-level `Profile` import altered the key emission order. Normalizing the union
key order in the diff yields **0 new / 32 resolved**. Those 7 errors are a
real pre-existing bug in that file (`a.profile ?? a` builds a union that lacks
`id`/`displayName`) and are out of scope for this task.

## Follow-ups (optional)

- The remaining 449 errors are pre-existing and unrelated to Prisma (419 of them
  are `TS2339` property-access errors, mostly from server actions returning
  `unknown`/`ActionResult<unknown>` and components reading fields off them).
- `src/lib/prisma/client.ts` and the `src/lib/prisma/` directory name still say
  "prisma"; the file is now just the `AppJson` host + an unused guard. Renaming
  the directory to `src/lib/json/` (and moving `json-types.ts` →
  `src/lib/types/app-json.ts`) would finish the cosmetic cleanup, at the cost of
  touching the ~6 files that import its runtime Zod schemas. Left as-is to keep
  this change type-safe and low-risk.
- The pre-existing `admin-articles-data-table.tsx` union bug should be fixed
  separately (give the `BlogArticleAdmin` authors a discriminated shape or read
  `a.profile` directly instead of `a.profile ?? a`).
