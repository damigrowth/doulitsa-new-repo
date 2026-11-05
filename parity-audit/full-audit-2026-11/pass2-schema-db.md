# Schema / DB contract parity audit (PASS 2) — 2026-11-05

Scope: the DB contract between the restored Prisma-era Postgres and the Django
models + migrations, checked table by table and column by column. Only NEW
findings and corrections to pass 1 are listed here. Already known, so not
re-reported: the provider_customer_id MID bug, the saved-rows no-FK note, the
verifications.afm 16-char question (a general answer is in C3), and the
taxonomy FK columns + backfill.

**Method limitation:** I had no live DB. No doulitsa Postgres container is
running locally and `backend/dumps/` is empty. The live-DB state below is
inferred from three sources:
(a) Prisma's DDL conventions. Old prisma/migrations SQL shows `TEXT`,
`TIMESTAMP(3)`, PG `ENUM` types, literal `DEFAULT`s and real FK constraints.
The datasource has no `relationMode`, so FKs are DB-enforced.
(b) The older live-DB inspection in `parity-audit/schema-diff.md`.
(c) The repo's restore docs and migration code.
Each finding that depends on live state ends with a verification SQL.

## 1. Coverage
- OLD files read (all of `oldnext/src/lib/prisma/schema/`, per `prisma.config.ts`):
  - `schema.prisma`: generator/datasource (postgres, no relationMode → real FKs)
  - `auth.prisma`: sessions, accounts, verification, pending_registrations, jwks, api_keys
  - `user.prisma`: users, profiles, verifications + enums UserRole/UserType/JourneyStep
  - `service.prisma`: services + enums SubscriptionType/Status
  - `review.prisma`: reviews + enum ReviewType
  - `saved.prisma`: saved_services, saved_profiles
  - `subscription.prisma`: subscriptions, subscription_payment_attempts + 6 enums
  - `chat.prisma`: chats, chat_members (composite PK), messages, blocked_users
  - `email.prisma`: contacts, email_batches
  - `blog.prisma`: blog_articles, blog_article_authors
  - `media.prisma`: media
  - `taxonomy-submission.prisma`: taxonomy_submissions + 2 enums
  - `admin.prisma`: comment only (TaxonomyStaging removed)
  - `migrations/2025071*/migration.sql` (2 files): confirms Prisma DDL style (TEXT, TIMESTAMP(3), DB DEFAULTs, enum types)
  - Old code spot-checks: `actions/services/create-service.ts` (draft defaults), `actions/admin/taxonomy-submission.ts:180-226` (raw array SQL), `actions/messages/chats.ts:163-186` (nanoid cid), displayUsername writers
- NEW files read:
  - All models: `backend/apps/{accounts,admin_api,billing,blog,media,messaging,profiles,reviews,saved,services,support,taxonomy}/models/*.py`
  - All migrations: `accounts 0001-0002`, `admin_api 0001-0002`, `billing 0001-0003`, `blog 0001-0002`, `media 0001-0002`, `messaging 0001-0003`, `profiles 0001-0004`, `reviews 0001-0002`, `saved 0001-0002`, `services 0001-0005`, `support 0001-0002`, `taxonomy 0001-0007`
  - `config/settings/base.py` (INSTALLED_APPS, DB options, auth backends, beat), `common/exceptions.py` (500 path), `backend/docker-entrypoint.sh`, `backend/README.md`
  - Root docs: `DATABASE-RESTORE-RUNBOOK.md`, `GO-PRODUCTION-CHECKLIST.md`, `DEPLOY-doulitsa-test.md`, `DOKPLOY.md`
  - Write and delete sites: `accounts/services/{account,admin_users,registration}.py`, `accounts/selectors/users.py`, `messaging/services/chat_ops.py`, `saved/services/toggle.py`, `services/services/{service_writes,admin_services}.py`, `services/serializers/service.py`, `services/selectors/service_reads.py`, `services/views/public/service.py`, `reviews/services/review_ops.py`, `reviews/views/admin/reviews.py`, `blog/services/articles.py`, `taxonomy/services/{submissions,admin_submissions}.py`, `taxonomy/views/public/submissions.py`, `billing/services/{record_attempt,providers}.py`, `support/views/public/support.py`, every `*/admin.py`
  - Frontend: `frontend/src/actions/services/create-service.ts`
- Delegated elsewhere: business logic behind each column (payments → billing, etc.). Only the DB contract is covered here.

