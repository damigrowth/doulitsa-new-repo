# PASS 4: adversarial verification, ADMIN + MESSAGING cluster (2026-11-05)

Scope: I re-derived every numbered finding in admin.md, pass3-admin.md, messaging.md and pass3-messaging.md from the code, on both the old side (`oldnext/`) and the new side (`frontend/` + `backend/`). I also covered these items from the pass-2 reports:
- pass2-authz-security D1, D3 and D7
- pass2-payload-contracts D1 and D2
- pass2-state-machines D4 and C1
- pass2-copy-sweep D3 and D4

Finally, I checked every correction that touches these reports: pass3-messaging C1/C2, pass3-admin §4, pass2-authz §5, pass2-schema-db C2 and pass3-blog C1.

No code was changed and no git commands were run. This file is my only write.

Verdict legend:
- **CONFIRMED**: re-derived, with both sides cited.
- **ADJUSTED**: the core is real, but the mechanism, scope or severity was stated wrongly.
- **REFUTED**: proven not to happen.
- **UNVERIFIABLE**: cannot be settled from the repo; the live check is named.

---

## 0. Canonical root-cause groups (for fix planning)

| Canonical id | Root cause | Members |
|---|---|---|
| **AM-PAYLOAD** | The admin UI was copied verbatim from OLD, which received full Prisma objects (`include:`). The Django endpoints return hand-built dicts that lack, or nest, the keys the copied UI reads. | admin D1, D2 (read side), D3 (read side), D5, D8, D9, D14, D15, D16; pass3-admin D8; pass2-payload D1 (empty search used as "list all") |
| **AM-WIPE** | Read-modify-write: a form opens from a payload that lacks the field, and the save then writes the form's empty or default value over real data. The inverse, where the backend skips `None` so the form cannot clear a field, is in the same family. | admin D2 (addons/faq/description), admin D3 (additional info); inverse admin D10 (presentation can't clear); write-format sibling pass3-admin D1 (billing `null` poisons the form); admin D12 (avatar clear only half-applied) |
| **AM-MSG** | The new admin and messaging actions return `{success, data}` / `{success, error}` (the `wrap()` helpers), while the unchanged OLD components read `result.message`, or only catch thrown errors. | admin D12 (no toast), pass3-admin D4 (blank toast), pass3-admin D8c (fallback toast), pass3-messaging P3-D4 (no reaction-failure toast) |
| **AM-JWT** | The better-auth session concepts (session rows, session id, session cookie) were mapped to SimpleJWT without keeping their semantics. | admin D4 (revoke = no-op), pass2-authz D3 (support "revoke admin sessions" is also a no-op), pass2-payload D2 (session.id = rotating `jti`), pass3-messaging P3-D2 (ws-token never refreshes), admin D21 (impersonate token unused) |
| **AM-PURGE** | Cache purge gaps on admin writes. | admin D13; NEW-1 below (revalidate fired *before* the write) |
| **MSG-NAME** | Where the chat display name and avatar come from. | messaging D6, D7; pass2-state-machines D4 + C1; pass3-messaging C1-confirm. Settled in §2. |
| **MSG-OPTIMISTIC** | The optimistic bubble and read ticks are new client state with no failure UI. | pass3-messaging P3-D1, P3-D3; messaging D5 |

---

## 1. Verdict table

### admin.md

