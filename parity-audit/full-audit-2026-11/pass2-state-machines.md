# State machines & cross-entity cascades — PASS 2 parity audit — 2026-11-05

Scope: every lifecycle/state machine, written as OLD vs NEW transition tables.
DEDUPE: anything already in SUMMARY.md or the 11 pass-1 reports is marked
`known → <report> Dn` in the tables and is NOT repeated in §3. §3 holds only NEW
findings. Corrections to pass-1 are in §3b. No code was changed.

## 1. Coverage

OLD files read (source of truth, `oldnext/`):
- `src/lib/prisma/schema/{user,auth,chat,review,service,saved,subscription,email,media,blog,taxonomy-submission}.prisma`: every relation and `onDelete` rule
- `src/lib/prisma/schema/migrations/20250710191328_add_better_auth_models/migration.sql`: actual DB FK actions (`reviews_sid_fkey`, `chats_lastMessageId_fkey` = `ON DELETE SET NULL`)
- `src/lib/auth/config.ts`: Better Auth user hooks (create/update/deleteUser `beforeDelete`), journey-step transitions, Google `mapProfileToUser`
- `src/actions/auth/{delete-account,upgrade-to-pro,update-user-type,complete-onboarding,login,change-username,oauth-setup}.ts`
- `src/actions/admin/users.ts`: ban/unban/remove/status/block/confirm/journey-step/setRole/updateUserBasicInfo
- `src/actions/admin/services.ts`: togglePublished, updateServiceStatus, deleteService, createServiceForProfile
- `src/actions/admin/profiles.ts`: toggles, toggleVerified, deleteProfile, updateProfileSettingsAction
- `src/actions/admin/verifications.ts`, `src/actions/profiles/verification.ts`
- `src/actions/admin/subscriptions.ts`: updateSubscriptionStatus, deleteSubscription, manual create
- `src/actions/services/{delete-service,create-service,update-service,get-service}.ts`: status, plan gate, profile-published gate
- `src/actions/reviews/get-reviews.ts`: sid filters
- `src/actions/messages/chats.ts`, `src/lib/utils/messages.ts` (`transformChatForList`), `src/app/(dashboard)/dashboard/messages/[chatId]/page.tsx`, `src/components/messages/chat-list-item.tsx`
- `src/actions/profiles/{get-profile,get-profiles}.ts`, `src/actions/home/get-home-data.ts`, `src/app/(profile)/profile/{sitemap.ts,[username]/page.tsx}`: blocked/confirmed/published/isActive public filters
- `src/actions/saved/get-saved-items.ts`
- `src/lib/subscription/feature-gate.ts`, `src/lib/payment/service.ts`, `src/actions/subscription/create-checkout-session.ts`, `src/app/api/webhooks/worldline/{route.ts,advice/route.ts}`, `src/app/api/cron/worldline-renewals/route.ts` (state writes only)
- `src/lib/email/providers/brevo/{list-management.ts,workflows.ts}`: list rules
- `src/app/(dashboard)/dashboard/promote/page.tsx`: subscription UI gating

NEW files read:
- backend: `apps/accounts/{models/user.py, services/{account,admin_users,auth,google_oauth,oauth,registration,sessions}.py, views/public/{account,onboarding}.py}`; `apps/messaging/{models/chat.py, services/chat_ops.py, tasks.py, brevo.py}`; `apps/reviews/{models/review.py, signals.py, selectors/review_reads.py, services/review_ops.py}`; `apps/services/{models/service.py, signals.py, services/{service_writes,admin_services}.py, selectors/service_reads.py}`; `apps/profiles/{models/*, signals.py, services/{cache,profile_updates,verification,admin_profiles}.py, selectors/{profile_reads,profile_aggregations}.py, views/public/profile.py}`; `apps/saved/{models/*, selectors/saved_reads.py}`; `apps/billing/{services/{subscription_ops,advice}.py, selectors/subscription_selectors.py}`; `apps/core/views/public/{home,sitemaps}.py`; every `on_delete` in `apps/**/models`; `backend/README.md` (DB provenance)
- frontend: `src/actions/auth/server.ts` (`getSetupRedirect`), `src/app/(dashboard)/dashboard/messages/[chatId]/page.tsx`, `src/components/messages/chat-list-item.tsx`, `src/app/(dashboard)/dashboard/promote/page.tsx`, `src/actions/auth/change-username.ts`

Delegated elsewhere: none new. Pass-1 owners still hold their domains. Every cell below that cites "known" points to its owner.