## 2. Mapping (Prisma table → Django model)
Every Prisma model has a Django model with the same `db_table`. I compared
column sets with a script that parsed all `*.prisma` and all Django model
files: **every Prisma scalar column is present with the same `db_column`
casing.** The Django-only columns are:
- `profiles.category_node_id`, `profiles.subcategory_node_id` (nullable, migration 0002)
- `services.{category,subcategory,subdivision}_node_id` (nullable, migration 0003)
- `users.password`, `users.last_login` (AbstractBaseUser; added manually, not by a migration — see D1/D4)
- `chat_members.id` (Django implicit PK; added manually or not at all — see D4)

Type mapping on the restored DB:
- All Prisma `String` columns are `TEXT`. Django `max_length` is not enforced by the DB.
- `Int` → int4. `Float` → float8. `Json` → jsonb. `Json[]` → jsonb[]. `String[]` → text[].
- Prisma enums remain PG ENUM types, because the Django 0001 migrations were faked.
- `TIMESTAMP(3)` was converted to `timestamptz` by the guarded `*_timestamptz_prisma_columns` migrations. I compared these against every Prisma `DateTime` field: the list is complete. `users.last_login` is not converted because it is not a Prisma column.

## 3. DIFFERENCES

### D1. Cutover has no codified path from the FINAL old-prod dump to the Django schema. The docs contradict each other, and following the runbook drops all production writes since 2026-06-13 — CRITICAL (data loss / boot crash)
- OLD: the single source of data is the live Supabase/Prisma DB, which keeps taking real writes until cutover (users, profiles, services, reviews, chats, subscriptions/payments).
- NEW:
  - `DATABASE-RESTORE-RUNBOOK.md:10-18`: "Do NOT restore the raw Supabase backup … `migrate --fake-initial` crashes on first boot (missing `users.password`/`last_login`, allauth `account` migration collision)". It says to seed from a migrated working DB instead.
  - Runbook checklist `:150`: "Regenerate `doulitsa-prod-seed.dump` from the **current** working DB." That is the test/staging DB, loaded from the 2026-06-13 dump (`:105-112`: users=616, profiles=444…).
  - `GO-PRODUCTION-CHECKLIST.md:70-71` says the opposite: "take the FINAL production dump" and restore it with the runbook.
  - `DEPLOY-doulitsa-test.md:30-37` and `DOKPLOY.md:19-22` still say to restore the raw `doulitsa-full-backup-*.dump` and rely on `--fake-initial`.
  - The steps that make a raw Prisma dump bootable exist only as an ad-hoc snippet in `backend/README.md:66-90`, and no migration or command does them:
    - `ALTER TABLE users ADD COLUMN password text`, `ADD COLUMN last_login timestamp(3)`
    - `migrate account|socialaccount --fake`
    - per-app `--fake-initial`
    - the `chat_members.id` surrogate PK, which is not covered at all (see D4)
  - The entrypoint (`docker-entrypoint.sh:15`) only runs `migrate --fake-initial`. Django's soft-apply check requires every model column to exist, so on a raw dump `accounts.0001` is not soft-applied. It then tries `CREATE TABLE users` and the boot aborts.
- Data that lives only in the Django DB and is not in any old-prod dump:
  - `taxonomy_*` tables, the "single source of truth", including every admin taxonomy edit made on test since July (`seed_taxonomy` would reload only the committed JSON snapshot). The cutover list doesn't mention `seed_taxonomy`, yet `backfill_taxonomy_fks` (cutover step 3) needs those tables filled.
  - Django staff logins
  - `django_celery_beat` rows
  - `token_blacklist`
- Impact:
  - Following the runbook literally ships the June snapshot plus test-env junk: test users, test Cardlink subscriptions and payment attempts written with `PAYMENTS_TEST_MODE`. Every real signup, profile/service edit, review, message and **paid subscription** on doulitsa.gr since 2026-06-13 is lost.
  - Following GO-PRODUCTION/DEPLOY instead crashes the backend on first boot.
  - Either way, real payment rows can be lost or mismatched against Cardlink.
- Fix direction:
  - Codify the conversion as an idempotent command or SQL migration: users.password/last_login, the chat_members PK decision, allauth tables (see D2).
  - Then restore the final old-prod dump.
  - Then `migrate`, then `seed_taxonomy` (or copy the `taxonomy_*` tables from test), then the two backfills.
  - Fix the four docs so they agree.
- Possibly intentional?: no. The runbook explicitly targets "the REAL production cutover".

