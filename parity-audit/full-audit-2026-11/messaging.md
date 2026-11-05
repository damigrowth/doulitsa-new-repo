# Messaging / chat parity audit — 2026-11-05

## 1. Coverage

### OLD files read (every one)
- `src/actions/messages/index.ts` — barrel re-export of the actions below.
- `src/actions/messages/chats.ts` — `getChats` (list, filter empty, unread batch), `getChatById`, `getOrCreateChat` (block check, 2-member dedup, nanoid cid).
- `src/actions/messages/messages.ts` — `getMessages` (20/page, `before`=createdAt), `sendMessage` (member + reply-target check, updates lastMessage/lastActivity), `editMessage`, `markAsRead`, `getUnreadCount`, `getUnreadCountsBatch`, `getTotalUnreadCount`, `getRecentUnreadMessages`.
- `src/actions/messages/blocking.ts` — `blockUser`, `unblockUser`, `getBlockedUsers`, `isBlocked`.
- `src/actions/messages/presence.ts` — `updatePresence`, `getPresenceStatus`, `getUserChatsWithPresence`.
- `src/actions/messages/reactions.ts` — `toggleReaction` (one reaction per user), `addReaction`, `removeReaction`.
- `src/actions/messages/contact.ts` — public contact form (`submitContactForm`). It lives in this folder but the behavior is support/contact (see D9).
- `src/app/(dashboard)/dashboard/messages/page.tsx` — index: redirects to the first chat, otherwise shows the empty state.
- `src/app/(dashboard)/dashboard/messages/[chatId]/page.tsx` — chat view: cid/id lookup, membership redirect, empty-chat redirect, header user.
- `src/components/messages/*` — chat-header, chat-list, chat-list-item, chat-list-container, chat-messages, chat-sidebar, header-presence, message-actions, message-input, message-reply-preview, message-reply-quote, messages-container, messages-container-with-sidebar, mobile-chat-list-button, mobile-chat-sidebar, reaction-picker, start-chat-dialog. Also checked the never-imported ones: `header-actions.tsx` (block menu), `message-edit.tsx`, `message-reactions.tsx`, plus the `*.backup` files (chat-messages, chat-list, chat-header).
- `src/lib/hooks/chat/use-chat-subscription.ts`, `use-chat-list-subscription.ts`, `use-presence.ts`, `use-message-optimistic.ts`, `use-infinite-scroll.ts` (never imported).
- `src/lib/hooks/use-unread-count.ts` — header/sidebar total unread (SWR, 60s).
- `src/lib/supabase/realtime.ts` — Supabase postgres_changes subscriptions (the old realtime mechanism).
- `src/lib/utils/messages.ts`, `src/lib/utils/formatting/time.ts`, `src/lib/types/messages.ts`, `src/lib/database/selects/chat.ts`, `src/lib/prisma/schema/chat.prisma`, `src/lib/validations/chat.ts` (never imported).
- `src/app/api/cron/process-email-batches/route.ts`, `src/lib/email/services/message-emails.ts`, `src/constants/email/templates/unread-messages.ts`, `EMAIL_CONFIG.UNREAD_MESSAGES` in `src/constants/email/email-config.ts`, `vercel.json` (cron `*/15`).
- Consumers: `components/dashboard/button-messages.tsx`, the `useUnreadCount` badge in `dashboard-sidebar.tsx`, the "Τελευταία Μηνύματα" card in `dashboard-content.tsx`, the StartChatDialog call sites in `profile/profile-info.tsx` and `service/service-buy.tsx`, `forms/form-contact.tsx`, `lib/validations/contact.ts`.

### NEW files read
- Frontend: `src/actions/messages/{index,chats,messages,blocking,presence,reactions,contact}.ts`, `src/lib/api/messaging.ts`, `src/lib/api/support.ts`, `src/lib/realtime/channels-ws.ts`, `src/lib/hooks/chat/*.ts`, `src/lib/hooks/use-unread-count.ts`, `src/lib/utils/messages.ts`, `src/lib/types/messages.ts`, both messages pages, all of `src/components/messages/*` (diffed file by file against old), `components/dashboard/{button-messages,dashboard-content}.tsx`, `profile-info.tsx`, `service-buy.tsx`, `form-contact.tsx`.
- Backend: `apps/messaging/models/chat.py`, `urls/{chats,messages,users,presence,admin}.py`, `views/public/chats.py`, `views/public/cron.py`, `services/chat_ops.py`, `consumers.py`, `tasks.py` (`process_email_batches`), `emails.py` (`send_unread_digest_email`, `send_email`, `_layout`), `config/settings/base.py` beat entry, `apps/support/views/public/support.py` (ContactView).