## 2. Transition tables (OLD vs NEW)

Legend: **=** same · **known → X Dn** already reported · **NEW-Dn** new finding in §3.

### 2.1 User journey / step

| State × trigger | OLD → next + side effects | NEW | Verdict |
|---|---|---|---|
| (none) × email register user/pro | step EMAIL_VERIFICATION, confirmed=true, role from proRole | same | = |
| (none) × Google, with intent | OAUTH_SETUP, confirmed+emailVerified | same | = (role=user for pro → known → auth D3) |
| (none) × Google, no intent | TYPE_SELECTION | same | = |
| TYPE_SELECTION × updateUserType | → OAUTH_SETUP, type+role | same (own-account only) | known → auth D24 |
| OAUTH_SETUP × completeOAuth pro | → ONBOARDING, **no Profile row** | → ONBOARDING **+ creates an unpublished stub Profile** | **NEW-D3** |
| OAUTH_SETUP × completeOAuth user | → DASHBOARD, auto-username | same | = |
| EMAIL_VERIFICATION × verify link | → DASHBOARD (user) / ONBOARDING (pro), auto sign-in | step same; no sign-in | known → auth D1 |
| EMAIL_VERIFICATION × **any later save of the row** (admin toggle, etc.) | nothing | `User.save()` hook auto-advances the step and forces confirmed=true | **NEW-D2** |
| any × Google sign-in to an existing email account | link the account (emailVerified→true via Better Auth); `confirmed`/image untouched | **sets confirmed=true** and copies the Google picture into an empty `user.image` | **NEW-D1** |
| ONBOARDING × completeOnboarding | profile upsert published+isActive, **visibility reset to default**, type=role, user fields re-synced, step DASHBOARD, admin email, Brevo | published/isActive/step/email/Brevo same; visibility only if empty; type only if empty | type/user fields known → auth D9; visibility **NEW-D5** |
| DASHBOARD (pro, incomplete profile) × any page | self-heal → ONBOARDING | no check | known → auth D7 |
| DASHBOARD user × upgrade-to-pro | type=pro, role, username, step ONBOARDING, Brevo | gate on role, not type | known → auth (rejection texts, admin-role nuance) |
| admin × set step DASHBOARD for an incomplete pro | auto-corrected to ONBOARDING | same | = |
| admin × set step EMAIL_VERIFICATION for a verified user | stored | immediately re-advanced by the save hook | **NEW-D2** |
| admin × setRole | role only (type untouched), Brevo | same | = |
| account deleted × re-register same email | email free; Brevo contact deleted in `beforeDelete` | same (Brevo delete enqueued) | = |

### 2.2 Service status (draft / pending / published / rejected / approved / inactive)

| State × actor/trigger | OLD | NEW | Verdict |
|---|---|---|---|
| — × owner create (submit) | pending, plan gate, admin email, first-service Brevo | same | = (texts known → services D6) |
| — × owner save draft | draft, plan gate, 30 s cooldown | no plan gate, other draft nuances | known → services D17 |
| draft × owner edit | → pending unconditionally (+ plan gate, email, Brevo) | conditional | known → services D8 |
| published/rejected/pending × owner edit | status unchanged | same | = |
| any × owner archive | → inactive, no Brevo | → inactive | known → services D9 |
| any × owner delete | hard delete; DB sets `reviews.sid` to NULL and cascades `saved_services`; Brevo resync | hard delete; no Brevo; review/saved cleanup relies on the DB FKs surviving the restore | Brevo known → services D9; FK caveat **NEW-D7 (conditional)** |
| any × admin togglePublished | published↔draft; email on →published; first-service Brevo from draft; **no resync on →draft** | same + **Brevo resync on published→draft** | **NEW-D6** |
| any × admin updateServiceStatus | email whenever →published (even published→published); Brevo rules; rejection reason ignored, no owner email on reject | same | = (duplicate settings email known → admin D6) |
| any × admin delete | delete + Brevo resync | same | = |
| published × owner's profile unpublished / user blocked | service page 404 (profile.published gate); archives/search still list it (no profile filter) | same | = |
| published × subscription lapses (promoted → past_due/canceled) | stays published; over-limit services not demoted; only new creates are gated | same | = |
| any × plan gate | `canCreateService` = published+pending < maxServices (3/15), active promoted only | same | = (text known → services D6) |

### 2.3 Profile flags (published / isActive / featured / verified / top)

