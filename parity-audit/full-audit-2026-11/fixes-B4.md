# Fix batch B4: admin payload contracts and wipe bugs (2026-11-05)

Scope: admin payload contracts and the wipe bugs. Frozen areas were not touched: nothing under `apps/billing`, and no admin subscription endpoints or pages. Nothing was committed or pushed; all changes are in the working tree.

Verification run:
- Backend: `manage.py check` reports 0 issues. The backend was restarted, then checked with curl against `:8800` using admin JWTs minted with `issue_tokens`.
- Frontend: `corepack yarn tsc --noEmit` is clean and `corepack yarn lint` is clean.
- Live checks: SSR curls against `:3100` with the `dj_access` cookie, plus playwright journeys (scratchpad `e2e/b4_admin.js`, `e2e/b4_sel.js`).
- The frontend container was OOM-killed twice during the run and was restarted each time with `docker compose start frontend`.

## Results

| Item | Status | Change / evidence |
|---|---|---|
| **P0-3** user-detail contract | **FIXED** (backend follows OLD's flat shape) | `get_user_with_relations` now loads the profile with annotated `_count{services,reviews}`. `AdminUserDetailView.get` returns the **flat** user plus `profile{id,uid,username,displayName,image,…,_count}`, `accounts` and `sessions`. This is OLD's `include` shape. Live: `/admin/users/cmw3egauhcf13rh3oea3yolo` returns **200** (it was a 500 on `user.id.slice`). It renders `cmw3egauhcf1...`, the profile links, and Services = 2. |
| **P0-4** service detail + merge | **FIXED** | `get_service_detail` adds `description`, `addons`, `faq`, `pid`, `userId` (the media-form folder), `profile.image` + `profile.user{email,name,role,banned,blocked}`, `reviews` and `_count.reviews`. The forms now open with the real list, so adding or editing ONE item submits the whole list. Live E2E on service 1087 (addons set to 2 valid items): the browser "add extra service" + Save gave DB **[Alpha, Beta, Gamma]**, so nothing was dropped (it was 4 → 1 before). 1087 was then restored to its 4 seeded addons. Note: with 4 addons the admin form shows the "έως 3" error and can't save. That cap is the shared serializer/schema (P2-34, B2), not B4. |
| P1-9 / adm D6 (bonus, same file) | **FIXED** | `AdminServiceSettingsView` runs `update_status` (and its email/Brevo hooks) only when the posted status differs from the stored one. It returns 404 for an unknown id. |
| **P0-5** additional-info detail | **FIXED (payload)**; one residual wipe, **see BLOCKER-1** | `get_profile_detail` now returns `commencement`, `experience`, `contactMethods`, `paymentMethods`, `settlementMethods`, `budget`, `terms` (plus size, firstName/lastName, authorBio) and an annotated `_count`. The nested `user` gains `banned/step/username/displayName/image/type/emailVerified/createdAt/updatedAt` (this also covers adm D9). Live: an admin rate-only save keeps contact, payment and settlement methods and terms (before the fix all 6 were wiped). **But `commencement` and `budget` were still wiped**: see BLOCKER-1. Full-write semantics were kept, matching OLD. |
| **P0-6** revoke | **FIXED** (refresh tokens); access tokens live up to 15 min | `AdminRevokeAllSessionsView` now also calls `sessions.revoke_all_for_user` (refresh-token blacklist) and returns `{"revoked", "refreshTokensRevoked"}`. Live: minted a user token pair, refreshed once (rotated), then revoke-all gave `{"revoked":1,"refreshTokensRevoked":1}`. The rotated refresh then gets **`Token is blacklisted`**. The **access** token still works until its 15-min TTL, the same as the public "log out everywhere". Killing it at once needs a per-user "tokens valid after" check in `common/authentication.py` (B1 area, not touched). `revoke_session` and `stop_impersonating` were left as they are (legacy Session rows have no JWT mapping). |
| P1-11 author picker | **FIXED** | `search_profiles_for_selection(published_list=True)`, exposed as `GET /admin/profiles/search?searchQuery=&published=true`, returns every published profile ordered by displayName (OLD `findMany({where:{published:true}})`). An empty query without the flag still returns `[]`, so the ProfileSelector behaves as before. The articles create and edit pages call `adminProfiles.search('', {published:true})`. Live: the API returns 446 rows (DB published = 446), and `/admin/articles/create` renders the authors. |
| adm D5 coverage | **FIXED** | Selection rows now include `coverage`. Live: `/profiles/search/for-services?searchQuery=e2epro` returns the coverage object. |
| adm D8 category labels | **FIXED** | The frontend `listServices`/`listProfiles` attach `taxonomyLabels`, as OLD did (`resolveServiceHierarchy` / `resolveTaxonomyHierarchy(getProTaxonomies())`). Live: the SSR payload of `/admin/services` shows `{"category":"Εκδηλώσεις",…}` and `/admin/profiles` shows `{"category":"Μάρκετινγκ","subcategory":"Digital Marketer"}`. |
| adm D10 clearable contact fields | **FIXED** | New `admin_update_presentation` follows OLD's write-all rule (blank becomes null, visibility falls back to `{email:true}`, socials becomes null). The admin action always sends all 6 keys. Live: setting all six fields and then sending nulls clears all of them. The unused `_patch_profile_fields` was removed. |
| pass3-adm D1 billing `''` | **FIXED** | The action and the view both store `''` (OLD). On read, `_billing_for_form` turns legacy `null` text fields into `''` so already-poisoned rows unlock the form. Live: `billing` = `{afm:'',doy:'',…}`. |
| adm D12 account form | **FIXED** | `updateAccountAdmin` returns `message: 'Ο λογαριασμός ενημερώθηκε επιτυχώς!'`, which makes the form toast and refresh. It sends `image` only when posted, so a removed avatar is untouched (as in OLD). New admin-only `AdminUpdateAccountSerializer` uses OLD's limits (displayName 1–100, optional). An explicit `image:null` now clears **both** User.image and Profile.image, and displayName syncs to the Profile (plus normalized). Live: a 1-char name is accepted; image null clears both. Then restored. |
| adm D14 (+D15) chat author/sort | **FIXED** | The table renders `author.displayName \|\| 'Χρήστης'` with the avatar and `@username`. `_msg.author` gains `id`. The messages endpoint honours `sortBy=createdAt&sortOrder`. The detail stats card shows the avatar and `@username` instead of the email. Live: the chat page renders `@e2e-simple1` / `@e2epro1d`, and the asc sort returns messages oldest-first. |
| adm D16 review author | **ALREADY-FIXED by B2** | `_admin_card` in `review_reads.py` is now User-sourced (B2 diff). The admin consumers read `author.displayName \|\| author.name`, which already matches, so no separate admin-side change was needed. |
| pass3-adm D2 chat sort precedence | **FIXED** | `sortBy+sortOrder` wins over `sort` (OLD chats.ts:132-165). An unknown or `messageCount` sortBy falls back to lastActivity. Live: `sort=newest&sortBy=lastActivity&sortOrder=asc` returns lastActivity asc. |
| pass3-adm D3 Athens "today" | **FIXED** | `_athens_today_start()` (zoneinfo Europe/Athens) is used by both chat stats views. |
| NEW-1 purge order | **FIXED** | All 12 `revalidatePublicProfile()` calls in `actions/admin/users.ts` now run after a successful Django write (B3 also lists NEW-1; this file is admin-scoped, so it was done here once). |
| NEW-3 taxonomy toasts | **FIXED** | The 4 taxonomy create/edit forms toast `result.error` (the server 409 reason) and fall back to the old text. |
| P5-DU-1 chat 404 | **FIXED** | `if (!chat.success \|\| !chat.data) notFound()`. Live: `/admin/chats/nonexistent-zz` returns **404**. |
| N2 article cover removal | **FIXED** | `UpdateArticleSerializer` keeps an explicit null for `coverImage` / `excerpt` / `categorySlug` (OLD `\|\| null`). Live: cover set and then null leaves `coverImage: None`. |
| N5 duplicate slug 500 | **FIXED** | The admin article views catch a slug `IntegrityError` and return a 409 `slug_taken` "Το slug χρησιμοποιείται ήδη". Live: a duplicate on create and on update both give 409. Test articles were deleted. |

## BLOCKER-1 (NEW, HIGH, cross-batch: shared form component, B3 area)

`components/forms/profile/form-additional-info.tsx` loses `commencement` (YearSelect) and `budget` (Selectbox) on load:
- After `form.reset()`, both Radix `Select` triggers show the placeholder, and the hidden native selects hold `''`.
- The value is therefore never posted (the form uses `skipEmpty`), and the save writes them as null.
- This happens on the **owner dashboard too**: `/dashboard/profile/additional` as e2e-pro1 shows the placeholders while the DB has 2015 / '2'. So every owner or admin additional-info save wipes the "Έναρξη Δραστηριότητας" and "Ελάχιστος Προϋπολογισμός" values.
- The MultiSelect, Currency and textarea fields load correctly.
- The likely cause is the Radix Select controlled-value / BubbleSelect `onValueChange('')` race after reset.
- The OLD component is near-identical: OLD commencement used `setValue(...)` instead of `field.onChange`, and budget is the same as OLD. So parity is unverified; check it on doulitsa.gr.
- Repro: `scratchpad/e2e/b4_sel.js` (admin) and `b4_sel_pro.js /dashboard/profile/additional` (owner).

I did not change the shared component (out of scope), and I kept the admin backend on OLD's full-write semantics. If B3 cannot fix the component, the fallback is to make both additional-info writers skip absent keys. That would mean those two fields can no longer be cleared.

## SKIPPED / notes
- P2-34 (>3 addons can't be edited): the shared Update serializer (B2) and the admin schema max(3), which is also OLD's admin cap.
- Access-token immediate revocation: `common/authentication.py` belongs to B1.
- `revoke_session` / `stop_impersonating`: legacy Session rows; there is no JWT equivalent.

## Local DB state after the run
- Service 1087's addons are restored to the 4 seeded ones.
- Profile `cmw3erbd6yboz434kr9744u4`: additional fields, billing (null), displayName and image are restored to their pre-run values.
- The 2 test articles were deleted.
- The e2e-pro1 refresh tokens are blacklisted. Mint new ones if needed.

## Files touched (B4)
Backend:
- `apps/accounts/{selectors/admin_users.py, serializers/admin_users.py, views/admin/users.py}`
- `apps/profiles/{services/admin_profiles.py, views/admin/profiles.py}`
- `apps/services/{services/admin_services.py, views/admin/service.py}`
- `apps/messaging/views/admin/chats.py`
- `apps/blog/{serializers/article.py, views/admin/article.py}`

Frontend:
- `actions/admin/{users.ts, services.ts, profiles.ts, chats.ts, profiles/billing.ts, profiles/presentation.ts}`
- `app/(admin)/admin/{articles/create/page.tsx, articles/[id]/page.tsx, chats/[cid]/page.tsx}`
- `components/admin/{admin-chat-messages-data-table.tsx, admin-chat-detail-stats.tsx}`
- `components/admin/forms/{edit-taxonomy-item-form.tsx, edit-pro-taxonomy-form.tsx, create-pro-taxonomy-form.tsx, create-service-taxonomy-form.tsx}`
- `lib/api/admin.ts` (the search `published` option)
- `lib/types/admin.ts` (`AdminChatMessageRow.author`)