### Delegated elsewhere
- `src/actions/admin/chats.ts`, `app/(admin)/admin/chats/**`, `components/admin/admin-chat*` and NEW `apps/messaging/views/admin/chats.py` → **admin** domain (admin chat capabilities). I did not audit these in depth.
- The rest of `apps/messaging/emails.py` / `brevo.py` (other templates, Brevo list sync) → **emails/notifications** domain.
- The rest of `dashboard-content.tsx` → **dashboard** domain.
- `profile/[username]` and `s/[slug]` pages, which supply `profile.uid` to StartChatDialog → **profile/service** domains. I spot-checked that Django ships `uid = profile.user_id`.

## 2. Mapping (old → new)

| OLD | NEW frontend action → Django endpoint |
|---|---|
| `getChats` | `getChats` → `GET /api/chats` (`chat_ops.list_chats`) |
| `getChatById` | `getChatById` → `GET /api/chats/{id or cid}` (`get_chat`) |
| `getOrCreateChat` | `getOrCreateChat` → `POST /api/chats/with/{otherUserId}` (`get_or_create_dm`) |
| `getMessages` | `getMessages` → `GET /api/chats/{id}/messages?limit&before` |
| `sendMessage` | `sendMessage` → `POST /api/chats/{id}/messages` (+ WS broadcast `chat.message`) |
| `editMessage` | `editMessage` → `PATCH /api/messages/{id}` |
| (none) | `deleteMessage` → `DELETE /api/messages/{id}` (new only) |
| `markAsRead` | `markAsRead` → `POST /api/messages/mark-read` (+ WS `chat.read`) |
| `getUnreadCount` / `getUnreadCountsBatch` / `getTotalUnreadCount` / `getRecentUnreadMessages` | `GET /api/chats/{id}/unread/count`, `POST /api/chats/unread/counts`, `GET /api/chats/unread/total`, `GET /api/chats/me/recent-unread` |
| `blockUser` / `unblockUser` / `getBlockedUsers` / `isBlocked` | `POST`/`DELETE /api/users/{id}/block`, `GET /api/users/me/blocked`, `GET /api/users/{id}/blocked-status` |
| `updatePresence` / `getPresenceStatus` / `getUserChatsWithPresence` | `POST /api/presence`, `GET /api/users/{id}/presence`, `GET /api/chats/me/presence-summary`. The real driver is now the WS connect refcount in `consumers.py`. |
| `toggleReaction` / `addReaction` / `removeReaction` | `POST /api/messages/{id}/reactions/toggle`, `POST …/reactions`, `DELETE …/reactions/{emoji}` |
| Supabase `subscribeToMessages` / `subscribeToReadReceipts` | `/ws/chat/{chatId}/` (`ChatConsumer`) |
| Supabase `subscribeToUserChats` / `subscribeToChatMemberPresence` | `/ws/presence/` (`PresenceConsumer`, fed by `_broadcast` fan-out) |
| Vercel cron `/api/cron/process-email-batches` | Celery beat `messaging-process-email-batches` (*/15) and `POST/GET /api/cron/process-email-batches` |
| `submitContactForm` | `submitContactForm` → `POST /api/support/contact` |
| Pages `/dashboard/messages`, `/dashboard/messages/[chatId]` | Same routes. Components are byte-identical except for the diffs listed below. |

## 3. DIFFERENCES