### D2. allauth tables are probably missing (migrations `--fake`d), so deleting a user goes through Django's collector and hits a nonexistent table: self-service "delete account" and admin "delete user" would 500 — HIGH (verify)
- OLD: Better Auth `deleteUser` with Prisma DB cascades. It works.
- NEW:
  - `allauth.account` and `allauth.socialaccount` are in INSTALLED_APPS (`config/settings/base.py:83-86`).
  - The documented restore flow marks their migrations applied without running them: `backend/README.md:83` `call_command("migrate", app, "--fake")` for `("account","socialaccount")`. The runbook also cites an "allauth `account` migration collision". The Prisma dump has no `account_emailaddress` / `socialaccount_*` tables, so faking them means they were never created.
  - `delete_account` (`apps/accounts/services/account.py:187`) and `remove_user` (`apps/accounts/services/admin_users.py:366`) call `user.delete()`. Django's Collector walks every reverse FK to `User`, including allauth's `EmailAddress.user` and `SocialAccount.user` (both CASCADE; EmailAddress also has a cascading EmailConfirmation child, so it is SELECTed rather than fast-deleted). The result is `ProgrammingError: relation "account_emailaddress" does not exist`. The exception handler (`common/exceptions.py:117-119`) leaves DB errors unhandled, so the request returns 500 and the transaction rolls back.
  - Same root cause: a failed Django-admin login falls through `ModelBackend` to `allauth.account.auth_backends.AuthenticationBackend` (`base.py:194-197`), which queries `account_emailaddress` and also 500s.
- Impact: users cannot delete their account (a GDPR flow). Admins cannot remove users. Brevo delete is enqueued before the failing delete, inside the atomic block (`account.py:176-183`), so the Brevo contact can be deleted even though the user stays.
- Possibly intentional?: no. Nothing in the app uses allauth models; Google OAuth is custom (`google_oauth.py`).
- Verify: `select to_regclass('public.account_emailaddress'), to_regclass('public.socialaccount_socialaccount');`. If either is NULL, this is confirmed. Fix options:
  - run the allauth migrations for real on an empty table set (the lowercase data migration is a no-op on empty tables), or
  - remove `allauth.account` / `allauth.socialaccount` from INSTALLED_APPS and AUTHENTICATION_BACKENDS if they are unused.

### D3. Unvalidated query-string values compared against PG ENUM columns return `invalid input value for enum` (DataError), which surfaces as a 500 — MEDIUM
- OLD: Prisma validates enum arguments client-side and throws a typed validation error, which old actions caught and returned as an error result. The page did not crash.
- NEW: the Django 0001 migrations were faked, so these columns are still PG ENUMs: `services.status` (`"Status"`), `reviews.status` / `reviews.type` (`"ReviewType"`), `blog_articles.status`, and `taxonomy_submissions.type` / `.status`. Any value outside the enum makes Postgres raise DataError, which is not handled and becomes a 500. Unvalidated sites:
  - `GET /api/services/me?status=<x>`: `MyServicesView` passes `request.query_params.dict()` raw (`services/views/public/service.py:282-284`) into `qs.filter(status=query["status"])` (`selectors/service_reads.py:730-731`).
  - Public services search/count `status` (`serializers/service.py:427`, a plain CharField). The draft exposure itself is services.md D1; a garbage value additionally 500s.
  - Admin reviews list `?status=` / `?type=` (`reviews/views/admin/reviews.py:45-53`). In the same view, `?rating=abc` does `int(rating)`, a ValueError that also 500s.
  - Admin blog list `?status=` (`blog/views/admin/article.py:27` → `blog/services/articles.py:211-212`).
  - Admin taxonomy submissions `status` / `type` (`taxonomy/services/admin_submissions.py:59-63`).
  - `GET /api/taxonomy/submissions/me?type=<x>` (`taxonomy/views/public/submissions.py:43-46` → `services/submissions.py:126-127`).
- Writes are safe: every write site validates against the choices first (`admin_services.py:201`, `review_ops.py:170`, `subscription_ops.py:720`, the blog serializer). The admin users list (`accounts/selectors/admin_users.py:69-76`) also validates.
- Impact: crafted or old bookmarked URLs (for example a `?status=` value the UI no longer uses) produce a 500 instead of an empty list or a 400. This mainly matters for log noise and for the public endpoint.
- Possibly intentional?: no. Fix: check the value against the TextChoices before filtering, and return a 400 or ignore it.

