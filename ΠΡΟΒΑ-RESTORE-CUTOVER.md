# Πρόβα Restore για το Cutover — βήμα-βήμα

Σκοπός: να αποδείξουμε ΜΙΑ φορά, σε πρόχειρη βάση, ότι το τελικό dump του
παλιού production μπαίνει στο Django schema και το app σηκώνεται με ΟΛΑ τα
δεδομένα — ΠΡΙΝ τη μέρα του cutover. Ό,τι σκάσει, διορθώνεται εδώ. Η
διαδικασία που θα δουλέψει γίνεται ο ΜΟΝΑΔΙΚΟΣ οδηγός του cutover και
αντικαθιστά τα 4 αντικρουόμενα docs (DATABASE-RESTORE-RUNBOOK,
DEPLOY-doulitsa-test, DOKPLOY, GO-PRODUCTION-CHECKLIST §4).

Χρόνος: ~1-2 ώρες. Δεν αγγίζει ΟΥΤΕ το παλιό production ΟΥΤΕ το test env.
Το κάνουμε μαζί: εσύ φέρνεις το dump (βήμα 1), τα υπόλοιπα τα τρέχω εγώ
τοπικά και τεκμηριώνω.

---

## 0. Πού γίνεται η πρόβα

Στο ΤΟΠΙΚΟ docker stack (Mac) — είναι ήδη ίδιο με το server (ίδιες
migrations, ίδιος entrypoint). Δεν χρειάζεται scratch βάση στον server.
Εναλλακτικά: δεύτερη κενή Postgres στο Dokploy, αλλά τοπικά είναι πιο
γρήγορο και ακίνδυνο.

## 1. Φρέσκο dump από το παλιό production (ΕΣΥ)

Από το Supabase του παλιού app. Δύο τρόποι:

- **Dashboard:** Database → Backups → Download (αν η έκδοση του πλάνου το
  δίνει), ή
- **pg_dump** με το **DIRECT** connection string (Settings → Database →
  Connection string → URI, ΟΧΙ τον transaction pooler :6543 — το pg_dump
  δεν δουλεύει σωστά μέσω pooler):

```bash
pg_dump "postgresql://postgres:<PASS>@db.<project>.supabase.co:5432/postgres" \
  --format=custom --schema=public --no-owner --no-acl \
  -f doulitsa-prod-$(date +%F).dump
```

Το αρχείο μπαίνει στο `backend/dumps/` (gitignored). ΜΗΝ το στείλεις
πουθενά αλλού — έχει πραγματικά προσωπικά δεδομένα.

## 2. Καθαρή βάση + restore (ο σκελετός υπάρχει στο backend/README.md §Restoring)

```bash
# 2a. Καθαρό slate
docker compose exec postgres psql -U django -d postgres \
  -c 'DROP DATABASE IF EXISTS django' -c 'CREATE DATABASE django OWNER django'

# 2b. Extensions που περιμένει το Supabase dump
docker compose exec postgres psql -U django -d django -c \
  'CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

# 2c. Restore μόνο το public schema (τα RLS errors στο τέλος = αναμενόμενα)
docker cp backend/dumps/<dump> django-backend-postgres-1:/tmp/db.dump
docker compose exec postgres pg_restore --dbname=django --username=django \
  --schema=public --no-owner --no-acl /tmp/db.dump
```

## 3. Schema patches (ΠΡΙΝ σηκωθεί το backend)

Το entrypoint τρέχει `migrate --fake-initial` στο boot — πάνω σε raw dump
ΚΡΑΣΑΡΕΙ χωρίς αυτά:

```sql
-- 3a. Στήλες auth που το Prisma δεν είχε (README βήμα 4)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamp(3) without time zone;

-- 3b. chat_members id (ΕΛΕΓΧΟΣ πρώτα — το παλιό prod ΙΣΩΣ το έχει ήδη):
SELECT is_identity FROM information_schema.columns
 WHERE table_name='chat_members' AND column_name='id';
-- Αν ΔΕΝ υπάρχει:
-- ALTER TABLE chat_members ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY;
-- ALTER TABLE chat_members ADD CONSTRAINT chat_members_chatid_uid_uniq UNIQUE ("chatId", uid);
```

## 4. Migrations με το fake recipe (README βήμα 5)

```bash
docker compose exec backend python manage.py shell <<'PY'
from django.core.management import call_command
for app in ("auth","contenttypes","admin","sessions","sites",
            "token_blacklist","django_celery_beat","django_celery_results"):
    call_command("migrate", app, "--fake-initial", "--noinput")
for app in ("account","socialaccount"):
    call_command("migrate", app, "--fake", "--noinput")
for app in ("accounts","profiles","services","reviews","billing",
            "messaging","saved","blog","taxonomy","media","support","admin_api"):
    call_command("migrate", app, "--fake-initial", "--noinput")
call_command("migrate", "--noinput")
PY
```