### D1. The open chat's unread badge in the chat list doesn't clear after reading (no list refresh on read) — MEDIUM
- OLD: `use-chat-list-subscription.ts:54-59` refetches the whole list on **any** change to `chats` or `chat_members` (`realtime.ts:193-216`). Opening a chat runs `usePresence`. Its `setOnline` call fires immediately and its heartbeat repeats every 30s (`use-presence.ts:48-79`). Each call updates `chat_members` and triggers a refetch. So the sidebar badge for the chat being read clears within about 30s of `markAsRead`.
- NEW: `frontend/src/lib/hooks/chat/use-chat-list-subscription.ts:50-55` refetches only on `presence`, `message`, `message_edited` and `message_deleted`. It ignores the `read` event that `mark_messages_read` broadcasts (`chat_ops.py:405-419`, and the PresenceConsumer forwards it in `consumers.py:289-290`). It also ignores `reaction`. There is no heartbeat any more: presence only broadcasts on the socket refcount 0→1 and →0 transitions (`consumers.py:49-93`). `ChatSidebar` is server-rendered with the unread counts from *before* `markAsRead` runs (`messages-container.tsx:52-70`). So the open chat's red badge can stay until the next message or presence transition.
- Impact: the user reads a conversation but the sidebar still shows unread N for it. The header and sidebar total badges are hidden on `/dashboard/messages*` and refresh on their own 60s SWR interval, so only the chat-list item is stale.
- Fix: add `read: trigger` (and `reaction: trigger` for parity with "any change") to the handler map in `use-chat-list-subscription.ts`.
- Possibly intentional?: no.

### D2. Chat page: non-member and empty-chat guards differ — MEDIUM
- OLD `[chatId]/page.tsx:57-69`: a non-member is `redirect('/dashboard/messages')`. Lines 71-82: a chat with 0 non-deleted messages also redirects to `/dashboard/messages`. Lines 94-95: the header user is built only when the chat appears in the filtered `getChats` list; otherwise the page shows "Αυτή η συνομιλία δεν είναι διαθέσιμη".
- NEW `frontend/src/app/(dashboard)/dashboard/messages/[chatId]/page.tsx:33-45`: `get_chat` returns None for non-members (`chat_ops.py:178-179`), so a non-member gets `notFound()` (404 page) instead of a redirect. There is no empty-message check. `selectedChat` (line 52) is computed and never used, so an empty chat (for example after a failed first send in StartChatDialog) opens as a blank conversation instead of redirecting.
- Impact: a different landing page for foreign or stale chat links; empty DMs become reachable.
- Possibly intentional?: no.

### D3. Unread-messages digest email: subject, which previews are shown, and template differ — MEDIUM
- OLD `email-config.ts:241-244`: subject is `Έχεις 1 αδιάβαστο μήνυμα - Doulitsa` or `Έχεις N αδιάβαστα μηνύματα - Doulitsa`. From is `Doulitsa <noreply@doulitsa.gr>`. Brevo attributes are `USER_NAME` and `UNREAD_COUNT` (`message-emails.ts:69-72`).
- NEW `emails.py:391`: subject is `Νέο Μήνυμα — Doulitsa` or `Νέα Μηνύματα — Doulitsa` (wrong text and an em-dash). No Brevo attributes.
- Preview selection:
  - OLD `unread-messages.ts:61` takes the messages newest-first, `.slice(0,15).reverse()`, so it shows the **15 newest** in chronological order.
  - NEW `tasks.py:87-94` builds `previews` from `reversed(new_messages)` (oldest first) and `emails.py:363` takes `previews[:15]`, so it shows the **15 oldest**.
- Template:
  - OLD has a bespoke HTML layout (602px card, black footer `® Doulitsa, 2026`) and a dedicated plain-text version: `• Sender (HH:MM): content` truncated to **100** chars, ending with `Δες όλα τα μηνύματά σου: <url>`.
  - NEW uses the generic `_layout`/`_button` (footer "Αυτό το μήνυμα στάλθηκε αυτόματα.", plus a "Ή αντίγραψε τον σύνδεσμο" line). Its plain text is the tag-stripped HTML.
- Greek body lines ("Γεια σου X!", "Έλαβες … τα τελευταία λεπτά.", "... και N ακόμη μήνυμα/μηνύματα", "Δες τα Μηνύματά σου") and the `φίλε` / `Χρήστης` fallbacks match.
- Possibly intentional?: no for the subject and preview order. The layout may belong to an email-design decision.

