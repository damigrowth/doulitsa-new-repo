# Backend runtime & async correctness — pass 5 — 2026-11-05

Scope: Celery tasks and beat, `transaction.atomic` blocks, every broad `except`
in `backend/{apps,common,config}`, Channels consumers, signal receivers, hot
public read paths (N+1 / unbounded), and runtime settings (ATOMIC_REQUESTS,
CONN_MAX_AGE, ASGI sync/async). Zero code changes. Deduped against SUMMARY.md
and every pass 1–4 report. Not repeated here: pre-commit signal purges
(pass2-caching D4), cron Bearer auth (pass3-blog N1), the digest `user.save`
(N4), double welcome email (auth D18), Brevo delete before user delete, the
queryset `.update()` purge gaps (G1), the stale worldline beat row (SUMMARY env
checks), WS ban/block (messaging D7), WS 15-minute token (pass3-messaging
P3-D2), Daphne-restart refcount (pass3-messaging open question), and the
enqueue-raises-after-save case for the support form (blog D4).

## 1. Coverage

### Celery
- `config/celery.py` (app, autodiscover, debug_task)
- `config/settings/base.py:304-346`: broker/result backend, `ACKS_LATE=True`, `TIME_LIMIT=300`, `PREFETCH=4`, DatabaseScheduler, beat schedule
- `apps/billing/tasks.py`: `process_worldline_renewals` (beat entry disabled)
- `apps/services/tasks.py`: `auto_refresh_promoted`. Idempotent: it sets `now`, so a re-run only moves the timestamp.
- `apps/messaging/tasks.py`: `process_email_batches` plus 15 thin email/Brevo wrappers
- Every `.delay()` call site (27, listed in the grep in §5). All args are str/int/ISO strings. No model instances are serialized: **OK**.
- Old side: `oldnext/vercel.json`, `app/api/cron/process-email-batches/route.ts`

### Atomic blocks (all 36 read)
- accounts: registration.py:80, 215; account.py:105, 162, 214; password.py:109; admin_users.py:152, 364; oauth.py:66
- profiles: verification.py:38; admin_profiles.py:501, 527, 547; profile_updates.py:431
- services: service_writes.py:180, 248, 363, 487; admin_services.py:325; tasks.py:42
- reviews: review_ops.py:183, 274
- billing: advice.py:310; subscription_ops.py:463, 569
- messaging: chat_ops.py:275, 352
- blog: articles.py:271, 351
- taxonomy: dataset_ops.py:273
- management commands (seed/backfill/canonicalize): offline, not runtime.
- `select_for_update` / `on_commit`: **zero uses** in the codebase.
- Old `prisma.$transaction` sites (all 10 compared): webhooks/worldline route + advice, cron renewals, change-username, admin/services, messages, record-attempt, create/update/refresh-service.

