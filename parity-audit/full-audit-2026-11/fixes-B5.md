# Fix batch B5: emails, crons, platform/runtime (2026-11-05)

Working tree only. Nothing committed or pushed. Nothing under `backend/apps/billing/` was touched. The worldline-renewals view and route are untouched.

## Verification run
- `docker exec django-backend-backend-1 python manage.py check` → `System check identified no issues (0 silenced).`
- **Email render diff against OLD.** The OLD templates (`oldnext/src/constants/email/templates/*.ts`) were executed in node 24 (`TZ=Europe/Athens`) with fixed fixtures. The NEW builders rendered the same fixtures in the Django shell. Result: **0 mismatches across 38 HTML/text parts, byte-identical.** The 19 cases cover verification, reset, welcome ×2, contact admin/user, new-verification, service report, profile report, new profile, new review ×2, review approved ×2, service created/published, support feedback, and unread digest ×2.
  - Scripts: scratchpad `oldmail/render.mjs` and `compare.py`.
- **Mechanics test** (locmem backend):
  - From display names: `Admin Doulitsa <noreply@doulitsa.gr>` and `Doulitsa <noreply@doulitsa.gr>`.
  - Reply-To: contact-admin → the visitor; confirmation → `contact@doulitsa.gr`; reports and feedback → the reporter.
  - Tags use OLD's enum values, and the text part is the OLD twin.