### D4. Digest failure handling differs (old burns messages, new retries) — LOW
- OLD: `sendUnreadMessagesEmail` swallows provider errors (`message-emails.ts:77-83`), so `route.ts:114-121` still writes the EmailBatch and those messages are never emailed again.
- NEW `tasks.py:98-111`: writes the batch only when `send_email` returns True. A failure, including "Brevo not configured" (`emails.py:88-90`), means the same messages are retried every 15 minutes.
- Possibly intentional?: yes, the docstring says so explicitly. Reporting it so the decision is on record.

### D5. Read-receipt ticks added to own bubbles — LOW
- OLD `components/messages/chat-messages.tsx` renders no read or seen indicator. The old Supabase receipt channel listened to the `message_reads` table (`realtime.ts:105-117`), which doesn't exist in the Prisma schema, so nothing ever fired.
- NEW `frontend/src/components/messages/chat-messages.tsx:11,281-291`: Check / CheckCheck icons on own messages, updated live by the `read` event (`use-chat-subscription.ts:123-131`).
- The code comment claims this "mirrors OLD", but the old file has no ticks.
- Possibly intentional?: yes (deliberate enhancement), but it's a visible UI difference from old.

### D6. Chat list and header name/avatar now come from Profile first; header fallbacks changed — LOW
- OLD: both list and header use the **User** row. `utils/messages.ts:33-52` uses `user.displayName` → `first last` → `Χρήστης`, with avatar `user.image`. The header (`[chatId]/page.tsx:104-134`) passes the User's displayName, firstName, lastName and image, and `chat-header.tsx` falls back `displayName || firstName || lastName || 'Unknown User'`.
- NEW `chat_ops.py:82-120` and `190-221` prefer **Profile.display_name** and **Profile.image**, then User fields, then the new-only `user.name`, then `Χρήστης`. The header gets `firstName`/`lastName` = null and `phone` = null (`page.tsx:69-84`). So:
  - a pro who changed their photo via basic-info shows the new Profile image (old kept showing the stale `User.image`, because `actions/profiles/basic-info.ts` updates only `profile.image`);
  - the header falls back to `Χρήστης` instead of `Unknown User`;
  - the header shows "First Last" where old showed only firstName;
  - avatar initials are computed from displayName only.
- Possibly intentional?: possibly (newer image is arguably better), but it's a parity difference.

### D7. Header profile-link gate derives `type` from "has a Profile" — LOW
- OLD `[chatId]/page.tsx:112,133`: `type: otherMember.user.type` (User.type).
- NEW `page.tsx:83`: `type = username ? 'pro' : null`, where `username` exists only when a Profile row exists (`chat_ops.py:221`).
- Divergent cases:
  - User.type=`pro` without a Profile row (onboarding incomplete): old renders a link, new doesn't.
  - A user downgraded to `user` (`update-user-type.ts`) whose Profile row remains: new renders a link, old doesn't.
- Possibly intentional?: yes. This is the recent deliberate QA fix. The common case is correct; only these edge cases differ.

### D8. Presence semantics changed (not visible in UI) — LOW
- OLD `use-presence.ts`: online is set on chat-page mount, with a 30s heartbeat. The user goes offline 2s after the tab is hidden and back online when it's visible again, and offline on unmount. Old bug: `HeaderPresence` also calls `usePresence({userId: otherUser})`, which runs `updatePresence(otherUserId, true/false)`, so viewing a chat flipped the *other* user online and offline.
- NEW: online is driven by a per-user WS connection refcount in the cache (`consumers.py:42-93`), with no visibility or heartbeat handling. `usePresence` ignores `chatId` and no longer writes the other user's presence. `get_presence` orders by `-last_seen` (old: an arbitrary row). Fallback `lastSeen` is `null` / `new Date(0)` (old: `new Date()`).
- Impact: none visible. No component renders `online` (checked: chat-header, chat-list-item, chat-messages). It only matters for D1, because old's heartbeat was what refreshed the chat list.
- Possibly intentional?: yes (transport swap). Listed for completeness.

### D9. Contact form action (`actions/messages/contact.ts`): texts and validation limits differ — MEDIUM (likely overlaps the support domain)
- Success message:
  - OLD `contact.ts:107-108`: `Το μήνυμα σας στάλθηκε επιτυχώς! Θα επικοινωνήσουμε σύντομα μαζί σας.`
  - NEW `frontend/src/actions/messages/contact.ts:20`: `Το μήνυμά σας εστάλη`.