| # | Verdict | Evidence (OLD / NEW) | Note |
|---|---|---|---|
| D1 user detail crash | **CONFIRMED** (CRITICAL) | OLD `oldnext/src/actions/admin/users.ts:50-90` returns the user object with `profile{_count}`, `accounts` and `sessions`. NEW `backend/apps/accounts/views/admin/users.py:99-103` returns `{user,accounts,sessions}`, and `AdminUserSerializer` (`serializers/admin_users.py:46-73`) has no `profile`. `frontend/src/actions/admin/users.ts:21-27` passes it through, and `client.ts:412-424` returns the body as-is. The page does `user = data` (`users/[id]/page.tsx:46`), then `user.id.slice(0, 12)` (`:99`), which throws a TypeError. | The selector docstring promises "with profile", but `get_user_with_relations` (`selectors/admin_users.py:98-112`) never loads it. AM-PAYLOAD. |
| D2 service addons/faq/description | **ADJUSTED**: still CRITICAL, wipe mechanism corrected | OLD `services.ts:337-375` uses `include`, so every scalar is returned. NEW `_admin_row` (`admin_services.py:99-127`) and `get_service_detail` (`:130-146`) have no `description`, `addons` or `faq`. The forms open with `addons: service.addons \|\| []` (`edit-service-addons-form.tsx:38`) and `faq: … \|\| []` (`edit-service-faq-form.tsx:37`). | Both Save buttons need `isDirty` (`addons-form:83`, `faq-form:82`), so an admin cannot "save the empty form". The loss happens when the admin adds or edits **one** item: the list submitted is just that item, and `update_service_fields` replaces the whole column (`admin_services.py:166-175`). Every existing addon or FAQ is silently replaced. Basic: `editServiceBasicSchema` requires ≥80 chars of description (`lib/validations/service.ts:1668-1672`), so a title-only edit is blocked until the admin retypes the description. The counts are wrong too (`services/[id]/page.tsx:322,338,346`). AM-PAYLOAD + AM-WIPE. |
| D3 profile additional-info wipe | **CONFIRMED** (CRITICAL) | OLD `profiles.ts:184-230` returns the full profile. NEW `get_profile_detail` (`admin_profiles.py:115-162`) has no commencement/contactMethods/paymentMethods/settlementMethods/budget/terms. The form resets from those keys (`form-additional-info.tsx:107-116`), and every schema field is optional (`validations/profile.ts:488-497`), so editing only "rate" is valid and dirty. `admin_update_additional_info` writes all seven fields (`admin_profiles.py:208-235`). | AM-PAYLOAD + AM-WIPE. |
| D4 revoke-all no-op | **CONFIRMED** (CRITICAL) | OLD `users.ts:524-551` calls `auth.api.revokeUserSessions`. NEW `revoke_all_user_sessions` deletes `Session` rows only (`services/admin_users.py:378-380`), and the view calls only that (`views/admin/users.py:179`). `revoke_all_for_user` (`services/sessions.py:55+`) exists but is called only from the public account view (`views/public/account.py:225`) and from delete-account (`services/account.py:166`). Refresh lifetime is 14 days (`settings/base.py:281`) with rotation (`:282`). | AM-JWT. `revoke_session` (`:373`) and `stop_impersonating` (`:405`) are equally inert. |
| D5 create-service wizard blocked | **CONFIRMED** (HIGH) | OLD `profiles.ts:773-782` selects `coverage`. NEW `search_profiles_for_selection` returns `_admin_profile_row` (`admin_profiles.py:316-333`) without coverage. The form computes `disabledOptions` from `selectedProfile.coverage` (`admin-create-service-form.tsx:211-222`), and `presence-online-step.tsx:77,139` blocks clicks on disabled options. Validity needs `presence\|\|online` (`:236`). | AM-PAYLOAD. |
| D6 duplicate "published" email | **CONFIRMED** (HIGH) | OLD `updateService` emails only when `status==='published' && existing!=='published'` (`services.ts:478-490`). NEW `AdminServiceSettingsView.patch` always calls `update_status` (`views/admin/service.py:96-99`), and `_notify_status_change` emails on any `new==PUBLISHED` (`admin_services.py:237-239`). The settings form always posts `status` (`edit-service-settings-form.tsx:83-90`). | The separate status action (`updateServiceStatus`) re-emailed published→published in OLD too (`services.ts:~1267`), so only the Settings path regresses. |
| D7 taxonomy re-parent ignored | **ADJUSTED** (HIGH): service taxonomy only | OLD `edit-taxonomy-item-form.tsx:123,141` sends `newParentId`; publish runs `moveAndUpdateItem` + `syncServicesAfterMove` (`taxonomy-publish.ts:166-250, 375, 542`). NEW `updateServiceTaxonomy` drops `parentId` (`actions/admin/taxonomies.ts:48-73`), `updateItem` doesn't forward it (`taxonomies-shared.ts:134-143`), and `update_taxonomy_item` never touches `parent_id` (`dataset_ops.py:237-267`). | The **pro** taxonomy edit form had no move in OLD either (no `newParentId` in `edit-pro-taxonomy-form.tsx`), so the "/pro" part of the title is wrong. |
| D8 taxonomyLabels dropped | **CONFIRMED** (MEDIUM) | OLD `profiles.ts:154`, `services.ts:277-298`. NEW: `_admin_profile_row` and `_admin_row` have no such key, and nothing in backend `apps/` or the frontend actions adds it. Tables: `admin-profiles-data-table.tsx:126-131`, `admin-services-data-table.tsx:147-153`. | AM-PAYLOAD. |
| D9 profile detail counts/user | **CONFIRMED** (MEDIUM) | `get_profile_detail` loads without annotation (`admin_profiles.py:116-121`), so `_count` is `{0,0}` (`:108-111`). The page reads `profile._count?.services` (`profiles/[id]/page.tsx:218`). `user` has 6 keys (`:90-93`); the page reads `user.banned/step/username/image/createdAt` (`:51-64`). OLD `user:true` + `_count` (`profiles.ts:191,220-224`). | AM-PAYLOAD. |
| D10 presentation can't clear | **CONFIRMED** (MEDIUM) | OLD writes `value \|\| null`, `visibility \|\| {email:true}`, `socials \|\| DbNull` (`admin/profiles/presentation.ts:106-118`). The NEW action maps blanks to `null` (`frontend/src/actions/admin/profiles/presentation.ts:22-27`). The serializer allows null (`serializers/profile_updates.py:220-225`). Then `update_profile` skips `None` (`admin_profiles.py:270-272`). | AM-WIPE (inverse). |
| D11 ban expiry stored, never enforced | **CONFIRMED** (LOW, possibly intentional) | The OLD form posts only `banExpires` (`edit-user-ban-form.tsx:96-100`), and the OLD action ignores it in favour of `isPermanent`/`banDuration` (`users.ts:1240-1255`), so it always stored null. NEW forwards it (`actions/admin/users.ts:277-285`). `ban_expires` is never read for enforcement (grep: only the model, selectors and admin services); `is_active` checks `banned` only (`models/user.py:144-146`). | — |
| D12 updateAccountAdmin | **ADJUSTED** (MEDIUM) | No toast: **confirmed**. NEW returns `{success,data}` (`actions/admin/users.ts:297-311`), and `form-account.tsx:119-127` requires `state.message`. | The avatar claim was wrong about OLD. The form uses `populateFormData(... jsonFields:['image'], skipEmpty:true)` (`form-account.tsx:159-163`, `lib/utils/form.ts:217-222`), so a removed (null) avatar is **not posted**. OLD then has `processedImage===undefined` (`users.ts:1324-1326`), which means OLD left **both** User.image and Profile.image untouched. NEW always sends `image: null` (`actions/admin/users.ts:300`). Django treats the key as present and clears `User.image` (`views/admin/users.py:370-375`), but `sync_account_to_profile(image=None)` leaves `Profile.image` (`profile_updates.py:68-70`). Net NEW defect: removing an avatar clears it on the User but not on the Profile, so the two diverge. OLD ignored the removal entirely. Validation 1–100 → 5–50 (`serializers/auth.py:71`) is confirmed. AM-MSG. |
| D13 submission purge no-op | **CONFIRMED** (MEDIUM) | `_revalidate_caches` calls `cache.delete_many(["prefix*",…])` (`admin_submissions.py:284-301`), which deletes literal keys. The sibling view says exactly this (`views/admin/dataset.py:138-140`). The frontend approve/reject call no revalidation (`actions/admin/taxonomy-submission.ts:37-58`, and the data table has none). `service:page:*` isn't even in the prefix list. OLD `taxonomy-submission.ts:327-341,399-408`. | AM-PURGE. |
| D14 chat messages author/sort | **CONFIRMED** (MEDIUM) | NEW table renders `message.authorId` (`admin-chat-messages-data-table.tsx:27,35`), while `_msg` ships `author{displayName,username,image}` (`views/admin/chats.py:212-224`). The view hard-codes `order_by("-created_at")` (`:180`). OLD `admin-chat-messages-data-table.tsx:41-56`, `chats.ts:449-454`. | AM-PAYLOAD (here the component, not the payload, regressed). |
| D15 chat detail stats / 404 | **CONFIRMED** (LOW) | NEW `admin-chat-detail-stats.tsx:67-80` shows email and no `image`. OLD `:84-97` shows the avatar and `@username`. `_member` has `username`/`image` (`chats.py:249-266`). The 404: OLD `getAdminChatById` returns the Prisma row or null (`chats.ts:230-280`). NEW `wrap()` always returns an object (`actions/admin/chats.ts:28-46`), so `if (!chat) notFound()` (`chats/[cid]/page.tsx:40-44`) never fires. | — |
| D16 review author from Profile | **CONFIRMED** (LOW/MEDIUM) | NEW `_admin_card` takes displayName/image from `author.profile` (`review_reads.py:315-337`). OLD takes them from the User row (`reviews.ts:80-87`). Consumers: `admin-reviews-data-table.tsx:223-232`, `reviews/[id]/page.tsx:200,284`. | AM-PAYLOAD. |
| D17 duplicate slug → 409 | **CONFIRMED** (LOW) | OLD `taxonomies-shared.ts:281` calls `generateUniqueSlug(...)`. NEW `dataset_ops.py:100-101,140-141,244-245` raises a 409. The NEW frontend `updateItem` passes the slug straight through (`taxonomies-shared.ts:128-145`). | The admin only sees the generic toast `'Failed to save changes — please try again'` (edit forms), not the reason. |
| D18 team details | **CONFIRMED** (LOW) | `assign_admin_role` sets step only for admin-like roles (`admin_users.py:430-435`), while OLD sets `step:'DASHBOARD'` for every role it accepts, and it accepts all six (`users.ts:1522-1571`). The pro-without-profile fallback is `freelancer` in NEW (`:449-455`) vs `user` in OLD (`:1641-1654`). Search: NEW orders by `email` and returns `[]` for <2 chars (`selectors/admin_users.py:168-177`); OLD orders by `createdAt desc` and returns an error (`users.ts:1703-1742`). The "Blocked" badge was removed (OLD `team-cards-client.tsx:79-81`; the serializer has no `blocked`, `serializers/admin_users.py:166-173`). | — |
| D19 profile list/search/delete | **CONFIRMED** (LOW) | NEW list search has no `email__icontains` (`admin_profiles.py:26-31`); OLD has it (`profiles.ts:60-67`). `delete_profile` does no Brevo sync and returns ids (`:309-313`, view `views/admin/profiles.py:100-105`). The generic PATCH passes camelCase keys to `update_profile`, whose `hasattr` drops them (`views/admin/profiles.py:96-97`, `admin_profiles.py:273`). | — |
| D20 Greek success texts | **CONFIRMED** (LOW) | NEW `frontend/src/actions/admin/profiles/*.ts` vs OLD `oldnext/src/actions/admin/profiles/*.ts`: the strings are exactly as tabulated. Username-taken: `admin_users.py:204` vs `users.ts:674`. | — |
| D21 user validation/side effects | **CONFIRMED** (LOW, no UI callers) | Spot-checked: `update_user_status` syncs Brevo only when `sync_reason` is set (type/blocked/step) (`admin_users.py:242-270`), while OLD syncs unconditionally (`users.ts:760`). `impersonate_user` creates a Session row that nothing consumes (`:384-404`). | AM-JWT (impersonate). |
| D22 empty price → 0 | **REFUTED** (unreachable) | The pricing form always posts `allValues.price.toString()` and `duration.toString()` (`edit-service-pricing-form.tsx:80-86`), so `price` is never `''`: `"0"` is truthy in OLD too, and both apps produce 0. A null price would throw in `.toString()` in both apps (the form files are identical). | Only a hand-crafted POST shows the difference. |
| D23 payments page size 10→25 | **CONFIRMED** (LOW) | OLD `subscriptions/[id]/page.tsx:25` uses `HISTORY_PAGE_SIZE=10`. NEW `lib/api/admin.ts:158` defaults `pageSize=25`, and the page passes no size (`subscriptions/[id]/page.tsx:152`). | UI paging, not payment behaviour, so the Addendum doesn't excuse it. |
| D24 Git pages removed | **CONFIRMED** (INFO, intentional) | — | The only capability lost is the parent move (D7). |

