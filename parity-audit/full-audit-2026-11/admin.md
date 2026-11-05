# Admin panel parity audit — 2026-11-05

Scope: every file under `oldnext/src/actions/admin/` plus the old admin UI (`oldnext/src/app/(admin)/**`, `oldnext/src/components/admin/**`), compared with the new frontend actions/pages/components and the Django admin endpoints. No code was changed.

How I checked: the new admin UI is mostly a **verbatim copy** of the old components and pages. I diffed every pair; most diff to 0 lines. So nearly every regression comes from the **data shapes and side effects of the Django endpoints** behind the copied UI. Each finding below was traced from the page or component, through the action, to the Django view or service.

---

## 1. Coverage

### OLD files read (all of `oldnext/src/actions/admin/`)
| File | Role |
|---|---|
| `users.ts` (1756) | user CRUD; role, ban/unban, block, confirm, step, image, sessions, impersonation, password, stats, `updateAccountAdmin` (displayName/image → profile sync), team (list/assign/remove/search) |
| `profiles.ts` (1042) | profile list/detail/update, toggles (published/featured/verified), verification upsert, delete, search (selection + service creation), stats, Brevo list stats, settings form action |
| `profiles/basic-info.ts`, `additional-info.ts`, `presentation.ts`, `portfolio.ts`, `coverage.ts`, `billing.ts`, `index.ts` | the admin's per-section profile edit actions (admin/support gate, Greek messages, cache revalidation) |
| `services.ts` (1906) | service list/detail/update + section actions, media, publish/feature toggles, status (approve/reject) with owner email + Brevo, delete, stats, admin create-for-profile |
| `verifications.ts` | verification list/detail/status (syncs `profile.verified`)/delete/stats |
| `reviews.ts` | review list/detail/status (rating recalculation + email to the owner on approve)/delete/stats/visibility |
| `subscriptions.ts` | subscription list/detail/status (featured sync)/delete/stats/manual promoted subscription |
| `taxonomy-submission.ts` | submission list/stats/approve/reject/bulk (placeholder id replace/remove) |
| `taxonomies.ts`, `pro-taxonomies.ts`, `skills.ts`, `tags.ts`, `taxonomies-shared.ts`, `taxonomy-helpers.ts`, `action-wrappers.ts`, `revalidate-taxonomies.ts` | taxonomy CRUD (draft-based), shared helpers, FormData wrappers |
| `taxonomy-git.ts`, `taxonomy-publish.ts`, `git-operations.ts` | Git/GitHub publish workflow for taxonomy drafts (PR, merge, sync, revert, **move-to-new-parent + service resync**) |
| `chats.ts` | chat stats/list/detail/detail-stats/messages |
| `api-keys.ts` | admin API key validate/create/list/update/delete/access |
| `revalidate-caches.ts` | revalidate all Next tags/paths |
| `helpers.ts` | `getAdminSessionWithPermission`, filtered navigation |
| `index.ts` | barrel |

Supporting old files read: `lib/validations/admin.ts` (schemas), `lib/validations/auth.ts` and `shared.ts` (password/displayName rules), `lib/auth/roles.ts` (permission matrix, `canAssignRole`), `lib/email/services/review-emails.ts`.

OLD UI: all 54 files under `app/(admin)/admin/**` and all 150 files under `components/admin/**` were diffed against the new counterparts. Results:
- 0-line diff (identical): every list page, layout, users/services/reviews/verifications/subscriptions/taxonomy list pages, all `*-filters`, `*-table-section` (except chats), `*-skeleton`, `*-stats` (except byType rename), all `forms/edit-service-*`, `edit-user-status-form`, `edit-user-ban-form`, `delete-user-form`, `revoke-sessions-form`, `edit-profile-settings-form`, `team/*` (except team-cards), `api-key-management`, `admin-review-actions`, `admin-verification-actions`.
- Non-trivial diffs, all reviewed: `users/[id]/page`, `profiles/[id]/page`, `verifications/[id]/page`, `subscriptions/[id]/page`, `taxonomies/pro/page`, `service/[id]`, `skills/[id]`, `admin/page`, `notifications/page`, the data tables (profiles, services, reviews, verifications, subscriptions, chats, chat-messages, taxonomy-submission), `admin-chat-detail-stats`, `admin-chats-table-section`, `admin-chat-messages-table-section`, taxonomy forms (create/edit tag/skill/pro/service, edit-taxonomy-item), `admin-create-service-form`, `manual-subscription-form`, `team-cards-client`, `admin-layout-wrapper`, `app-sidebar`.
- Missing in new (checked for callers): `git/page.tsx`, `taxonomies/git/page.tsx`, `deployment/*`, `draft-*`, `pending-change*`, `confirm-*-dialog`, `code-block` (Git flow only). The following had **no callers** even in old: `service-management`, `verification-management`, `service-detail-view`, `section-cards`, `chart-area-interactive`, `user-auth-flow`, `data-table`, `admin-stats-skeleton`, `admin-service-table-header-sort`, `app-sidebar-wrapper`, `nav-documents`, `nav-secondary`, `forms/edit-user-image-form`.