### Broad `except` (all 70 sites, verdict per site)
| Site | Swallows | Verdict |
|---|---|---|
| core/locations.py:41, 85; core/taxonomy.py:36 | DB taxonomy build failure → JSON fallback | known (caching D5) |
| core/views/public/health.py:41, 50 | probe errors | fine |
| accounts/views/public/onboarding.py:154; registration.py:234; account.py:179; admin_users.py:75, 87 | enqueue failures, logged | fine (account.py:179 = known ordering item) |
| accounts/views/public/auth.py:97; account.py:229; oauth.py:96; services/views/public/service.py:137 | enqueue failures, `pass` with **no log** | observability only; old logged Brevo errors. Folded into D7. |
| accounts/views/admin/users.py:385; views/public/account.py:87, 112; profiles/services/profile_updates.py:74, 100 | User→Profile mirror failures; success still returned | **D5** (username); the others are the same pattern, LOW |
| accounts/services/sessions.py:50 | logout blacklist errors | fine (old signOut also best-effort) |
| support/views/public/support.py:49 | reCAPTCHA unreachable → False (blocks) | fine, fails closed |
| taxonomy/services/cache.py:28, 38 | lru `cache_clear` errors | fine |
| taxonomy/services/admin_submissions.py:300 | `delete_many` on `*` keys | known (admin D13) |
| profiles/services/cache.py:34; services/signals.py:37; reviews/signals.py:29 | Redis purge errors | fine (TTL fallback) |
| profiles/selectors/profile_reads.py:76 | missing `user` relation | fine |
| admin_api/views/admin/notifications.py:63, 82, 101, 120, 139 | per-section errors → section empty | LOW, admin-only; old threw per action |
| profiles/services/afm_lookup.py:68 | zeep errors → Greek 503 | see **D9** (timeouts) |
| messaging/consumers.py:62, 64, 89 | refcount cache errors | fine |
| messaging/consumers.py:112, 221 | JWT resolve → 4401 | fine |
| messaging/consumers.py:129 | **every** send error (incl. a non-JSON payload) | LOW; payloads are all isoformat'd today |
| messaging/brevo.py:98, 130, 161, 288, 299 | Brevo HTTP errors | parity (old Brevo never blocked) |
| messaging/emails.py:102 | every send error → False | **D3** (no retry) |
| messaging/tasks.py:34 | zoneinfo missing → UTC HH:MM | fine |
| messaging/tasks.py:115 | per-user digest error | parity (old per-user catch) |
| messaging/views/public/cron.py:43; services/views/public/cron.py:43; billing/views/public/billing.py:427 | cron failures → 500 | fine (unreachable anyway: N1) |
| messaging/services/chat_ops.py:54 | every broadcast error → warning | LOW: realtime silently lost; old Supabase realtime was DB-driven |
| services/services/service_writes.py:227; admin_services.py:255, 295, 357 | post-write hooks | fine, logged |
| billing/services/renewals.py:248 | network errors → ERROR attempt | parity (beat disabled) |
| billing/services/record_attempt.py:50 | audit write errors | parity (old identical) |
| billing/views/public/billing.py:252, 314, 327, 386 | parse errors | known (billing D13 / P3-B6) |
| billing/services/providers.py:200, 214 | Stripe errors | Stripe unused |
| billing/services/subscription_ops.py:337, 340 | broker down → inline send; any error logged | fine |
| common/authentication.py:46 | **any** exception in cookie-JWT auth, incl. DB errors | **D8** |
| common/authentication.py:96 | DB error → synthetic env admin | known area (pass4 NEW-2) |
| common/hashers.py:38 | malformed bcrypt hash → False | fine |
| config/channels_routing.py:24 | **consumer import error → no WS routes** | **D10** |

### Channels
- `config/asgi.py`, `config/channels_routing.py`, `apps/messaging/consumers.py` (all 296 lines), `chat_ops._broadcast` / `set_presence`
- Reference channels 4.3.2 source (`consumer.py`, `db.py`); pyproject pins `channels>=4.1`, so a fresh image resolves to 4.3.x.

### Signals
- `apps/{profiles,services,reviews,taxonomy}/signals.py` and their `apps.py` `ready()` wiring (all four registered).

### Hot read paths checked for N+1 / unbounded queries
- `service_reads.search_services`/`_card` (select_related profile), `get_service_page_bundle`, `get_featured_services`, `_suggest_taxonomies`/`_suggest_services`
- `profile_aggregations.list_profiles_by_filters` / `directory_data` / `archive_data` / `profile_page_bundle`
- `review_reads.*` (select_related author/profile), `saved_reads`, `core/views/public/home.py`, `sitemaps.py`
- No plausible timeouts. All are paginated or cached and use select_related or aggregates. The only gap is `saved_reads.py:57` (Profile without `select_related("user")`, ≤ page size N+1), which is micro-perf and not reported.

### Settings / deploy
- `config/settings/{base,prod,dev}.py`, `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml`, `DOKPLOY.md`, `DEPLOY-doulitsa-test.md`, `GO-PRODUCTION-CHECKLIST.md`

## 2. Mapping (old → new runtime)
- Vercel cron `*/15 process-email-batches` → beat `messaging-process-email-batches` → `process_email_batches`
- Vercel cron `0 0 auto-refresh` → beat `services-auto-refresh-promoted`
- Vercel cron `0 6 worldline-renewals` → beat entry commented out (intentional)
- (no old counterpart) → beat `accounts-cleanup-pending-registrations` → **task does not exist** (D2)
- Inline `await send*Email()` / `await brevo*()` in server actions → Celery `.delay()` wrappers
- Supabase Realtime (DB-driven) → Daphne + Channels consumers + `chat_ops._broadcast`