| Trigger | OLD | NEW | Verdict |
|---|---|---|---|
| onboarding completes | published=true (any role in practice), isActive=true | published only for freelancer/company roles, isActive=true | = for valid pros (broken-pro case known → auth D2) |
| admin togglePublished/Featured | flip only, no cache revalidation | flip; `post_save` purges caches | = (NEW is fresher) |
| admin toggleVerified | flip + verification row APPROVED/PENDING | same | = |
| admin settings form (all 5 booleans) | update + revalidate | update_profile | = |
| admin delete profile | cascade services/reviews/subscription/verification/saved(DB); Brevo resync | cascade; no Brevo | known → lib-shared D7 |
| verification submit/resubmit (owner) | upsert PENDING; **profile.verified untouched**; admin email | same | = |
| verification approve / reject / pending (admin) | verified = (APPROVED); no user email | same | = |
| verification delete (admin) | delete + verified=false | same | = |
| subscription active (webhook/admin/manual) | profile.featured=true | same, but via `.update()` with no cache purge | known → billing D4 |
| renewal failure | past_due + featured=false | same | = (cache known → billing D4) |
| cancel-at-period-end | never downgrades | same | known (SUMMARY) / billing D10 |
| user blocked / unconfirmed (admin) | hidden from directory/home/profile page/sitemap (`user.blocked=false, confirmed=true`); no cache purge (30-min profile-page TTL) | same filters; also no purge (no `User` signal) | = |
| user **banned** | NOT hidden publicly (filters ignore `banned`) | NOT hidden publicly | = (confirmed same) |

### 2.4 Subscription (incomplete / active / past_due / canceled / trialing / unpaid)

| State × trigger | OLD | NEW | Verdict |
|---|---|---|---|
| none × checkout | upsert free+incomplete with pending order id + coupon fields | get_or_create free+incomplete + billing snapshot | billing details known → billing D17 |
| active × checkout | refused "Έχετε ήδη ενεργή συνδρομή" | same text, 409 | = |
| past_due/canceled/incomplete × checkout | allowed | allowed | = |
| incomplete × initial payment CAPTURED | active, promoted, period, featured | same (MID bug known → billing D1) | known |
| active × recurring CAPTURED | period advanced, featured, admin email | anchoring differs | known → billing D11 |
| active × recurring failed | past_due + featured=false | same | = |
| past_due × time | old cron (never ran on Vercel) would retry, then cancel to free | cron disabled (intentional) | = in effect |
| active × user cancel | cancelAtPeriodEnd, canceledAt | same | messages known → billing D5 |
| canceling × restore | clears flags | same | = |
| any × admin status | canceled→featured false; active→featured true (promoted only) | same, `.update()` | known → billing D4 |
| any × admin delete | featured false (promoted) | same | = |
| UI gating | promote page: `isActive = status==='active'`; plan features need active+promoted (`getActivePlan`) | identical (`page.tsx:32-33`, `_active_plan`, `_is_promoted_subscriber`) | = |

### 2.5 Review (pending / approved / rejected × published × visibility)

Pass-1 reviews-saved verified the lifecycle as matching. Cascades re-checked:
- Author deleted: reviews cascade in both. Neither recalculates the receiving profile's rating or review count, so the denormalized columns go stale. Same in both.
- Profile deleted: cascade in both.
- **Service deleted:** OLD DB sets `reviews.sid` to NULL. NEW `Review.service_id` is a plain int with no ORM relation (see NEW-D7).

### 2.6 Chat / messages

| Trigger | OLD | NEW | Verdict |
|---|---|---|---|
| block (either way) × start DM | refused | refused ("Conversation blocked", English) | = (texts known → lib-shared D3) |
| block × send message | not checked | not checked | = |
| block UI | never mounted | never mounted | = |
| counterpart deletes account, counterpart was the chat creator | Chat cascades: the conversation disappears for the survivor | same | = |
| counterpart deletes account, not the creator | chat survives with one member; their messages are gone; lastMessage is set to NULL | same (DB FK / dangling id both render as no last message) | = |
| … list label for the missing member | **"Χρήστης"** | **"Άγνωστος χρήστης"**, empty avatar initials | **NEW-D4** |
| … opening the chat | "Αυτή η συνομιλία δεν είναι διαθέσιμη / Ο άλλος χρήστης μπορεί να έχει διαγραφεί…" | identical | = |
| list name source | User.displayName → first+last → Χρήστης | User.displayName (Profile name never applied, see §3b) | correction C1 |

### 2.7 Ban / block / confirmed

