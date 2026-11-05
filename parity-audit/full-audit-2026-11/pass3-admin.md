# Admin panel parity audit — PASS 3 (fresh re-audit) — 2026-11-05

Scope: the same OLD-side scope as admin.md §1, re-derived from scratch. That is `oldnext/src/actions/admin/**`, `oldnext/src/app/(admin)/**` and `oldnext/src/components/admin/**`, compared with the NEW frontend actions/pages/components and the Django admin endpoints. Zero code changes. No git commands were run.

Dedupe: I read SUMMARY.md, admin.md, pass2-authz-security.md (including its correction about the better-auth admin-plugin ACL), pass2-payload-contracts.md (author picker), pass2-validation-matrix.md, pass2-state-machines.md, pass2-caching-matrix.md, pass2-copy-sweep.md, pass2-schema-db.md, billing-payments.md, messaging.md, reviews-saved.md, blog-support-media-crons.md and lib-shared-sweep.md. This report lists only findings that are NOT in any of them.

---

## 1. Coverage

### Re-derived OLD file list
- **`src/actions/admin/` — 30 files** (the brief's "33" is a miscount):
  - action-wrappers, api-keys, chats, git-operations, helpers, index, pro-taxonomies, profiles
  - profiles/{additional-info, basic-info, billing, coverage, index, portfolio, presentation}
  - revalidate-caches, revalidate-taxonomies, reviews, services, skills, subscriptions, tags
  - taxonomies-shared, taxonomies, taxonomy-git, taxonomy-helpers, taxonomy-publish, taxonomy-submission, users, verifications
  - Every exported function was compared against the NEW action, the Django view and the service/selector behind it.
- **`src/app/(admin)/admin/**` — 54 files**: 53 pages/layouts plus `data.json` (mock data for an unused chart).
- **`src/components/admin/**` — 167 files** (pass 1 said 150).
  - I diffed all 167 against NEW with a script: 45 differ, 25 are missing in NEW, and the rest are byte-identical.
  - The missing ones are the Git/draft/deployment components, plus the dead files pass 1 already listed. Also missing: `subscriptions/index.ts` (a barrel with no importers in either app) and `forms/edit-service-basic-form.test.tsx` (a test file).
- **Prime suspect pass 1 skipped: admin Articles UI.** Pass 1 delegated `articles/**`, `article-form`, `admin-articles-*` to blog, and the blog report delegated them back to admin (blog-support-media-crons.md:48), so nobody had audited them. I audited them here:
  - list, filters, search, page/limit
  - table columns
  - create/edit/delete round trip
  - cache purge on delete
  - Result: no new difference beyond the known blog D1 (category slugs), pass2-payload D1 (author picker) and pass2-validation D5 (empty draft title).

### NEW files read
- Frontend actions: `frontend/src/actions/admin/*` (all 28), `actions/blog/manage-articles.ts`, `lib/api/admin.ts`, `lib/utils/form.ts` (`parseJSONValue`), `lib/validations/profile.ts` (`billingSchema`), `components/forms/profile/form-billing.tsx`.
- Frontend UI: every admin page, table section, data table, filters component and form that has a diff, plus `admin-data-table.tsx` (sort header) and `admin-table-pagination.tsx`.
- Backend, `apps/accounts/`: `{views/admin/users.py, selectors/admin_users.py, services/admin_users.py, serializers/admin_users.py}`.
- Backend, `apps/profiles/`: `{views/admin/profiles.py, services/admin_profiles.py, services/profile_updates.py (update_billing), serializers/profile_updates.py, serializers/admin_profile_serializers.py}`.
- Backend, `apps/services/`: `{views/admin/service.py, services/admin_services.py, serializers/service.py}`.
- Backend, `apps/reviews/`: `{views/admin/reviews.py, services/review_ops.py, selectors/review_reads.py}`.
- Backend, `apps/billing/`: `{views/admin/billing.py, services/subscription_ops.py (admin_*, _row)}`.
- Backend, `apps/taxonomy/`: `{services/admin_submissions.py, services/dataset_ops.py, views/admin/submissions.py}`.
- Backend, other: `apps/messaging/views/admin/chats.py`, `apps/admin_api/{views/admin/api_keys.py, services/api_keys.py}`, `apps/blog/{services/articles.py (list_admin/_admin_card/delete), views/admin/article.py}`.

### Delegated elsewhere
None new. Billing math, email templates and Brevo internals remain with their owners, as in pass 1.

---

## 2. Mapping (old → new)
Unchanged from admin.md §2. One addition:

| OLD | NEW action → Django | UI |
|---|---|---|
| blog/manage-articles `listArticlesAdmin/getArticleAdmin/create/update/deleteArticle` | `actions/blog/manage-articles.ts` → `/api/admin/blog/articles[/<id>]` (`articles.list_admin`, `get_admin`, `create/update/delete_article`) | `/admin/articles`, `/admin/articles/create`, `/admin/articles/[id]` |

---

## 3. DIFFERENCES (new findings only)

### D1. An admin "Στοιχεία Τιμολόγησης" save writes `null` into `profile.billing`. Afterwards the pro's own billing form (and the admin form on reload) can never become valid, so "Αποθήκευση" stays disabled — MEDIUM
- **OLD:**
  - `oldnext/src/actions/admin/profiles/billing.ts:97-105` stores `{receipt, invoice, afm: data.afm || '', doy: … || '', name: … || '', profession: … || '', address: … || ''}`.
  - Empty fields are therefore always `''`. The user-side action does the same.
- **NEW:**
  - `frontend/src/actions/admin/profiles/billing.ts:18-26` sends `afm/doy/name/profession/address: getFormString(...) || null`.
  - `AdminProfileBillingView` (`backend/apps/profiles/views/admin/profiles.py:290-303`) stores the values verbatim (`d.get("afm")`, …), so a receipt-only save stores `{"afm": null, "doy": null, "name": null, "profession": null, "address": null}`.
  - The pro's own path still writes `''`. The comment at `backend/apps/profiles/services/profile_updates.py:321-331` says "OLD stores empty strings (not null)". Only the admin path diverges.
- **Consequence in the form:**
  - `form-billing.tsx:107-130` copies `profile.billing` into the form unchanged. `parseJSONValue` returns objects as-is, so the defaults are not merged (`lib/utils/form.ts:164-173`).
  - `billingSchema` (`lib/validations/profile.ts:365-373`) declares each field as `z.string().optional().or(z.literal(''))`, which rejects `null`. `isValid` is therefore false.
  - The submit button is `disabled={isPending || !isValid || …}` (`form-billing.tsx:446-450`).
  - For a receipt-only profile, the invoice fields holding the nulls are not even rendered (`isInvoiceSelected &&`, `form-billing.tsx:324`). The user cannot fix them without ticking "Τιμολόγιο", filling all five fields, then un-ticking it.
- **Impact:** after any admin billing edit with blank invoice fields, the pro, and the admin on the next visit, cannot save billing again. Nothing shows the user why. Downstream readers that expect strings (the subscription billing snapshot, billing D17) now get `null`.
- **Fix:** in the admin action or view, coerce to `''` exactly as `update_billing` does.
- **Possibly intentional?:** no.

### D2. Admin chats list: picking a value in the "sort" dropdown makes the column-header sort stop working — LOW/MEDIUM
- **OLD:** `getAdminChats` gives the table's `sortBy`+`sortOrder` precedence over the dropdown `sort` ("Table sorting takes precedence over filter dropdown sorting", `oldnext/src/actions/admin/chats.ts:132-165`).
- **NEW:**
  - `AdminChatListView` checks `sort` first. Only when `sort` is absent does it read `sortBy/sortOrder` (`backend/apps/messaging/views/admin/chats.py:57-65`).
  - Both params live in the URL together: the dropdown sets `sort` (`admin-chats-filters.tsx:27-28`), and the column header adds `sortBy/sortOrder` (`admin-data-table.tsx:58-63`).
  - So once an admin has chosen "Newest/Oldest/Active", clicking "Created"/"Last activity" headers flips the arrow icon but the order does not change.
- **Impact:** column sorting on /admin/chats is ignored after any dropdown choice.
- **Possibly intentional?:** no. The code comment claims OLD parity.

### D3. Admin chat "Messages today" (global and per chat) counts from UTC midnight instead of Athens midnight — LOW
- **OLD:** `startOfToday.setHours(0,0,0,0)` (`chats.ts:56-57`, `:351-352`) runs in the server's TZ, which OLD forced to Europe/Athens (`src/instrumentation.ts`, see lib-shared D1).
- **NEW:** `datetime.now(timezone.utc).replace(hour=0, …)` (`backend/apps/messaging/views/admin/chats.py:24, 145`) is hard-coded UTC.
  - This is separate from lib-shared D1: setting `TZ` on the frontend does not fix it. It needs `timezone.localtime()` / Europe/Athens in Django.
- **Impact:** the window starts 2 h (winter) or 3 h (summer) late. Messages sent between 00:00 and 02:00/03:00 Athens time are missing from "today", and from 21:00/22:00 Athens time the counter resets for the "next day".
- **Possibly intentional?:** no.

### D4. Admin review visibility toggle shows an empty success toast — LOW
- **OLD:** `toggleAdminReviewVisibility` returns `message: 'Review is now visible' | 'Review is now hidden'` (`oldnext/src/actions/admin/reviews.ts:431-437`). `admin-review-actions.tsx:114` shows it via `toast.success(result.message)`.
- **NEW:** the action returns `{success, data:{visibility}}` with no `message` (`frontend/src/actions/admin/reviews.ts:43-47`; Django returns `{visibility}`, `views/admin/reviews.py:128-129`). The unchanged component calls `toast.success(undefined)`, which renders a blank toast.
- This is distinct from reviews-saved D2, which covers the pro-side toggle (a different action).
- **Possibly intentional?:** no.

### D5. Deleting a service or pro taxonomy node is now refused while any service/profile uses it — LOW (possibly intentional)
- **OLD:** `taxonomies-shared.deleteItem` (`:311-350`) removes the node and its subtree (`deleteItemRecursively`), with no reference check. The draft was then published via Git.
- **NEW:** `delete_taxonomy_item` counts referencing Services/Profiles across the subtree. If any exist it raises 409 `Δεν είναι δυνατή η διαγραφή: N καταχωρήσεις χρησιμοποιούν αυτή την κατηγορία.` (`backend/apps/taxonomy/services/dataset_ops.py:159-201`).
- The NEW frontend toast for this failure is generic: `handleError` passes `error.message`, but the edit/list callers show their own text.
- **Impact:** admins can no longer remove a category that live data still points to. They must re-categorise first, and old had no such step.
- **Possibly intentional?:** yes, probably. The code comment argues it prevents orphaned rows. Listed so it is a conscious decision.

### D6. Admin "delete user" has no self-delete guard — LOW (needs confirmation)
- **OLD:** `removeUser` → better-auth `auth.api.removeUser` (`users.ts:400-403`). Better-auth's admin plugin rejects `userId === session.user.id` (`YOU_CANNOT_REMOVE_YOURSELF`).
- **NEW:**
  - `AdminUserDetailView.delete` → `remove_user` deletes any target, including the caller (`backend/apps/accounts/views/admin/users.py:116-121`, `services/admin_users.py:361-367`).
  - `DeleteUserForm` has no client-side guard either (`components/admin/forms/delete-user-form.tsx`).
- **Impact:** an admin can delete their own account from `/admin/users/{ownId}` once admin D1 (the page crash) is fixed.
- **Caveat:** better-auth's source isn't vendored (`oldnext` has no node_modules), so this is from knowledge of better-auth 1.x behaviour.
- **Possibly intentional?:** no.

### D7. Admin API keys: list, update and delete now span every admin's keys, not just the caller's own — LOW (no current UI impact)
- **OLD:** `auth.api.listApiKeys({headers})`, `updateApiKey` and `deleteApiKey` (`api-keys.ts:130-210`) are scoped by better-auth to the session user's own keys. Other users' keys are "not found".
- **NEW:**
  - `list_api_keys` iterates `ApiKey.objects.all()` (`backend/apps/admin_api/services/api_keys.py:84-95`).
  - `update_api_key` and `delete_api_key` fetch by id with no `user=` filter (`:98-122`).
- **Impact today:** none in the UI. `api-key-management.tsx:103-104` has `// setApiKeys(result.data);` commented out in both apps, so the list is never shown.
- **Impact via the API:** any SETTINGS admin can disable or delete another admin's key. Combined with pass2-authz D1 (keys are global bearer credentials), the list also exposes every key's owner and prefix.
- **Possibly intentional?:** no.

### D8. Minor admin list display fallbacks — LOW (cosmetic)
- Services list "by" line:
  - OLD falls back from `profile.displayName` to `profile.user.email` (`oldnext/.../admin-services-data-table.tsx:132`).
  - NEW falls back to `profile.username` (`frontend/.../admin-services-data-table.tsx:132-134`), because `_admin_row.profile` has no `user` (`admin_services.py:121-125`).
- Verifications list "Profile" column:
  - OLD shows the profile avatar image (`image={profile.image}`).
  - NEW shows only an initials avatar, because `_verification_row.profile` has no `image` and the prop was dropped (`admin-verifications-data-table.tsx:171-172`; `admin_profiles.py:466-477`).
- Admin "create service for profile" success toast:
  - OLD showed `'Service created successfully'` (`services.ts:1883-1886`).
  - NEW returns no `message`, so the Greek fallback `'Η υπηρεσία δημιουργήθηκε με επιτυχία'` is shown (`admin-create-service-form.tsx:434-436`). This only matters once admin D5 is fixed.
- **Possibly intentional?:** no, but cosmetic.

---

## 4. Corrections / extensions to earlier reports

- **admin.md §1 "Delegated elsewhere" (articles → blog)** combined with **blog-support-media-crons.md:48** (articles UI → admin) left the admin Articles UI unaudited. It is now covered (§1 above). There are no new differences there beyond the known blog D1, pass2-payload D1 and pass2-validation D5.
  - Verified points: list filters (status/category/search on `title|titleNormalized`), `-created_at` order, `page`+`limit=50` (no pager in either app), table fields (`_admin_card` has every key the table reads), authors list, and delete. The detail tag is also tagged `blog:articles`, so a delete purges it without the slug.
- **admin.md §4 "Chats: … `sort` values"** is only partly right. The values match, but their precedence against `sortBy` is inverted (D2).
- **admin.md §4 "Section writes … all match"** misses the billing write: `''` became `null` (D1).
- **admin.md §4 "API keys: SETTINGS gates (incl. old's quirk of `view` for delete)"** — the quirk is not reproduced in practice.
  - `ApiKeyDetailView` has class-level `_EDIT`. DRF runs `check_permissions` in `initial()` before `delete()` swaps in `_VIEW` (`views/admin/api_keys.py:76-95`), so delete needs SETTINGS **edit**.
  - The same pattern makes other DELETE handlers check two levels: the class level, then FULL.
  - No impact, since no role holds SETTINGS view without edit (pass2-authz §4).
- **pass2-state-machines D6** (toggle-published resyncs Brevo) extends to the service **Settings** form.
  - `AdminServiceSettingsView` routes every `status` through `update_status` → `_notify_status_change` (`views/admin/service.py:96-105`). Setting published → rejected/inactive/draft from the Settings form therefore enqueues `brevo_state_change`.
  - OLD's Settings path (`updateServiceSettingsAction` → `updateService`, `services.ts:400-560`) never resynced Brevo on a downgrade. Only the separate `updateServiceStatus` did.
  - This belongs in the same product decision as state-machines D6.
- **Not a regression (info):** the users-list "Type → Simple" filter sends `type=simple`.
  - OLD passed it straight to Prisma (`users.ts:140-142`), and Prisma rejects it because `simple` is not a UserType value. The list showed an error.
  - NEW maps any non-`user/pro` value to `user` (`selectors/admin_users.py:72-73`), so the filter now works. NEW fixes an OLD bug here; there is nothing to port.

---

## 5. Re-verified same (pass-1 "confirmed same" claims re-checked line by line)

- **Users list:**
  - search (`searchField=email`, contains/starts/ends, case-insensitive)
  - type/provider/step/role/status filters (status: verified → emailVerified, unverified, banned, blocked)
  - `limit=12` from the table section, offset paging
  - sort keys used by the table (name/type/role/createdAt/updatedAt, default createdAt desc)
  - row fields
- **User stats and dashboard cards:** total/active/banned/blocked/unverified, byStep, byProvider, byType (`simple→user` rename handled in `admin/page.tsx`, `admin-stats-cards.tsx`, `admin-users-stats.tsx`).
- **User status/ban/role:**
  - `updateUserStatusAction` calls `setUserRole` first whenever `role` is posted, as in old.
  - `canAssignRole` gate.
  - Pro DASHBOARD→ONBOARDING auto-correct uses the new type when type and step change together.
  - Ban requires a reason when banning. Unban clears reason and expiry; old relied on the form sending blanks.
- **removeUser:** Verification rows deleted by email, Brevo contact deleted, `full` gate (D6 aside).
- **Team list:** order `role` asc then `createdAt` desc. On the restored DB the role column is the PG enum, so both apps sort in enum declaration order (admin, support, editor).
- **Profiles list:**
  - type/verified/status (featured|top) filters; `_bool('unverified')` → False
  - sort keys displayName/services/createdAt/updatedAt
  - limit and offset; `email` column fallback to user.email
- **Profile stats:** total, published, featured, verified, unverified, top, professional, company (all by `profile.type`).
- **Brevo stats:** the four buckets. `step` is NOT NULL, so `.exclude(step=DASHBOARD)` equals Prisma `not`.
- **Profile settings form:** posts all five booleans as strings, and NEW sets each one. Old did not sync the verification record here either; only `toggleVerified` does, and NEW matches that.
- **Profile section writes:**
  - basic-info: tagline/bio with normalization, category/subcategory/speciality/skills; image and coverage ignored, matching old
  - additional-info: rate null when blank, experience derived, arrays default to `[]`, null budget/terms
  - coverage with coverageNormalized
  - portfolio sanitize, null when empty
- **Services list:**
  - search: normalized title/description, profile name/username, numeric id
  - filters: status (incl. approved/inactive), category/subcategory/subdivision, type JSON key, featured/not-featured, fixed/not-fixed, subscriptionType, profileId
  - sorts: price/createdAt/updatedAt; paging
- **Service stats keys** read by `admin-services-stats.tsx` and the dashboard: total/published/pending, serviceTypes, pricing.*.
- **Service media save:** pending/blob resources dropped; returns no top-level `message` in both apps. The form's Alert reads `state.message` in both.
- **Service create-for-profile:** pending status, freelancer/company guard, owner email, first-service Brevo; redirect to `/admin/services`.
- **Reviews:**
  - list filters (status, rating int, type SERVICE/PROFILE), search (comment, author name/email/displayName), sort createdAt/updatedAt/rating, paging
  - detail payload has every key `reviews/[id]/page.tsx` reads
  - moderation: published synced, rating recalculation only across `approved`, owner email only on a change into approved
  - delete recalculation only if approved and published; visibility flips unconditionally; stats
- **Verifications:**
  - list status filter (PENDING/APPROVED/REJECTED); search afm|name (NEW adds username, a superset)
  - status → `profile.verified` sync (APPROVED true, otherwise false); delete → verified=false; stats
  - every detail field the page reads
- **Subscriptions:**
  - search displayName|user email, status/billingInterval filters, default `lastPaymentAt desc` (NULLS FIRST in both), limit 12
  - row/profile fields incl. image and user email; stats total/active/canceled/pastDue
  - manual create guards and Greek errors; status → promoted featured coupling; delete → unfeature
- **Taxonomy submissions:**
  - list (`items` key; label search; status/type filters; sort createdAt|status|label|type; limit/offset), categoryLabel, submitterProfile
  - stats; approve/reject guards ("Record not found"/"Record is not pending"); bulk counts and messages
- **Chats:**
  - stats on non-deleted messages, messageCount on non-deleted
  - member search (NEW also matches chat name/cid, a superset)
  - `messageCount` sort falls back to lastActivity in both
  - messages: search on content, `sort=oldest`→asc mapping in the section, default limit 12
  - deleted messages listed with a "Message deleted" label in both. NEW nulls `content` for deleted messages, but the table never shows it, so there is no visible difference.
- **Taxonomy CRUD (tags/skills/service/pro):**
  - numeric ids for tags/skills; slug uniqueness on create
  - pro subcategory `type` defaults to freelancer and travels in `raw`
  - service category featured/icon; tag/skill delete has no reference check (same as old)
  - list pages read live data
- **Pagination component, sort header, layout guard and filtered nav** are identical apart from the removed Git item.

## 6. Open questions / couldn't verify
- D6 relies on better-auth's `removeUser` self-guard; `oldnext` has no `node_modules` to confirm it.
- D1: count the affected rows on prod: `select count(*) from profiles where billing->>'afm' is null and billing is not null;`. Admin saves made before cutover were written by OLD with `''`, so only post-cutover admin saves are affected.
- I did not run the app. Every finding is from tracing code. D1 and D4 are deterministic from the cited lines.