- **Digest on test rows** (one transaction, rolled back; 17 unread messages):
  - Subject `Έχεις 17 αδιάβαστα μηνύματα - Doulitsa`.
  - Shows the 15 NEWEST (#2..#16) oldest-first, plus `... και 2 ακόμη μηνύματα`. Times are Athens (10:02Z → 12:02).
  - `users.updated_at` is unchanged; `last_unread_email_sent_at` is set.
  - A re-run gives `skipped:1` and 0 mails (dedupe works).
  - With the lock held, the run returns `locked:1`.
- **Cron auth** (APIClient, in-process):
  - `Bearer notasecret` → 401 from the **view** (`{"error":"Unauthorized"}`), no longer simplejwt's `token_not_valid`.
  - `Bearer <CRON_SECRET>` → 200 on `/api/cron/process-email-batches`, `/api/cron/auto-refresh` and `/api/webhooks/revalidate-cache`.
- **New tasks run against real rows:** service report, profile report, feedback, verification request, reset (name lookup) and service created all OK. An unknown service id → not sent.
- **Not restarted:** the running Daphne (:8800) and celery-worker containers still run the old code (no autoreload). Restart web **and** worker together on deploy, otherwise the old worker treats the new task names (`send_service_report_email`, `send_profile_report_email`, `send_support_feedback_email`) as unregistered.

## FIXED

| Item | What / where | Evidence |
|---|---|---|
| **P1-21 XC-TZ (platform)** | `ENV TZ=Europe/Athens` in `backend/Dockerfile` (web, worker and beat share the image), `frontend/Dockerfile` (runtime stage) and `frontend/Dockerfile.dev`. The frontend TZ is the platform half of pass6 **K-2** (messages hydration). The browser-TZ code half belongs to B3. Django `TIME_ZONE` was already Europe/Athens. | The running containers report UTC (`date`) until the images are rebuilt. `/usr/share/zoneinfo/Europe/Athens` exists in python:3.12-slim. Node's ICU needs no OS tzdata. |
| XC-TZ refresh quota | `services/services/service_writes.py`: new `_athens_day()` (`timezone.localtime(dt).date()`) replaces the UTC `.date()` at both quota sites (update-refresh and `refresh_service`). Matches OLD `new Date(y,m,d)` at local midnight. | `_athens_day(2026-11-04T23:30Z)` → `2026-11-05` |
| XC-TZ email dates | `el_datetime()` = JS `toLocaleString('el-GR')` in Athens (`5/11/2026, 3:04:05 μ.μ.`). Used for new-profile, service-created, report and feedback "Ημερομηνία". | matches node output |
| XC-CRONTZ | Reviewed, **no change.** `*/15` doesn't depend on TZ. The OLD auto-refresh never ran (POST-only route behind a Vercel GET cron, blog D7), so there is no OLD hour to match. Midnight Athens lines up with the now-Athens refresh-quota day. | — |
| **P2-30 XC-CRONAUTH** (3 views only) | `authentication_classes = []` on `ProcessEmailBatchesCronView` (`messaging/views/public/cron.py`), `AutoRefreshCronView` (`services/views/public/cron.py`) and `RevalidateWebhookView` (`core/views/admin/cache.py`). **`WorldlineRenewalsCronView` is not touched** (frozen, fix-order trap). | see the cron-auth test above |
| **P2-11 E1** sender + Reply-To | `emails.send_email(from_email=, reply_to=)`. Display names `Doulitsa` / `Admin Doulitsa` per OLD `email-config.ts`. Auth mails use `BREVO_SENDER_NAME‖'Doulitsa'` (OLD `getDefaultSender`). Settings: `BREVO_SENDER_EMAIL` defaults to `noreply@doulitsa.gr` (was `noreply@example.com`); new `BREVO_SENDER_NAME`. | mechanics test |
| **P2-11 E2** subjects | All restored to OLD. Verification uses the live `Επιβεβαίωση λογαριασμού στη Doulitsa`. Also reset, welcome, contact admin `Νέα Φόρμα Επικοινωνίας - {email}`, contact user `Λάβαμε το μήνυμα σου!`, new verification, new profile, service and profile report, feedback `{label} από {name}`, unread digest. Billing subject unchanged (frozen). | subjects printed in the diff run |
| **P2-11 E3** bodies + P3-32 E4 text twins | New `backend/apps/messaging/email_templates.py`: a **verbatim** port of all 16 OLD templates (HTML + TEXT; a script extracted the TS template literals). Builders pre-compute OLD's conditionals. `https://doulitsa.gr` became `${BASE}` = FRONTEND_BASE_URL. Restored: sign-off, reset "1 ώρα", dates, `ID Μηνύματος`, contact fallback `Φόρμα Επικοινωνίας`, 602px layout, black footer. | 38/38 identical |
| Admin emails restored | Verification request (P2-10): the task resolves profile → user display name and email plus the verification id, giving OLD's subject and 3 admin links. New review, new profile and service created now carry OLD's links and Ημερομηνία. **Raw category id:** OLD's SERVICE_CREATED template never rendered the category, so the raw-id line is gone (parity). | diff run; `service-created has raw category line: False` |
| E8 support feedback / P2-24 service report / profile report | Dedicated builders and tasks: `send_support_feedback_email`, `send_service_report_email` (service URL; **skips unknown `service_id`**), `send_profile_report_email`. Each has OLD's subject, body, Reply-To and tag. Call sites switched (email call only): `support/views/public/support.py` (feedback, plus contact now passes `contact.id`), `services/views/public/service.py` (report), `profiles/services/verification.py` (`report_profile`). | tasks test |
| P3-32 E5 tags | `EMAIL_TAGS` set to OLD's values: `user_registration`, `contact_admin`, `new_verification`, `service_report`, `profile_report`, `support_feedback`, `new-review`, `review_approved`, `new_profile`, `service-created`, `service_published`, `unread_messages`. The billing tag is left as it was. | mechanics test |
| **P2-12 digest** (+ P3-32 N4) | `tasks.py`: previews passed newest-first; the builder does `[:15]` then reverses (OLD `slice(0,15).reverse()`); OLD subject; HTML preview truncated at 120 and text at 100; user name fallback `φίλε`. The bookkeeping is now `User.objects.filter(id=).update(last_unread_email_sent_at=…)`, so there is no `User.save` hook and no `updated_at` bump. | digest test |
| P5-BR-3 digest run lock | `process_email_batches` takes a `cache.add` lock (`lock:messaging:process_email_batches`, TTL 300 = task hard limit) and releases it in `finally`. A locked run returns `{"locked":1}`. | lock test |
| **P2-7 double welcome** | `accounts/services/registration.py`: `send_welcome_email.delay` removed at verification. OLD never called `sendWelcomeEmail`; the welcome came from the Brevo list automation (`config.ts:431`). The Brevo sync stays. The builder is kept and ported but unused. | code |
| **P3-32 E9** FRONTEND_BASE_URL | `base.py`: default `https://doulitsa.gr` (OLD `NEXT_PUBLIC_APP_URL ‖ 'https://doulitsa.gr'`). Compose still sets localhost for dev. | settings print |
| **P2-32** BREVO_LIST_* names | `base.py` `_brevo_list()`: reads the new names **or** OLD's `BREVO_LIST_EMPTYPROFILE` / `NOSERVICES` / `PROS`. Each defaults to `"6"` like OLD. | `{'USERS':'6',…}` |
| **P2-23** Brevo re-syncs | `service_writes.archive_service` / `delete_service` → `_brevo_resync()` (OLD `delete-service.ts:104,197`). `admin_profiles.delete_profile` → `brevo_state_change.delay(p.user_id,"profile_deleted")` (OLD `admin/profiles.ts:630`). | enqueue mocked and asserted |
| P5-BR-7 silent enqueue sites | `logger.exception(...)` instead of `pass` at `accounts/views/public/auth.py` (registration Brevo), `accounts/services/account.py` (upgrade-to-pro), `accounts/services/oauth.py` (OAuth setup) and `services/views/public/service.py` (report email). Email call sites only; no auth logic touched. | code |
| P5-BR-10 channels_routing | `config/channels_routing.py`: the bare `except: pass` became `logger.exception` + `raise`. | `ws routes 2` |
| **blog D9** slug-rename purge | `blog/services/articles.py update_article`: remembers `previous_slug` and deletes `blog:article:{old}` on a rename. | code |
| Docs (P5-BR-11 / env notes) | `DOKPLOY.md`: Celery is marked **REQUIRED** (it said "optional"), plus TZ and email/Brevo env notes. `backend/.env.example`: sender name/address and the old list-name aliases. | — |
| P2-5 (reset-mail part) | The reset task looks up `display_name` / `username` by email when the caller passes neither, so the mail greets `displayName‖username‖'φίλε'` like OLD. | `Γεια σου Constantinos Coliatsis,` |

## ALREADY-FIXED / done by another batch
- **P5-BR-2 `cleanup_expired_pending_registrations`.** I created `apps/accounts/tasks.py`. **B1 then overwrote it with an equivalent implementation** (same task name and the same `expires_at < now` delete), and B1's version is now on disk. Task registration was verified. B1 should list it.
- **P5-BR-9 zeep client reuse + timeout.** Done by B2 in `profiles/services/afm_lookup.py` (module client cache, `Transport(timeout=15, operation_timeout=20)`).
- **P5-BR-8 CookieJWTAuthentication.** Fixed by B1 (commit `f593f49e`); I did not touch `common/authentication.py`.
- **LC-11 anymail `sendinblue` alias.** Present in the container (`anymail 15.2`, `anymail.backends.sendinblue.EmailBackend` imports), so the transport is fine.

## SKIPPED (out of scope / frozen / owned elsewhere)
- **XC-TZ admin "today" stats** (`messaging/views/admin/chats.py`). B4 owns these (D3); not touched. Django `TIME_ZONE` is Athens, so `timezone.localdate()` / `localtime()` there gives Athens midnight.
- **P3-32 E11 payment email date and subject.** Billing email, frozen. `send_subscription_payment_email` is byte-identical to before (diffed).
- **P2-24 message cap 500** (`services/serializers/service.py`). Serializer/validation, not the email layer (B2 area). The email part and the `service_id` check are done.
- **P3-33 feedback extra `Contact` row and loosened validation** (`support.py:28-35`). Not in the B5 list; left as is.
- **P5-BR-3 retries / acks_late** on email tasks, and **P5-BR-4** Brevo per-user ordering and tombstone. Design changes, not in the B5 key list.
- **P1-26 Brevo delete → `on_commit`** (`accounts/services/account.py:178`). Accounts delete flow (B1).
- **Frontend hydration code half of K-2.** B3.

## Notes / caveats for the orchestrator
0. **Commit attribution.** My B5 edits to accounts files went into **B1's commit `f593f49e`**: the double-welcome removal in `registration.py` and the three enqueue-logging lines in `auth.py`, `account.py` and `oauth.py`. They were in the working tree when that commit was made. Every other B5 change is still uncommitted in the working tree.
1. **Links:** emails now use `FRONTEND_BASE_URL` where OLD hard-coded `https://doulitsa.gr`. Identical on prod; on test the links point to the test host.
2. **Sender address:** comes from `BREVO_SENDER_EMAIL`, with OLD's display names on top. OLD hard-coded `noreply@doulitsa.gr` for the config mails. Identical when the env holds that address (EB-5 live check).
3. **Welcome:** after the dedup, users get a welcome only if the Brevo list automation is active. That is what OLD did; BR-1 is the live check.
4. **FRONTEND_BASE_URL default:** the default changed from localhost to doulitsa.gr. That also affects the billing redirect bases, but only when the env is unset; deployed envs set it.
5. **Feedback labels:** labels for the NEW-only issue types `bug` / `question` / `other` (`Αναφορά Προβλήματος` / `Ερώτηση` / `Άλλο`) have no OLD counterpart.
6. **Templates module:** `email_templates.py` is generated from OLD; do not hand-edit its strings. The builders own every conditional.