### D4. Live schema drift that no migration owns: `chat_members.id`, `users.password`, `users.last_login`. The code assumes conflicting shapes — MEDIUM (verify)
- OLD: `chat_members` has a composite PK `(chatId, uid)` and no `id` (`chat.prisma:24-37`). `users` has no password or last_login columns.
- NEW:
  - The Django state (`messaging/migrations/0001_initial.py:95`) declares a `BigAutoField id` on `ChatMember`, but 0001 was faked, so the column exists only if someone added it by hand.
  - The code contradicts itself on whether it exists. `chat_ops.py:277-284` says "`chat_members` has composite PK (chatId, uid) and no synthetic id — Django's ORM INSERT…RETURNING `id` fails, so use raw SQL", and `messaging/views/admin/chats.py:228` avoids materializing rows. The older live inspection (`parity-audit/schema-diff.md:19,66`) found `id bigint GENERATED … PK`.
  - Consequences per state:
    - No `id`: the Django-admin `ChatMember` changelist (`messaging/admin.py:22`) 500s, and any future `ChatMember.objects.get/first()` 500s.
    - `id bigint NOT NULL` without an identity/default (a common manual "fix"): the raw INSERT (`chat_ops.py:282`) violates NOT NULL, so **every new DM 500s**.
  - `users.password` is `password text` NULLable per `README.md:69`, but `varchar(128) NOT NULL` per the older inspection. Environments differ.
  - `users.last_login` is created as `timestamp(3) without time zone` (`README.md:70`), and the timestamptz migrations don't include it (`accounts/migrations/0002…py:22-29`). Django-admin logins write it, and it reads back naive under `USE_TZ=True`.
- Impact: behaviour depends on how each environment was hand-patched. Prod after D1 will be patched by hand again.
- Verify:
  - `\d chat_members` (is there an `id`? identity or default?)
  - `select column_name, data_type, is_nullable, column_default from information_schema.columns where table_name='users' and column_name in ('password','last_login');`
- Fix: commit an idempotent migration that sets these explicitly (for example `chat_members.id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY` with the composite unique kept, and `last_login timestamptz`).

### D5. New code depends on Prisma-only DB artifacts that Django migrations do not reproduce. A Django-built DB (tests, any rebuild) behaves differently — MEDIUM
- OLD: Prisma's DDL carries the semantics:
  - literal DB DEFAULTs: `chat_members.joinedAt/lastSeen DEFAULT CURRENT_TIMESTAMP`, `muted/online DEFAULT false`
  - FK constraints with DB cascades
  - ENUM types
