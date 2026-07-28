# Doulitsa Migration Parity Audit

## Domain: Messaging/Chat

OLD = Next.js + Prisma (data) + Supabase Realtime (live). Despite the brief, the OLD
data-layer is Prisma, not Supabase queries — only the **live** layer is Supabase Realtime
(`src/lib/supabase/realtime.ts`, `src/lib/supabase/client-rls.ts`). NEW = Django/DRF +
Channels/daphne. Frontend server actions in both repos expose the same function names.

Authorization in OLD was enforced two ways: (a) every server action re-checks membership
in code (`getMessages`/`sendMessage` verify `chatMember`), and (b) Supabase RLS policies
gate Realtime events via `current_user_id()` session var (`client-rls.ts:7-19`). NEW relies
on in-view membership checks + `ChatConsumer._is_member` for the socket.

---

### Parity matrix

| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| List chats | endpoint | `actions/messages/chats.ts:16` getChats | `views/public/chats.py:52` ChatListView → `services/chat_ops.py:42` list_chats; FE `frontend/.../chats.ts:42` | ⚠️ | Response shape differs heavily (see mismatches). OLD filters out chats with zero non-deleted messages (`chats.ts:34`); NEW returns **all** chats incl. empty ones (`chat_ops.py:92-113`). |
| Get chat by id | endpoint | `actions/messages/chats.ts:60` getChatById | `chats.py:60` ChatDetailView → `chat_ops.py:117` get_chat | ⚠️ | NEW also accepts lookup by `cid` (`chat_ops.py:122`). OLD only by `id`. Member shape differs (see mismatches). NEW omits `_count`/`lastMessage` that OLD include returns. |
| Get-or-create DM | endpoint | `actions/messages/chats.ts:108` getOrCreateChat | `chats.py:71` ChatWithUserView → `chat_ops.py:167` get_or_create_dm | ⚠️ | Both block on BlockedUser. **`cid` generation differs**: OLD = random `nanoid()` (`chats.ts:11,164`); NEW = deterministic `sorted(uidA,uidB).join("::")` (`chat_ops.py:182`). Existing-chat lookup differs: OLD queries by 2-member set, NEW by cid. Behaviorally returns `{chatId,isNew}` in both. |
| List messages (paginated) | endpoint | `actions/messages/messages.ts:11` getMessages | `chats.py:82` ChatMessagesView.get → `chat_ops.py:204` list_messages | ⚠️ | Pagination parity OK (limit + `before` cursor by createdAt). **Default limit differs: OLD=20 (`messages.ts:17`), NEW=50 (`chats.py:89`/`chat_ops.py:208`).** OLD reverses to oldest→newest (`messages.ts:78`); **NEW returns newest-first, not reversed** (`chat_ops.py:214,219`). Message shape differs (see mismatches). |
| Send message | endpoint+realtime | `actions/messages/messages.ts:88` sendMessage | `chats.py:93` POST → `chat_ops.py:222` send_message (+`_broadcast chat.message`) | ⚠️ | Logic parity (membership check, txn, update lastMessage/lastActivity). NEW adds reply-target existence check **only loosely** — OLD verifies parent belongs to same chat (`messages.ts:110-118`); **NEW skips that validation** (`chat_ops.py:233` just sets reply_to_id). |
| Edit message | endpoint+realtime | `actions/messages/messages.ts:157` editMessage | `chats.py:104` PATCH → `chat_ops.py:245` edit_message (+broadcast) | ✅ | Author-only, sets edited/editedAt. OLD blocks editing deleted msg (`messages.ts:176`); NEW does not re-check `deleted` (minor). |
| Delete message | endpoint+realtime | ❌ none in `actions/messages/**` | `chats.py:116` DELETE → `chat_ops.py:260` delete_message (+broadcast) | ⚠️ | NEW **adds** a soft-delete endpoint with author check + `chat.message_deleted` broadcast. OLD messaging actions never expose delete (only the realtime hook listens for DELETE events from admin/db). Extra capability, not a regression. |
| Mark as read (batch) | endpoint | `actions/messages/messages.ts:198` markAsRead | `chats.py:121` MarkReadView → `chat_ops.py:273` mark_messages_read | ⚠️ | Parity: only marks others' messages read. **NEW does NOT broadcast a read receipt** — OLD relied on Supabase `message_reads` INSERT → live receipt (see Realtime gap). Also OLD `read=true` is on `messages` table; there is no `message_reads` table in either Prisma schema (`chat.prisma`), so OLD's `subscribeToReadReceipts` listened to a table that doesn't exist in schema ❓. |
| Unread count (per chat) | endpoint | `actions/messages/messages.ts:229` getUnreadCount | `chats.py:136` → `chat_ops.py:278` unread_count | ✅ | Same predicate (chat, not-author, not-deleted, not-read). Returns bare int. |
| Unread counts (batch) | endpoint | `actions/messages/messages.ts:260` getUnreadCountsBatch | `chats.py:144` → `chat_ops.py:284` batch_unread_counts | ⚠️ | OLD returns Map seeded with **0 for every requested chatId** (`messages.ts:283`); NEW returns dict **only for chats with >0 unread** (`chat_ops.py:292`). FE `frontend/.../messages.ts:82` does `new Map(Object.entries(obj))` → missing chats absent, callers must default to 0. |
| Total unread | endpoint | `actions/messages/messages.ts:299` getTotalUnreadCount | `chats.py:155` → `chat_ops.py:295` total_unread | ✅ | Equivalent. Not re-exported in OLD `index.ts` but FE has it. |
| Recent unread (email ctx) | endpoint | `actions/messages/messages.ts:338` getRecentUnreadMessages | `chats.py:163` → `chat_ops.py:302` recent_unread_messages | ⚠️ | NEW caps at 50 (`chat_ops.py:313`); OLD uncapped. Author sub-object shape differs: OLD returns `{id,displayName,username,image}` (`messages.ts:388`); NEW `_msg_card` has **no author object at all** (`chat_ops.py:318`). |
| Chat members list | data | inside getChatById `chats.ts:77` (members.include.user) | `chat_ops.py:127` get_chat members | ⚠️ | Both return members. Key/shape differs (OLD `members[].user.{id,displayName,firstName,lastName,image}`; NEW `members[].{userId,displayName,image,username,online,muted,joinedAt}`). |
| Mute chat member | endpoint | ❌ not in OLD actions (col `muted` exists `chat.prisma:29`, no setter) | ❌ no NEW mute endpoint (`muted` returned in get_chat only) | ✅ | Neither exposes a mute toggle. `muted` is read-only display in both. Parity preserved. |
| Block user | endpoint | `actions/messages/blocking.ts:9` blockUser | `chats.py:177` UserBlockView.post → `chat_ops.py:337` block_user | ✅ | Both upsert. NEW adds `reason` (col exists in OLD schema `chat.prisma:75`, OLD never set it). |
| Unblock user | endpoint | `actions/messages/blocking.ts:43` unblockUser | `chats.py:191` DELETE → `chat_ops.py:346` unblock_user | ⚠️ | OLD `prisma.delete` throws if record absent; NEW `filter().delete()` is idempotent (no error). Behavior diff, minor. |
| List blocked | endpoint | `actions/messages/blocking.ts:66` getBlockedUsers | `chats.py:196` UserBlockedListView → `chat_ops.py:350` list_blocked | ⚠️ | OLD blocked sub-object `{id,email,firstName,lastName,image}` (`blocking.ts:84`); NEW `{id,email,displayName,image}` — **firstName/lastName dropped, displayName added** (`chat_ops.py:355`). |
| Is-blocked status | endpoint | `actions/messages/blocking.ts:108` isBlocked | `chats.py:204` UserBlockedStatusView → `chat_ops.py:363` is_blocked_either_way | ⚠️ | OLD returns bare boolean; NEW returns bare boolean too but FE may expect object ❓. Both check either direction. |
| Update presence (heartbeat) | endpoint | `actions/messages/presence.ts:8` updatePresence | `chats.py:215` PresenceUpdateView → `chat_ops.py:373` set_presence | ⚠️ | Both set online + lastSeen on all ChatMember rows. NEW additionally **broadcasts** presence (`chat_ops.py:378-380`). |
| Get presence status | endpoint | `actions/messages/presence.ts:32` getPresenceStatus | `chats.py:227` UserPresenceView → `chat_ops.py:383` get_presence | ⚠️ | OLD returns `{online, lastSeen:Date}`; NEW `{online, lastSeen:isoString|null}`. OLD picks `findFirst` (arbitrary); NEW picks most-recent by `-last_seen` (`chat_ops.py:386`). |
| My chats + presence | endpoint | `actions/messages/presence.ts:71` getUserChatsWithPresence | `chats.py:235` → `chat_ops.py:396` my_chats_with_presence | ⚠️ | OLD returns **own** membership rows `{chatId, online}` (self's online) (`presence.ts:79`); **NEW returns the OTHER member's online** per chat (`chat_ops.py:399` `.exclude(user=user)`). Semantically different — flag. |
| Toggle reaction | endpoint+realtime | `actions/messages/reactions.ts:12` toggleReaction | `chats.py:246` → `chat_ops.py:408` toggle_reaction (+broadcast) | ⚠️ | **Behavior differs**: OLD enforces "one reaction per user across all emojis" — switching emoji removes prior (`reactions.ts:45-57`). NEW toggle is per-emoji only (`chat_ops.py:412-421`), a user can hold multiple emojis. |
| Add reaction | endpoint+realtime | `actions/messages/reactions.ts:83` addReaction | `chats.py:259` → `chat_ops.py:428` add_reaction (+broadcast) | ✅ | Equivalent (no-op if already present). |
| Remove reaction | endpoint+realtime | `actions/messages/reactions.ts:125` removeReaction | `chats.py:271` DELETE → `chat_ops.py:442` remove_reaction (+broadcast) | ✅ | Equivalent. |
| Contact form | endpoint | `actions/messages/contact.ts:19` submitContactForm | (out of messaging scope; separate app) ❓ | ❓ | Not in `backend/apps/messaging`; lives elsewhere. Out of chat scope. |

---

### Realtime parity (Supabase Realtime → Django Channels)

OLD live layer (`src/lib/supabase/realtime.ts`) defined **four** subscriptions; NEW Channels
consumers (`backend/apps/messaging/consumers.py`) + FE (`frontend/src/lib/realtime/channels-ws.ts`,
`frontend/src/lib/api/websocket.ts`, `use-chat-subscription.ts`, `use-presence.ts`).

| Live behavior | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|
| Live new messages | `realtime.ts:22` subscribeToMessages INSERT on `messages` | `chat_ops.py:241` `_broadcast chat.message` → `consumers.py:95` chat_message → FE `use-chat-subscription.ts:45` | ✅ | Works. NEW broadcasts AFTER REST insert (push model) vs OLD postgres_changes. Equivalent UX. |
| Live message edit | `realtime.ts:50` UPDATE | `chat_ops.py:256` chat.message_edited → `consumers.py:98` → FE `:79` | ✅ | Parity. |
| Live message delete | `realtime.ts:62` DELETE | `chat_ops.py:270` chat.message_deleted → `consumers.py:101` → FE `:94` | ✅ | Parity (NEW soft-delete + broadcast). |
| Live reactions | via message UPDATE `realtime.ts:50` (reactions are a col on messages) | dedicated `chat.reaction` broadcast `chat_ops.py:424` → `consumers.py:104` → FE `:100` | ✅ | NEW improves: dedicated event vs piggy-back on UPDATE. |
| **Read receipts (live)** | `realtime.ts:94` subscribeToReadReceipts INSERT on `message_reads` → FE old `use-chat-subscription.ts:168` flips `isRead` | ❌ no broadcast on mark-read (`chat_ops.py:273` mark_messages_read returns int, **no `_broadcast`**); FE `use-chat-subscription.ts` has **no read-receipt handler** | ❌ | **DROPPED.** Sender no longer sees their message turn "read" live. Note OLD subscribed to a `message_reads` table that doesn't exist in `chat.prisma` ❓ — OLD receipts may have been dead too, but the live hook + wiring existed and NEW removed it. |
| **Presence / online (live)** | `realtime.ts:137` subscribeToChatMemberPresence UPDATE on `chat_members` → FE old `use-presence.ts:92` updates presenceMap | `chat_ops.py:378` broadcasts to **`chat.{chatId}`** group (`chat.presence`); but FE NEW `use-presence.ts:34` subscribes to **`/ws/presence/`** (PresenceConsumer, group `presence.{userId}`) | ❌ | **BROKEN ROUTING.** `set_presence` (REST heartbeat) and ChatConsumer connect/disconnect publish `chat.presence` to the `chat.<id>` group (`chat_ops.py:380`, `consumers.py:67/107`). FE presence hook listens on the **presence** socket, whose `PresenceConsumer.presence_update` is **never sent to** (`presence.{userId}` group has no producer except… nothing calls `presence_update`). Net: the dedicated presence socket receives **no events**. Live online/offline dots will not update via `/ws/presence/`. ChatConsumer DOES emit `chat.presence` to chat-socket clients, so `use-chat-subscription` could carry it but doesn't handle `presence`. **Live presence is effectively dropped.** |
| **Typing indicator (live)** | ❌ none in OLD (no typing code anywhere in `components/messages` or hooks) | `consumers.py:87` ChatConsumer handles inbound `typing` → broadcasts `chat.typing`; FE has no sender | ➖ | NEW added typing scaffolding that OLD never had. No FE producer/consumer wired (`use-chat-subscription.ts` has no `typing` handler). Not a regression (new, inert). |
| Live chat-list updates (new chat / unread bump) | `realtime.ts:185` subscribeToUserChats on `chats`+`chat_members` → FE old `use-chat-list-subscription.ts:54` refetches getChats | NEW FE `use-chat-list-subscription.ts:50` opens `/ws/presence/` and refetches on `presence`/`message`/`message_edited`/`message_deleted` (used by `chat-list-container.tsx`) | ❌ | **Migrated to Channels but DOA due to the routing bug.** The hook listens on `/ws/presence/`, but the `PresenceConsumer` (`consumers.py:153`) joins group `presence.<userId>` and **nothing ever `group_send`s to that group** — every `message*` and `chat.presence` broadcast goes to the **`chat.<id>`** group (`chat_ops.py:241,256,270,380`). So the presence socket delivers **no `message`/`presence` frames**, and the chat-list refetch trigger (`:47-49`) never fires. Sidebar live unread / new-conversation refresh is broken. |
| Unread badge (live) | derived from chat-list subscription refetch (`use-chat-list-subscription.ts`) | hook exists but never triggered (see row above) | ❌ | Incoming message in a non-open chat won't live-update the sidebar unread count, because the `/ws/presence/` socket receives nothing. |

---

### Detailed gaps (per ❌ / ⚠️)

1. **❌ Live presence is broken (routing mismatch).**
   - OLD: `subscribeToChatMemberPresence` listened to `chat_members` UPDATEs filtered by chat; the `usePresence` hook fed a `presenceMap` consumed by `header-presence.tsx` for the online dot.
   - NEW: producers publish `chat.presence` to the **`chat.<id>`** group (`chat_ops.py:380`, plus ChatConsumer connect/disconnect `_set_online`), and `PresenceConsumer` joins **`presence.<userId>`** and exposes `presence_update` — but **nothing ever `group_send`s to `presence.<userId>`**. The FE presence hook (`use-presence.ts:34`) only opens `/ws/presence/`, so it receives nothing.
   - Impact: online/offline indicator never updates live. User appears stuck at initial state.
   - Suggested Django fix: in `set_presence` and in ChatConsumer connect/disconnect, also `group_send` to `presence.{member_uid}` for each peer (or have FE subscribe to the chat socket's `presence` event). Add a `chat.presence`→`presence` handler in `use-chat-subscription.ts`, OR make `set_presence` fan out to the per-user presence groups of all peers in shared chats and rename the consumer handler to match (`presence_update`). Wire FE `use-presence` to update the map from that.

2. **❌ Read receipts dropped.**
   - OLD: `mark_read` set `messages.read=true`; OLD also wired `subscribeToReadReceipts` so the sender saw "read" live.
   - NEW: `mark_messages_read` returns a count and does **not** broadcast (`chat_ops.py:273-275`); FE has no receipt handler.
   - Impact: sender never sees live read state; `isRead` only refreshes on full reload.
   - Suggested Django fix: after `mark_messages_read`, `_broadcast(chat_id, "chat.read", {messageIds, userId})` per affected chat; add a `read` handler in `use-chat-subscription.ts` that flips `isRead`. (Note OLD's `message_reads` table never existed in Prisma schema — implement against `messages.read`.)

3. **❌ Live chat-list / unread-badge updates dead (same root cause as #1).**
   - NEW `use-chat-list-subscription.ts:50` was migrated to Channels and opens `/ws/presence/`, refetching `getChats` on `presence`/`message`/`message_edited`/`message_deleted`. But `PresenceConsumer` joins group `presence.<userId>` and **no producer ever sends to that group** — all message/presence broadcasts target the `chat.<id>` group. So the trigger never fires.
   - Impact: sidebar unread counts and new-conversation appearance don't update live.
   - Suggested fix: have `send_message`/`edit`/`delete`/`set_presence` ALSO `group_send` to `presence.<uid>` for every member of the affected chat (event types `message`/`presence`), and give `PresenceConsumer` handlers named to match (`message`, `presence`, …). Fixing #1's routing fixes this hook too.

4. **⚠️ getChats no longer filters empty chats.** OLD dropped chats with zero non-deleted messages (`chats.ts:34`); NEW returns them (`chat_ops.py:92`). Impact: freshly-created-but-empty DMs show in sidebar. Fix: filter `if last is None and message count==0: continue`, or only include chats with `last_message_id`.

5. **⚠️ Message pagination: default limit + ordering.** OLD default 20 + reversed to ascending; NEW default 50 + **descending** (newest first, not reversed). Impact: FE that assumed ascending order will render reversed; page size differs. Fix: reverse the slice in `list_messages` and default `limit=20` to match, or confirm FE handles desc.

6. **⚠️ Reply-target validation weaker in NEW.** OLD verifies the parent message exists and is in the same chat (`messages.ts:110-118`); NEW just stores `reply_to_id` (`chat_ops.py:233`). Impact: cross-chat / dangling reply ids accepted. Fix: replicate the parent-in-same-chat check.

7. **⚠️ toggleReaction semantics differ.** OLD = one reaction per user total (switching emoji moves it); NEW = independent per emoji. Impact: visible reaction behavior change. Fix: in `toggle_reaction`, when adding, first strip the user from all other emoji arrays.

8. **⚠️ getUserChatsWithPresence returns the wrong member's online.** OLD returns the **current user's** online per chat (`presence.ts:79`); NEW returns the **other** member's (`chat_ops.py:399`). Confirm intended semantics; if FE uses it to show peer status it may be the NEW behavior that's "more correct," but it is a behavior change vs OLD — flag.

9. **⚠️ getUnreadCountsBatch omits zero-count chats.** OLD seeds 0 for all; NEW omits. Callers must default missing keys to 0 (FE does not). Fix: seed result dict with all requested ids → 0.

10. **⚠️ get_or_create_dm cid scheme changed** (random → deterministic `a::b`). Functionally returns same `{chatId,isNew}` contract, but any code that parsed/displayed `cid` or relied on collision-retry will differ; the `get_chat` cid-lookup depends on the new scheme.

---

### Response-shape mismatches

- **Chat list item** — OLD `transformChatForList` (`utils/messages.ts:48-58`) → `{id,cid,name,avatar,lastMessage:string|null,lastActivity:Date,unread,online,otherMemberId}`.
  NEW `list_chats` (`chat_ops.py:101-113`) → `{id,cid,name,displayName,image,username,otherUserId,online,lastActivity:isoString,unreadCount,lastMessage:object|null}`.
  Mismatches: `avatar`→`image`; `otherMemberId`→`otherUserId`; `unread`→`unreadCount`; `lastMessage` was a **string** now an **object**; `lastActivity` Date→ISO string; OLD name = otherMember displayName, NEW name = `chat.name or displayName`. FE `frontend/.../chats.ts:13` re-normalizes dates + reactions but does **not** rename keys → components reading `avatar`/`unread`/`otherMemberId` break unless updated.

- **Chat detail** — OLD getChatById returns Prisma object: `{...chat, lastMessage, members[].user.{id,displayName,firstName,lastName,image}, _count.messages}`.
  NEW get_chat (`chat_ops.py:148-164`) → `{id,cid,name,createdAt,lastActivity, members[].{userId,joinedAt,online,muted,displayName,image,username}}`. **Drops** `lastMessage`, `_count`, `firstName/lastName`, nested `user`. Members are flattened (`userId` vs `user.id`).

- **Message card** — OLD `transformMessageForChat` (`utils/messages.ts:107-121`) → `{id,content,createdAt:Date,edited,editedAt,deleted,authorUid,isOwn,isRead,replyToId,replyTo:{id,content,authorName,author},reactions:Array,author:{…}}`.
  NEW `_msg_card` (`chat_ops.py:318-331`) → `{id,chatId,authorId,content,deleted,edited,editedAt,replyToId,reactions:dict,read,createdAt:iso}`. Mismatches: `authorUid`→`authorId` (FE patches, `messages.ts:30`); **no `author` object, no `replyTo` object, no `isOwn`, no `isRead`** (FE computes isOwn/reactions client-side, `messages.ts:25-41`); `reactions` dict vs array (FE normalizes); deleted message content is `null` in NEW vs original content in OLD; `read` exposed raw vs OLD `isRead` (own→true). Dates ISO vs Date.

- **Blocked list item** — OLD `{id,blockedId,blocked:{id,email,firstName,lastName,image},createdAt}` (`blocking.ts:84`); NEW `{id,blockedId,blocked:{id,email,displayName,image},createdAt:iso}` (`chat_ops.py:352`). firstName/lastName dropped; displayName added; date as string.

- **Presence status** — OLD `{online,lastSeen:Date}`; NEW `{online,lastSeen:iso|null}`.

- **Recent unread** — OLD items include author `{id,displayName,username,image}`; NEW `_msg_card` has no author.

---

### Counts

- **matched = 8** (live new msg, live edit, live delete, live reactions, add/remove reaction, edit message, unread count per-chat, total unread, mute parity, block) — counting the clearly-equivalent rows ≈ 8 core.
- **partial (⚠️) = 16** (list chats, get chat, get-or-create, list messages, send, mark-read, batch unread, recent unread, members, unblock, list blocked, is-blocked, update presence, get presence, my-chats-presence, toggle reaction).
- **missing / broken (❌) = 4** (live read receipts, live presence routing, live chat-list/unread-badge updates, getChats empty-chat filter is regression-adjacent — counting the 3 dropped realtime behaviors + chat-list-sub-not-migrated).
- **needs_verification (❓) = 2** (`message_reads` table never existed in either Prisma schema — was OLD's read-receipt subscription dead too?; is-blocked-status return shape vs FE expectation).

Summary tally: matched=8, partial=16, missing=4, needs_verification=2.