### NEW files read
- Frontend actions: `frontend/src/actions/admin/*` (all 28 files incl. `profiles/*`, `notifications.ts`), `frontend/src/lib/api/admin.ts`, `frontend/src/lib/api/client.ts` (response handling: no unwrapping), `frontend/src/lib/auth/roles.ts` (identical to old), `components/forms/profile/form-account.tsx`, `form-additional-info.tsx`, `form-basic-info.tsx`, `form-billing.tsx`, `form-presentation-info.tsx`.
- Backend:
  - `apps/accounts/{views/admin/users.py, views/admin/team.py, services/admin_users.py, selectors/admin_users.py, serializers/admin_users.py, permissions/admin.py, urls/admin.py, services/sessions.py}`, `serializers/auth.py` (`UpdateAccountSerializer`)
  - `apps/profiles/{views/admin/profiles.py, views/admin/verifications.py, services/admin_profiles.py, serializers/admin_profile_serializers.py, urls/admin.py}`, `services/profile_updates.sync_account_to_profile`
  - `apps/services/{views/admin/service.py, services/admin_services.py, urls/admin.py, serializers/service.UpdateServiceSerializer}`
  - `apps/reviews/{views/admin/reviews.py, services/review_ops.py (moderate/admin delete/toggle), selectors/review_reads.admin_card, urls/admin.py}`
  - `apps/billing/{views/admin/billing.py, services/subscription_ops.admin_*, urls/admin.py}`
  - `apps/taxonomy/{views/admin/dataset.py, views/admin/submissions.py, services/admin_submissions.py, services/dataset_ops.py, urls/admin.py, serializers/taxonomy.ServiceTaxonomySerializer}`
  - `apps/messaging/views/admin/chats.py`, `apps/admin_api/views/admin/api_keys.py`, `services/api_keys.py`, `apps/core/views/admin/cache.py`
  - `config/urls.py` (admin mounts), `common/authentication.py`, `common/permissions.py`, `apps/messaging/tasks.send_review_approved_email`

### Delegated elsewhere
- `app/(admin)/admin/articles/**`, `components/admin/article-form.tsx`, `admin-articles-*` → **blog/content** domain (the page diff is 30–34 lines; not audited here)
- The content of the review-approved and service-published emails → **emails** domain (I only checked trigger and recipient)
- Subscription renewal and payment math, and the `_row` payment fallbacks → **billing** domain. I checked only the admin-visible list, status, delete, manual and payments actions.
- Brevo list-assignment internals (`brevo_state_change` task logic) → **emails/marketing** domain
- Ban enforcement and ban expiry at login/request time (`apps/accounts/services/auth.py:77`) → **auth** domain (noted under D11)

---

## 2. Mapping (old → new)

