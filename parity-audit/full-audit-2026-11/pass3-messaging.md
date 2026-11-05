# Messaging / chat parity audit — pass 3 (fresh re-audit) — 2026-11-05

Read first: `_INSTRUCTIONS.md` (with the Addendum), `SUMMARY.md`, `messaging.md`, `pass2-state-machines.md` (incl. C1), `pass2-authz-security.md`. I also grepped every other report for chat, unread, digest, websocket and consumer to dedupe (admin D14/D15, schema-db D4/D5/D6/C2, blog-support D2, copy-sweep digest footer, validation-matrix chat rows).

This file lists only NEW findings, plus corrections and re-verifications. No code was changed.

## 1. Coverage

### OLD files read (re-derived with `find`/`grep` over `oldnext/src`)
- `actions/messages/{index,chats,messages,blocking,presence,reactions,contact}.ts`
- `app/(dashboard)/dashboard/messages/page.tsx`, `[chatId]/page.tsx`
- `components/messages/*`, all 26 files including the `.backup` files and the never-imported `header-actions`, `message-edit` and `message-reactions`. Re-confirmed by grep that these three, and `use-infinite-scroll`, are never imported.
- `lib/hooks/chat/{use-chat-subscription,use-chat-list-subscription,use-presence,use-message-optimistic,use-infinite-scroll}.ts`, `lib/hooks/use-unread-count.ts`
- **Missed by pass 1 (read now):**
  - `lib/supabase/client-rls.ts`: what the realtime socket really authenticated with.
  - `lib/supabase/client.ts`, `lib/supabase/client-jwt.ts` and `lib/supabase/server-rls.ts`: none of them is on the realtime path; grep found no importer outside `lib/supabase`.
  - `app/api/auth/exchange-token/route.ts`: owned by auth; only `client-jwt.ts` calls it, and that file is unused.
- `lib/supabase/realtime.ts`, `lib/utils/messages.ts`, `lib/utils/formatting/time.ts`, `lib/database/selects/chat.ts`, `lib/prisma/schema/chat.prisma`
- `app/api/cron/process-email-batches/route.ts`, `lib/email/services/message-emails.ts`, `constants/email/templates/unread-messages.ts`
- Consumers:
  - `components/dashboard/{button-messages,dashboard-content(chat card),dashboard-sidebar(badge)}.tsx`
  - the StartChatDialog call sites in `profile/profile-info.tsx` and `service/service-buy.tsx` (diffed: identical)
  - `middlewares/withLowercaseRedirect.ts`, checked for the effect on cid URLs (identical; it only lowercases the static prefix)

### NEW files read
- Frontend:
  - `actions/messages/{chats,messages,reactions}.ts`, `lib/api/messaging.ts`, `lib/realtime/channels-ws.ts`
  - `lib/hooks/chat/*`, `lib/hooks/use-unread-count.ts` (identical to old), `lib/utils/messages.ts`
  - both messages pages, every `components/messages/*` (diffed file by file again: only `chat-list-container`, `chat-list-item`, `chat-messages`, `chat-sidebar` and `messages-container` differ)
  - `app/api/auth/ws-token/route.ts`, `middleware.ts`, `middlewares/withTokenRefresh.ts`
  - `lib/api/client.ts` (refresh path), `lib/auth/cookies.ts` (max ages)
- Backend:
  - `apps/messaging/{consumers.py, services/chat_ops.py (all), views/public/chats.py, views/public/cron.py, urls/*, models/chat.py, tasks.py (digest), emails.py (digest builder)}`
  - `config/asgi.py`, `config/channels_routing.py`
  - `config/settings/base.py`: CHANNEL_LAYERS, SIMPLE_JWT, throttles, `ATOMIC_REQUESTS=False`
  - `apps/messaging/views/admin/chats.py`: checked only for writes that would need a broadcast; it has none

### Delegated elsewhere
Unchanged from pass 1:
- admin chats → admin
- exchange-token / better-auth JWT → auth
- digest copy/layout → emails

