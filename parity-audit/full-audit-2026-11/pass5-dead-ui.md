# Pass 5 — Dead-wired / half-wired UI — 2026-11-05

Cut: interactive elements that exist in both OLD and NEW (buttons, links, menu
items, toggles, dropdown options, sort headers, pagination, tabs, form submits,
dialogs). Each handler was traced end to end: handler → server action →
`lib/api/*` → Django URL → view → selector/service → effect/response.

Classes checked:
- (a) stub, 404 or ignored-param backends
- (b) options the server filters out or ignores
- (c) toggles that are saved but never read
- (d) hrefs built from null fields
- (e) fields that Django never sends
- (f) vanished or un-openable features
- (g) success callbacks that expect a shape which changed

Dedupe: I skimmed the finding titles of every pass 1–4 report. Nothing below repeats a known finding.

**Bottom line:** this cut is almost clean. Every interactive element I traced in the public, dashboard and admin areas reaches a real Django endpoint with matching parameter keys, and the UI reads fields Django actually sends. There is **one new finding (LOW)**. The other dead elements I found are dead in OLD too, so they are parity issues and not regressions. I list them in §4 so the user can decide whether to fix them anyway.

## 1. Coverage

Method:
- **Endpoint existence.** I extracted every `api.get/post/patch/put/delete('/…')` path in `frontend/src/{actions,lib,components,app}`: about 190 distinct paths. I checked each one by hand against `backend/config/urls.py` and every `apps/*/urls*.py`; no Django env is installed, so `resolve()` could not be run. Every path the UI calls exists with the right method. The only miss is `GET /services` without the trailing slash, from the unused `getServicesWithPagination`, which no UI reaches.
- **Vanished features (class f).** I compared the action imports of the OLD UI with the NEW UI (`components` + `app`).
  - Only OLD imports `blockUser`, `editMessage`, `updateUserImageAction`, the git actions and `getProfileByUserId`.
  - Their components (`messages/header-actions.tsx`, `message-edit.tsx`, `message-reactions.tsx`, `admin/forms/edit-user-image-form.tsx`) were never imported anywhere in OLD either, so nothing visible vanished. The git pages are already admin D24.
- **Unchanged components.** I listed every component or page that is byte-identical to OLD and imports an action, about 100 files. Because the UI is unchanged there, any defect has to be in the action or Django layer, so I traced that layer for each one.
- **Changed components.** I diffed the 152 component files that changed and read every interactive diff.
- Three parallel sub-sweeps (public, dashboard, admin) covered the same classes. Their candidate findings were re-verified by hand before inclusion.

Surfaces covered, each element traced:
- **Public:**
  - Save/heart (SaveButton and BreadcrumbButtons) → `/saved/toggle` and `/saved/state`.
  - Share popover.
  - Report profile and report service dialogs.
  - Review form → `/reviews/` (`{id,message}` drives ReviewSuccess).
  - StartChatDialog → `/chats/with/<uid>` (`{chatId,isNew}`).
  - `isOwner` gating via `profile.uid` / `service.profile.uid`, both present in `serialize_profile_summary`.
  - Archive sort options: all 7 match Django `_SORT_MAP`.
  - Archive online, county, type, pagination and page size.
  - Header/home search suggestions (`url` field present).
  - Header user menu, unread badge (`/chats/unread/total` → int), footer, mega-menu.
  - Blog list, category, pagination and search.
  - Contact form.
  - Login, register, forgot, reset, resend, Google, onboarding and oauth-setup submits.
  - Profile-page "load more" services, which is client-side.
- **Dashboard:**
  - Home stats (`/services/me/stats`, `/reviews/me/received/total`) and recent chats.
  - Services table: status filter, sort headers (title/category/status map in `get_user_services_dashboard`), pagination.
  - Featured star (`{featured}`) and refresh (`refreshedAt`, `remainingRefreshes`).
  - Delete (204 handled at `client.ts:404`) and edit link.
  - Sidebar recent services (`{services:[{id,title}]}`, ordered by `sort_date`, same as OLD).
  - Create, draft and edit service (`serviceId`/`serviceTitle` returned by `CreateServiceView`).
  - Reviews page: `r_page`/`g_page`/`rec_page`/`g_rec_page` on six `/reviews/me/*` endpoints.
  - Saved page: page and limit keys match `SavedListSerializer`.
  - Profile tabs: account, password, username (`newUsername`), upgrade, basic, additional, presentation (visibility is read back by the public profile), coverage, portfolio, verification (PENDING/APPROVED/REJECTED strings match), billing.
  - Messages: list search, reply (`replyToId`), mark-read (`messageIds`), older messages (`before`), copy.
  - Support feedback `issueType`.
  - Promote: payment history (`historyPage`) and checkout redirect (`data.url`).
- **Admin:**
  - Every list section: users, profiles, services, reviews, verifications, subscriptions, chats, articles, taxonomy submissions, skills, tags, service/pro taxonomies.
    - Filter option values were checked against the Django filter code.
    - Sortable column ids were checked against each Django sort map.
    - `sortOrder` → `sortDirection` mapping.
    - Pagination limits are within the 100 clamp.
  - Stats cards (all keys present; users `byStep.EMAIL_VERIFICATION`/`OAUTH_SETUP`, services `serviceTypes`/`pricing.*`, and so on).
  - Detail-page buttons: verification and review approve/reject/revert, profile settings toggles (`isActive`/`top` are read by public payloads), status/ban forms.
  - Manual subscription (profile search + create), team assign/role, API-key create/toggle/delete, article create/edit/delete.
  - Row links (`pid`, `uid`, `authorId`, `profile.username`, `service.slug` are all in `_admin_card` and `_verification_row`).