| Aspect | OLD | NEW | Verdict |
|---|---|---|---|
| blocked × login | message "Ο λογαριασμός σας έχει αποκλειστεί" (after Better Auth had already created the session) | same message, no tokens | = |
| blocked × existing session | stayed valid (no per-request check) | `is_active` → treated as anonymous right away | known → auth D4 (arguably a fix) |
| banned × login/session | Better Auth refused while the ban was unexpired; banUser revoked sessions | is_active; expiry ignored | known (SUMMARY ban expiry / auth D4) |
| banned × Google login | Better Auth refused | not checked | known → auth D5 |
| **unconfirmed × Google login** | stays unconfirmed (and hidden publicly) | **auto-reconfirmed** | **NEW-D1** |
| Brevo on ban/block/unban/unblock | remove from all lists / re-add | same | = |
| public visibility | blocked or !confirmed hides the profile; banned does not; services of blocked users stay in archives | same | = |

### 2.8 Account deletion cascade (walked fully)

OLD (`auth.api.deleteUser` → `beforeDelete`): delete the Brevo contact, delete Verification rows by email, then Prisma/DB cascade:
- Sessions, Accounts, ApiKeys, Media, EmailBatch, SavedService/SavedProfile (as saver), BlockedUser (both sides), ChatMember, Messages authored, Chats **created** (with all their members and messages), Reviews **given**.
- Profile → Services → (saved_services cascade, reviews.sid set to NULL), Reviews **received**, ProfileVerification, Subscription → PaymentAttempts, BlogArticleAuthor.
- Message.deletedBy, Message.replyTo and Chat.lastMessage are set to NULL.
- No cache revalidation. No provider-side subscription cancel.

NEW (`account.delete_account`): revoke all refresh tokens, delete Verification rows, enqueue the Brevo delete, then `user.delete()`. The Django ORM cascade mirrors every FK above with `on_delete=CASCADE` (all `db_constraint=False`). `post_delete` signals on Profile, Service and Review purge the Redis caches (better than OLD). `chat_members` (composite PK, no `id`) is deleted via fast-delete, so it doesn't crash. Three columns that were FKs in Prisma are plain columns in Django: `messages.deletedBy`, `messages.replyToId`, `chats.lastMessageId`. Two more: `reviews.sid`, `saved_*.serviceId/profileId`. Their cleanup depends on the old Postgres FK constraints still existing (see NEW-D7). Admin `remove_user` does the same, plus the Brevo delete. **Result: =**, apart from NEW-D7's conditional.

## 3. DIFFERENCES (new only)