- NEW: Django never emits DB defaults. Columns modelled as plain scalars get no FK.
  - **DM creation** uses a raw `INSERT INTO chat_members ("chatId", uid)` (`chat_ops.py:282`) that leaves out joinedAt/lastSeen/muted/online. It only works because the Prisma DB defaults exist. On a Django-created schema (the pytest DB, a fresh rebuild) those columns are NOT NULL with no default, so every new DM fails. There is no test for `get_or_create_dm` or `delete_account` (`grep` in `apps/*/tests`), so the test suite would not notice.
  - **Delete cascades the old app relied on, which exist only as dump-era FK constraints because Django models the columns as plain fields:**
    - `saved_services.serviceId → services` CASCADE (`saved_service.py:20`, IntegerField)
    - `saved_profiles.profileId → profiles` CASCADE (`saved_profile.py:20`, CharField)
    - `reviews.sid → services` SET NULL (`review.py:46`, IntegerField)
    - `chats.lastMessageId → messages` SET NULL (`chat.py:23`)
    - `messages.replyToId → messages` and `messages.deletedBy → users` SET NULL (`chat.py:70,73`)
  - On a rebuild: deleting a service leaves saved rows and `reviews.sid` pointing at a missing service, and deleting a message leaves `chats.lastMessageId` dangling. Chat-list code then tries to resolve a missing last message.
  - Enum-domain enforcement (D3's DataError) also disappears on a rebuild. Bad values then get stored instead of rejected.
- Impact today on the restored DB: none (the artifacts are present). The risk is any re-creation, plus false confidence from tests. Prisma composite indexes not in Meta are the same class (already noted in the older `parity-audit/schema-diff.md`, not in pass 1).
- Possibly intentional?: no. Fix: give `ChatMember` model fields explicit inserts (or use `bulk_create(ignore_conflicts=True)` once the `id` question in D4 is settled), and add `db_default=` (Django 5) for the Prisma literal defaults. Or document "rebuilds unsupported".

### D6. Deterministic `chats.cid` plus a UNIQUE constraint makes concurrent "start conversation" requests 500 — LOW
- OLD: `cid = nanoid()` with a uniqueness-retry loop (`actions/messages/chats.ts:163-186`). Two concurrent requests could at worst create two chats; there was never a constraint error.
- NEW: `cid = "::".join(sorted([user.id, other_user_id]))` (`chat_ops.py:246`). A check-then-insert without a lock or `IntegrityError` handling (`:247-276`) means a double-click (two parallel POSTs) makes the second `Chat.objects.create(cid=…)` violate `chats_cid_key`, giving an unhandled IntegrityError and a 500. The first request succeeds.
- Impact: an occasional error toast on the first contact with a pro.
- Fix: catch IntegrityError and re-read by cid.

### D7. Django-admin edits of legacy rows are blocked by model validators that the TEXT columns never enforced — LOW
- OLD: Prisma `String` has no length or format validation, so legacy rows hold any text.
- NEW: Django admin ModelForms run `full_clean()` with the model validators:
  - `Profile.website/image`, `User.image`, `Media.secure_url`: `URLField` (needs a scheme)
  - `Profile.email`, `Contact.email`, `PendingRegistration.email`: `EmailField`
  - `max_length` caps such as `Profile.phone/viber/whatsapp` 64, `ProfileVerification.afm` 16, `Subscription.payment_method_last4` 4, `Service.title` 512
  - Models are in `apps/*/models/*.py`; admins are registered in every `apps/*/admin.py`.
  A legacy row with `website="www.x.gr"` or a longer phone cannot be saved from `/django-admin/` until the support user rewrites that field, even when editing an unrelated field.
- Impact: support friction only. API paths use explicit DRF serializers, and the DB accepts the values.
- Possibly intentional?: partly. Verify which legacy values fail (`select count(*) from profiles where website !~ '^https?://' and website <> '';`).

## Corrections to pass-1 reports
- **C1 — reviews-saved.md D8 / §5 (open question on whether the DB has FKs).**
  - Prisma's postgres datasource has no `relationMode` (`schema.prisma:10-13`), so `saved_services_serviceId_fkey`, `saved_profiles_profileId_fkey` (ON DELETE CASCADE) and `reviews_sid_fkey` (SET NULL) are real constraints and survive pg_restore. The older live inspection also found the messages/chats FKs intact.
  - So on the restored DB, saved counts do **not** include orphans (the DB cascades), and reviews of a deleted service get `sid=NULL` exactly as before.
  - The real behaviour for a non-existent id is different from D8's description. `SavedService.objects.create` violates the FK, and `toggle.py:25/38` catches it as `except IntegrityError: pass  # race` and returns `True`, so the API answers "saved" while nothing is stored. The UI shows saved, and a reload shows unsaved. (This is safe only because `ATOMIC_REQUESTS=False`, `config/settings/base.py:157`.)
- **C2 — messaging.md line 138 ("Blocking a non-existent user id: new creates a row, because the FK has `db_constraint=False`").** The DB still has Prisma's `blocked_users_blockedId_fkey`. `BlockedUser.objects.update_or_create(...)` (`chat_ops.py:570`) therefore raises an unhandled IntegrityError, which is a **500**, not a stored row. Old returned an error result.
- **C3 — general answer to "column length" questions (including SUMMARY's `verifications.afm column type` check).**
  - Every Prisma `String` is `TEXT` on the restored DB. The Django 0001 migrations that declare `varchar(n)` were faked, and no later migration altered those columns (I checked every migration: only AddField of `*_node`, state-only ArrayField/default fixes, and timestamptz RunSQL).
  - So a Django `max_length` on a Prisma-era table **never** causes a DB 500 in prod. It matters only for DRF/admin validation (D7) and for Django-built test DBs.
  - Real `varchar` limits exist only on Django-created tables: `taxonomy_*`, allauth, celery, and token_blacklist. The taxonomy serializers cap at or below the model lengths (`taxonomy/serializers/taxonomy.py`), except for slugs derived from 255-char Greek labels, which could exceed 255 after transliteration (very unlikely).
- **C4 — older `parity-audit/schema-diff.md` items now fixed (for the record).** These are fixed by state-only migrations:
  - SubscriptionPaymentAttempt model (`billing/0002`)
  - `email_batches.messageIds` ArrayField (`messaging/0002`)
  - `services.sortDate` default (`services/0002`)
  - profile/service array fields (`profiles/0004`, `services/0005`)

## 4. Confirmed same
- Column set: all 30 Prisma tables are mirrored. Names and camelCase `db_column`s match exactly (script comparison). The only additions are the `*_node_id` FKs, AbstractBaseUser's password/last_login, and the ChatMember id.
- Nullability matches Prisma field by field: all `?` fields are `null=True`, and every required field is non-null. Django defaults equal the Prisma defaults:
  - cuid ids
  - `step` EMAIL_VERIFICATION, `role`/`type` user, `provider` "email"
  - `Service.status` draft, `price/duration` 0
  - `Review.status` pending, `type` PROFILE
  - `Subscription.provider` stripe, `plan` free, `status` incomplete, `currency` eur
  - `dailyServiceRefreshCount` 0
  - `chats.published` true
  - `ProfileVerification.status` "PENDING"
  - `Contact.status` "new"
- Enum value sets: Django TextChoices equal the Prisma enums for UserRole, UserType, JourneyStep, Status (service/blog/review), ReviewType, SubscriptionType, SubscriptionStatus/Plan/Provider, BillingInterval, PaymentAttemptStatus/Source, and TaxonomySubmissionType/Status. ReviewStatus lists all six `Status` values, the same PG enum.
- Every write to an enum column validates against the choices first. Billing attempt statuses come from Cardlink's fixed set, and that writer swallows errors (`record_attempt.py:35-53`).
- Timestamps: the timestamptz conversion covers every Prisma `DateTime` column (guarded and idempotent). Prisma `@updatedAt` NOT NULL is satisfied by `auto_now` on every ORM insert, and there are no raw INSERTs into tables with updatedAt.
- Unique columns written by new code, beyond the known MID bug:
  - `services.slug` = title + id
  - `blog_articles.slug` uses a timestamp suffix (same as old)
  - `accounts.accountId`: credential = user.id, google = sub (same as Better Auth)
  - `subscriptions.providerSubscriptionId` = the per-checkout orderId (same as old `route.ts:190,294`)
  - `chats.lastMessageId` = the new message id
  - `saved_*`, `blocked_users`, `blog_article_authors` pairs use get-then-create or update_or_create
  - `users.username` is checked case-insensitively before insert
  - `media.publicId` and `pending_registrations.email`: neither old nor new code writes them
- Delete cascades on the restored DB: User → accounts/sessions/api_keys/profile/media/reviews_given/saved/chats_created/chat_memberships/messages_authored/blocks/email_batches. Profile → services/reviews_received/verification/subscription(→payment_attempts)/blog authorships/saved_profiles(DB). Service → saved_services(DB), reviews.sid NULL(DB). Message → chats.lastMessageId / replies NULL(DB). This equals old Prisma `onDelete` (all required relations are Cascade; optional ones default to SetNull). Gaps are the same as old: TaxonomySubmission.submittedBy, ProfileVerification.uid and Session.impersonatedBy are plain strings with no FK on either side.
- Prisma composite indexes still exist on the live DB (faked migrations dropped nothing). New Django FK columns get btree indexes automatically. Django-declared extra indexes on `verification` were never created (0001 faked); the table is small, so this has no impact.
- Raw SQL `array_replace` / `array_remove` in taxonomy approvals is identical to the old `$executeRaw` (`admin_submissions.py:258-281` vs old `taxonomy-submission.ts:182-226`).
- Draft service NOT NULL taxonomy columns: the frontend always sends `''` (`frontend/src/actions/services/create-service.ts:19-21`), matching old `|| ''`. No NULL insert.
- JSON/array NULL handling in new code is guarded (`or []`, `isinstance(..., dict)`).

## 5. Open questions / couldn't verify
- All live-state claims (D2, D4, and the FK presence in C1/C2) need the SQL checks listed above on test.doulitsa.gr's DB.
- Whether legacy rows hold NULL in Prisma list columns (`profiles.skills/contactMethods/paymentMethods/settlementMethods`, `services.tags/addons/faq`, `email_batches.messageIds`). Prisma creates list columns without NOT NULL. Django reads NULL as None, and most reads are guarded, but `canonicalize_taxonomies.py:62,83` passes `s.tags` / `p.skills` straight to `translate_list`. Check: `select count(*) from profiles where skills is null or "contactMethods" is null;` and the same for services.
- Whether the seed DB was ever patched to create the allauth tables after the README flow (D2).