## 2. Mapping
Same as the pass-1 mappings. No unmapped UI handler was found.

## 3. DIFFERENCES (new findings only)

### D1. Admin chat detail page never 404s for a nonexistent or mistyped chat id — LOW (class g)
- **OLD:**
  - `getAdminChatById` returns the Prisma `findFirst` row, which is `null` when the chat does not exist (`oldnext/src/actions/admin/chats.ts:230-277`).
  - The page then calls `if (!chat) notFound()` (`oldnext/src/app/(admin)/admin/chats/[cid]/page.tsx:40-43`), so an unknown id gives a 404.
- **NEW:**
  - The page code is identical: `const chat = await getAdminChatById(cid); if (!chat) notFound();` (`frontend/src/app/(admin)/admin/chats/[cid]/page.tsx:40-43`).
  - `getAdminChatById` now returns the `wrap()` ActionResult `{success, data|error}` (`frontend/src/actions/admin/chats.ts:44-46`). That object is always truthy, including `{success:false, error:'Chat not found'}`.
  - Django `AdminChatDetailView.get` raises `NotFound("Chat not found")` (`backend/apps/messaging/views/admin/chats.py:108-111`). The action turns that 404 into `{success:false}`, so `notFound()` is never reached.
- **Impact:**
  - A bad or stale `/admin/chats/<id>` (old link, typo, deleted chat) renders the "Chat Details" shell instead of a 404.
  - The stats card shows its error state and the messages table is empty, because `/admin/chats/<id>/messages` also 404s and the section falls back to `[]`.
  - Every other admin detail page correctly checks `!result.success || !result.data`: services, reviews, verifications, articles, subscriptions, users, profiles.
- **Fix:** `if (!chat.success || !chat.data) notFound();`.
- **Possibly intentional?:** No. The page was copied unchanged from OLD and the action's return contract changed under it.

## 4. Old-also: dead in both stacks (parity, not regressions; listed so they are not rediscovered)
- **Admin API keys page never lists keys.**
  - `loadApiKeys` has `// setApiKeys(result.data);` commented out (`frontend/src/components/admin/api-key-management.tsx:103-104`, identical in OLD).
  - Create, toggle and delete all reach Django, but the rows to toggle or delete are never shown.
- **Admin notifications page buttons do nothing.** "Mark read", "dismiss" and "mark all read" have no `onClick` (`frontend/src/app/(admin)/admin/notifications/page.tsx`). OLD was a mock with the same buttons; see copy-sweep D3.
- **Admin articles table "createdAt" header is marked sortable but sorting is ignored.**
  - The table section never forwards `sortBy`/`sortOrder` (`admin-articles-table-section.tsx:15-25`).
  - Django `list_admin` hard-codes `-created_at` (`backend/apps/blog/services/articles.py:210`).
  - Identical in OLD.
- **Admin chats "Μηνύματα" header is sortable but has no Django sort key.** It falls back to `last_activity` (`backend/apps/messaging/views/admin/chats.py:62-63`). OLD also mapped `messageCount` → `lastActivity`.
- **Pro taxonomies "all" table edit icon 404s.** It links to `/admin/taxonomies/pro/${id}` (`admin-pro-taxonomies-table-section.tsx:166`), and neither app has a `pro/[id]` route.
- **Admin profile basic-info form sends fields that are never written.** It sends `image` and `coverage` (`frontend/src/actions/admin/profiles/basic-info.ts:27-29`), but Django deliberately does not write them (`admin_update_basic_info`). OLD had the same omission.
- **Verification and review "notes" fields in the approve/reject dialogs are never stored**, in either stack.
- **Admin service-taxonomy edit cannot clear an image.** A falsy image is dropped (OLD `edit-taxonomy-item-form.tsx:137`; NEW `actions/admin/taxonomies.ts:69`). `update_taxonomy_item` only writes `image` when the key is present (`dataset_ops.py:252`).
- **Admin service media form alerts never show.** It reads `state.message`, which the action never sets, so the success and error Alerts are never displayed (`edit-service-media-form.tsx:190-201`). Same in OLD.
- **Dashboard service media: the last photo cannot be removed.**
  - `MediaUpload` sets the value to `null`, and the action sends `{media:null}`.
  - Django `UpdateServiceMediaSerializer.media` is a `ListField` without `allow_null` (`backend/apps/services/serializers/service.py:406-412`), so it returns 400 and an error toast.
  - OLD also failed, because raw `null` on a Prisma `Json?` column is rejected; that is my reasoning about Prisma 6, not a test run. Only the error text differs.
  - The profile portfolio is fine (`allow_null=True`).
- **Dashboard sidebar "Διαχείριση Υπηρεσιών" submenu stays empty on the services pages.** It is `defaultOpen` there, but the recent services only load in the trigger's `onClick` (`components/dashboard/dashboard-nav-services.tsx`). Identical in OLD.
- **Admin "Create User" button links to `/admin/users/create`, a route that does not exist in either app.**

## 5. Corrections
None. No earlier finding was disproved in this cut.

## 6. Open questions
- Everything above comes from reading the code; nothing was exercised in a browser. D1 can be confirmed live by opening `/admin/chats/does-not-exist` on test.doulitsa.gr: expect the shell with an error card instead of the 404 page.