### pass3-admin.md

| # | Verdict | Evidence | Note |
|---|---|---|---|
| D1 admin billing writes `null` | **CONFIRMED** (MEDIUM) | NEW action `|| null` (`frontend/src/actions/admin/profiles/billing.ts:18-26`). The view stores the values verbatim (`views/admin/profiles.py:309-315`), and `update_profile` stores the dict because the dict itself is not None. Owner path coerces to `''` (`profile_updates.py:321-331`). OLD admin uses `''` (`admin/profiles/billing.ts:97-105`). `parseJSONValue` returns objects as-is (`lib/utils/form.ts:164-173`), and `billingSchema` uses `z.string().optional()`, which rejects null (`validations/profile.ts:364-372`), so the button stays disabled (`form-billing.tsx:446`). | AM-WIPE (write-format sibling). |
| D2 chat list sort precedence | **CONFIRMED** (LOW/MEDIUM) | NEW `views/admin/chats.py:57-65` checks `sort` first. OLD `chats.ts:132-165` gives table sort precedence. Both params can be present in the URL (`admin-chats-filters.tsx:28`, `admin-data-table.tsx:61-62`, `admin-chats-table-section.tsx:25-27`). | — |
| D3 "today" in UTC | **CONFIRMED** (LOW) | NEW `chats.py:23, 145` uses `datetime.now(timezone.utc).replace(hour=0…)`. OLD forced `process.env.TZ='Europe/Athens'` (`src/instrumentation.ts:25,32`). Django has `TIME_ZONE=Europe/Athens` (`base.py:52`), but this code bypasses it. | — |
| D4 review visibility blank toast | **CONFIRMED** (LOW) | OLD returns a `message` (`reviews.ts:431-437`). NEW `wrap` (`actions/admin/reviews.ts:11-14,44-47`) has none. Component: `admin-review-actions.tsx:114`. | AM-MSG. This is the **only** admin component that toasts `result.message` (grep), so the family is small. |
| D5 delete refused while referenced | **CONFIRMED** (LOW, probably intentional) | NEW `dataset_ops.py:159-201` returns 409 Greek. OLD `taxonomies-shared.ts:311-350` deletes recursively. | Product decision. |
| D6 no self-delete guard | **CONFIRMED** on the NEW side; OLD side **UNVERIFIABLE** | NEW `remove_user` has no guard (`admin_users.py:361-367`), and the view doesn't add one (`views/admin/users.py:116-121`). OLD calls `auth.api.removeUser` (`users.ts:400`), with better-auth `>=1.4.19 <1.5.0` (`package.json:106`) and no node_modules. | Live check: on old prod, try deleting your own admin account from `/admin/users/<ownId>` (expect `YOU_CANNOT_REMOVE_YOURSELF`), or read the better-auth 1.4 `admin` plugin `removeUser` source. |
| D7 API keys span all users | **CONFIRMED** (LOW) | NEW `list_api_keys` uses `ApiKey.objects.all()` filtered only by purpose (`services/api_keys.py:84-95`); update/delete have no `user=` filter (`:98-122`). OLD better-auth calls are user-scoped (`api-keys.ts:130-210`). | — |
| D8 list display fallbacks | **CONFIRMED** (LOW) | Verifications avatar `image` prop dropped (`admin-verifications-data-table.tsx:172`, and `_verification_row.profile` has no image, `admin_profiles.py:466-477`). Service "by" fallback: `_admin_row.profile` has no `user` (`admin_services.py:121-125`). Create toast: `admin-create-service-form.tsx:435`. | AM-PAYLOAD + AM-MSG. |
| §4 corrections | **CONFIRMED** | Articles coverage gap: accepted. API-key DELETE needs SETTINGS **edit** (`views/admin/api_keys.py:76-95`: class `_EDIT` is checked in `initial()` before `delete()` swaps). The state-machines D6 extension to the Settings form is confirmed (OLD `updateService`, `services.ts:400-560`, has no `handleUserStateChange`; NEW `views/admin/service.py:96-99` → `_notify_status_change:249-254`). Users-list `type=simple`: OLD `users.ts:139-141` passes it raw to Prisma (the enum is `user\|pro`, `user.prisma:191-194`), while NEW maps it (`selectors/admin_users.py:70`). That is an OLD bug fixed, not a regression. | — |

