# Server checks — results (TEST DB, run 2026-11-05 via psql, read-only)

DB: the Dokploy test-env Postgres (sandbox MID present → test). Raw output in
the session scratchpad (`dbcheck/out.txt`). Env/Cardlink/Brevo checks NOT yet
run (need Dokploy panel).

## ARMED / CONFIRMED (changes fix priorities)

| Check | Result | Consequence |
|---|---|---|
| Q0 | UNIQUE index live; **MID `9000011131` already written on 1 subscription** | P0-1 bomb is armed: the NEXT different paying profile 500s. Fix + Q0c NULL-out needed. |
| Q0b | 2 `incomplete` worldline subscriptions (2026-03-12, 2026-04-27) | Possible stuck rows; eyeball in Cardlink back-office. |
| Q8 | **`billing-process-worldline-renewals` beat row ENABLED** in django_celery_beat | The dormant double-billing hazard is REAL in the scheduler. Disable/delete the row BEFORE touching cron auth (fix-order trap §0.3-13). |
| Q8 | **All beat `last_run_at` stuck at 2026-07-26** | **celery-beat has NOT run since July 26** on test → no digests, no auto-refresh, no cleanups. Check the Dokploy service. |
| AQ-2 | **4 real users stuck** at OAUTH_SETUP/TYPE_SELECTION (google) | P0-2 victims exist; unstick after the code fix. |
| AQ-1 | **33 users `confirmed=false`**; 0 expired bans | P1-7 silent-lockout population is real. |
| AQ-10 | **449 published services have numeric tag ids** | P1-20 (dead tag search) affects ~64% of the catalog. |
| AQ-14 | **21 slug collisions** present in taxonomy_nodes | CG-1 level-aware fix confirmed necessary. |
| Q2 | All status/type columns are PG ENUMs | P2-38 query-param 500s are live. |
| AQ-17 | blog has `marketingk` (old slugs) in DB | Fix direction confirmed: revert the FRONTEND slug renames. |

## DEFUSED (good news — these fears are NOT live on this DB)

- Q1: allauth tables EXIST, 15 migrations applied → account delete does NOT 500 (schema D2 defused here; re-check after any fresh restore).
- Q4/Q6: `chat_members` has identity id, defaults, FKs; ALL legacy FKs intact (saved/reviews/chats/messages/blocked) → no orphan risks; block-nonexistent → FK error path.
- Q3: no credential-less-checkout poisoned rows. AQ-3: 0 broken pros (role=user). AQ-9: 0 null-category profiles (no /dir/null pills from data).
- AQ-12: 0 services over the addons/FAQ caps → P2-34 currently affects nobody.
- Q7: 1 website without http://, 0 overlong phones. AQ-11: only 1 profile coverage saved on the new stack → LOC-1 re-normalization is trivial.
- AQ-13: `verifications.afm` is TEXT → no 500 from length.
- Q5: users.password varchar NOT NULL / last_login timestamptz as expected.
- Q9: 78 profiles NULL skills, 89 NULL contactMethods (relevant to canonicalize command only). Services arrays all non-NULL.

## Immediate actions arising

1. **Close the publicly exposed Postgres port** (5432 on the server was opened for this check).
2. Dokploy: check why **celery-beat is down since July**; restart/create the service.
3. Django admin → Periodic tasks: **disable `billing-process-worldline-renewals`** (do NOT re-enable later; renewals are advice-driven).
4. After P0-2 code fix: unstick the 4 OAUTH_SETUP/TYPE_SELECTION users (UPDATE step).
5. After P0-1 code fix: run Q0c (NULL the stored MID).
6. Still pending: §4.2 env checks (Dokploy panel), §4.4 Cardlink, §4.5 Brevo, LC-11 anymail backend import check.