## 2. Mapping
No change from `messaging.md` §2. One correction to the realtime row: the OLD Supabase socket was authenticated with the **public anon key**, not a per-user JWT. See C2.

## 3. NEW DIFFERENCES

### P3-D1. Optimistic message bubbles are now visible. A failed send looks like a sent message, and the temp bubble is interactive — MEDIUM
- OLD: `lib/hooks/chat/use-message-optimistic.ts:27` keeps state in a per-instance `useState`. `MessageInput` (`message-input.tsx:59`) and `MessagesContainer` (`messages-container.tsx:46`) each call the hook, so the container's `optimisticMessages` is always `[]`. Visible behavior:
  - A sent message appears only when the realtime INSERT echo arrives.
  - On a failed send (`sendMessage` throws "Failed to send message"), nothing appears. The input is already cleared, but the user can see the message never arrived.
- NEW: `frontend/src/lib/hooks/chat/use-message-optimistic.ts:34-56` puts the state in a module-level zustand store keyed by chatId, so the bubble renders at once (`messages-container.tsx:162-179`). Consequences:
  1. **Failed send looks successful.** On error the entry is only patched to `error: true` (`:119`). `chat-messages.tsx` never reads `sending` or `error`: there is no failure style and no retry (`retryMessage` is not wired to any UI). The bubble stays, with the single "Check" tick from messaging D5. Trigger cases include: content over 20000 characters (DRF 400), not a member (403), reply-to-temp (point 2), and a network or 5xx failure. The user believes the message was sent.
  2. **The temp bubble is interactive.** It keeps id `temp-<ts>` until a server echo with the same `serverId` arrives. If the WS is down it keeps that id indefinitely; see P3-D2.
     - **Reply** passes `replyToId="temp-…"`. `send_message` returns 400 "Invalid reply target" (`chat_ops.py:347-350`), so the reply fails too, and it looks sent as well (point 1).
     - **React** calls `toggleReaction("temp-…")`, which returns 404 and is swallowed silently (P3-D4).
     - OLD never exposed temp bubbles.
  3. **Phantom bubbles survive navigation.** The store is never cleared. Returning to the chat client-side re-shows failed (`error`) bubbles, and any sent bubble whose real id isn't among the freshly loaded last-20 messages is shown again (sorted chronologically). This lasts until a full reload.
  4. **Ordering and duplicates.** The bubble is ordered by the client clock (`createdAt: new Date()`), and the combined list is now sorted. With clock skew the bubble sorts above or below its real place. If the WS echo arrives before the POST resolves, `serverId` isn't set yet, so the real and temp bubbles both show for a moment.
- Impact: users can lose messages without knowing, especially replies to their own just-sent messages.
- Fix:
  - render `error` (and `sending`) state, and wire `retryMessage`; or remove the bubble on error with a toast;
  - disable reply and react while `id` starts with `temp-`, or use `serverId` once known;
  - clear `byChat[chatId]` on unmount;
  - dedupe on `serverId` or on content plus near timestamp.
- Possibly intentional?: the instant bubble is a deliberate fix (see the hook comment). The silent-failure and temp-id consequences are not.