### messaging.md

| # | Verdict | Evidence | Note |
|---|---|---|---|
| D1 open-chat badge never clears | **CONFIRMED** on the NEW side; the OLD-side recovery is partly **UNVERIFIABLE** | NEW `use-chat-list-subscription.ts:50-55` handles only presence/message/message_edited/message_deleted. `mark_messages_read` broadcasts `chat.read` (`chat_ops.py:418`), and the PresenceConsumer forwards it as `read` (`consumers.py:289-290`), but nothing listens. OLD subscribes to `chats` and `chat_members` changes (`realtime.ts:185-216`). `updatePresence` → `chatMember.updateMany` runs on mount and on a 30s heartbeat (`presence.ts:14`, `use-presence.ts` heartbeat). | OLD's ~30s self-heal depends on Supabase delivering `chat_members` UPDATE events under the anon-key + RLS setup. Live check: on doulitsa.gr, open a chat that has unread messages and watch whether its sidebar badge clears within ~30–60s without a reload. The NEW fix (`read: trigger`) is needed either way. |
| D2 chat page guards | **CONFIRMED** (MEDIUM) | OLD non-member → `redirect` (`[chatId]/page.tsx:57-69`); 0 non-deleted messages → `redirect` (`:71-82`). NEW `get_chat` returns None for non-members (`chat_ops.py:178-179`), which leads to `notFound()` (`page.tsx:44-46`). There is no empty check, and `selectedChat` (`:52`) is never used. | — |
| D3 digest subject/preview order | **ADJUSTED** (MEDIUM) | Subject: OLD `email-config.ts:241-244` vs NEW `emails.py:360,391`. **Confirmed.** Preview order: OLD loads `orderBy createdAt desc` (`route.ts:78`) and then `slice(0,15).reverse()` (`unread-messages.ts:61`), giving the 15 newest. NEW `reversed(desc)` (`tasks.py:87-94`) and then `[:15]` (`emails.py:363`) gives the 15 oldest. **Confirmed.** | The "Brevo attributes USER_NAME/UNREAD_COUNT" sub-claim is **REFUTED**, per pass3-blog C1: `triggerWorkflow`'s subject/message branch never forwards `attributes` (`brevo/workflows.ts:33-62`). |
| D4 old burns / new retries | **CONFIRMED** (LOW, intentional) | OLD `message-emails.ts:77-83` swallows errors, and `route.ts:114-123` writes the batch regardless. NEW `tasks.py:98-111` writes it only on success. | — |
| D5 read ticks added | **CONFIRMED** (LOW) | NEW `chat-messages.tsx:11,284-291`; OLD has none (grep). | MSG-OPTIMISTIC. |
| D6 name/avatar from Profile | **ADJUSTED**: superseded by the §2 settlement | List **name** is NOT Profile-first: the keying bug at `chat_ops.py:92` vs `:102`. List **avatar** and the **header** name/avatar are Profile-first (`:118`, `:214-220`). | The header points (Χρήστης instead of 'Unknown User', "First Last") are confirmed: the backend always fills `displayName` (`:214-219`), and `chat-header.tsx:28`'s 'Unknown User' is now unreachable. |
| D7 header type from Profile | **CONFIRMED** (LOW, deliberate QA fix) | OLD `[chatId]/page.tsx:112,133` uses `user.type`. NEW `page.tsx:83` derives `type` from `username`. | Also exposed by pass2-state-machines D3 (stub profiles → link to an unpublished 404). |
| D8 presence semantics | **CONFIRMED** (LOW, invisible) | NEW `use-presence.ts`: only a WS listener; `chatId` is ignored. `online` is rendered nowhere except the internal header-presence state. | — |
| D9 contact form | **ADJUSTED** (LOW) | Success text (`frontend/src/actions/messages/contact.ts:20` vs OLD `contact.ts:107-108`), the English captcha error (`support.py`, ContactView) and the generic error are **confirmed** visible differences. | The validation-limit difference (2-255 / 10-20000) is **unreachable from the UI**: `form-contact.tsx:66` runs `zodResolver(contactSchema)` with the OLD limits 2-50 / 10-500 (`lib/validations/contact.ts:6-14`) before submit. It only matters for direct API calls. |
| D10 delete/reactions/blocking edges | **CONFIRMED**, with one sub-bullet **UNVERIFIABLE** | `{}` vs null and the silent 204 on unblock: `chat_ops.py:576-577`. | "Block a nonexistent id creates a row": `update_or_create` (`chat_ops.py:570`) with `db_constraint=False` in the model (`models/chat.py:86,90`). The outcome depends on whether Prisma's `blocked_users_blockedId_fkey` survived the restore: if it did, the result is a **500** (pass2-schema-db C2); if not, a stored row. Live check: `\d blocked_users` on prod/test. |
| D11 bare `int()` → 500 | **CONFIRMED** (LOW) | `views/public/chats.py:90,171`; `qs[:limit]` (`chat_ops.py:317`). A negative slice raises an AssertionError, and the custom handler only maps DRF exceptions, so the result is a 500. | — |
| D12 dashboard card avatar | **CONFIRMED** (LOW) | NEW `dashboard-content.tsx:217-226` vs OLD `:217-219`. | The new `'Άγνωστος χρήστης'` fallback at `:231` belongs to the pass2-state-machines D4 family. |
| D13 getChats swallows errors | **CONFIRMED** (LOW) | NEW `actions/messages/chats.ts:103-108` returns `[]`. OLD throws. `getChat` is called twice (`page.tsx:36,57`). | — |