## 3. DIFFERENCES

### D1. Every WebSocket consumer's DB work runs on one shared thread per Daphne process, and presence fan-out costs O(chats) — realtime stalls for everyone — LOW-MEDIUM (plausible under reconnect storms; verify chat counts)
- OLD: realtime was Supabase Realtime, fed from Postgres changes. It ran outside the app process, so one user's connect cost nothing for others.
- NEW:
  - Channels never opens an asgiref `ThreadSensitiveContext`. Every `database_sync_to_async` call (thread_sensitive=True by default) from **every** consumer in the process therefore runs on asgiref's single process-wide `single_thread_executor`. That includes:
    - `AuthMiddlewareStack`'s session lookup;
    - `_user_from_id` (consumers.py:22-28);
    - `_is_member` (:232-235);
    - `_presence_connect` / `_presence_disconnect` (:49-93).
  - Channels ≥4.2 also runs `aclose_old_connections()` (a thread-sensitive `sync_to_async`) before **every** dispatched event (`channels/consumer.py dispatch`). So each message frame delivered to each socket also queues on that same thread.
  - Django HTTP views are not affected, because the ASGIHandler gives each request its own context.
  - On that shared thread, `_presence_connect` / `_presence_disconnect` call `set_presence` (chat_ops.py:603-616). It runs one UPDATE, then for **each chat the user belongs to** it calls `_broadcast` (chat_ops.py:25-55):
    - an `async_to_sync(group_send)` to `chat.<id>`;
    - a `SELECT` of the members;
    - one more `async_to_sync(group_send)` per member.
  - That is about 1 query + 3 blocking event-loop hops per chat, serialized, and it fires on every 0↔1 refcount transition.