- Generic error:
  - OLD: `Παρουσιάστηκε σφάλμα κατά την αποστολή του μηνύματος. Παρακαλώ δοκιμάστε ξανά.`
  - NEW: `err.message` from the API, else `Σφάλμα δικτύου`.
- Validation:
  - OLD runs zod `contactSchema` first (`validations/contact.ts`): name 2-50, valid email, message 10-500, with Greek field errors and the summary `Μη έγκυρα δεδομένα επικοινωνίας`.
  - NEW relies on DRF `ContactSerializer` (`support.py:20-25`): name 2-**255**, message 10-**20000**, with English DRF error messages.
- reCAPTCHA failure:
  - OLD: `Η επαλήθευση ReCAPTCHA απέτυχε. Παρακαλώ δοκιμάστε ξανά.`
  - NEW: `Captcha verification failed` (English).
- Stored subject and email subject:
  - OLD stores `subject: 'Contact Form Submission'` and the admin email subject is `Φόρμα Επικοινωνίας`.
  - NEW stores the form `subject` or NULL; the email subject falls back to `Επικοινωνία`.
- Possibly intentional?: no.

### D10. New-only backend message delete; reactions and blocking edge semantics — LOW
- `DELETE /api/messages/{id}` (author soft-delete plus `message_deleted` broadcast, `chat_ops.py:392-402`) has no old counterpart. Old users couldn't delete messages, and no new UI calls it. API surface only.
- Reactions: when the last reaction is removed, old stores `null` (`reactions.ts:63,155`) and new stores `{}` (`chat_ops.py:667,699`).
- Unblock of a non-existent block: old throws "Failed to unblock user"; new returns 204 silently.
- Blocking a non-existent user id: new creates a row, because the FK has `db_constraint=False`; old got an FK error.
- `getBlockedUsers` row: old ships `blocked {id,email,firstName,lastName,image}`; new ships `{id,email,displayName,image}`.
- No UI consumes any of these (old `header-actions.tsx` was never imported).
- Possibly intentional?: partly.

### D11. Input bounds now enforced or crashing — LOW
- New send/edit content `max_length=20000` (old had no limit).
- `limit` and `minutes` query params are parsed with bare `int()` (`views/public/chats.py:90,171`), so a non-numeric value gives a 500. A negative `limit` reaches `qs[:limit]` and gives a 500 (negative slicing).
- Old had no validation either, but Prisma would reject these differently.
- Possibly intentional?: n/a (hardening suggestion).

### D12. The "Τελευταία Μηνύματα" dashboard card now shows an avatar image — LOW
- OLD `dashboard-content.tsx:217-219` shows only the initial letter.
- NEW `dashboard-content.tsx:217-226` renders `<img src=chat.image>` when present.
- Also: if the last message is soft-deleted (`content: null`), new renders an empty `<p>`, because `chat.lastMessage` is an object and therefore truthy.
- Possibly intentional?: possibly (cosmetic).

### D13. `getChats` swallows API errors — LOW
- OLD `chats.ts:51-54` throws, so the page errors.
- NEW `frontend/src/actions/messages/chats.ts:103-108` returns `[]`, so a backend failure shows the empty state "Βρείτε ένα επαγγελματικό προφίλ…" as if the user had no chats. `getChat` is also called twice per chat-page render (`page.tsx:36,57`), which is wasteful.
- Possibly intentional?: no.