### pass3-messaging.md

| # | Verdict | Evidence | Note |
|---|---|---|---|
| P3-D1 optimistic failure invisible | **CONFIRMED** (MEDIUM) | OLD: separate `useState` per hook instance (`use-message-optimistic.ts:27`), used by two callers (`message-input.tsx:59`, `messages-container.tsx:46`), so the container list is always `[]`. NEW: a module zustand store (`use-message-optimistic.ts:34-56`). On error it is only patched to `error:true` (`:119`). `chat-messages.tsx` never reads `error`/`sending` (grep). The `sendMessage` action rethrows (`actions/messages/messages.ts:65-72`). The store is never cleared. | MSG-OPTIMISTIC. Side fact: OLD had no other path to show your own sent message (no `revalidatePath` in OLD `sendMessage`, `messages.ts:88-156`), so OLD **must** have received `messages` INSERT realtime events in prod. Otherwise senders would never have seen their own messages. This partly answers pass3-messaging Open Q1: realtime did fire, at least for `messages`. |
| P3-D2 WS reconnect after 15 min | **CONFIRMED** (LOW) | The `ws-token` route only reads the cookie (`app/api/auth/ws-token/route.ts:13-19`). The middleware matcher excludes `/api` (`middleware.ts:21`). `ACCESS_MAX_AGE=15*60` (`lib/auth/cookies.ts:37`). Client token cache is 60s, with backoff to 30s (`channels-ws.ts:20-21,33-50`). Recovery via the 60s `useUnreadCount` poll, which still runs on messages pages; only the badge is hidden (`use-unread-count.ts`). | AM-JWT. |
| P3-D3 ticks wrong on reload | **CONFIRMED** (LOW) | `actions/messages/messages.ts:48` uses `isRead: isOwn \|\| …`, rendered at `chat-messages.tsx:286-289`. | MSG-OPTIMISTIC. |
| P3-D4 reaction failure no toast | **CONFIRMED** (LOW) | OLD throws (`reactions.ts:74-77`). NEW catches and returns `{success:false}` (`frontend/src/actions/messages/reactions.ts:9-19`). The component only catches throws (`chat-messages.tsx:82-89`). | AM-MSG. |
| C1 (optimistic "same or better" wrong) | **CONFIRMED** | See P3-D1. | — |
| C2 (OLD realtime used the anon key) | **CONFIRMED** | `client-rls.ts` `generateCustomJwt()` returns `NEXT_PUBLIC_SUPABASE_ANON_KEY` ("temporary implementation"). | So pass2-authz D7's OLD description is wrong; see below. |