- Failure scenario: a deploy restarts Daphne and every client reconnects at once. Take N users with an average of K chats each. Before any queued WS frame (new messages, read receipts) is dispatched to anyone, about N×K×(1 query + 3 hops) of serialized work has to run. With 300 users × 10 chats × ~4 ms, chat delivery freezes for ~12 s across the whole process. A single pro with hundreds of chats opening a tab causes a visible hiccup for everyone.
- Fix direction:
  - batch `set_presence` (one members query for all of the user's chats, then group_send without per-chat SELECTs);
  - or run consumer DB helpers with `thread_sensitive=False`;
  - or move presence fan-out to a Celery task.
- Possibly intentional?: no. A transport artefact.

### D2. Beat schedules a task that doesn't exist (`apps.accounts.tasks.cleanup_expired_pending_registrations`) — LOW
- OLD: no such job (vercel.json has 3 crons; Prisma has no PendingRegistration cleanup).
- NEW:
  - `base.py:342-345` schedules it hourly.
  - There is no `apps/accounts/tasks.py`. `grep cleanup_expired_pending_registrations` finds only the settings entry and `MIGRATION_TRACKER.md:584` (row T4 ⬜).
  - DatabaseScheduler persists the row, so every hour the worker logs `Received unregistered task of type 'apps.accounts.tasks.cleanup_expired_pending_registrations'` and discards the message.
- Impact:
  - Hourly ERROR noise in the worker log, which can hide real task errors.
  - `pending_registrations` rows are never pruned. No read path uses them yet.
- Fix: implement the task, or remove the beat entry and disable the DB row.

### D3. Email/Brevo tasks run with `acks_late=True` but can never fail, so delivery is at-least-once on worker loss yet at-most-once on Brevo errors. The digest has no run lock — LOW
- OLD: every email was an inline `await` inside the action or cron. That meant one attempt and no redelivery.
- NEW:
  - `CELERY_TASK_ACKS_LATE=True` (base.py:310) acks only after the task returns.
  - Every email builder catches all exceptions and returns `False` (emails.py:95-104), so the task always "succeeds" and Celery never retries.
  - There is no `autoretry_for` / `bind` / `max_retries` on any task (tasks.py:129-334).
- Failure scenarios:
  - **Duplicates:** a worker SIGKILL (OOM, Docker `stop_grace_period` 10 s exceeded on redeploy) after the Brevo call but before the ack leaves the message unacked. Redis redelivers it after the 1 h visibility timeout, so the user gets a second verification/reset/review email an hour later.
  - **Losses:** a transient Brevo 5xx/timeout on a verification or reset email is logged and dropped. That is the same as old, but the acks_late setup buys only the downside.
  - **Digest:** `process_email_batches` sends before recording the batch (tasks.py:98-113) and has no lock (no `cache.add` mutex). Any overlap double-sends a digest to every user with new unread messages. Overlaps come from a redelivered run (above), a second beat process, or the HTTP cron once N1 is fixed and an external cron is also configured, as on Vercel.
- Fix direction:
  - add a Redis lock around `process_email_batches`;
  - make the builders raise on transient errors, with `autoretry_for=(…), max_retries=3` on the email tasks;
  - or set `acks_late=False` for email tasks.
- Possibly intentional?: no.

### D4. Brevo sync tasks for the same user run concurrently and out of order — a stale sync can re-create a GDPR-deleted contact — LOW
- OLD: Brevo calls were awaited inline and sequentially in each action (`handleUserStateChange`, `deleteContact`), so per-user order was guaranteed.
- NEW:
  - `brevo_state_change`, `brevo_first_service` and `brevo_delete_contact` (tasks.py:293-334) are independent tasks. Worker concurrency plus prefetch 4 means they can run in parallel and in any order.
  - `sync_user_to_correct_list` (brevo.py:208-290) removes the contact from all lists and then calls `add_contact_to_list`. That is `POST /contacts` with `updateEnabled` (brevo.py:66-100), which **creates** the contact when it is missing.
- Failure scenarios:
  - **Resurrection:** a user registers or upgrades, so `brevo_state_change` is queued. Seconds later they delete the account, so `brevo_delete_contact` is queued, inside the atomic block (account.py:174-178). If the state-change worker loaded the user before the delete committed and posts after the delete task ran, the contact is re-created in Brevo after the GDPR erase.
  - **Wrong list:** two overlapping syncs (e.g., `service_status_changed` + `first_service`) interleave their remove/add calls, and the contact ends up in a wrong list or in two lists.
- Fix direction: route all per-user Brevo work through one task that re-reads state, guarded by a per-user lock, and have the delete task set a tombstone that sync checks.

### D5. Username change is no longer atomic across User and Profile, and a failed Profile sync still returns success — LOW
- OLD: `actions/auth/change-username.ts:105-129` updates `user` and `profile.username` in one `prisma.$transaction`.
- NEW:
  - `account.change_username` commits the User row on its own (account.py:104-111).
  - The view then calls `sync_username_to_profile` (views/public/account.py:107-114). That function swallows every exception itself (profile_updates.py:89-104), and the view wraps it in another swallow.
- Failure scenario: a DB error or connection blip on the profile save leaves `users.username` new and `profiles.username` old, while the API answers "Το username άλλαξε επιτυχώς!". The public profile keeps serving at `/profile/<old>`, cards link to the old handle, and the cache purge for the old key never runs. Nothing retries it.
- The same non-atomic swallow pattern exists in:
  - `update_account` → `sync_account_basics` (views/public/account.py:80-89);
  - the admin user edit (views/admin/users.py:377-389).
  For those two there was no old transaction (old wrote them separately), so they are listed only for completeness.
- Fix: wrap both writes in one `transaction.atomic()` in the service and drop the swallow.

### D6. Billing handlers do read-modify-write on a stale snapshot with a full-row `sub.save()`, where old used SQL increments and a partial update — LOW
- OLD:
  - initial payment: `upsert` with `paymentCount: {increment: 1}`, `totalPaidLifetime: {increment}` (webhooks/worldline/route.ts:322-341);
  - recurring child: `update` with increments (route.ts:456-468);
  - advice: increments (advice/route.ts:233-234).
  All of these are column-scoped SQL `SET x = x + n`.
- NEW:
  - `_handle_payment_success` loads `sub` **before** the atomic block (subscription_ops.py:449), computes `payment_count + 1` in Python, and calls a bare `sub.save()` that writes every column (:451-492).
  - `_handle_recurring_child` (:556-570) and `_handle_recurring_advice` (advice.py:281-322) do the same.
  - None of them uses `select_for_update` or `F()`.
- Failure scenarios (NEW-only):
  - Admin "delete subscription" (`admin_delete`) runs while an advice or child webhook is in flight. The webhook's `sub.save()` finds 0 rows to UPDATE, falls through to INSERT, and **resurrects** the deleted subscription as ACTIVE. Old's `update where id` would throw P2025 instead.
  - Concurrent duplicate deliveries (Cardlink advice retry plus the classic notify for the same child) lose an increment instead of double-counting. Counts are wrong in a different direction from old.
- Fix: `Subscription.objects.select_for_update().get(pk=…)` inside the atomic block, and `F()` increments / `update_fields`.
- Possibly intentional?: no. The payment-behaviour addendum covers business rules, not mechanical write races.

### D7. Several enqueue failures are swallowed with no log at all — LOW (observability)
- `auth.py:97` (Brevo at registration), `account.py:229` (upgrade-to-pro), `oauth.py:96` (OAuth setup) and `services/views/public/service.py:137` (report-service admin email) all use `except Exception: pass`.
- OLD logged every Brevo/email failure with `console.error`, which showed up in Vercel logs.
- Impact: lost Brevo moves and lost report emails leave no trace. Ops can't tell a misconfiguration (D3/D4, lib-shared D6 env names) from success.
- Fix: `logger.exception(...)`, as the sibling sites already do.

### D8. Cookie-JWT authentication turns any exception, including DB errors, into "anonymous" — LOW
- OLD: Better Auth `getSession` DB failures threw, so the user saw an error and their login state was untouched.
- NEW:
  - `CookieJWTAuthentication.authenticate` (common/authentication.py:41-47) has `except Exception: return None` around `get_user()`, which is a DB query.
  - For browser-direct calls (cookie only, no Bearer), a transient `OperationalError` becomes "not logged in". Optional-auth endpoints answer as anonymous; protected ones return 401.
  - A 401 triggers the client refresh path. If the refresh hits the same blip, the cookie-deleting path (pass3-lib S-D1) logs the user out.
- Fix: catch only `AuthenticationFailed` / `InvalidToken` / `TokenError`, and let DB errors propagate as 500.

### D9. AADE lookup uses zeep with default transport: the WSDL is fetched on every call and the SOAP call has no timeout — LOW
- OLD: `lookup-afm.ts:64` did a single `fetch` POST, bounded by the Vercel function max duration.
- NEW: `afm_lookup.py:61-67` builds `zeep.Client(wsdl=...)` per request. That downloads and parses the WSDL each time, with zeep's default Transport `timeout=300` and `operation_timeout=None`.
- Impact: a slow or hung AADE endpoint ties up a Daphne request thread indefinitely, while the Next action times out first and the user sees a generic error. Every lookup also pays the WSDL round trip. (The lookup is already broken per pass3-profiles P3-D1 / pass4 AFM-1, so this matters once it is fixed.)
- Fix: `Transport(timeout=10, operation_timeout=10, cache=InMemoryCache())` and a module-level client.

### D10. A consumer import error silently disables all WebSockets while the app reports healthy — LOW
- NEW: `config/channels_routing.py:22-25` has `try: websocket_urlpatterns += _load_messaging_routes() except Exception: pass`, a leftover from scaffolding ("added in Phase 6 step 8").
- Any import-time error in `apps/messaging/consumers.py` (or its imports) leaves the list empty. Daphne boots, `/api/health` stays green (Dockerfile HEALTHCHECK is HTTP-only), and every WS connect fails with "No route found". Chat realtime is dead and nothing appears in the boot log.
- OLD: no counterpart. Supabase realtime failures surfaced client-side.
- Fix: delete the try/except.

### D11. Runtime settings traps (verify on prod) — LOW
- **CONN_MAX_AGE=60 under Daphne, without CONN_HEALTH_CHECKS** (base.py:156).
  - Under ASGI each request runs in its own thread context (Django ticket #33497), so persistent connections are not reused across requests. They can also pile up instead of being pooled.
  - Old used Prisma's pool or Supabase pgbouncer.
  - Check `SELECT count(*), state FROM pg_stat_activity WHERE usename=<app> GROUP BY state` on prod under load. If idle connections grow, set `CONN_MAX_AGE=0` or use the Django 5.1 psycopg `"pool"` option.
- **ATOMIC_REQUESTS=False** matches old: Prisma had no per-request transaction. OK.
- **Celery documented as "optional"** (DOKPLOY.md:60 "Celery (optional, same image)"). Every transactional email and Brevo sync is `.delay()`. Without a worker they queue forever in Redis with no error: no verification, reset, review or welcome emails. Old sent them inline. GO-PRODUCTION-CHECKLIST.md:57 does require the worker and beat, so this is a doc contradiction to fix in DOKPLOY.md.

## 4. Confirmed same / OK
- All task args are JSON primitives; no model instances cross the broker.
- `auto_refresh_promoted` is idempotent.
- `process_email_batches` matches old per-user error isolation, ordering (send, then record), dedupe via `EmailBatch.message_ids` (text[] fixed in migration 0002), and the "all unread, no window" query.
- Beat crons do not overlap each other. The 300 s hard limit keeps a digest run inside its 15-minute slot.
- **Atomic boundaries match old**:
  - message send (Message + Chat.lastMessage);
  - create/update/refresh service (service + profile counters);
  - admin create-for-profile;
  - review status + rating recalc;
  - blog article + authors;
  - verification status + `profile.verified`;
  - registration (User + Account + Verification);
  - password reset.
- External calls (Brevo, email, Cloudinary, Worldline) are outside atomic blocks everywhere except the known account-delete Brevo enqueue.
- `record_payment_attempt` is outside the atomic block, as in old.
- No Cloudinary deletes in either app.
- Old check-then-act races that are reproduced exactly, so they are not reported: payment-success idempotency check (route.ts:184-197 ↔ subscription_ops.py:378-385), advice TxId check, refresh daily counter, draft 30 s gate, duplicate-review check, reactions JSON read-modify-write.
- Channels:
  - group_add/discard are balanced in both consumers (discard keyed on attributes set only after a successful membership check);
  - refcount incr/decr are balanced (decr only when `user_id` was set);
  - every event type `_broadcast` emits (`chat.message`, `_edited`, `_deleted`, `.read`, `.presence`, `.reaction`) has a handler on both consumers, and `chat.typing` goes only to the chat group, which handles it — so there is no "No handler for message type" crash.
- Signals: all four modules are registered in `ready()`. The profile/service/review receivers are guarded with try/except, so they cannot break a save. The taxonomy receiver is unguarded, but it only fails when Redis is down, in which case throttling fails first anyway.
- `async_to_sync` in `_broadcast` is only ever called from sync threads (DRF views, or the `database_sync_to_async` thread), never from the event loop. No sync_to_async misuse found.
- Hot public endpoints: no N+1 or unbounded query plausible enough to time out (see §1).
- Celery/worker settings module: the Dockerfile sets `DJANGO_SETTINGS_MODULE=config.settings.prod`, so the `config.settings.dev` default in celery.py/manage.py is overridden in containers.

## 5. Open questions / couldn't verify
- D1 magnitude: needs the prod distribution of chats per user (`SELECT uid, count(*) FROM chat_members GROUP BY uid ORDER BY 2 DESC LIMIT 20`) and the installed channels version in the built image (`pip show channels`).
- D3 duplicate window: Dokploy's stop grace period and whether kombu's Redis visibility_timeout is overridden (it isn't in settings).
- D11 connection behaviour: needs `pg_stat_activity` on prod.
- Message ordering: `_broadcast` runs synchronously after commit in each request thread. Two near-simultaneous sends in one chat can reach sockets in a different order than `created_at`. Old Supabase delivered in WAL order. Not reported, because the FE re-sorts on reload and the window is milliseconds. Needs a browser test to see whether the FE inserts by timestamp.
- `.delay()` call sites enumerated (27): onboarding.py:146, 153; auth.py:86, 96, 145, 177; registration.py:232-233; account.py:178, 228; admin_users.py:74, 86; support.py:75, 79, 101; oauth.py:95; verification.py:52, 95; admin_services.py:239, 243, 248, 254, 294, 353, 356; service.py:136; subscription_ops.py:336; service_writes.py:222, 226; review_ops.py:115, 216. All except account.py:178 are after their atomic block commits.

## Corrections
- None. I re-checked messaging D4 ("old burns messages") against old `message-emails.ts:78`: old never re-throws, so the batch row was always written, and D4 is correct. pass2-caching D4 and pass3-blog N1 also re-confirmed.
