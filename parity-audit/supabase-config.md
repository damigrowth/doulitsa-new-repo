# Supabase-Specific Features & Config Parity

**Scope:** Supabase-specific features (Storage, Realtime, Edge Functions/SQL/RPC) + environment/integration parity.
**Method:** every claim cites `file:line`. `❓` marks unverifiable items.
**Codebases:**
- OLD: `/home/sereth1/Desktop/doulitsa-new-repo/app_before_migrations` (Next.js + Supabase + Better Auth + Prisma)
- NEW backend: `/home/sereth1/Desktop/doulitsa-new-repo/backend` (Django + DRF + Channels + Celery)
- NEW frontend: `/home/sereth1/Desktop/doulitsa-new-repo/frontend` (Next.js)

---

## Matrix

| Feature/integration | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| **Supabase Storage (buckets/upload/download/signed/public URLs)** | Storage | *Not used* — no `.storage.from()` / `createSignedUrl` / `getPublicUrl` anywhere in `src` (grep clean) | n/a | ✅ MATCH (N/A) | OLD never used Supabase Storage; all media goes through Cloudinary. Storage schema exists in DB dump (`storage.*` triggers) but is dead infra. |
| **Media upload (Cloudinary signed)** | Storage | `actions/cloudinary/get-media-library-token.ts:43-49` (`cloudinary.utils.api_sign_request`); widget `components/media/upload/cloudinary-upload-widget.tsx:46,121-129`; sig endpoint `/api/sign-cloudinary-params` | `apps/media/services/cloudinary_signing.py:24-58`; view `apps/media/views/public/sign.py:26`; `apps/media/services/cloudinary_upload.py`; model `apps/media/models/media.py` | ✅ MATCH | Both sign params server-side; secret stays server-side. NEW reimplements both `sign-cloudinary-params` and admin `media-library-token` (cloudinary_signing.py:8). Frontend proxies via `app/api/sign-cloudinary-params/route.ts`. |
| **Upload size/type limits** | Storage | Widget 10MB JPG/JPEG/PNG/WebP, min 400×400, 1:1 crop `cloudinary-upload-widget.tsx:49,50,123`; simple-upload 15MB `media-upload-simple.tsx:43-44` (client-only) | Server-enforced 10 MiB + content-type allowlist `cloudinary_upload.py:28,49-53`; `local_upload.py:30,52-63` | ✅ MATCH (improved) | NEW adds **server-side** size/type enforcement (OLD enforced only client-side). One diff: OLD simple-upload allowed 15MB; NEW server caps at 10 MiB. Crop/min-dimension is still client-side in frontend ❓ (not re-verified per-component). |
| **Local media fallback storage** | Storage | none | `apps/media/services/local_upload.py`; `STORAGES`/`MEDIA_ROOT` `config/settings/base.py:345-352` | ➕ NEW EXTRA | NEW adds a local-disk upload path (`signature:"local-storage"`) usable when Cloudinary unset. |
| **Realtime: live new messages** | Realtime | `lib/supabase/realtime.ts:39-71` `subscribeToMessages` (`postgres_changes` INSERT on `messages`); hook `lib/hooks/chat/use-chat-subscription.ts:62` | WS `apps/messaging/consumers.py:95` `chat_message`; broadcast `apps/messaging/services/chat_ops.py:241`; frontend `lib/realtime/channels-ws.ts`, `lib/api/messaging.ts:80` | ✅ MATCH | OLD = Supabase Realtime postgres_changes; NEW = Django Channels group `chat.<id>` over `ws/chat/{id}/`. |
| **Realtime: message edit/delete** | Realtime | `realtime.ts:73-95` UPDATE/DELETE on `messages`; hook `use-chat-subscription.ts` | `consumers.py:98-102` `chat_message_edited`/`chat_message_deleted`; broadcast `chat_ops.py:256,270` | ✅ MATCH | Both edit + delete events broadcast live. |
| **Realtime: reactions** | Realtime | implicit via message UPDATE (`reactions.ts` writes; UPDATE event) | `consumers.py:104` `chat_reaction`; broadcast `chat_ops.py:424` | ✅ MATCH | NEW has dedicated reaction event. |
| **Realtime: presence (online/offline)** | Realtime | `realtime.ts:170-205` `subscribeToChatMemberPresence` (UPDATE on `chat_members`); hook `lib/hooks/chat/use-presence.ts:75,92` (heartbeat + subscription) | `consumers.py:153-180` `PresenceConsumer` (connect=online, disconnect=offline) + `chat_ops.py:373-380 set_presence`; `ws/presence/` | ⚠️ DIFFERS (minor) | NEW drives presence from WS connect/disconnect (no client heartbeat interval). Frontend handles `presence` event. OLD's explicit heartbeat `setInterval` (use-presence.ts:75) is not reproduced — long-lived idle sockets rely on WS liveness instead. ❓ idle-timeout behavior not load-tested. |
| **Realtime: typing indicator** | Realtime | *Not present in OLD* (no typing channel found) | `consumers.py:86-91,110` (`receive_json` typing → `chat.typing`) | ➕ NEW EXTRA | NEW adds typing support over WS; frontend defines the event but may not yet render it (channels-ws.ts comment) ❓. |
| **Realtime: read receipts (live)** | Realtime | `realtime.ts:108-141` `subscribeToReadReceipts` (INSERT on `message_reads` table) → live "seen" updates | **No WS broadcast.** `chat_ops.py:273-275 mark_messages_read` updates `Message.read` bool and does **not** `_broadcast`. Frontend marks read via REST `POST /messages/mark-read` `messages-container.tsx:62,83` | ❌ DROPPED | **Live read-receipt propagation removed.** OLD pushed real-time "seen" events to the other party via a `message_reads` table; NEW stores a `read` boolean (no separate table, no broadcast). The sender no longer sees the recipient's read status update in real time (only on next fetch). |
| **Realtime: chat-list updates** | Realtime | `realtime.ts:212-256` `subscribeToUserChats` (`*` on `chats`+`chat_members`); hook `use-chat-list-subscription.ts:54` | Per-chat group broadcasts; `chat_ops.batch_unread_counts`/`total_unread` `chat_ops.py:284,295` via REST; unread also surfaced in `recent_unread_messages` (Celery email) | ⚠️ DIFFERS | NEW has no dedicated "all my chats" live channel; chat-list/unread badges refresh via REST + per-chat WS events rather than a global subscription. Live reordering of the chat list on a brand-new chat ❓ (depends on frontend refetch). |
| **HTTP polling fallback** | Realtime | none (Supabase WS only) | none — WS only, exponential-backoff reconnect `channels-ws.ts:120-127` | ✅ MATCH | No polling either side; NEW adds reconnect backoff (2→30s). |
| **Supabase RPC `set_user_id`** | SQL/RPC | `lib/supabase/client-rls.ts:148`, `lib/supabase/server-rls.ts:69` (only 2 RPC sites) | Replaced by app-layer auth: `consumers.py:142-145 _is_member`, DRF permissions | ✅ MATCH | RPC existed only to set a PG session var for RLS; obsolete under Django (auth = request.user). |
| **SQL function `set_user_id()` / `current_user_id()`** | SQL | DB dump: `CREATE FUNCTION public.set_user_id(text)`, `public.current_user_id()` (RLS helpers; comments confirm "Used by RLS policies for chat access control") | Membership/permission checks in Django (`_is_member`, DRF perms) | ✅ MATCH | Pure RLS plumbing — **no business logic**. Safe to drop. |
| **Postgres triggers / Edge Functions** | SQL/Edge | No `supabase/functions` dir; all 6 DB triggers belong to Supabase-internal schemas (`realtime.*`, `storage.*`, `extensions.*`), not `public` app logic | n/a | ✅ MATCH | **No application business logic lived in SQL/triggers/edge functions.** Nothing to port. Only app SQL = the 2 RLS helpers above. |
| **Supabase JWT exchange** | Auth/Supabase | `src/app/api/auth/exchange-token/route.ts` (Better-Auth JWT → Supabase-signed JWT, `SUPABASE_JWT_SECRET`) | Native DRF SimpleJWT; WS auth via `?token=` `consumers.py:44-46` | ✅ MATCH | Whole Better-Auth→Supabase JWT bridge eliminated; NEW issues its own JWTs. |
| **Email / Brevo (Sendinblue)** | Integration | `lib/email/providers/brevo/*`, lists in env `BREVO_LIST_*` | `EMAIL_BACKEND=anymail...sendinblue` `settings/base.py:326-337`; `BREVO_LISTS` | ✅ MATCH | Anymail/Sendinblue backend; 4 Brevo lists mapped (`USERS/EMPTYPROFILE/NOSERVICES/ACTIVEPROS`). |
| **Payments / Worldline (Cardlink)** | Integration | `lib/payment/providers/worldline/*` (digest/xml/adapter) | `settings/base.py:369-377 WORLDLINE`; `apps/billing/services/providers.py`, `apps/billing/urls/payment_routes.py` | ✅ MATCH | Worldline/Cardlink reimplemented in billing app; env wired. Stripe+PayPal kept as legacy providers (extra). |
| **Google OAuth** | Integration | `GOOGLE_CLIENT_ID/SECRET` (Better Auth) | django-allauth `settings/base.py:177-184` (`GOOGLE_OAUTH_CLIENT_ID/SECRET`) | ✅ MATCH | Env var renamed (`GOOGLE_CLIENT_ID`→`GOOGLE_OAUTH_CLIENT_ID`). |
| **reCAPTCHA** | Integration | `RECAPTCHA_SECRET_KEY`/`SITE_KEY` (contact form) | `RECAPTCHA_SECRET_KEY` `settings/base.py:405`; used `apps/support/views/public/support.py` | ✅ MATCH | Site key surfaced in frontend env. |
| **AADE / AFM lookup (Greek tax SOAP)** | Integration | `actions/profiles/lookup-afm.ts`; `AADE_USERNAME/PASSWORD` | `settings/base.py:400-402 AADE`; `apps/profiles/services/afm_lookup.py` | ✅ MATCH | SOAP AFM lookup reimplemented. |
| **Cloudinary config** | Integration | `NEXT_PUBLIC_CLOUDINARY_*` + `CLOUDINARY_API_SECRET` | `settings/base.py:362-366 CLOUDINARY`; `common/utils/cloudinary.py` | ✅ MATCH | Full config present. |
| **GitHub taxonomy git-ops** | Integration | `GITHUB_TOKEN/OWNER/REPO/...` | `settings/base.py:392-397 GITHUB` | ✅ MATCH | Env wired. |
| **Channels layer (Redis) / daphne** | Infra | Supabase Realtime server | `settings/base.py:37,55,265-269 CHANNEL_LAYERS` (channels_redis); `config/asgi.py`, `config/channels_routing.py`; `CHANNELS_REDIS_URL` | ✅ MATCH | daphne+channels+redis replace Supabase Realtime backend. |
| **`NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` / `SUPABASE_JWT_SECRET`** | Env | Required across `lib/supabase/*` | **Removed** — absent from `backend/.env.example` and frontend | ✅ MATCH | Correctly dropped; frontend grep shows zero `@supabase/supabase-js` imports remaining. |
| **`CRON_SECRET` / `ADMIN_API_KEY` / `MAINTENANCE_MODE` / `PAYMENTS_TEST_MODE`** | Env | present in OLD | `backend/.env.example` (CRON_SECRET, ADMIN_API_KEY, MAINTENANCE_MODE, PAYMENTS_TEST_MODE/ENABLED) | ✅ MATCH | Operational secrets carried over. |