### pass-2 items in this cluster

| # | Verdict | Evidence | Note |
|---|---|---|---|
| pass2-authz D1 API keys = global bearer creds | **CONFIRMED** (HIGH) | `ApiKeyAuthentication` is in `DEFAULT_AUTHENTICATION_CLASSES` (`settings/base.py:221-229`). Its behaviour (`common/authentication.py:50-98`): the env key maps to the oldest admin; a DB key is matched by a plaintext `get(key=…)`; there is no owner `is_active`/banned check. `HasResourcePermission` checks only role (`permissions/admin.py:124-128`). Keys are stored raw (`services/api_keys.py:69-79`). `ValidateApiKeyView` is AllowAny (`views/admin/api_keys.py:41-51`). OLD: `apiKey()` plugin with no `enableSessionForAPIKeys`, and grep finds no `x-api-key` (`lib/auth/config.ts:480-500`). | Extra detail not reported before: the key prefix changed `doulitsa_admin_` → `sk_` (`config.ts:481` vs `api_keys.py:51`), and OLD's per-key rate limit (1000/h, `config.ts:496-500`) is gone. |
| pass2-authz D3 support takes over admins | **CONFIRMED** on the NEW side; the OLD-side refusal is **UNVERIFIABLE** | NEW: role/ban/revoke/basic-info views are `_PERM_VIEW`, password is `_PERM_EDIT` (`views/admin/users.py:127-230`). There is no target-role check, and `_require_can_assign` checks only the new role (`admin_users.py:50-56`). Support has `users:'full'` (`lib/auth/roles.ts:123`). OLD better-auth roles (`lib/auth/permissions.ts`): `admin` and `support` both grant only `user:[create,read,update,delete,ban,unban]` and have no `session`. | Even the OLD **admin** role lacked `set-role`/`set-password`, so in OLD those actions worked only for `ADMIN_USER_IDS` members. Live check: the Vercel env `ADMIN_USER_IDS`. The "revoke an admin's sessions" leg is moot, because revoke is a no-op (admin D4). |
| pass2-authz D7 WS accepts banned users | **ADJUSTED**: hardening, not a regression | NEW `consumers.py:96-114, 205-230`: `User.objects.get` with no `is_active` check. **Confirmed.** | OLD was weaker: anon-key sockets, no session needed (pass3-messaging C2, verified). Downgrade to "hardening suggestion". |
| pass2-payload D1 author picker empty | **CONFIRMED** (HIGH) | NEW `articles/create/page.tsx:28` and `[id]/page.tsx:33` call `adminProfiles.search('')`, and `search_profiles_for_selection` returns `[]` for <2 chars (`admin_profiles.py:319-321`). LazyCombobox is local-only (`lazy-combobox.tsx:129-134, 305-343`). OLD: `findMany({where:{published:true}, orderBy displayName})` (`articles/create/page.tsx:16-26`). | AM-PAYLOAD. For editors (no PROFILES view) the call 403s and is caught as `[]`, which is the same result. |
| pass2-payload D2 no-service dialog reappears | **CONFIRMED** (LOW/MEDIUM) | `SessionView` returns `session.id = access jti` (`views/public/account.py:52-58`). With ACCESS 15 min + rotation (`base.py:280-283`), the key changes on every refresh, and the dialog keys `sessionStorage` on it (`no-service-dialog.tsx:25-39`). | AM-JWT. |
| pass2-state-machines D4 "Άγνωστος χρήστης" | **CONFIRMED** (LOW) | With no other member, `other={}` gives `name = chat.name` (`chat_ops.py:147`). `get_or_create_dm` never sets a name (`:276`), and the item falls back to `'Άγνωστος χρήστης'` (`chat-list-item.tsx:55`; also `dashboard-content.tsx:231`). OLD gives `'Χρήστης'` (`lib/utils/messages.ts:33-46`). | Avatar initials `''` (`chat-list-item.tsx:43`). |
| pass2-state-machines C1 (list keying) | **CONFIRMED** | `chat_ops.py:92` uses `setdefault(row["user_id"])`; `:102` reads `get(row["chat_id"])`. | Settled in §2. |
| pass2-copy-sweep D3 notifications real data | **CONFIRMED** (INFO, intentional) | OLD mock (`notifications/page.tsx:20,91`); NEW `admin_api/views/admin/notifications.py:55,93`. | — |
| pass2-copy-sweep D4 taxonomy toasts | **CONFIRMED** (INFO) | `admin-taxonomy-submission-data-table.tsx:94` vs OLD `:108`; form toasts are as listed. | — |
| pass2-schema-db C2 (block nonexistent → 500) | **UNVERIFIABLE** | See messaging D10. Needs `\d blocked_users`. | — |
| pass3-blog C1 (no Brevo attributes) | **CONFIRMED** | `workflows.ts:33-62`. | It refutes the attributes leg of messaging D3. |