| OLD action | NEW frontend action → Django endpoint | Page/UI caller |
|---|---|---|
| users: listUsers / getUser / getUserStats | `adminUsers.list/get/stats` → `GET /api/admin/users`, `/users/{id}`, `/users/stats` | users list, **users/[id]**, dashboard, analytics |
| createUser, setUserRole, banUser, unbanUser, removeUser, impersonate, stopImpersonating, list/revoke sessions, updateUser, setUserPassword | `POST /users`, `/users/{id}/role`, `/ban`, `/unban`, `DELETE /users/{id}`, `/impersonate`, `/users/me/stop-impersonating`, `/sessions`, `/sessions/revoke-all`, `DELETE /users/sessions/{token}`, `PATCH /users/{id}`, `/password` | delete-user-form, revoke-sessions-form (the rest have no UI caller) |
| updateUserBasicInfo/Status/BanStatus/Image, toggleUserBlock/Confirmation, updateUserJourneyStep (+FormData wrappers) | `PATCH /basic-info`, `/status`, `/ban-status`, `/image`, `POST /blocked/toggle`, `/confirmed/toggle`, `PATCH /journey-step` | edit-user-status-form, edit-user-ban-form |
| updateAccountAdmin | `PATCH /users/{id}/account` | AccountForm (adminMode) on users/[id] and profiles/[id] |
| getTeamMembers, assignAdminRole, removeAdminRole, searchUsersForRoleAssignment | `GET /team`, `POST/DELETE /team/{id}/role`, `GET /team/search` | team page + dialogs |
| profiles.ts list/get/update/toggles/updateVerificationStatus/delete/search*/stats/brevo/settings | `/api/admin/profiles…` (list, detail, settings, published/featured/verified toggle, verification-status, search, search/for-services, stats, brevo-stats) | profiles list, profiles/[id], create-service & manual-sub profile pickers, analytics |
| profiles/*.ts section actions | `PATCH /profiles/{id}/basic-info`, `additional-info`, `presentation`, `portfolio`, `coverage`, `billing` | profiles/[id] forms |
| services.ts (all) | `/api/admin/services…` (list, detail, `/{id}/` generic, taxonomy, basic, pricing, settings, addons, faq, media, published/featured toggles, status, stats, for-profile) | services list, services/[id] forms, services/create |
| verifications.ts | `/api/admin/verifications…` | verifications list/[id] |
| reviews.ts | `/api/admin/reviews…` (+ NEW-only `pending`) | reviews list/[id] |
| subscriptions.ts | `/api/admin/billing…` (+ `/payments`) | subscriptions list/[id]/create |
| taxonomy-submission.ts | `/api/admin/taxonomy/submissions…` | taxonomies/submissions |
| taxonomies/pro-taxonomies/skills/tags/taxonomies-shared | `/api/admin/skills`, `/tags`, `/taxonomies/services`, `/taxonomies/pros` (direct DB writes) | taxonomy create/edit pages |
| taxonomy-git / taxonomy-publish / git-operations | no counterpart (only an unused `/taxonomies/commit` endpoint) | Git pages removed — the move to the DB is intentional |
| chats.ts | `/api/admin/chats…` | chats list / chats/[cid] |
| api-keys.ts | `/api/admin/api-keys…` | api-keys page |
| revalidate-caches / revalidate-taxonomies | identical Next-side files (+ `/api/admin/cache/revalidate-all`, `/api/admin/taxonomies/revalidate`) | — |
| helpers.getFilteredNavItems | same, minus the Git item | sidebar |

---

## 3. DIFFERENCES

### D1. Admin user detail page crashes: the Django detail payload is nested under `user`, but the copied page reads top-level fields — CRITICAL
- OLD: `getUser` returns the Prisma user object itself, with `profile{…,_count{services,reviews}}`, `accounts` and `sessions` included (`oldnext/src/actions/admin/users.ts:50-97`).
- NEW: `AdminUserDetailView.get` returns `{user:{…}, accounts:[…], sessions:[…]}` (`backend/apps/accounts/views/admin/users.py:95-103`). `frontend/src/actions/admin/users.ts:21-27` passes it through unchanged, and `frontend/src/lib/api/client.ts:412-424` does not unwrap. The page then does `const user = userDataResult.data` and reads `user.id.slice(0, 12)` (`frontend/src/app/(admin)/admin/users/[id]/page.tsx:46,99`). `user.id` is undefined, so a TypeError is thrown.
- The payload also has **no `profile` key at all**. Even once the nesting is fixed, the page cannot show the "View profile / public profile" links, "Has profile", or the services/reviews counts (page lines 60-70, 282-303).
- Every form on the page (`EditUserStatusForm`, `EditUserBanForm`, `RevokeSessionsForm`, `DeleteUserForm`, `AccountForm`) is fed `user.id`. With the current shape they would call `/api/admin/users/undefined/...`.
- Impact: `/admin/users/{id}` is unusable. The user-management capabilities whose only UI is this page are all inaccessible: status/role/type/step, ban, revoke sessions, delete, display name/avatar.
- Fix: either return the flat `AdminUserSerializer` data with `accounts`, `sessions` and `profile:{id,username,_count:{services,reviews}}` merged in, or have `getUser` flatten the payload.
- Possibly intentional?: no.

### D2. Admin service edit page has no `description`, `addons` or `faq` in its data. Saving the Addons/FAQ form wipes them; Basic can't be saved without retyping — CRITICAL
- OLD: `getService` returns the full Prisma service, including `description`, `addons`, `faq`, `profile.user`, the 10 latest reviews with their profiles, and `_count.reviews` (`oldnext/src/actions/admin/services.ts:334-395`).
- NEW: `get_service_detail` returns `_admin_row(s)` plus `recentReviews`/`reviewsCount` (`backend/apps/services/services/admin_services.py:99-146`). `_admin_row` has no `description`, `addons` or `faq`.
- Effect on the forms:
  - `EditServiceAddonsForm` initialises `addons: service.addons || []` and `EditServiceFaqForm` initialises `faq: service.faq || []`, so both open empty.
  - `EditServiceBasicForm` initialises `description: service.description`, which is undefined.
  - On save, `update_service_fields` writes `[]` for addons/faq, because only `None` is skipped (`admin_services.py:173-189`). The service's real addons and FAQ are erased.
  - The Basic form submits an empty description, so the admin must retype it.
- The page also shows Addons/FAQ counts of 0, and `service._count?.reviews` is always 0 (the new key is `reviewsCount`).
- Impact: data loss on the owner's published service whenever an admin saves the Addons or FAQ section. Basic edits are blocked or destructive.
- Possibly intentional?: no.

### D3. Admin profile edit page has none of the additional-info fields. Saving "Πρόσθετα Στοιχεία" wipes them — CRITICAL
- OLD: `getProfile` returns the full Prisma profile (`oldnext/src/actions/admin/profiles.ts:184-247`), including `commencement`, `contactMethods`, `paymentMethods`, `settlementMethods`, `budget` and `terms`.
- NEW: `get_profile_detail` (`backend/apps/profiles/services/admin_profiles.py:115-162`) has none of those six fields.
- `AdditionalInfoForm` reads `profile.commencement/contactMethods/paymentMethods/settlementMethods/budget/terms` (`frontend/src/components/forms/profile/form-additional-info.tsx:109-116`), so it opens blank.
- `admin_update_additional_info` writes **every** field, with blanks becoming null/[] (`admin_profiles.py:208-235`). That matches old write semantics, but old pre-filled the form.
- Impact: an admin who edits only "rate" erases the pro's start year, experience, contact/payment/settlement methods, budget and terms.
- Possibly intentional?: no.

### D4. Admin "Revoke all sessions" no longer logs the user out — CRITICAL (auth)
- OLD: `revokeAllUserSessions` → `auth.api.revokeUserSessions` deletes the Better-Auth sessions, which immediately invalidates every login (`users.ts:524-551`).
- NEW: `revoke_all_user_sessions` only deletes rows from the legacy `Session` table (`backend/apps/accounts/services/admin_users.py:378-380`). Authentication is SimpleJWT (`common/authentication.py:26`), and refresh tokens live in `OutstandingToken`.
- A working "log out everywhere" helper already exists (`apps/accounts/services/sessions.py:55` `revoke_all_for_user`, blacklists refresh tokens) but the admin path does not call it.
- The same applies to `revoke_session` (single token) and `stop_impersonating`.
- Impact: the admin sees "revoked" (the Django response is `{revoked: n}`, usually 0), but the user's access/refresh tokens stay valid for up to 14 days.
- Possibly intentional?: no.

### D5. Admin "create service for profile" is blocked at step 2: the profile search no longer returns `coverage` — HIGH
- OLD: `searchProfilesForServiceCreation` selects `coverage` (`profiles.ts:774-789`).
- NEW: `AdminProfileSearchForServicesView` → `search_profiles_for_selection` → `_admin_profile_row` (`admin_profiles.py:80-112, 316-333`) has no `coverage`.
- `admin-create-service-form.tsx:211-222` derives `disabledOptions` from `selectedProfile.coverage`. With it undefined, presence, online, onsite and onbase are all disabled.
- Step 2 validity requires `type.presence || type.online` (lines 234-235), so the wizard can never advance.
- Impact: admins and editors cannot create a service on a pro's behalf.
- Possibly intentional?: no. The new type comment even says "coverage is only present on the profile-detail payload".

### D6. Admin service "Settings" save on an already-published service re-sends the "service published" email to the owner — HIGH
- OLD: `updateServiceSettingsAction` → `updateService`. The email (plus cache warm and Brevo) is sent only if `updateData.status === 'published' && existingService.status !== 'published'` (`services.ts:478-554`).
- NEW: `AdminServiceSettingsView.patch` always calls `svc.update_status` when `status` is present (`backend/apps/services/views/admin/service.py:96-115`). `EditServiceSettingsForm` always sends `status` (`edit-service-settings-form.tsx:83-90`).
- `_notify_status_change` sends `send_service_published_email` for any `new_status == published`, with no `previous_status` check (`admin_services.py:237-243`).
- Impact: every time an admin toggles "featured" or re-saves settings on a live service, the owner gets another "your service was published" email.
- Possibly intentional?: no.

### D7. Moving a service/pro taxonomy item to a different parent is silently ignored, and services are not re-synced — HIGH
- OLD: `edit-taxonomy-item-form` records `newParentId` + `level` in the draft. `taxonomy-publish.applyUpdateDraft` → `moveAndUpdateItem` moves the node, keeping its children (`taxonomy-publish.ts:166-250`). `syncServicesAfterMove` then rewrites `services.subcategory`/`category` for the affected services (`taxonomy-publish.ts:375-411`).
- NEW: the form still shows a "Change the parent to move this …" select and passes `parentId` (`frontend/src/components/admin/forms/edit-taxonomy-item-form.tsx:111-121,184-213`). But `updateServiceTaxonomy` drops `parentId` when building `item` (`frontend/src/actions/admin/taxonomies.ts:48-73`), and `update_taxonomy_item` never touches `parent_id` (`backend/apps/taxonomy/services/dataset_ops.py:237-267`).
- Impact: the toast says "Saved" but the hierarchy is unchanged. No service is re-pointed.
- Possibly intentional?: no. The UI still offers the capability.

### D8. Admin profile list "Κατηγορία" column always "-", and the service list shows the raw category id: `taxonomyLabels` dropped — MEDIUM
- OLD:
  - `listProfiles` adds `taxonomyLabels` via `resolveTaxonomyHierarchy` (`profiles.ts:148-160`).
  - `listServices` adds `taxonomyLabels{category,subcategory,subdivision}` (`services.ts:277-298`).
- NEW:
  - `_admin_profile_row` (`admin_profiles.py:80-112`) has no `taxonomyLabels`. The table renders `-` when it is missing (`admin-profiles-data-table.tsx:126-131`).
  - `_admin_row` (`admin_services.py:99-127`) has no `taxonomyLabels` either. The table falls back to a raw `service.category` id badge (`admin-services-data-table.tsx:147-153`).
- Impact: admins lose the category/subcategory/subdivision labels in both list views.
- Possibly intentional?: no.

### D9. Admin profile detail: Services count always 0; the `user` sub-object is truncated — MEDIUM
- OLD: `getProfile` includes `user: true` (full user) and `_count{services,reviews}` (`profiles.ts:188-227`).
- NEW:
  - `get_profile_detail` reuses `_admin_profile_row`. Its `_count` reads the `_services_count` annotation, which is only set by the list queryset, so in the detail view it is always `{services:0,reviews:0}` (`admin_profiles.py:108-111,140`). The real counts are under `servicesCount`/`reviewsCount`, which the page does not read (`profiles/[id]/page.tsx:218`).
  - `user` only has `id,email,name,role,blocked,confirmed`, so `mockUser.banned`, `step`, `username`, `displayName`, `image` and the dates fall back or are undefined (`page.tsx:53-64`).
  - The old `services` (10 latest) and `reviews` (10 latest) are gone. They are not rendered by the page, so that part is low.
- Impact: wrong "Services: 0", and the account card is built from fallbacks.
- Possibly intentional?: no.

### D10. Admin presentation (contact) edit cannot clear fields — MEDIUM
- OLD: writes `phone/website/viber/whatsapp: value || null`, `visibility || {email:true}`, `socials || DbNull` on every save (`oldnext/src/actions/admin/profiles/presentation.ts:106-118`).
- NEW: `AdminProfilePresentationView` → `_patch_profile_fields` → `svc.update_profile`, which **skips `None` values** (`admin_profiles.py:270-272`). The action sends `null` for blanks (`frontend/src/actions/admin/profiles/presentation.ts:23-28`).
- Impact: an admin emptying a pro's phone, website, viber, whatsapp or socials sees success, but the old value stays. The `{email:true}` default for missing visibility is also never applied.
- Possibly intentional?: no.

### D11. Ban form: the expiry date is now honored, but nothing ever lifts the ban — MEDIUM (possibly intentional)
- OLD: `EditUserBanForm` sends `banExpires` (ISO), but `updateUserBanAction` ignores it and computes the expiry from `isPermanent`/`banDuration`, which the form never sends (`users.ts:1239-1255`). So old bans were always stored with `banExpires=null` (permanent).
- NEW:
  - `updateUserBanAction` forwards `banExpires` (`frontend/src/actions/admin/users.ts:277-285`), so it is stored.
  - Nothing auto-expires a ban: `apps/accounts/services/auth.py:77` and `common/permissions.py:34` check only `banned`.
  - Better-Auth's admin plugin did auto-unban on expiry, but old never stored an expiry from this form.
- Impact: old and new behave the same in practice (bans are permanent). The detail page now shows an expiry date that is never enforced.
- Also: Better-Auth's `banUser` refused self-ban and revoked sessions. The new `ban_user` has no self-ban guard. That endpoint has no UI caller.
- Possibly intentional?: partly. Forwarding `banExpires` fixes an old bug, but showing an expiry that never applies is misleading. Flag for the auth agent.

### D12. `updateAccountAdmin` (admin edits a user's display name/avatar): no success/error toast; clearing the avatar doesn't propagate to the profile — MEDIUM
- OLD:
  - Returns `{success, message:'Ο λογαριασμός ενημερώθηκε επιτυχώς!'}` or `{success:false, message}` (`users.ts:1407-1418`). AccountForm shows a toast, refetches and calls `router.refresh()` (`form-account.tsx:116-132` reads `state.message`).
  - Sets `profile.image = processedImage`, including null.
- NEW:
  - The action returns `{success, data}` or `{success:false, error}` with **no `message`** (`frontend/src/actions/admin/users.ts:297-311`). The admin gets no confirmation, no error toast, and no refresh.
  - The backend sync calls `sync_account_to_profile(image=None)` when the avatar is removed, and that helper treats `None` as "unchanged" (`backend/apps/accounts/views/admin/users.py:369-384`, `profile_updates.py:68-70`). The user avatar is cleared but `profile.image` keeps the old picture.
  - Validation is stricter: `UpdateAccountSerializer` requires displayName 5–50 (`serializers/auth.py:71`), where the admin path allowed 1–100. The client form already enforces 5–50, so this part is low.
- Possibly intentional?: no.

### D13. Approving or rejecting a taxonomy submission doesn't purge the profile/service caches — MEDIUM
- OLD: after replacing or removing `pending_<id>` in `profiles.skills`/`services.tags`, it revalidates `collections.*`, `archive.*`, `directory.all`, `home` and `search.all` (`taxonomy-submission.ts:327-341, 399-408`).
- NEW:
  - `_revalidate_caches()` uses `cache.delete_many(["profiles:directory:*", …])`, which deletes literal keys containing `*`. That is a no-op; the sibling view's comment says exactly this (`backend/apps/taxonomy/views/admin/dataset.py:137-141` vs `services/admin_submissions.py:316-337`).
  - The raw-SQL `array_replace` fires no model signals.
  - The frontend `approveTaxonomySubmission` calls no Next revalidation (`frontend/src/actions/admin/taxonomy-submission.ts:37-45`).
- Impact: public profile/service pages keep the placeholder (or the removed chip) until their TTLs expire.
- Possibly intentional?: no. The caching architecture is intentional, but this purge is broken.

### D14. Admin chat messages table shows the raw author id and ignores sort order — MEDIUM
- OLD: the table shows the author's avatar, displayName ('Χρήστης' fallback) and `@username` (`oldnext/src/components/admin/admin-chat-messages-data-table.tsx:41-56`). Messages honor `sortBy/sortOrder` (`chats.ts:449-454`).
- NEW:
  - The table renders `message.authorId` (a cuid) as the name and avatar seed (`frontend/src/components/admin/admin-chat-messages-data-table.tsx:27,34-35`), even though the backend now ships `author{displayName,username,image}` (`messaging/views/admin/chats.py:229-242`).
  - `AdminChatMessagesView` always orders `-created_at` and ignores `sortBy/sortOrder`, so the filter's "oldest" option has no effect (`chats.py:186`).
  - Old message items had `author.id`; the new author object has no id.
- Possibly intentional?: no.

### D15. Admin chat detail stats: shows email instead of @username, and no avatars — LOW
- OLD: creator/member `{id, displayName, username, image}`, rendered as avatar + `@username` (`oldnext/.../admin-chat-detail-stats.tsx:84-97`).
- NEW: the component was changed to show `email` and no image (`frontend/.../admin-chat-detail-stats.tsx:68-80`), although the backend `_member` now returns `username` and `image` (`chats.py:249-266`).
- Also: a nonexistent chat id no longer 404s. `getAdminChatById` returns a truthy ActionResult, so `if (!chat) notFound()` never fires (`chats/[cid]/page.tsx:40-44`).
- Possibly intentional?: no.

### D16. Review admin list/detail: the author's displayName and avatar now come from the author's Profile, so simple users show no displayName or avatar — LOW/MEDIUM
- OLD: `author{displayName,image}` come from the User row (`reviews.ts:66-75, 122-131`).
- NEW: `_admin_card` takes `displayName`/`image` from `author.profile` (`backend/apps/reviews/selectors/review_reads.py:316-344`). Simple (non-pro) reviewers have no Profile, so they fall back to `name`/`'User'` with no avatar.
- Possibly intentional?: no.

### D17. Taxonomy update with a duplicate slug is now rejected (409, English message) instead of being auto-renamed — LOW
- OLD: `updateItem` runs `generateUniqueSlug(data.slug, currentItems, data.id)`, so a colliding slug is suffixed (`taxonomies-shared.ts` updateItem).
- NEW: `update_skill`/`update_tag`/`update_taxonomy_item` raise `ApiError("Slug already used", 409)` (`dataset_ops.py:100-101,140-141,244-245`).
- New service/pro node ids are slug-based (`_unique_node_id`) instead of `nanoid(6)`.
- Possibly intentional?: the id scheme probably is (DB architecture). The slug behavior is a difference.

### D18. Team management details — LOW
- `assign_admin_role` sets `step=DASHBOARD` only for admin/support/editor (`admin_users.py:430-435`). OLD sets `step:'DASHBOARD'` for **any** assigned role (`users.ts:1565-1571`).
- `remove_admin_role` falls back to `freelancer` for a pro user without a profile type (`admin_users.py:449-455`). OLD falls back to `user` (`users.ts:1641-1654`).
- Team search orders by `email` asc (`selectors/admin_users.py:170-177`). OLD orders by `createdAt desc` (`users.ts:1740-1742`). For under 2 characters, OLD returns the error "Search query must be at least 2 characters"; NEW returns an empty list.
- Team member payload lacks `blocked/confirmed/emailVerified/testUser/firstName/lastName/updatedAt` (`serializers/admin_users.py:166-173`). The "Blocked" badge was removed from `team-cards-client.tsx` (old lines 79-83).
- Possibly intentional?: no.

### D19. Admin profile list/search and stats details — LOW
- List search drops `profile.email` (OLD searched `username|displayName|email|user.email`, `profiles.ts:60-67`; NEW `admin_profiles.py:28-34` has no `email__icontains`). The selection search keeps it.
- List rows lack `verification` and `user.banned` (OLD `profiles.ts:121-139`). The current table doesn't render them.
- `deleteProfile`: OLD re-syncs Brevo for the owner (pro → EMPTYPROFILE) and returns `{deletedProfile: <profile>, cascadeInfo:{services,reviews}}` (`profiles.ts:620-642`). NEW does no Brevo sync and returns `{deletedProfile: id, cascadeInfo:{profileId, uid}}` (`views/admin/profiles.py:97-102`). No UI caller.
- Generic `updateProfile`: NEW passes camelCase keys (`displayName`) to `update_profile`, which silently drops them (`hasattr(profile,'displayName')` is False), and it never sets `*Normalized` (OLD `profiles.ts:261-276`). No UI caller.
- Possibly intentional?: no.

### D20. Greek admin feedback texts changed in the profile section actions — LOW
| Section | OLD message | NEW message |
|---|---|---|
| Basic | 'Τα βασικά στοιχεία ενημερώθηκαν επιτυχώς!' | 'Τα στοιχεία ενημερώθηκαν' |
| Additional | 'Τα πρόσθετα στοιχεία ενημερώθηκαν επιτυχώς!' | 'Τα στοιχεία ενημερώθηκαν' |
| Presentation | 'Τα στοιχεία επικοινωνίας ενημερώθηκαν επιτυχώς!' | 'Τα στοιχεία προβολής ενημερώθηκαν' |
| Portfolio | 'Τα δείγματα εργασιών ενημερώθηκαν επιτυχώς!' | 'Το portfolio ενημερώθηκε' |
| Coverage | 'Οι περιοχές κάλυψης ενημερώθηκαν επιτυχώς!' | 'Η κάλυψη ενημερώθηκε' |
| Billing | 'Τα στοιχεία τιμολόγησης ενημερώθηκαν επιτυχώς!' | 'Τα στοιχεία χρέωσης ενημερώθηκαν' |
| Missing profileId | 'Το αναγνωριστικό προφίλ δεν βρέθηκε' | 'Λείπει το profileId' |
- Username-taken (basic info): OLD 'Το συγκεκριμένο username χρησιμοποιείται ήδη. Επιλέξτε ένα διαφορετικό username.' (`users.ts:673-674`); NEW 'Αυτό το username χρησιμοποιείται ήδη' (`admin_users.py:204`).
- Where: OLD `oldnext/src/actions/admin/profiles/*.ts`; NEW `frontend/src/actions/admin/profiles/*.ts`.
- Possibly intentional?: no.

### D21. Admin user validation and side-effect details — LOW
- Basic-info rules: OLD allowed `username` min 5 (no regex), `displayName` 5–50 (accountUpdateSchema.partial), and the picked schema **dropped `name`** (`validations/admin.ts:66-81,176-181`). NEW allows a 3–30 `[a-zA-Z0-9_-]` username, displayName up to 100 with no minimum, accepts `name`, and lowercases the username (`serializers/admin_users.py:136-142`, `admin_users.py:216-219`). No UI caller.
- `updateUserStatus`: OLD always Brevo-syncs after any status/type/step change (`users.ts:760`). NEW syncs only on type/blocked/step changes, not on confirmed/emailVerified (`admin_users.py:242-270`). The same goes for the OLD unconditional sync in `toggleUserConfirmation`: OLD had none there, which matches.
- `createUser`: NEW enforces `canAssignRole` (support can't create admin) and sets type/step/confirmed/emailVerified itself. OLD relied on Better-Auth hooks and had no role check (`users.ts:230-268`). No UI caller.
- `impersonate`: NEW creates a Session row and returns a token that nothing consumes, so impersonation is effectively non-functional. No UI caller.
- Possibly intentional?: no.

### D22. Service pricing save with an empty price writes 0 — LOW
- OLD: `price: formData.get('price') ? Number(...) : undefined`, so an empty price is not updated (`services.ts:707`).
- NEW: `price: Number(getFormString(formData,'price') || 0)` (`frontend/src/actions/admin/services.ts:69`).
- Possibly intentional?: no.

### D23. Subscription payment history page size changed from 10 to 25 — LOW
- OLD: `HISTORY_PAGE_SIZE = 10` (`oldnext/src/app/(admin)/admin/subscriptions/[id]/page.tsx:25`).
- NEW: `getSubscriptionPayments` → `pageSize=25` default (`frontend/src/actions/admin/subscriptions.ts:59-61`, `lib/api/admin.ts:158`).
- Possibly intentional?: no (billing agent may also report it).

### D24. Git deploy pages and nav item removed — INFO (intentional)
- OLD: `/admin/git`, `/admin/taxonomies/git`, the Git button on the pro-taxonomies page, and the "Git" nav item (`helpers.ts`, `app-sidebar.tsx`).
- NEW: removed. Writes go straight to the DB.
- This is intentional per the "taxonomies served live from Django" rule. The only capability lost with it that is still needed is the parent move (D7). Revert/undo of taxonomy changes no longer exists.

---

## 4. Confirmed same
- Role/permission matrix (`ROLE_PERMISSIONS`, `canAssignRole`) is identical. The per-endpoint levels match old (view/edit/full per action).
- User list filters (type/provider/step/status/role), search operators, and default limit/offset/sort (`createdAt desc`) match. The sortable keys the table uses (name/type/role/createdAt/updatedAt) are supported.
- User stats buckets (active = !banned & !blocked & emailVerified & confirmed; byStep/byProvider/byType). The `byType.simple` → `byType.user` key rename is handled in the dashboard and analytics components.
- Pro DASHBOARD auto-correct to ONBOARDING (image + category + subcategory) in status and journey-step updates.
- removeUser: Verification cleanup + Brevo contact delete, `full` gate.
- setUserRole / assignAdminRole role-hierarchy checks; self-demotion guards.
- Profile settings (published/featured/verified/top/isActive). toggleVerified syncs the verification record (APPROVED/PENDING). The profile-scoped verification upsert matches.
- Profile stats (professional/company by `profile.type`) and the Brevo bucket logic match old.
- Section writes: basic-info writes (tagline/bio + normalized, category/subcategory/speciality/skills; image/coverage ignored like old), coverage + coverageNormalized, portfolio sanitize → null when empty, and additional-info `experience` derivation all match.
- Verifications: list filters, approve/reject/pending → `profile.verified` sync, delete → `verified=false`, stats. No user emails in either old or new.
- Reviews: status transitions incl. pending, `published` synced with `approved`, rating recalculation only when crossing `approved`, email to the **profile owner** only on a change into `approved`, delete recalculation only if approved & published, visibility toggle, stats, list filters/search.
- Services: list search (normalized title/description, profile name/username, numeric id), all filters, `full` gate on delete, toggle published/featured, status hooks for reject/inactive/draft (Brevo) and draft→pending, create-for-profile (pending status, freelancer/company guard, owner email + first-service Brevo), stats incl. approved/inactive/serviceTypes/pricing/topTag.
- Subscriptions: list search/filters/default sort (`lastPaymentAt desc`, limit 12), status → promoted `featured` sync (active→true, canceled→false + canceledAt), delete → unfeature, manual promoted subscription (pro guard, already-active guard, Greek errors, period start/now, clear cancel flags, `featured=true`), stats.
- Taxonomy submissions: list (label search, `items` key, categoryLabel, submitterProfile), approve (numeric id incl. approved-assigned ids, unique slug, `array_replace`), reject (optional reason, `array_remove`), bulk counts and messages.
- Chats: stats (non-deleted messages), list search over member names, `sort` values, messageCount on non-deleted messages, cid-or-id lookup, deleted messages included in the admin message list.
- API keys: SETTINGS gates (incl. old's quirk of `view` for delete), expiry in days (default 365).
- `revalidate-caches.ts`, `revalidate-taxonomies.ts`, `action-wrappers.ts`, `skills.ts`, `tags.ts` and `index.ts` are byte-identical.

## 5. Open questions / couldn't verify
- I did not run the app. D1, D2, D3, D5 and D14 come from tracing code, not from observing the UI. D1 (TypeError on `user.id.slice`) and D5 (all type options disabled) are deterministic from the code paths cited.
- Whether `send_service_published_email` / `send_review_approved_email` render the same template as old (reviewerName is no longer passed) → emails domain.
- Whether the `brevo_state_change` / `brevo_first_service` tasks reproduce `handleUserStateChange` / `handleFirstServiceCreated` exactly → emails/marketing domain.
- `update_taxonomy_item` stores pro-subcategory `type` only inside `raw`. I could not confirm the maps builder reads it from there (taxonomy domain).
- `AdminRevalidateTaxonomyCachesView` and `RevalidateAllCachesView` purge only a few Django keys and rely on TTLs (intentional caching architecture). I did not check the TTLs.
- The old `getUser` returned the Better-Auth `sessions`. In the JWT world the new `Session` table is likely empty, so even after the D1 fix, "Active Sessions" will show 0. Showing real `OutstandingToken`s would be a design decision.