---

## Detailed gaps

### GAP 1 — Live read receipts dropped (❌ functional regression)
- **OLD did:** `subscribeToReadReceipts` (`lib/supabase/realtime.ts:108-141`) listened to INSERTs on a dedicated `message_reads` table and fired a callback so the sender's UI updated "seen" in real time. Read state was per-(message,user) rows (`payload.new.messageId`, `payload.new.uid`).
- **NEW does:** `mark_messages_read` (`apps/messaging/services/chat_ops.py:273-275`) flips a single boolean `Message.read` and returns a count. It does **not** call `_broadcast`. Frontend marks-read via REST `POST /messages/mark-read` (`frontend/.../messages-container.tsx:62,83`).
- **Impact:** The other participant's "read/seen" indicator no longer updates live; it only appears after the sender refetches messages or reconnects. Also the read model collapsed from a `message_reads` join table to a single `read` flag, so per-user read state in any future group chat is lost (currently chats appear 1:1, so low impact today).
- **Suggested fix:** Add a `_broadcast(chat_id, "chat.message_read", {messageIds, readerId})` inside `mark_messages_read`, add a `chat_message_read` handler in `ChatConsumer`, and handle a `message_read` event in `channels-ws.ts`/`use-chat-subscription`.

### GAP 2 — Presence heartbeat & global chat-list subscription not reproduced (⚠️ behavioral diff)
- **OLD did:** `use-presence.ts:75` ran a `setInterval` heartbeat to keep presence fresh; `subscribeToUserChats` (`realtime.ts:212-256`) gave a single live channel for the whole chat list (new chats / reordering).
- **NEW does:** presence is bound to WS connect/disconnect (`consumers.py:158-177`); there is no global "all my chats" WS channel — unread/list state comes from REST (`batch_unread_counts`/`total_unread`, `chat_ops.py:284,295`) plus per-chat WS events.
- **Impact:** (a) Stale presence possible if a socket lingers without a clean disconnect (no heartbeat to expire it). (b) A brand-new conversation may not appear in the recipient's chat list until a refetch, instead of instantly.
- **Suggested fix:** Optional — add a periodic presence refresh/expiry (Celery beat or last_seen TTL) and/or a `user.<id>` group event when a new chat is created so the list updates live. ❓ Confirm whether frontend already refetches the chat list on focus/interval before prioritizing.