---

## 2. Contradiction chain settled: chat display name and avatar (MSG-NAME)

There were three iterations: messaging D6 ("list + header prefer Profile"), then state-machines C1 ("list doesn't"), then pass3-messaging (confirms C1). This is the definitive code-derived behaviour, from `backend/apps/messaging/services/chat_ops.py` at HEAD.

**Chat LIST (`list_chats`), each sidebar row:**
- Profile fields are written under the key `row["user_id"]` (`:92-95`) and read back under `row["chat_id"]` (`:102`). A chat id never equals a user id, so `profileDisplayName` and the Profile `username` are **never applied**.
- **name** = `User.display_name` → `"first last"` → `User.name` (NEW-only step) → `'Χρήστης'` (`:110-116`). This equals OLD (`lib/utils/messages.ts:33-46`), except for the extra `User.name` step.
- **avatar** = `Profile.image` → `User.image` (`:118`; `profile_image_by_uid` is keyed correctly). This differs from OLD, which used `User.image` only.
- **username** = always `null` (`:119`).
- **No other member** (deleted account): `name = chats.name` (normally NULL, `:147`), so the UI shows `'Άγνωστος χρήστης'` with empty initials (`chat-list-item.tsx:43,55`). OLD showed `'Χρήστης'`.

**Chat HEADER (`get_chat` → `[chatId]/page.tsx:57-86`):**
- **name** = `Profile.display_name` → `User.display_name` → `"first last"` → `User.name` → `'Χρήστης'` (`:214-219`).
- **avatar** = `Profile.image` → `User.image` (`:220`).
- **username** = `Profile.username` (`:221`).
- `firstName`/`lastName`/`phone` are null (`page.tsx:70-77`). `chat-header.tsx:28`'s `'Unknown User'` fallback is unreachable.

