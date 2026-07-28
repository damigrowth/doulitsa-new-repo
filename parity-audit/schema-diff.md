# Doulitsa Migration Parity Audit — Database Schema Diff

**Scope:** Full DB schema diff. OLD = Prisma (`app_before_migrations/src/lib/prisma/schema/*.prisma`, source of truth) vs NEW = Django models (`backend/apps/*/models/**.py`) corroborated against the live restored production DB (`docker exec django-backend-postgres-1 psql -U django -d django`).

**Method:** Every claim cites Prisma `file:line` and Django `file:line`, and is checked against live DB via `\d`/`information_schema`. The live DB was originally built by Prisma migrations, so its columns/indexes reflect OLD; the audit's job is to confirm the NEW Django models faithfully mirror it (and to flag where Django would *not* reproduce it on a fresh DB, or where a model is missing entirely).

---

## Schema Diff

### Table-by-table matrix

| Table | Issue | OLD (prisma file:line) | NEW (model file:line / live DB) | Severity | Notes |
|-------|-------|------------------------|---------------------------------|----------|-------|
| `subscription_payment_attempts` | **Entire table/model missing in Django** | `subscription.prisma:109-133` (model `SubscriptionPaymentAttempt`) | No Django model; not in `billing/models/__init__.py:4-15`; no migration (grep `apps/billing/migrations/*` → none). Live DB HAS the table | ❌ | Payment-attempt history invisible to Django ORM. Worldline/Cardlink reconciliation, retries, refunds break. |
| `subscription_payment_attempts` | Enums `PaymentAttemptStatus`, `PaymentAttemptSource` not modeled | `subscription.prisma:28-43` | No Django `TextChoices` anywhere | ❌ | Follows from the missing model above. |
| `users` | NEW adds `password` not in OLD | `user.prisma:1-47` (no `password` field; pw lives in `accounts.password` `auth.prisma:27`) | `AbstractBaseUser` supplies `password` (`accounts/models/user.py:83`); live DB `users.password varchar(128) NOT NULL` | ⚠️ | Addition, not a gap. Boot-time "missing password" was a **dump-vs-model artifact** — restored dump lacked the Django-auth column; added so Django could boot. Harmless (Better Auth still authenticates via `accounts.password`). See Detailed gaps. |
| `users` | NEW adds `last_login` not in OLD | `user.prisma:1-47` (no `last_login`) | `AbstractBaseUser` supplies `last_login` (`accounts/models/user.py:83`); live DB `users.last_login timestamptz NULL` | ⚠️ | Same as above — Django-auth artifact, nullable, not an OLD→NEW data-loss gap. |
| `chat_members` | OLD had composite PK `(chatId, uid)`; NEW added surrogate `id` PK | `chat.prisma:24-37` (`@@id([chatId, uid])`, no `id`) | `messaging/models/chat.py:33-50` (Django implicit `id` BigAutoField + `unique_together=(("chat","user"),)`); live DB: `id bigint PK` + `chat_members_chatid_uid_uniq UNIQUE` | ⚠️ | Composite uniqueness PRESERVED as a UNIQUE constraint, so no duplicate-row risk. The "missing id PK" at boot was a **genuine model-vs-dump shape change** intentionally introduced by Django (it requires a single-column PK). Acceptable; verify nothing in OLD code relied on a composite PK lookup. |
| `users` | `id`/`email`/`role` appeared duplicated in one psql run | `user.prisma:2-3,22` | Clean `\d public.users` = 26 cols, all Prisma + password/last_login | ✅ | The 61-row dump was `psql` reading `auth.users` (Supabase) on the search_path too — **artifact, not a real schema issue**. `public.users` is correct. |
| `users` (cols) | All Prisma columns present, types/defaults match | `user.prisma:1-47` | `accounts/models/user.py:85-125`; live DB verified | ✅ | enums `JourneyStep`/`UserType`/`UserRole` present as PG enum types; camelCase preserved via `db_column`. |
| `users` (indexes) | `@@index([role])`, `[step]`, `[confirmed,blocked]` | `user.prisma:43-45` | `accounts/models/user.py:135-139` + live DB has all three | ✅ | Declared in Django Meta. |
| `profiles` (cols) | All ~50 columns present, types/nullability/defaults match | `user.prisma:49-159` | `profiles/models/profile.py:28-111`; live DB 51 cols verified | ✅ | ArrayFields (`skills`,`contactMethods`,`paymentMethods`,`settlementMethods`) → `text[]`; JSON fields → `jsonb`. All match. |
| `profiles` (indexes) | 7 composite/search indexes | `user.prisma:134-150` | **Not declared in Django** (`profile.py:113-117` comment "they exist already"); live DB HAS all 7 | ⚠️ | Parity OK on the live DB, but `makemigrations` on a fresh DB would NOT recreate them → silent perf regression in a rebuild. |
| `verifications` (ProfileVerification) | columns/unique(pid)/indexes | `user.prisma:161-180` | `profiles/models/profile_verification.py:14-37`; live DB verified | ✅ | Distinct from Better Auth `verification`. `pid` OneToOne (unique) preserved. |
| `services` (cols) | All columns incl. `type jsonb`, `addons/faq jsonb[]`, enums | `service.prisma:18-104` | `services/models/service.py:32-81`; live DB 27 cols verified | ✅ | `subscriptionType`/`status` PG enums preserved. |
| `services` | `sortDate` default `now()` not declared in Django | `service.prisma:62` (`@default(now())`) | `services/models/service.py:77` `sort_date = DateTimeField(db_column="sortDate")` — **no default**; live DB default `CURRENT_TIMESTAMP` | ⚠️ | DB-level default still applies on raw inserts, but Django ORM `.create()` without `sort_date` will send NULL → **IntegrityError** (column is NOT NULL). Verify app always sets it. |
| `services` (indexes) | 11 indexes | `service.prisma:72-98` | Not declared in Django; live DB HAS all 11 | ⚠️ | Same fresh-rebuild caveat as profiles. |
| `reviews` | columns/enums/9 indexes | `review.prisma:6-55` | `reviews/models/review.py:35-65`; live DB verified | ✅ | `ReviewStatus` includes draft/published/inactive (superset of Prisma `Status`) — harmless. Indexes not declared in Django but present in DB (⚠️ rebuild caveat). |
| `chats` | columns + `lastMessageId` unique + indexes | `chat.prisma:1-22` | `messaging/models/chat.py:9-30`; live DB verified | ⚠️ | `last_message_id` modeled as plain `CharField(unique=True)` not a FK to `messages` (`chat.py:23-25`); live DB has real FK `chats_lastMessageId_fkey`. FK exists in DB so parity holds, but Django won't recreate it. |
| `messages` | columns + 4 FKs + self-FK `replyToId` | `chat.prisma:40-69` | `messaging/models/chat.py:53-78`; live DB verified | ⚠️ | `reply_to_id` and `deleted_by` modeled as plain `CharField`, not FK (`chat.py:70,73`). Live DB HAS the FKs (`messages_replyToId_fkey` SET NULL, `messages_deletedBy_fkey` SET NULL). Parity holds on live DB; not reproducible from Django. |
| `blocked_users` | unique(blockerId,blockedId) + indexes | `chat.prisma:71-85` | `messaging/models/chat.py:81-98`; `unique_together` present | ✅ | |
| `email_batches` | `messageIds String[]` modeled as JSONField (TYPE MISMATCH) | `email.prisma:35` (`messageIds String[]`) | `messaging/models/chat.py:107` `message_ids = JSONField`; **live DB `messageIds` = `text[]` (udt `_text`)** — CONFIRMED | ❌ | Django reads a PG `text[]` column through a `jsonb`-oriented `JSONField`. psycopg returns a Python list either way so naive reads may appear to work, but writes serialize to JSON text → driver type error against a `text[]` column, and any `__contains`/array lookups break. Fix: use `ArrayField(models.TextField())`. |
| `blog_articles` / `blog_article_authors` | columns/unique/indexes | `blog.prisma:4-49` | `blog/models/blog_article.py:19-59`; live DB verified | ✅ | `unique_together(article,profile)` preserved. |
| `subscriptions` | all ~33 columns, 5 enums, uniques | `subscription.prisma:45-106` | `billing/models/subscription.py:36-111`; live DB 33 cols verified | ✅ | All provider/legacy/worldline/analytics/discount fields present. Unique constraints on provider/stripe IDs preserved. |
| `saved_services` / `saved_profiles` | unique + FKs | `saved.prisma:4-31` | `saved/models/saved_service.py`, `saved_profile.py`; `unique_together` present | ✅ | `profile_id`/`service_id` modeled as scalar (not FK) but `db_column` + unique match. |
| `media` | `bytes` BigInteger vs Int | `media.prisma:8` (`bytes Int?` → int4) | `media/models/media.py:17` `BigIntegerField`; **live DB `bytes` = `integer`** — CONFIRMED | ⚠️ | Model is wider than the column. Reads/writes within int4 range are fine; values > 2^31 would fail at the DB. Minor; on a fresh build Django would create `bigint`, diverging from OLD. Align to `IntegerField` for exact parity. |
| `media` | `@@index([userId])` | `media.prisma:21` | Django Meta omits the `user` index (`media.py:43-46` lists only public_id/is_temporary/usage*) but FK auto-creates one | ✅ | FK index covers it. |
| `contacts` | columns | `email.prisma:1-12` | `support/models/contact.py:9-21` | ✅ | |
| `taxonomy_submissions` | columns/enums/indexes | `taxonomy-submission.prisma:12-29` | `taxonomy/models/taxonomy_submission.py:25-45` | ✅ | `assignedId` String preserved as CharField. Indexes not declared in Django Meta (⚠️ rebuild caveat). |
| `accounts` (Better Auth) | columns incl. `accountId` unique | `auth.prisma:16-33` | `accounts/models/account.py:15-47`; live DB 13 cols verified | ✅ | camelCase `@map` columns preserved. |
| `sessions` | columns + `token` unique | `auth.prisma:1-14` | `accounts/models/session.py:14-39` | ✅ | |
| `verification` (Better Auth) | columns | `auth.prisma:35-44` | `accounts/models/verification.py:15-29`; live DB 6 cols verified | ⚠️ | Django adds `indexes=[identifier, expires_at]` (`verification.py:26-28`) NOT in Prisma. Additive only — harmless. |
| `pending_registrations` | columns | `auth.prisma:47-58` | `accounts/models/pending_registration.py:14-26` | ✅ | `email` unique preserved. |
| `jwks` | columns | `auth.prisma:61-68` | `accounts/models/jwks.py:13-21` | ✅ | |
| `api_keys` | columns + `key` unique | `auth.prisma:71-90` | `admin_api/models/api_key.py:9-41` | ✅ | All Better Auth API-key plugin fields present. |