### Non-gaps (explicitly verified safe)
- **Supabase Storage:** never used by OLD app code (grep clean); migrating to Cloudinary is not a regression. `storage.*` triggers in the DB dump are Supabase platform internals.
- **Edge Functions / SQL business logic:** none existed. No `supabase/functions` dir; the only app-defined `public` SQL functions (`set_user_id`, `current_user_id`) are RLS helpers, correctly replaced by Django auth/permission checks. All 6 DB triggers are in `realtime/storage/extensions` schemas, not app logic.
- **All external integrations** (Brevo, Worldline/Cardlink, Google OAuth, reCAPTCHA, AADE, Cloudinary, GitHub) are present and wired in `backend/.env.example` + `config/settings/base.py` + integration modules. No missing integrations found.

### Notes / ❓ needs-verification
- Crop ratio / min-dimension (400×400) enforcement appears client-side only in NEW frontend ❓ (server enforces size+type but not dimensions) — same as OLD, so parity, but a hardening opportunity.
- OLD simple-upload allowed 15MB vs NEW server cap 10 MiB — minor limit tightening.
- Frontend `typing` event is broadcast by backend but UI rendering of typing indicator not confirmed ❓.
- Idle-socket presence expiry under load not tested ❓.

---

## Counts
- **features/integrations audited (matrix rows): 28**
- **missing: 0** (no integration unconfigured; no Supabase Storage to port; no SQL/Edge business logic dropped)
- **differs / regressions: 3** — ❌ live read receipts dropped (GAP 1); ⚠️ presence heartbeat dropped + ⚠️ global chat-list subscription dropped (GAP 2)
- **needs_verification (❓): 4** — typing UI render, crop/min-dimension server enforcement, idle presence expiry, live chat-list refresh path