## 4. Confirmed same (verified)
- **Who can start a chat:** any logged-in user with anyone except themselves. The UI self-check text is "Δεν μπορείς να στείλεις μήνυμα στον εαυτό σου". Logged-out users get an AuthRequiredDialog: "Για να επικοινωνήσεις με Chat πρέπει να έχεις λογαριασμό". A block in either direction rejects creation (generic toast "Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά."). As in old, an existing chat stays usable after a block, because sendMessage has no block check in either app.
- **When "Επικοινωνία" creates a chat:** only on dialog submit, with get-or-create then sendMessage, then a push to `/dashboard/messages?chatId=…`, which redirects to the most recent chat. The service page pre-fills `Ενδιαφέρομαι για την υπηρεσία "…" (X€)` plus add-ons. The call sites and `profile.uid` are identical.
- **Dedup:** NEW checks its deterministic cid `a::b` first, then falls back to the old "both members and exactly 2 members" set match, so legacy nanoid-cid chats are reused.
- **Chat list:**
  - order is `lastActivity DESC`;
  - chats with 0 non-deleted messages are hidden;
  - unread = messages not by me, `read=false`, `deleted=false`;
  - the item shows `formatCompactMessageTime(lastActivity)`, the last message content or "Δεν υπάρχουν μηνύματα ακόμα", and a red badge when unread > 0;
  - search ("Αναζήτηση συνομιλιών...", "Δεν βρέθηκαν αποτελέσματα για …") matches the name and last-message content.
- **Index page:** redirects to `chats[0].cid || id`. The empty state text is identical, and so are the "Αυτή η συνομιλία δεν είναι διαθέσιμη / Ο άλλος χρήστης…" texts.
- **Messages:**
  - first page is 20, newest-first and then reversed;
  - older pages load 50 at a time with `before = oldest createdAt`, and `hasMore` starts as `initial >= 20`;
  - the reply target must be in the same chat;
  - send trims content and updates `lastMessageId` and `lastActivity`;
  - edit is author-only, rejects deleted messages and sets edited/editedAt (no UI in either app; old `message-edit.tsx` was never imported).
- **Mark-read:** runs on open for initial unread messages and for every incoming realtime message. Messages authored by the reader are excluded. Neither app checks membership (a pre-existing old weakness, mirrored).
- **Total unread badge:** SWR 60s, revalidate on focus, hidden on `/dashboard/messages*`, shows "99+" above 99. Same in the header MessagesMenu and the dashboard sidebar.
- **Reactions:** toggle enforces one reaction per user (algorithm identical). Neither app checks membership.
- **Timestamps:** `lib/utils/formatting/time.ts` is byte-identical. The date divider is identical: Σήμερα / Χθες / el-GR "15 Ιανουαρίου 2024".
- **Greek UI copy:** all of it in `components/messages/*` is identical. All files except `chat-list-item`, `chat-list-container`, `chat-messages` (ticks), `chat-sidebar` (auth source) and `messages-container` (dedupe/sort) are byte-identical, and those diffs are covered above. That copy includes "Πληκτρολογήστε την απάντησή σας...", "Εισάγετε μήνυμα...", "Απάντηση στον εαυτό σου / σε X", "Νέο Μήνυμα προς X", "Αποστολή…" and "Το μήνυμα στάλθηκε επιτυχώς". Some English toasts ("Message copied to clipboard", "Failed to add reaction") are English in old too.
- **Digest cron logic:** runs every 15 minutes. It collects all unread, non-deleted messages from others, dedupes against all past EmailBatch messageIds (no cooldown, no age window), records one batch per send, and shows times as HH:MM in Europe/Athens with 120-char previews in the HTML.
- **Optimistic send:** the new version dedupes against the server id instead of a 1s removal timer. The visible result is the same or better (no duplicate or vanishing bubble).
- **Attachments:** neither app has any.

## 5. Open questions / couldn't verify
- **Double digest scheduling:** both the Celery beat task (`config/settings/base.py:323`) and the HTTP cron endpoint exist. If Dokploy also hits `/api/cron/process-email-batches`, two concurrent runs could race and double-send, because the EmailBatch dedupe isn't transactional or locked. I couldn't see the Dokploy cron configuration.
- **Old `CHAT_LIST_SELECT.lastMessage.where`:** it uses `where: {deleted:false}` on a to-one relation, which Prisma doesn't normally allow, so I couldn't tell whether old hid admin-deleted last-message previews. New ships `content: null` for a deleted last message, and the list falls back to "Δεν υπάρχουν μηνύματα ακόμα".
- **ApiError text for DRF validation failures (D9):** I didn't trace what text `ApiError.message` carries for these in `client.ts`; it may be English or a generic string.
- **Admin chat capabilities:** delegated to the admin domain and not verified here.
- **No live run:** I didn't exercise the WebSocket flows. The D1 race is inferred from the code.