### P3-D2. WS (re)connects fail after the 15-minute access cookie expires: realtime gap, and missed messages are never back-filled — LOW
- OLD:
  - `lib/supabase/client-rls.ts` `generateCustomJwt()` returns `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `supabase.realtime.setAuth(anonKey)` uses it. That key never expires, so Supabase channel rejoins after a network drop, sleep or deploy always succeeded.
  - `authClient.getSession()` (7-day better-auth session) was the only per-user step.
- NEW:
  - `channels-ws.ts:36-50` gets the token from `GET /api/auth/ws-token`. That route (`app/api/auth/ws-token/route.ts`) only reads the `dj_access` cookie and never refreshes it.
  - The refresh middleware doesn't run there: `middleware.ts` matcher `/((?!api|…).*)` excludes `/api`.
  - The cookie's `maxAge` is 15 minutes (`lib/auth/cookies.ts:37`). After 15 minutes without a page navigation, any reconnect works like this: ws-token returns 401 `{token:null}`, the socket connects without a token, `ChatConsumer` / `PresenceConsumer` close it with 4401, and the client retries with backoff up to 30s (`channels-ws.ts:20-21,127-134`).
  - It only recovers after some server action refreshes the cookie via the 401 path (`client.ts:231-262`), typically the 60s `useUnreadCount` poll from the dashboard layout. So the gap is about 1–1.5 minutes.
  - After reconnect, `use-chat-subscription.ts` does no catch-up fetch, so messages broadcast during the gap never appear in the open thread until a reload. OLD also had no catch-up, but never had this auth-induced gap.
- Impact: after a laptop sleep, a Wi-Fi change, a mobile tab coming back from background or a Daphne redeploy, incoming messages are silently missing from an open chat. The sidebar self-heals on the next event.
- Fix: refresh inside `ws-token` (route handlers can set cookies), or make the client retry `ws-token` after a server action; and refetch the latest page of messages on socket reopen.
- Possibly intentional?: no.

### P3-D3. Read ticks from messaging D5 are misleading after a reload: every own message from the server shows "seen" — LOW (refines messaging D5)
- OLD: no ticks (D5). `transformMessageForChat` forces `isRead = true` for own messages (`utils/messages.ts:78`), but nothing renders it.
- NEW: `actions/messages/messages.ts:48` keeps `isRead: isOwn || read`. So every own message loaded by `getMessages` renders `CheckCheck` (`chat-messages.tsx:285-291`), whether or not the other user has read it. Only bubbles sent live in this session show a single `Check` until a `read` event arrives.
- Impact: the "seen" indicator is wrong for all history. This is a stronger reason to resolve D5 by removing the ticks (OLD parity), or to base own-message `isRead` on the backend `read` flag.
- Possibly intentional?: the ticks maybe; the wrong state no.

### P3-D4. Reaction failures no longer show the "Failed to add reaction" toast — LOW
- OLD: `actions/messages/reactions.ts:74-77` throws `Failed to toggle reaction`. `chat-messages.tsx` `handleToggleReaction` catches it and shows `toast.error('Failed to add reaction')`.
- NEW: `frontend/src/actions/messages/reactions.ts:8-19` catches every error and returns `{success:false}`. The component (identical) only toasts on a throw, so a failure (404 on a deleted, temp or foreign message, a 429, or a network error) does nothing visible.
- Fix: throw, or have the component check `success`.
- Possibly intentional?: no.

## 4. Corrections

- **C1 (to messaging.md §4 "Optimistic send … the visible result is the same or better"):** wrong. OLD's optimistic bubble never rendered (two separate `useState` instances, see P3-D1). The new instant bubble is a visible behavior change, and it introduces the failure modes in P3-D1.
- **C2 (to pass2-authz-security.md D7, OLD description):**
  - The claim was that OLD used "a 15-minute Supabase JWT minted only for a live better-auth session". In fact the realtime path (`realtime.ts` → `client-rls.ts`) authenticated every socket with the **anon key** (`generateCustomJwt` returns `NEXT_PUBLIC_SUPABASE_ANON_KEY`). It subscribed even without a session: it just skipped `set_user_id`. `client-jwt.ts` and `/api/auth/exchange-token` are never imported on that path.
  - So in OLD a banned user's already-open channels also kept receiving, and a channel didn't even require a session. NEW is stricter: JWT plus a membership check on `ChatConsumer` connect.
  - What remains valid in D7: there's no `is_active` / banned check at connect. "Keeps receiving until disconnect" is not a regression.
- **Confirmed pass2-state-machines C1:**
  - In `chat_ops.py:86-102` the Profile fields are stored under the user id and read back under the chat id. So the list name is `User.display_name → first+last → name → Χρήστης`, and the list `username` is always null.
  - The header (`get_chat:190-221`) prefers `Profile.display_name`.
  - The pass-1 D6 statement "list … prefer Profile.display_name" is therefore wrong for the list name. It is right for the list avatar (`profile_image_by_uid`) and for the header.

## 5. Re-verified same (pass-1 "confirmed same" items checked again against code)
- **Start chat:** call sites are identical; `profile.uid` = `user_id`. Block in either direction rejects it (`chat_ops.py:236-244`). Self is rejected server-side, and the UI checks first. Flow: get-or-create, then send, then `/dashboard/messages?chatId=` and the index redirect.
- **Dedup:** the deterministic cid is checked first. Then the legacy exactly-2-member set match (`:256-273`), which equals the old `some a AND some b AND none outside {a,b}`.
- **Chat list:**
  - `-last_activity` order (Postgres NULLS FIRST in both);
  - chats without non-deleted messages are hidden;
  - unread = others' messages with `read=false, deleted=false`;
  - search over name and last-message content;
  - the badge reads `chat.unread`.
- **Index page:** byte-identical apart from the session helper.
- **Chat page:** lookup by cid, then by id; the "not available" texts; `key={selectedChatId}`. The guards are already known (D2).
- **Messages:**
  - 20 newest, then reversed; deleted messages excluded;
  - older pages 50 with `before` = ISO createdAt; `hasMore` initial `>= 20`;
  - reply target must be in the same chat;
  - content trimmed (DRF `CharField` trims as well), `lastMessageId` / `lastActivity` updated in a transaction;
  - the broadcast runs after commit (`ATOMIC_REQUESTS=False`).
- **Mark-read:**
  - only the initial 20 plus realtime messages, excluding own. In BOTH apps, unread messages older than the latest 20 are never marked read, so such a chat's badge never reaches 0. This is parity, not a regression.
  - The realtime effect re-marks the same ids on every new message (both apps).
- **Total unread badge:** `use-unread-count.ts` and `button-messages.tsx` are byte-identical (60s poll, focus revalidate, hidden on `/dashboard/messages*`, "99+").
- **Chat-list socket churn:** `refreshChats` is in the effect deps, so each refresh closes and reopens the list subscription twice. OLD had exactly the same structure with Supabase channels, so this is parity. NEW's presence refcount absorbs it, because other sockets stay open.
- **Realtime payload handling:** new message, edit, delete, reaction and reply lookup map 1:1 to OLD's INSERT/UPDATE/DELETE handlers. New messages have `author: null` in both. Admin chat views do no writes, so no broadcast is missing (OLD admin also had no message writes).
- **OLD `revalidatePath('/dashboard/messages')` in reactions.ts:** NEW drops it. There is no visible effect: client state in the list and messages hooks is `useState(initial)`, so the server re-render never changed the UI.
- **Reactions:** the one-per-user toggle algorithm is identical (`{}` vs `null` is known D10).
- **Online/presence:** still rendered nowhere in either app (grep `online` in components/messages: only header-presence state).
- **Digest:**
  - candidate users, the unread filter, all-time EmailBatch dedupe, 120-character previews, Athens HH:MM, `φίλε` / `Χρήστης` fallbacks, `/dashboard/messages` link;
  - HTML is unescaped in both (OLD's template interpolates raw content too, so this is parity);
  - the digest's `user.save(update_fields=…)` triggers no User signals (none registered).
- **Attachments:** neither the old Prisma schema nor the new models have any attachment fields or flows.
- **Copy:** `time.ts` is byte-identical; Σήμερα/Χθες divider; all Greek copy in `components/messages/*` unchanged apart from known items.

## 6. Open questions
- **Did OLD realtime deliver anything at all?** With an anon-key socket, Supabase `postgres_changes` honours RLS for the `anon` role. The `set_user_id` RPC sets a PostgREST session variable that Realtime does not see. If `messages`, `chats` and `chat_members` had RLS policies based on `current_user_id()`, OLD prod received **no** realtime events, and then messaging D1 (old list refreshed via the heartbeat) and this report's realtime comparisons describe intended rather than actual OLD behavior. This needs a look at the Supabase RLS policies or a live test on doulitsa.gr.
- **Daphne restart:** do `disconnect` handlers run on a Daphne restart? If not, the presence refcount stays raised for up to 2h. That's invisible today because no UI renders online.