**Net effect:** for a pro whose `Profile.display_name ≠ User.display_name`, the sidebar and the header show different names for the same person. OLD showed `User.displayName` in both.

**Parity fix (OLD is the source of truth):** drop the Profile promotion from both the list and the header (use User fields, including `User.image`), use the `'Χρήστης'` fallback when there is no other member, and keep the D7 `type` derivation as a conscious QA decision. If the team prefers Profile data, fix the keying at `:92` (`other_by_chat.setdefault(<chat_id>…)`) so the list and header at least agree. That is a product call, because it departs from OLD.

---

## 3. New findings surfaced while verifying (not in any earlier report)

### NEW-1. Admin user/team actions revalidate the public profile cache BEFORE the Django write (and even when it fails) — LOW (AM-PURGE)
- NEW `frontend/src/actions/admin/users.ts`: 12 of 13 `revalidatePublicProfile()` calls run before the `adminUsers.*` / `adminTeam.*` request inside the same `try` (`:59-60` setRole, `:68` ban, `:83` unban, `:102`, `:126`, `:143`, `:158`, `:169`, `:178`, `:187`, `:306-307` updateAccountAdmin, …). Only `removeUser` (`:92-93`) revalidates after the write.
- Effect: a public profile request that lands between the invalidation and the Django commit refills the 5-minute Data Cache with pre-write data. Example: a just-blocked or unconfirmed pro stays visible for up to 5 minutes. A failed write also purges for nothing.
- OLD revalidated after the Prisma write (e.g. `users.ts:1395-1404`).
- Fix: move each `revalidatePublicProfile()` after the awaited API call, and only on success.

### NEW-2. API key format and rate limit changed — LOW (extends pass2-authz D1)
- OLD better-auth `apiKey({defaultPrefix:'doulitsa_admin_', rateLimit:{1000/h}})` (`oldnext/src/lib/auth/config.ts:480-500`).
- NEW keys are `sk_` + token_urlsafe (`backend/apps/admin_api/services/api_keys.py:51,77`) and have no per-key rate limit.
- Any ops script that pattern-matched the old prefix will break.

### NEW-3. Taxonomy edit errors hide the server reason — LOW (extends admin D17 / pass3-admin D5)
- `edit-taxonomy-item-form.tsx` and `edit-pro-taxonomy-form.tsx` show the fixed `'Failed to save changes — please try again'` on `!result.success`.
- So the 409 `Slug already used` (D17) is invisible to the admin. The Greek "N καταχωρήσεις χρησιμοποιούν αυτή την κατηγορία" delete refusal (pass3-admin D5) is equally invisible wherever the caller shows its own text.

---

## 4. Summary of changes to severity and wording vs the input reports

- **REFUTED:**
  - admin D22: unreachable from the UI.
  - messaging D3, Brevo-attributes leg only.
- **ADJUSTED:**
  - admin D2: the wipe happens on the first add/edit, not on an "empty save"; still CRITICAL.
  - admin D7: service taxonomy only.
  - admin D12: OLD never cleared the avatar; NEW clears it on the User only.
  - messaging D3: subject and preview order stand.
  - messaging D6: superseded by §2.
  - messaging D9: the limit difference is API-only.
  - pass2-authz D7: hardening, not a regression.
- **UNVERIFIABLE legs**, with the live check for each:
  - pass3-admin D6, OLD self-delete guard: try it on old prod, or read the better-auth 1.4 source.
  - pass2-authz D3, OLD refusal: Vercel `ADMIN_USER_IDS`.
  - messaging D1, OLD 30s self-heal: watch the badge on doulitsa.gr.
  - messaging D10 / schema-db C2, block of a nonexistent id: `\d blocked_users`.
- **Everything else CONFIRMED** as stated, with the citations above.