**ΠΡΟΣΟΧΗ — γνωστό κενό που η πρόβα πρέπει να λύσει:** το `--fake` στα
account/socialaccount σημαίνει ότι τα 5 allauth tables ΔΕΝ δημιουργούνται
σε raw dump → η διαγραφή λογαριασμού κάνει 500. Έλεγχος:

```sql
SELECT to_regclass('public.account_emailaddress');
```

Αν NULL → βγάζουμε το DDL και το τρέχουμε χειροκίνητα ΠΡΙΝ το fake:

```bash
docker compose exec backend python manage.py sqlmigrate account 0001_initial
docker compose exec backend python manage.py sqlmigrate socialaccount 0001_initial
# (τρέχουμε το SQL στο psql, μετά το fake recipe του βήματος 4)
```

Στο test DB τα tables υπάρχουν — άρα κάποιος το έλυσε στο παρελθόν· η
πρόβα θα καταγράψει ΑΚΡΙΒΩΣ πώς, ώστε να μην είναι προφορική γνώση.

## 5. Δεδομένα που ΔΕΝ έρχονται από το dump (Django-only tables)

- **Ταξινομίες** (ΑΠΟΦΑΣΗ — δύο δρόμοι):
  - (α) `python manage.py seed_taxonomy` → φορτώνει τα datasets ΧΩΡΙΣ τα
    admin edits που έγιναν στο test·
  - (β) αντιγραφή των `taxonomy_*` tables ΑΠΟ το test DB (pg_dump -t) →
    κρατάει ΚΑΙ τα admin edits. **Προτεινόμενο: (β)** αφού δουλεύεις
    ταξινομίες στο test admin.
- **Celery beat**: μετά το πρώτο boot, στο Django admin → Periodic tasks →
  **disable `billing-process-worldline-renewals`** (διπλή χρέωση).
- **Admin χρήστης**: README βήμα 6 (ή τα υπάρχοντα admin accounts του dump
  δουλεύουν με reset password).

## 6. Backfills (με αυτή τη σειρά)

```bash
docker compose exec backend python manage.py backfill_taxonomy_fks
docker compose exec backend python manage.py backfill_payment_columns
docker compose exec backend python manage.py renormalize_coverage          # έλεγχος
docker compose exec backend python manage.py renormalize_coverage --apply
```

(Το SQL Q0c για το MID μένει ΠΑΓΩΜΕΝΟ μαζί με τα payments — μπαίνει εδώ
μόνο όταν ξεπαγώσει το P0-1 fix.)

## 7. Επαλήθευση — η πρόβα πέτυχε όταν ΟΛΑ αυτά περάσουν

```bash
docker compose restart backend && sleep 10
docker compose exec backend python manage.py check          # 0 issues
docker compose exec backend python manage.py migrate --check # τίποτα pending
curl -s localhost:8800/api/health                            # 200
```

Συγκρίσεις πλήθους (παλιό prod vs πρόβα — ΙΔΙΟΙ αριθμοί):
```sql
SELECT count(*) FROM users; SELECT count(*) FROM profiles;
SELECT count(*) FROM services; SELECT count(*) FROM subscriptions;
SELECT count(*) FROM reviews; SELECT count(*) FROM messages;
```

Λειτουργικά (στο τοπικό frontend :3100 πάνω στη βάση της πρόβας):
- [ ] Login υπάρχοντος χρήστη του dump (reset password πρώτα αν χρειάζεται)
- [ ] /dir και /ipiresies: γεμάτα, σωστά counts, φίλτρα ΟΚ
- [ ] Μία profile page + μία service page με πλήρη δεδομένα
- [ ] Chat ανοίγει με το ιστορικό του
- [ ] **Διαγραφή ενός δοκιμαστικού λογαριασμού** (το allauth τεστ!)
- [ ] Admin: λίστες χρηστών/υπηρεσιών/συνδρομών με σωστά στοιχεία
- [ ] Συνδρομές: το admin δείχνει τελευταία πληρωμή (backfill δούλεψε)

## 8. Μετά την πρόβα

1. Ό,τι χρειάστηκε παραπάνω/διαφορετικό → γράφεται ΜΕΣΑ σε αυτό το αρχείο
   (αυτό γίνεται ο επίσημος οδηγός του cutover).
2. Τα DATABASE-RESTORE-RUNBOOK/DEPLOY/DOKPLOY παίρνουν σήμανση «βλ.
   ΠΡΟΒΑ-RESTORE-CUTOVER.md» στο κομμάτι restore.
3. Τη μέρα του cutover: ΙΔΙΑ βήματα 1→7 με το τελικό dump στη βάση του
   production, με το site του παλιού σε freeze πριν το dump.
4. Σβήνουμε την τοπική βάση της πρόβας (`DROP DATABASE`) — έχει πραγματικά
   δεδομένα, δεν την αφήνουμε να σέρνεται στο laptop.