---

### Detailed gaps (per ❌ / ⚠️)

#### ❌ 1. `subscription_payment_attempts` — entire model missing (MOST SEVERE)
- **OLD has:** model `SubscriptionPaymentAttempt` (`subscription.prisma:109-133`): `id`, `subscriptionId` (FK→subscriptions, cascade), `status` (`PaymentAttemptStatus` enum), `source` (`PaymentAttemptSource` enum), `amount`, `currency` (default `eur`), `sequence`, `txId`, `paymentRef`, `orderId`, `message`, `errorMessage`, `createdAt`; indexes on `(subscriptionId,createdAt)`, `(status,createdAt)`, `(txId)`.
- **NEW has:** nothing. No model file, no entry in `billing/models/__init__.py`, no migration. Live DB still has the table + FK + 3 indexes (built by Prisma), so **data is intact** — but Django cannot see it.
- **Impact:** broken-feature (not data-loss). Any DRF/Django code that reads payment history, drives Worldline/Cardlink recurring charges, cron renewals/retries, or surfaces payment attempts in admin will fail or be impossible to write. The two enums (`subscription.prisma:28-43`) are also unmodeled.
- **Suggested Django fix:** add `apps/billing/models/payment_attempt.py` with `SubscriptionPaymentAttempt(models.Model)` mirroring the columns (`db_table="subscription_payment_attempts"`, `managed=True`), two `TextChoices` enums (CAPTURED/AUTHORIZED/REFUSED/REFUSEDRISK/CANCELED/ERROR and initial/recurring_child/cron_renewal/cron_retry/manual), `subscription = ForeignKey(..., db_column="subscriptionId", db_constraint=False)`, `currency` default `"eur"`, and the three `Meta.indexes`. Export it in `billing/models/__init__.py`. Generate a `--fake`-able migration since the table already exists.