### D1. Google sign-in silently re-confirms any existing account (`confirmed=true`), undoing an admin "unconfirm" and making a hidden profile public again — MEDIUM
- OLD: Better Auth's OAuth login for an existing email links the Google account and (when Google says the email is verified) sets only `emailVerified`. `confirmed` is never touched (`lib/auth/config.ts` hooks only write `confirmed` on create). An admin `toggleUserConfirmation(false)` (`actions/admin/users.ts:894-928`) therefore stays in force. Public queries filter `user.confirmed: true` (`get-profiles.ts:100-105,383-388,954`, `get-profile.ts:236`, `get-home-data.ts:211,236`, `profile/sitemap.ts:22`), so the profile stays hidden.
- NEW: `backend/apps/accounts/services/google_oauth.py:131-143` (existing-user branch) does `if not user.confirmed: user.confirmed = True` on every Google login. Public filters still use `user__confirmed=True` (`profile_aggregations.py:40,422,529-530`, `profile_reads.py:41-43`, `core/views/public/home.py:61`, `sitemaps.py:135-136`).
- Impact: an admin uses "unconfirm" to hide a pro. The pro signs in once with "Σύνδεση με Google" using the same email, and the account is re-confirmed, can use the site again (NEW `is_active` needs confirmed), and the profile is back in the directory, home, sitemap and profile page. OLD offered no such bypass. (It also accidentally "fixes" the auth D4 lockout for Google users only, which hides that bug's real scope.)
- Fix hint: keep `confirmed` unchanged for existing users (OLD parity). If a heal is wanted for the D4 data issue, do it explicitly, never on login.
- Possibly intentional?: no. The comment says it mirrors "pre-verified Google users", but OLD only pre-confirmed **newly created** Google users.

### D2. `User.save()` auto-advance hook fires on every save, not only on verification — LOW/MEDIUM
- OLD: steps move only through explicit paths: the Better Auth update hook when `emailVerified` flips with provider=email (`config.ts:415-447`), admin `updateUserStatus` / `updateUserJourneyStep`, onboarding, OAuth setup and upgrade. An admin could set `step=EMAIL_VERIFICATION` or `confirmed=false` on a verified user and it stuck.
- NEW: `apps/accounts/models/user.py:189-213` (`save` override): whenever `email_verified and step == EMAIL_VERIFICATION`, the step is rewritten to ONBOARDING/DASHBOARD **and `confirmed` is forced to true** on any save, whatever `update_fields` says. So:
  - `update_user_journey_step(step=EMAIL_VERIFICATION)` / `update_user_status(step=EMAIL_VERIFICATION)` on a verified user is silently overridden in the same save (`admin_users.py:228-283`). The admin UI reports success but the step shows ONBOARDING/DASHBOARD.
  - `toggle_user_confirmation(confirmed=false)` (`admin_users.py:297-300`) on a verified user who is still at EMAIL_VERIFICATION is reverted to confirmed=true in the same save.
  - A Google sign-in or any profile-side save for such a user also advances the step without the Brevo sync OLD ran after verification (`config.ts:441-449`).
- Impact: some admin journey/confirmation edits don't stick, and list placement can be wrong until the next sync.
- Possibly intentional?: partly. The docstring says it exists for Django-admin checkbox flips. The over-broad trigger, and the forced `confirmed`, are not OLD behavior.

### D3. Google OAuth setup creates an unpublished stub Profile for pros before onboarding — LOW
- OLD: `actions/auth/oauth-setup.ts` updates only User (type/role/username/step/image). The Profile row is first created by `complete-onboarding.ts` (`prisma.profile.upsert`, :147-189). Email-registered pros get none before onboarding either.
- NEW: `apps/accounts/services/oauth.py:83-89` calls `ensure_profile_exists(user)` for `type=pro` at OAuth setup. This creates `Profile(username, display_name, email, type, published=False, is_active=False)` (`profile_updates.py:429-442`). Email-registered pros still get none until onboarding, so the two paths now differ.
- Side effects:
  - The chat page derives `type='pro'` from "has a profile username" (`frontend/.../messages/[chatId]/page.tsx`, see messaging D7). A Google pro still in onboarding gets a clickable name/avatar linking to `/profile/<username>`, which 404s (unpublished).
  - Admin profile list and stats (`admin_profiles.get_profile_stats` total/unverified/professional/company) count these stubs; OLD had no row.
  - Stub profiles of pros who abandon onboarding pile up.
- Possibly intentional?: probably a convenience, but it changes entity existence semantics vs OLD.

### D4. Chat with a deleted (or otherwise missing) counterpart: the list label changed from "Χρήστης" to "Άγνωστος χρήστης" — LOW
- OLD: `lib/utils/messages.ts:33-46`: if no other member exists, `displayName = 'Χρήστης'` and avatar null. The chat list shows "Χρήστης" with initials from that name.
- NEW: `chat_ops.py:list_chats` returns `name: other.get("displayName") or chat.name`, which is `null` when the other member row is gone (account deleted while not the chat creator). `chat-list-item.tsx:43,55` then renders `'Άγνωστος χρήστης'` and passes `''` for the avatar initials.
- Impact: different Greek copy and an empty avatar for orphaned conversations.
- Fix hint: fall back to `'Χρήστης'` in `list_chats` when there's no other member (OLD text).
- Possibly intentional?: no.

### D5. Onboarding no longer resets contact visibility to the default — LOW
- OLD: `complete-onboarding.ts:158,176` always writes `visibility: { email: false, phone: true, address: true }` in both the update and create branches of the upsert. A pro sent back to ONBOARDING (admin step change or the old self-heal) ends with default visibility.
- NEW: `accounts/views/public/onboarding.py:131-132` writes the default only `if not profile.visibility`, so any previous setting is kept.
- Impact: only on re-onboarding. A pro who had hidden their phone keeps it hidden in NEW; OLD reset it to visible. Rare, but a state-machine difference.
- Possibly intentional?: maybe (arguably nicer), but it isn't parity.

### D6. Admin "toggle published" (published → draft) now resyncs Brevo; OLD did not — LOW
- OLD: `actions/admin/services.ts:1002-1115` `togglePublished`: Brevo is touched only when the toggle lands on `published` (first-service move). Unpublishing via the toggle runs **no** `handleUserStateChange`. (Only `updateServiceStatus` resyncs on published → rejected/inactive/draft, :1322-1348.)
- NEW: `apps/services/services/admin_services.py:266-280` routes the toggle through `_notify_status_change`, which enqueues `brevo_state_change` on published → draft (:249-254).
- Impact: a pro whose last published service is toggled off moves PROS → NOSERVICES in NEW; OLD left them in PROS. Arguably more correct, but it changes Brevo automations (which emails a pro receives).
- Possibly intentional?: possibly (consistency with updateServiceStatus). Flag for a product decision.

### D7. (Conditional) Former Prisma FKs are plain columns in Django; delete cleanup now depends on legacy DB constraints surviving — LOW, verify in DB
- OLD: Prisma relations plus migration SQL: `reviews.sid → services ON DELETE SET NULL`, `chats.lastMessageId → messages ON DELETE SET NULL`, `messages.replyToId` / `deletedBy` set to NULL, `saved_services.serviceId` / `saved_profiles.profileId` cascade.
- NEW: `Review.service_id` (`reviews/models/review.py:44`), `Message.reply_to_id` / `deleted_by`, `Chat.last_message_id` (`messaging/models/chat.py`) and `SavedService.service_id` / `SavedProfile.profile_id` (`saved/models/*`) are plain columns. Other FKs use `db_constraint=False`. Correct cascades/SET NULL now happen **only if** the Postgres constraints from the restored Supabase dump still exist (`backend/README.md:41-104`: pg_restore + `--fake-initial`).
- If a DB was built by Django migrations instead (fresh env, or a prod rebuild), then after a service delete:
  - reviews keep a dangling `sid`, so `list_profile_other_service_reviews` (`review_reads.py:69-85`, `service_id__isnull=False`) shows them on other service pages with `service: null` (OLD excluded them because sid was NULL);
  - saved rows become orphans (saved counts are off, see reviews-saved D8).
- Check: `\d reviews`, `\d saved_services`, `\d chats` on prod for `*_fkey` constraints.
- Possibly intentional?: no (latent).

### 3b. Corrections to pass-1

- **C1 (messaging D6 is partly wrong):** the chat **list** does NOT prefer Profile.display_name. `chat_ops.py:list_chats:86-93` stores the profile fields with `other_by_chat.setdefault(row["user_id"], …)` (keyed by **user id**), but reads them back with `other_by_chat.get(row["chat_id"])` (keyed by **chat id**). `profileDisplayName` and `username` are therefore never applied: list name = `User.display_name → first+last → name → Χρήστης` (matches OLD for the name), list `username` is always null, and only the avatar comes from Profile.image. The **header** (`get_chat`, keyed correctly) does prefer Profile.display_name. Net effect: for a pro whose Profile.display_name differs from User.display_name, the sidebar and header show different names for the same person. The fix is keying (or dropping the Profile promotion, to match OLD).
- **C2 (billing D4 scope):** confirmed that admin `admin_update_status` / `admin_delete` / manual create (`subscription_ops.py:720-760, 800-822`) also use `.update()` / `save` with the same no-purge pattern. The D4 root fix should cover these too (D4 already mentions them; listing them for the fix checklist).

## 4. Confirmed same (state-machine level)
- Plan gating (`getActivePlan` = active AND promoted) for maxServices, featured slots, refresh limits and related services. Promote-page `isActive`/`isCanceling` UI gate is identical.
- Service: owner edits never change published/rejected/pending. Archive → inactive. Profile-published gate on the service page. No profile filter on archives (both). No demotion of services when a subscription lapses.
- Verification loop (submit/resubmit → PENDING without touching `verified`; admin approve/reject/pending/delete → `verified` sync; toggleVerified syncs the row).
- Public visibility filters (blocked/confirmed/published/isActive). Banned users are not hidden publicly in either app.
- Brevo list rules (blocked/banned → removed; USERS / EMPTYPROFILE / NOSERVICES / PROS) are ported exactly.
- Account-delete cascade (Brevo GDPR delete, verification tokens, every owned row). NEW additionally revokes JWTs and purges caches.
- Chat creator-cascade semantics and the deleted-counterpart chat page empty state.
- Admin step auto-correct (DASHBOARD → ONBOARDING for incomplete pros).

## 5. Open questions / couldn't verify
- Whether the prod Dokploy DB still has the legacy FK constraints (NEW-D7). This decides whether service delete orphans reviews/saved rows.
- How many prod users have `confirmed=false` and use Google (NEW-D1 bypass exposure).
- Better Auth's exact link-time behavior (`emailVerified` update on link, no `confirmed`/image update) is inferred from the library defaults. `node_modules` is not installed in `oldnext/`, so it can't be confirmed byte-for-byte.