#### ⚠️ 2. `users.password` / `users.last_login` — Django-auth additions (boot-time "missing" finding)
- **OLD has:** neither column. User passwords are stored in `accounts.password` (`auth.prisma:27`); OLD `users` has no `password`/`last_login` (`user.prisma:1-47`).
- **NEW has:** `AbstractBaseUser` (`accounts/models/user.py:83`) provides both. Live DB now has `password varchar(128) NOT NULL`, `last_login timestamptz NULL`.
- **Verdict on the known finding:** **dump-vs-model artifact, NOT an OLD→NEW gap.** The restored production dump (pre-Django) naturally lacked these Django-only columns; they had to be added (`ALTER TABLE`) so `AbstractBaseUser` could boot. They do not exist in OLD by design. `password NOT NULL` with no default is the only mild risk — existing rows were backfilled (set_unusable_password) during restore; verify no row has an empty/invalid hash that would block admin login.
- **Impact:** minor/none for OLD frontend (it ignores these columns). Authentication for the OLD Next.js path still flows through `accounts.password`.

#### ⚠️ 3. `chat_members` — composite PK → surrogate `id` PK (boot-time finding)
- **OLD has:** composite primary key `@@id([chatId, uid])`, no `id` column (`chat.prisma:24-37`).
- **NEW has:** Django auto `id bigint` PK + `unique_together=(("chat","user"))` (`messaging/models/chat.py:33-50`). Live DB: `id bigint GENERATED ... PK` + `chat_members_chatid_uid_uniq UNIQUE` + both FKs intact.
- **Verdict on the known finding:** **genuine intentional model change**, not a dump artifact. Django ORM requires a single-column surrogate PK, so the migration added `id` and demoted the composite to a UNIQUE constraint. Uniqueness semantics are preserved — no duplicate `(chat,uid)` rows possible.
- **Impact:** minor. Risk only if OLD code or RLS policies addressed a row by the composite PK as a true PK (they reference columns, so fine). Verify the `id` column was backfilled for pre-existing rows (it is `GENERATED BY DEFAULT AS IDENTITY`, so the restore must have populated it — confirm `SELECT count(*) FROM chat_members WHERE id IS NULL` = 0).

#### ⚠️ 4. Index declarations dropped from Django models (`profiles`, `services`, `reviews`, `taxonomy_submissions`, `chats`)
- **OLD has:** rich composite indexes declared in Prisma (`user.prisma:134-150`, `service.prisma:72-98`, `review.prisma:28-53`, etc.).
- **NEW has:** Django Meta omits most of them (Profile Meta even says "they exist already" `profile.py:113-117`). Live DB HAS them all (built by Prisma) — verified via `pg_indexes`.
- **Impact:** zero on the current live DB; but a **fresh `migrate` on a clean DB would not recreate these**, causing large query-plan regressions (the indexes were explicitly added for 60-70% speedups). Suggested fix: declare the composite indexes in each model's `Meta.indexes` to make the schema self-describing and rebuild-safe.

#### ⚠️ 5. `sortDate` / FK relations not enforced from Django (`services.sortDate`, `chats.lastMessageId`, `messages.replyToId`/`deletedBy`)
- `services.sort_date` (`service.py:77`) has no Django default though Prisma `@default(now())` (`service.prisma:62`); column is NOT NULL in DB. ORM `.create()` omitting it → IntegrityError. Add `default=timezone.now` or set it in the service layer.
- `chats.last_message_id`, `messages.reply_to_id`, `messages.deleted_by` are plain `CharField`s (`chat.py:23,70,73`) instead of FKs; real FK constraints exist in the live DB but Django uses `db_constraint=False` philosophy and won't recreate them on rebuild. Cosmetic for parity now; flagged for rebuild fidelity.

---

### Counts
- **tables_compared = 30** (28 OLD Prisma models incl. PaymentAttempt + Better Auth tables; cross-checked against 49 live public tables, excluding Django/celery/allauth infra)
- **missing_tables = 1** (`subscription_payment_attempts` — no Django model)
- **missing_columns = 0** (no OLD column is absent from NEW models or live DB; `users.password`/`last_login` are NEW *additions*, not gaps)
- **type_mismatches = 2 confirmed** (`email_batches.messageIds` = `text[]` in DB but Django `JSONField`/jsonb ❌ breaking on writes; `media.bytes` = `integer` in DB but Django `BigIntegerField` ⚠️ minor)
- **missing_constraints = 1 structural** (`chat_members` composite PK demoted to UNIQUE — preserved as constraint, semantics intact) + **index declarations dropped from ~5 Django models** (present in live DB, absent from model code → not rebuild-safe)
