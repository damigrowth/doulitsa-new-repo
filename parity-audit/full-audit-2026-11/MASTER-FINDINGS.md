# MASTER FINDINGS: full parity audit 2026-11 (consolidated from the pass-4 verifiers)

This is the one document the fix team works from. Every entry comes from the six pass-4 verifier reports in this folder. Each verifier re-derived the findings of passes 1–3 from the code. Nothing here is new analysis: when this document has to settle a conflict between verifiers, it says so in a **Reconciled** line.

The audit made zero code changes and has not been committed. The old app is the source of truth. The payment-behaviour and caching-design changes are intentional (see the `_INSTRUCTIONS.md` Addendum).

---

## 0. Stats header

### 0.1 Canonical entries per severity (this document)

| Level | Entries | Meaning |
|---|---|---|
| **P0 CRITICAL** | 7 | data loss, money, auth, cutover |
| **P1 HIGH** | 26 | feature broken or missing, data exposure |
| **P2 MEDIUM** | 45 | wrong behaviour, copy or ordering |
| **P3 LOW** | 44 | cosmetic, edge cases, API-only |
| **Total** | **122** | absorbs about 300 raw findings |

Product-decision-only items are not counted here; they are listed in §5.

**Rule for split severities.**
- A split such as "LOW-MEDIUM" or "LOW/MEDIUM" is filed at the **lower** level.
- There are two exceptions: a verifier explicitly escalated the item, or the item is a member of a group whose head is higher.

### 0.2 Pass-4 verdicts per pass (numbered findings only)

| Pass | Findings | CONFIRMED | ADJUSTED | REFUTED | Reclassified INTENTIONAL | UNVERIFIABLE / not re-verified |
|---|---|---|---|---|---|---|
| Pass 1 (11 domain reports) | 199 | 157 | 30 | 1 (adm D22) | 11 (billing, Addendum) | 0 (legs only, see §4) |
| Pass 2 (8 sweep reports) | 52 | 43 | 4 | 2 (authz D4, cache D7) | 0 | 2 U (authz D8, sm D7) + 1 not re-verified (sm D5) |
| Pass 3 (11 deepening reports) | 58 | 56 | 2 | 0 | 0 | 0 (legs only) |
| **Total** | **309** | **256** | **36** | **3** | **11** | **3** |

How the table was counted:
- "CONFIRMED" includes items that were confirmed but marked as intentional or INFO by the verifier: A-D23, A-D24, adm D24, copy D3/D4 and arch D15. Those are listed again in §3.
- Partial refutations of sub-claims (for example, the throttle legs) do not change a finding's verdict. They are listed in §3.2.
- Pass-2/3 "Corrections" sections (C-items) are not counted as findings. Their verdicts are listed in §3.3.
- **New in pass 4** (not in any earlier report):
  - adm-verifier NEW-1, NEW-2 and NEW-3
  - services-count cache poisoning (V-svc note on svc D1)
  - `/profiles/count` cache poisoning (V-prof note on arch D17)
  - the server-side free-activation hazard (V-bill escalation of bill D2)
  - auth views dropping the global throttles (V-auth §0)
  - `RevalidateWebhookView` dead under XC-CRONAUTH (V-xc §0.2)
  - the Brevo delete being enqueued before a failing `user.delete()` (V-bill on schema D2)
  - the report endpoint never checking `service_id` (V-svc on svc D10)
  - the subcategory-icon inheritance (V-svc on HST D14)
  - bare `int()` on `GET /api/services` (V-svc on N4)

### 0.3 Reconciliations between verifiers (summary; details at each entry)

1. **Privacy (PRIV-1).**
   - V-svc confirmed HST D4 at HIGH, including phone, viber and whatsapp.
   - V-prof adjusted HST D4 and rev D5 to LOW / LOW-MED and proved that OLD rendered phone, viber and whatsapp publicly.
   - **Picked V-prof**, because it read the OLD render path (`profile-info.tsx:124-165`); V-svc only re-read NEW.
   - PRIV-1 stays **P1** because of the email leak (arch D3).
2. **rev D5.** V-xc said CONFIRMED; V-prof said ADJUSTED. Picked ADJUSTED, for the same reason as item 1.
3. **val D1 (password trim).** V-xc said CONFIRMED; V-auth said ADJUSTED from HIGH to MEDIUM. Picked V-auth's severity: the behaviour is the same, and V-auth assessed the population.
4. **Throttles.** V-auth §0, V-prof THR-1, V-svc CG-4 and V-xc XC-THROTTLE all describe the same root cause and agree on it. They are merged as **XC-THROTTLE**.
   - On the OLD side, V-xc could not verify better-auth's built-in limiter.
   - V-auth showed it lives only in the HTTP router, which the OLD server actions bypass (better-auth 1.3.28 †).
   - **Picked V-auth:** OLD had no limits on login, register or resend.
5. **Group-id collisions.** V-auth's G1–G12 and V-bill's G1–G5 reuse the same names. In this document they are namespaced **AUTH-G1..G12** and **BILL-G1..G5**.
6. **Ban expiry.** adm D11 (LOW, possibly intentional: OLD admin always stored null) and A-D4 (`ban_expires` never read, HIGH group) are merged into **AUTH-G4**.
   - Enforcing expiry is parity for legacy rows, because better-auth auto-unbanned them.
   - Whether *new* admin-set expiries are honoured is §5 D-07.
7. **Crumb base `baseHref`.**
   - V-xc kept lib D9 at MEDIUM. V-svc set svc D15 / HST D13 to LOW.
   - Picked **LOW (P3)**: link target only, and V-svc gave the more recent explicit severity.
   - The singular-label part of arch D4 (PLURAL-1) stays P2.
8. **Admin taxonomy-submission purge.** adm D13 (V-adm, AM-PURGE) and HST D6 (V-svc, CG-8) are the same code (`admin_submissions.py:284-301`). They are merged into **CG-8**.
9. **Digest email.** msg D3 (V-adm) and blog D2 (V-xc) are the same defect and are merged. Both verifiers refuted the Brevo-attributes leg.
10. **Featured `.update()` purge.**
    - bill D4 (BILL-G1), arch D14 (CACHE-1), cache C3 and sm C2 share one root cause.
    - CACHE-1 (Profile signal → `service:page:*`) and BILL-G1 (helper) are two halves of one fix; see P1-24 and P2-13.
11. **Taxonomy-submission error contract.** HST D2 and prof-dash D6 are the same file and line (`F:actions/taxonomy-submission.ts:16`) and are merged.
12. **Admin password serializer lines.**
    - V-auth cites `admin_users.py:84,111`; V-xc cites `:87,115`.
    - Both refer to `B:apps/accounts/serializers/admin_users.py`, the two password `CharField`s around lines 84–115. Grep for `password` there.
13. **Cron auth vs renewals.**
    - Fixing XC-CRONAUTH (V-xc) by setting `authentication_classes=[]` would make bill D10's double-billing hazard live (V-bill).
    - **Delete the renewals route and view first** (P2-30 depends on P3-B-D10).

---

## Legend

**Path prefixes:** `B:` = `backend/`, `F:` = `frontend/src/`.

**Report keys:**

| Key | File | Key | File |
|---|---|---|---|
| auth / A- | auth-accounts.md | p3auth / P3- | pass3-auth-accounts.md |
| prof-dash | profiles-dashboard.md | p3prof | pass3-profiles-dashboard.md |
| arch | profiles-public-archives.md | p3arch | pass3-profiles-public-archives.md |
| svc | services.md | p3svc / P3-S | pass3-services.md |
| hst / HST | home-search-taxonomy.md | p3hst / N | pass3-home-search-taxonomy.md |
| rev | reviews-saved.md | p3rev | pass3-reviews-saved.md |
| msg | messaging.md | p3msg | pass3-messaging.md |
| bill | billing-payments.md | p3bill / P3-B | pass3-billing-payments.md |
| adm | admin.md | p3adm | pass3-admin.md |
| blog | blog-support-media-crons.md | p3blog | pass3-blog-support-media-crons.md |
| lib / LS | lib-shared-sweep.md | p3lib / S-D | pass3-lib-shared-sweep.md |
| authz / AZ | pass2-authz-security.md | cache | pass2-caching-matrix.md |
| copy | pass2-copy-sweep.md | payload | pass2-payload-contracts.md |
| routes | pass2-routes-urls.md | schema | pass2-schema-db.md |
| sm / SM | pass2-state-machines.md | val / VM | pass2-validation-matrix.md |

**Verifier keys:**

| Key | File |
|---|---|
| V-auth | pass4-verify-auth.md |
| V-prof | pass4-verify-profiles.md |
| V-svc | pass4-verify-services-taxonomy.md |
| V-bill | pass4-verify-billing-schema.md |
| V-adm | pass4-verify-admin-messaging.md |
| V-xc | pass4-verify-crosscutting.md |

**Verdict letters:** C = confirmed, A = adjusted, R = refuted, U = unverifiable.

**Other markers:**
- † = the verdict rests on better-auth 1.3.28 internals (old prod ran 1.4.19); see §4.6.
- SQL ids such as Q0 and AQ-1 refer to §4.1.

---

## 1. Findings by severity

### P0 CRITICAL

#### P0-1 · BILL-MID: every successful payment writes the merchant MID into the UNIQUE `provider_customer_id`, so the 2nd paying profile's activation fails with a 500
- **Fix:**
  - Delete `B:apps/billing/services/subscription_ops.py:471` (the `provider_customer_id = MID` assignment). OLD wrote it only in the `create:` branch, and it was always NULL in practice.
  - After deploying, clear the MIDs already written (Q0c).
- **Why it is critical:**
  - The IntegrityError is raised inside `transaction.atomic()`, so the whole write rolls back: no `worldline_master_order_id`, no attempt row, no email.
  - The money is captured, but the subscription stays `incomplete`, and every later advice gets a 404.
- **Absorbs:** bill D1 (V-bill C, CRITICAL). SUMMARY P0 #1.
- **Prereq:**
  - Q0 (is the constraint live? is the MID already written?)
  - Q0b (victims), cross-checked against the Cardlink back-office (§4.4)
  - Q0c (remediation, after the code fix)

#### P0-2 · AUTH-G2: Google sign-up as a simple user is always rejected (400, English)
- **Fix:** do one of these:
  - `F:actions/auth/oauth-setup.ts:20`: send `role` only when `type==='pro'`
  - or accept `"user"` in `OAuthSetupSerializer.role` (`B:apps/accounts/views/public/oauth_setup.py:29`)
- **Context:** the form auto-appends `role='user'` (`F:components/forms/auth/form-oauth-setup.tsx:174-186,205-213`). `services/oauth.py:74` is never reached.
- **Absorbs:** P3-D1 and P3-C1 (V-auth C, CRITICAL).
- **Prereq:** AQ-2 (find the stuck accounts; repair them after the fix).

#### P0-3 · AM-PAYLOAD: the admin user-detail page crashes (TypeError), so ban, delete, sessions and account edit are unreachable
- **Fix:**
  - Make `B:apps/accounts/views/admin/users.py:99-103` return the OLD shape: a flat user object with `profile{_count}`, `accounts` and `sessions`.
  - Load the profile in `B:apps/accounts/selectors/admin_users.py:98-112` (`get_user_with_relations`; the docstring already promises it).
  - Alternatively, adapt `F:app/.../admin/users/[id]/page.tsx:46` (`user = data`) to `data.user`. Note that `:99` does `user.id.slice(...)`.
- **Absorbs:** adm D1 (V-adm C, CRITICAL). SUMMARY P0 #2.

#### P0-4 · AM-WIPE (service): an admin's first add or edit of a service addon or FAQ silently replaces the whole column; the basic edit is blocked by the description rule
- **Fix:**
  - Add `description`, `addons` and `faq` to `_admin_row` and `get_service_detail` (`B:apps/services/services/admin_services.py:99-146`).
  - Fix the counts at `services/[id]/page.tsx:322,338,346`.
  - Optional hardening: have `update_service_fields` (`:166-175`) refuse an addons/faq write whose base differs from the stored data.
- **Mechanism (corrected by V-adm):**
  - Save requires `isDirty`, so an "empty save" is not possible.
  - The loss happens on the first add or edit: the list submitted contains only the edited item (`edit-service-addons-form.tsx:38`, `edit-service-faq-form.tsx:37`).
- **Absorbs:** adm D2 (V-adm A, still CRITICAL). SUMMARY P0 #3.

#### P0-5 · AM-WIPE (profile): saving the admin "additional info" form wipes 6 other fields
- **Fix:**
  - Add `commencement`, `contactMethods`, `paymentMethods`, `settlementMethods`, `budget` and `terms` to `get_profile_detail` (`B:apps/profiles/services/admin_profiles.py:115-162`).
  - Optionally make `admin_update_additional_info` (`:208-235`) write only the keys that were sent.
- **Absorbs:** adm D3 (V-adm C, CRITICAL). SUMMARY P0 #4.

#### P0-6 · AM-JWT: admin "Revoke all sessions" does not revoke JWTs (14-day refresh tokens keep working)
- **Fix:**
  - Have `B:apps/accounts/views/admin/users.py:179` call `B:apps/accounts/services/sessions.py` `revoke_all_for_user` (refresh-token blacklist), which is already used by `views/public/account.py:225`.
  - Make `revoke_session` (`services/admin_users.py:373`) and `stop_impersonating` (`:405`) effective the same way.
- **Absorbs:**
  - adm D4 (V-adm C, CRITICAL). SUMMARY P0 #5.
  - The "revoke admin sessions" leg of authz D3 (moot until this is fixed; V-adm).
- **Prereq:** check that the SimpleJWT blacklist app tables exist (`base.py:282-283` rotate + blacklist).

#### P0-7 · BILL-G5 (cutover): there is no codified path from the FINAL old-prod dump to the Django schema, and the docs contradict each other
- **Fix:**
  - Write one idempotent management command, `prepare_prisma_dump`. It should:
    - add `users.password` and `last_login timestamptz`
    - give `chat_members.id` a `GENERATED BY DEFAULT AS IDENTITY` PK, keeping the composite unique
    - run the allauth migrations for real, or remove allauth (see P1-26)
    - `--fake-initial` the Prisma apps
  - Rewrite these four docs as one sequence (final dump → command → migrate → copy the `taxonomy_*` tables from test, or `seed_taxonomy` → backfills):
    - `DATABASE-RESTORE-RUNBOOK.md` (`:10-18,58-60,150`)
    - `GO-PRODUCTION-CHECKLIST.md:70-71`
    - `DEPLOY-doulitsa-test.md:37`
    - `DOKPLOY.md:21`
  - Today the conversion SQL lives only in `backend/README.md:66-90`, and `docker-entrypoint.sh:14` runs only `migrate --fake-initial`.
- **Absorbs:** schema D1 (V-bill C, CRITICAL process). Also unblocks P2-38 (schema D4/D5).
- **Prereq:** Q1, Q4, Q5 and Q6 on test, then on prod at cutover. This is a process item, not a code bug, but it must be done before cutover.

---

### P1 HIGH

#### P1-1 · PRIV-1: the public profile-page bundle always sends both emails; public summaries send first and last name
- **Fix:**
  1. In `B:apps/profiles/selectors/profile_aggregations.py:575-579` (`profile_page_bundle`), emit a single `email = profile.email or user.email` **only when `visibility.email is True`**. Never send `user.email`.
  2. Add one public serializer: `serialize_profile_summary` (`B:apps/profiles/selectors/profile_reads.py:80-131`) minus `firstName`, `lastName`, `email` and `user`. Use it in:
     - `B:apps/core/views/public/home.py:70`
     - `B:apps/saved/selectors/saved_reads.py:59`
     - `profiles/by-username` (`views/public/profile.py:182`)
     - the service page (`B:apps/services/selectors/service_reads.py:335`)
  3. Send avatar initials instead of the names (`page.tsx:135` uses `firstName` only for initials).
  4. Add `email` to the **owner** payload only (`profile_reads.py:148-165`). This fixes prof-dash D10.
- **Do not change:** phone, viber, whatsapp and terms may stay; they were public in OLD.
- **Do not** switch home or saved to `serialize_profile_card` without checking the consumers. The service page needs `terms`, `rate` and similar fields (V-prof).
- **Absorbs:**
  - arch D3 (A: email C HIGH; phone R; names C LOW-MED)
  - rev D5 (A, LOW)
  - hst D4 (A, LOW-MED)
  - prof-dash D10 (C)
  - payload §4 re-confirm
  - SUMMARY P0b #6
- **Reconciled:**
  - V-svc kept HST D4 at HIGH, with phone, viber and whatsapp included.
  - V-prof proved that OLD rendered phone, viber and whatsapp publicly (`profile-info.tsx:124-159`) and that `visibility` only ever governs email (`:165`).
  - V-prof wins. The entry stays P1 for the 30-minute-cached login-email leak.

#### P1-2 · CG-5: public `/api/services/search` and `/count` accept a `status` override, so anyone can list drafts and unpublished content
- **Fix:**
  - Remove `status` from the public request serializer (`B:apps/services/serializers/service.py:425`).
  - Force PUBLISHED in `B:apps/services/selectors/service_reads.py:580,611` (`_public_qs(...)`).
  - Add `subdivision` (and the forced status) to the `services:count:<cat>|<sub>` key (`:604-617`).
- **Absorbs:**
  - svc D1 (V-svc C, HIGH). SUMMARY P0b #7.
  - Pass-4 new: count-cache poisoning. One anonymous `{"status":"draft"}` call stores the draft count under the published key for 30 minutes (V-svc).
  - The services half of cache D8 (V-xc C, latent).
- **Prereq:** LC-3 (is the Django host publicly routed?).

#### P1-3 · AUTHZ-PUB: public `/api/profiles/search` and `/count` accept `published:false`
- **Fix:**
  - Remove `published` from `B:apps/profiles/serializers/profile_filters.py:13`.
  - Hard-code `published=True` in `list_profiles_by_filters` / `count_profiles_by_filters` (`profile_aggregations.py:216,265`).
  - With the value forced, the count cache key (`:277-288`) is safe.
- **Exposure:** `serialize_profile_card` only (no phone or names).
- **Absorbs:**
  - authz D2 (V-prof C, HIGH)
  - arch D17 side note (pass-4 new: `published:false` poisons the shared 30-minute count cache)
  - the profiles half of cache D8
- **Prereq:** LC-3.

#### P1-4 · AUTH-G12 (keys): admin API keys are global bearer credentials for the whole Django API
- **Context:**
  - The env key maps to the oldest admin.
  - Keys are compared with a plaintext `==`.
  - There is no check of the owner's active status or role.
  - Keys are stored raw.
- **Fix:**
  - Remove `ApiKeyAuthentication` from `DEFAULT_AUTHENTICATION_CLASSES` (`B:config/settings/base.py:221-229`). Apply it only to the views that need it.
  - In `B:common/authentication.py:50-97`: hash keys at rest, compare in constant time, and check the owner's `is_active`, banned status and role.
  - In `B:apps/admin_api/services/api_keys.py:26,36,51,69-79`: store only the hash.
  - Scope list/update/delete to `user=` (`:84-122`).
- **Absorbs:**
  - authz D1 = AZ-D1 (V-auth C HIGH; V-adm C HIGH). The "unauthenticated validation oracle" sub-claim is parity (OLD's `validateAdminApiKey` was also un-gated).
  - p3adm D7 (keys span all users, LOW)
  - NEW-2 (key prefix `doulitsa_admin_` → `sk_`; the per-key limit of 1000/h is gone; LOW)
- **Prereq:** LC-8 (is `ADMIN_API_KEY` set? does `api_keys` have rows?). The support-takeover leg is P2-35.

#### P1-5 · AUTH-G1: the email-verification link no longer signs the user in; failures go to the wrong page; the resend response is wrong
- **Fix:**
  - On success, call `issue_tokens(user)` in `B:apps/accounts/views/public/auth.py:212-222`. The Next proxy `F:app/api/verify-email/route.ts` then sets `dj_access`/`dj_refresh` before redirecting.
  - On failure, redirect to `/register/failure?email=<record.identifier>`.
  - If the token is unknown but its user is already verified, redirect to the success target or `/login`.
  - Replace `exc.default_code` with `exc.code` at `auth.py:170,219`. `default_code` is always `"error"` (`common/exceptions.py:30,47`).
  - Resend: return OLD's always-success copy. That means no 409 and no `status_code=200` error envelope (`B:apps/accounts/services/registration.py:245-256`).
  - Decide whether the token stays single-use (`registration.py:192-199,225`). OLD's token was stateless and reusable.
- **Absorbs:**
  - A-D1 (C, HIGH)
  - P3-D3 (C, MEDIUM)
  - A-D15 (C, MEDIUM)
  - P3-C3
  - SUMMARY P1 #8

#### P1-6 · AUTH-G3: pro accounts left with role=user can't finish onboarding (English 403); the old safeguards are gone
- **Fix:**
  - Restore the register-form guard (OLD `form-auth-register.tsx:189-196`).
  - In `B:apps/accounts/services/google_oauth.py:49-52,120`, default to freelancer for a pro intent instead of USER.
  - In the setup form, set the default role and the enum (`form-oauth-setup.tsx:70,154`).
  - Re-add the onboarding role picker.
  - In `B:apps/accounts/views/public/onboarding.py:40`, replace `IsProfessional` with a type=pro check plus OLD's effective-role logic, and accept `role` when `type=pro and role=user`. `F:actions/auth/complete-onboarding.ts:30-37` must send it.
- **Absorbs:**
  - A-D2 (C, HIGH)
  - A-D3 (C, MEDIUM)
  - VM-3b inline-schema correction
  - SUMMARY P1 #9
- **Prereq:** AQ-3 (`type='pro' AND role='user'` victims).

#### P1-7 · AUTH-G4: `confirmed=false` users and users with an expired ban are silently treated as logged out (/login loop)
- **Context:**
  - Google sign-in has no blocked/banned check and shows no message.
  - `ban_expires` is never read.
- **Fix:**
  - In `B:apps/accounts/models/user.py:143-146`, compute `is_active = not blocked and not (banned and (ban_expires is None or ban_expires > now))`. Drop `confirmed` from it, or decide explicitly after AQ-1 (§5 D-06).
  - Auto-clear expired bans, as better-auth did† (`CcYw7b-A.mjs:100-131`).
  - `B:common/authentication.py:37-47` returns None silently; surface the reason instead.
  - Add a blocked/banned check in `google_oauth.exchange_code` (`:109-153`) that redirects to `/login?message=<Greek>`.
- **Absorbs:**
  - A-D4 (C, HIGH, needs data count)
  - A-D5 (A, LOW-MED: OLD Google sign-in refused only an unexpired *ban*, with an English error page, and never checked `blocked`; denying blocked users is arguably a fix)
  - adm D11 (C LOW; merged, see §0.3-6)
  - SUMMARY P1 #10
- **Prereq:** AQ-1.
- **Must ship with P2-1 (AUTH-G5):** a Google login re-confirms the account and hides the scope of A-D4 (V-auth §4).

#### P1-8 · AM-PAYLOAD: the admin create-service wizard is blocked (no coverage in the profile search payload)
- **Fix:** add `coverage` to `search_profiles_for_selection` / `_admin_profile_row` (`B:apps/profiles/services/admin_profiles.py:316-333`). The form computes `disabledOptions` from it (`admin-create-service-form.tsx:211-222`).
- **Absorbs:** adm D5 (V-adm C, HIGH).

#### P1-9 · Admin service Settings save re-sends the "service published" email on every save
- **Fix:**
  - `B:apps/services/views/admin/service.py:96-99`: call `update_status` only when the status actually changed.
  - `_notify_status_change` (`B:apps/services/services/admin_services.py:237-239`): email only when moving from non-published to PUBLISHED.
  - Note: OLD's separate `updateServiceStatus` action also re-emailed on a published→published change; only the Settings path regresses.
- **Absorbs:** adm D6 (V-adm C, HIGH).

#### P1-10 · Admin service-taxonomy re-parent is silently ignored
- **Fix:** forward `parentId` and move the node like OLD's `moveAndUpdateItem` + `syncServicesAfterMove`. Three places:
  - `F:actions/admin/taxonomies.ts:48-73`
  - `taxonomies-shared.ts:134-143`
  - `B:apps/taxonomy/services/dataset_ops.py:237-267` (`update_taxonomy_item`)
- **Absorbs:** adm D7 (V-adm A, HIGH). Service taxonomy only; the pro taxonomy edit form had no move in OLD either.

#### P1-11 · AM-PAYLOAD: the admin article "Συγγραφείς" author picker is always empty
- **Fix:** do one of these:
  - Let `search_profiles_for_selection` (`B:apps/profiles/services/admin_profiles.py:316-321`) return published profiles ordered by `display_name` when the query is empty (OLD `findMany({where:{published:true}, orderBy displayName})`).
  - Or have `articles/create/page.tsx:28` and `articles/[id]/page.tsx:33` call a list endpoint.
- **Absorbs:** payload D1 (V-prof C, V-adm C, HIGH).

#### P1-12 · TAX-HIER: `/dir` pills link to the broken `/dir/<sub>`; unknown or wrong-type slugs don't 404; the directory groups raw values
- **Fix:**
  1. Backend `archive_data`/`directory_data` (`B:apps/profiles/selectors/profile_aggregations.py:312-365,421-456`):
     - Resolve each subcategory's parent through the pro tree and emit `/dir/<parent>/<sub>`. Today `categorySlug: None` at `:448-450` and `:329`.
     - Drop unknown and `_uncategorized` rows.
     - On a filtered subcategory page, emit no pills, and fall back to the directory when there are 0 groups.
  2. Frontend `F:actions/profiles/get-profiles.ts:80-95`: replace the global `findProBySlug ?? findProById ?? findServiceBySlug ?? findServiceById` with type-scoped resolution: a pro category, then a child of that category. Otherwise return "not found", which leads to `notFound()`.
- **Absorbs:**
  - arch D1 (C, HIGH)
  - arch D5 (C, MEDIUM)
  - arch D8 (C, MEDIUM; with PLURAL-1 for labels)
  - arch D10 (C, LOW-MED)
  - p3arch D3 (C, LOW; `/dir/null/<sub>`)
  - the hierarchy part of arch D4
  - SUMMARY P1 #11
- **Prereq:** AQ-9 (profiles with a subcategory but no category).

#### P1-13 · DROP-1: profile filter-drawer dropdowns are capped at the top 10, in count order, with no type scope
- **Fix:**
  - Return `taxonomyData.categories`/`subcategories` from `archive_data`, built like OLD `get-profiles.ts:770-814`: all children that have profiles, type-matched, in taxonomy order.
  - Drop the borrowing from `/profiles/directory` (`profile_aggregations.py:361` `[:10]`; `F:actions/profiles/get-profiles.ts:202-216`).
- **Absorbs:**
  - arch D2 (C, HIGH)
  - arch D9 (C, LOW-MED)
  - SUMMARY P1 #12 (profiles half)

#### P1-14 · Service subdivision dropdown and carousel are truncated to 8, filtered, and include the current item
- **Fix:**
  - `B:apps/services/selectors/service_reads.py:672-678`. Build the lists as OLD did:
    - the dropdown: all populated children of the current subcategory (OLD `get-services.ts:1174-1190`)
    - the carousel: the siblings excluding the current one, top 5 (`:1222-1255`)
    - on root `/ipiresies`: `subdivisions=[]`
  - `F:actions/services/get-services.ts:209,236-258` must stop using one list for both.
- **Absorbs:** svc D4 (V-svc C+extension, HIGH). SUMMARY P1 #12 (services half).

#### P1-15 · Archive `?search=` is lost from the filter state
- **Fix:** return a `filters` object (including `search`) from the archive bundle (`B:apps/services/selectors/service_reads.py:713-730`). `F:actions/services/get-services.ts:296` reads `bundle.filters`.
- **Absorbs:** svc D3 (V-svc C, HIGH). SUMMARY P1 #14.

#### P1-16 · Every service page's meta description and JSON-LD reads `" -  - …"`
- **Fix:** do one of these:
  - Ship taxonomy ids (not Greek labels) in `_card` (`B:apps/services/selectors/service_reads.py:204`).
  - Or resolve by label/slug in `F:lib/seo/fetch-entity.ts:83-85` before `resolveServiceHierarchy`.
- **Absorbs:** svc D5 (V-svc C, HIGH). SUMMARY P1 #15.

#### P1-17 · Saving a draft service fails by default (empty duration → 0 < min 1)
- **Fix:** do one of these:
  - `F:actions/services/create-service.ts:25`: send `duration || undefined`, as OLD did (`create-service.ts:191`).
  - Or allow null in `DraftServiceSerializer.duration` (`B:apps/services/serializers/service.py:349-355`).
- **Absorbs:** svc D2 (V-svc C, HIGH). The "consumes the throttle slot" sub-claim is refuted (XC-THROTTLE). SUMMARY P1 #16.

#### P1-18 · CG-1: taxonomy level resolved through the flat `bySlug` map (21 slug collisions)
- **Symptoms:**
  - The whole Μάρκετινγκ category (8 subcategories and 42 subdivisions) is missing from search suggestions.
  - Wrong banners on 20 subcategories and on `/categories/marketing`.
  - Unknown archive slugs return 200.
- **Fix:**
  1. `B:apps/core/taxonomy.py:43-81` `_service_indexes`: build the category, subcategory and subdivision lists from `hierarchy` levels (or `build_maps()["service"]["tree"]`, `maps_builder.py:82`, which exists only in the DB-built maps). Expected counts: 8 / 88 / 490 (today 73 / 437 / 448).
  2. `F:actions/services/get-services.ts:172-181`:
     - Replace `findServiceBySlug(k) ?? findServiceById(k)` and the stub `enrich` with `findTaxonomyBySubcategorySlug` for subcategory/subdivision routes (this also yields `currentCategory`).
     - Use a top-level-only lookup for `/categories/[category]`.
     - Return `{success:false, error:'… not found'}` when nothing resolves.
- **Absorbs:**
  - HST D1 (C, HIGH; the "wrong URL" sub-claim is adjusted: it is actually a **duplicate** suggestion)
  - P3-S1 and C4 (C, MEDIUM)
  - N2 (C, LOW/MED)
  - N2b (C, MEDIUM)
  - routes D1 (C, MEDIUM; soft-404, re-probed live)
  - the slug-stored part of svc D13
  - SUMMARY P1 #13
- **Prereq:** AQ-14 (do the collisions survive on prod?). Verify with LC-5 after the fix.

#### P1-19 · Taxonomy-submission errors never reach the user (`error` vs `message`)
- **Fix:** have `F:actions/taxonomy-submission.ts:16` return `message` (OLD contract). The consumers read `result.message`:
  - `service-details-step.tsx:76`
  - `form-basic-info.tsx:230`
  - `form-service-edit.tsx:244`
- **Effect:** the backend's Greek texts (`B:apps/taxonomy/services/submissions.py:67-101`) then show.
- **Absorbs:**
  - HST D2 (V-svc C, HIGH)
  - prof-dash D6 (V-prof C, MEDIUM; same file, merged per §0.3-11)

#### P1-20 · CG-2: tag search never matches (tag slugs compared against the stored tag ids)
- **Fix:**
  - `matching_tag_slugs` (`B:apps/core/taxonomy.py:244-259`): return tag `node["id"]` (or expand to both slug and id).
  - Apply this in `_build_search_conditions` (`B:apps/services/selectors/service_reads.py:83-85`) and in suggestions.
  - Applying it to the dashboard search (`service_reads.py:743`) is an improvement over OLD, not parity (§5 D-13).
- **Absorbs:**
  - N1 (V-svc A, HIGH: archive and suggestions only)
  - p3hst C1
  - the tag clause of svc D19
- **Prereq:** AQ-10 (published services with tags; are the tags numeric?).

#### P1-21 · XC-TZ: the server timezone is no longer Europe/Athens
- **Symptoms:** all server-rendered dates are UTC; the refresh quota and admin "today" use UTC.
- **Fix:**
  - Set `TZ=Europe/Athens` for the frontend, via Dokploy env or the `frontend/Dockerfile`, or port OLD `src/instrumentation.ts:24-34`. Today the Dockerfile has **no** TZ line.
  - Backend: replace `datetime.now(timezone.utc).date()` with `timezone.localdate()` in:
    - `B:apps/services/services/service_writes.py:340-347,473-476` (refresh quota)
    - `B:apps/messaging/views/admin/chats.py:23,145` (admin "today")
  - XC-CRONTZ: the beat schedule times (`base.py:312,327-330`) are now in Athens time, where OLD used UTC. Re-check that the hours match OLD's intent.
- **Absorbs:**
  - lib D1 (V-xc C, HIGH)
  - P3-S3 (C, LOW)
  - p3adm D3 (C, LOW)
  - blog D8 (time part) and lib D13 (XC-CRONTZ, LOW)
  - SUMMARY P1 #17
  - p3lib's "Dockerfile adds TZ" correction is **refuted** (V-xc)
- **Prereq:** EF-1 (`TZ` on the frontend app; `date` inside the container).

#### P1-22 · XC-BLOGSLUG: blog category slugs differ between the frontend and Django
- **Symptoms:** admins can't save articles in 5 categories; the old category URLs 404.
- **Fix:** revert the frontend slugs in `F:constants/datasets/blog-categories.ts:20-32` to the old/backend set (`B:apps/blog/constants.py:11-25`). **Do not** change the backend: the live test DB holds `marketingk`, and `/articles/marketingk` currently 404s.
- **Absorbs:**
  - blog D1 (V-xc C; fix direction **adjusted**)
  - lib D2
  - p3blog C4
  - SUMMARY P1 #18
- **Prereq:** AQ-17 on prod (`categorySlug` distribution).

#### P1-23 · AFM-1: the AFM lookup (Πιστοποίηση) most likely fails for every AFM
- **Root cause:**
  - `afm_called_by` is set to the wrong value.
  - `error_rec` is ignored.
  - `basic_rec` is read one level too high, which always returns "not found".
- **Fix** in `B:apps/profiles/services/afm_lookup.py`:
  - `:66`: `INPUT_REC={"afm_called_by": "", ...}`
  - `:78-85`: `rt = getattr(result, "rg_ws_public2_result_rtType", None)`. If `rt.error_rec.error_code` is set, raise with `error_descr`. Read `rt.basic_rec`.
  - `:45,:55`: translate the English config/dependency errors to OLD's Greek, and the texts in `F:actions/.../lookup-afm.ts:25`.
- **Absorbs:**
  - prof-dash D1 (C in code; impact U)
  - P3-D1 (C, HIGH)
  - p3prof C3
  - the text part of prof-dash D7 (A; the throttle clause is refuted)
  - SUMMARY P1 #19
- **Prereq:** LC-10 (`lookup_afm('094014201')` in the backend shell with `print(result)`).

#### P1-24 · BILL-G1: featured flips via queryset `.update()` skip every cache purge
- **Symptoms:** the featured badge and order on the profile, directory, home and service pages wait for the TTL (up to 2 hours).
- **Fix:**
  - Add the helper `B:apps/billing/services/cache.py::apply_featured_and_purge(profile_id, featured)`. It should:
    - do `profile.featured = featured; profile.save(update_fields=["featured","updated_at"])`, which fires `invalidate_profile_caches`
    - delete `service:page:{id}` for every service of that profile, plus `services:count:*`
    - run inside `transaction.on_commit`
  - Route these through it:
    - `B:apps/billing/services/subscription_ops.py:288` (`_revalidate_featured`; called from `:511,580,613` and `advice.py:322,366`)
    - `renewals.py:293`
    - `subscription_ops.py:743` (admin status)
    - `subscription_ops.py:760` (admin delete)
  - Purge `service:page:*` on any Subscription status or plan change. The `_is_promoted_subscriber` gate in `service_reads.py:261,308` sits inside that cache.
  - If P2-13 (CACHE-1) lands first, the helper's step 2 is already covered by the Profile signal.
- **Absorbs:**
  - bill D4 (V-bill C, HIGH)
  - cache C3 (A: "cancel" is **not** a trigger)
  - sm C2 (A: manual-create already uses `save()`, `:826`)
  - arch D14 (V-prof A: the `updatedAt` part plus the purge)
  - SUMMARY P1 #20 (part)
- **Not parity gaps:** the admin paths (OLD admin did not revalidate either). Fix them anyway.
- **Not reachable:** the Next Data Cache layer cannot be reached from Django, so it stays bounded by the 5-minute TTL (accepted by design).

#### P1-25 · BILL-G4 (gate): the payments kill-switch and test mode are enforced only in the UI; Django's `PAYMENTS_TEST_MODE` defaults to True
- **Hazard:** if the env is mismatched, `/dashboard/checkout` sends pros to the Cardlink sandbox. A sandbox CAPTURED signed with the TEST secret then **activates promoted for free**.
- **Fix:**
  - Enforce `PAYMENTS_ENABLED` and test mode inside `create_checkout` (`CheckoutSessionView`, `B:apps/billing/views/public/billing.py:53-66`).
  - Default `PAYMENTS_TEST_MODE=False` (`base.py:20,469`), or fail closed.
  - Use one source of truth. Today the FE reads `process.env.PAYMENTS_TEST_MODE === 'true'` (`F:lib/payment/test-mode.ts:15`).
  - `checkout/page.tsx:43` must use `/api/payments/check-access`.
- **Absorbs:** bill D2 (V-bill C + **escalated**, HIGH env-conditional). SUMMARY P1 #20 (part). Related: P2-25 (D20) and P2-26 (P3-B1).
- **Prereq:** EB-1 and EF-2 on **both** Dokploy apps.

#### P1-26 · allauth tables were probably faked, so `user.delete()` (account delete, admin delete) may 500
- **Fix:** after Q1:
  - Either run the `account`/`socialaccount` migrations for real, or remove allauth from `INSTALLED_APPS` and the auth backends (`base.py:83-86,194-197`).
  - **Independent of Q1:** move the Brevo-delete enqueue (`B:apps/accounts/services/account.py:176-179`) into `transaction.on_commit`. Today the contact is deleted even when the user delete fails.
- **Absorbs:** schema D2 (V-bill C in code; HIGH if the tables are absent; live U). Pass-4 new: the on_commit sub-finding.
- **Prereq:** Q1.

---

### P2 MEDIUM

#### P2-1 · AUTH-G5: Google exchange re-confirms existing users (`confirmed=true`); the save hook auto-advances on every save; Google names aren't stored
- **Fix:**
  - `B:apps/accounts/services/google_oauth.py:135-137`: stop setting `confirmed` (and the image) for existing users.
  - Store `given_name`/`family_name` (`:105,113-128`).
  - `B:apps/accounts/models/user.py:199-211`: narrow the `User.save` hook to the `email_verified` False→True transition, and stop forcing `confirmed`.
- **Absorbs:**
  - SM-D1 (C, MEDIUM)
  - SM-D2 (C, LOW)
  - P3-D4 (C, LOW)
  - AZ-D4's `confirmed` sub-claim (the linking half is refuted, §3)
- **Ship with:** P1-7.

#### P2-2 · XC-TRIM: DRF `CharField` trims whitespace by default (passwords, tagline, bio)
- **Fix:** set `trim_whitespace=False` on:
  - all password fields: `B:apps/accounts/serializers/auth.py:16,21,47-49,67` and `B:apps/accounts/serializers/admin_users.py` (both password fields, ~:84–115)
  - tagline and bio: `B:apps/profiles/serializers/profile_updates.py:30-34`
- **Absorbs:**
  - VM-D1 (V-auth A: HIGH→MEDIUM; V-xc C; reconciled per §0.3-3)
  - P3-D3 (p3prof, C LOW; a whitespace-only tagline is stored as `''`)
  - the trim part of ERR-1
  - the AUTH-G6a trim part
- **Consolidator merge:** password trim and text trim share the root cause.
- **Related:** A-D6 (min 6 vs 8) is §5 D-03. VM-D6 (max 100) is INFO (§3).

#### P2-3 · XC-THROTTLE: every `ScopedRateThrottle` subclass is a no-op, and the views that use them also drop the global anon/user throttles
- **Effect:** login, register, forgot-password, resend, contact, both report endpoints, draft, AFM and taxonomy submission have **no rate limit at all**.
- **Fix:**
  - In `B:common/throttling.py:68-105`, subclass `SimpleRateThrottle` (keeping `ClientIPThrottleMixin`) so the class `scope` is honoured, or set `throttle_scope` on each view.
  - Keep `AnonRateThrottle` in each `throttle_classes` list. The affected views:
    - `accounts/views/public/auth.py:42,66,134,158`
    - `support/views/public/support.py:58`
    - `taxonomy/views/public/submissions.py:20`
    - `profiles/views/public/profile.py:199,213`
    - `services/views/public/service.py:49,116`
  - Forgot-password: add OLD's per-email 1/10-minute key (`F:` old `forgot-password.ts:28-40`) and the Greek minutes copy. The frontend `rate_limited` branch (`F:actions/auth/forgot-password.ts:20-21`) is dead code today.
  - Decide per endpoint whether to keep a limit OLD didn't have (§5 D-10).
- **Absorbs:**
  - A-D13 and LS-D11 (A: **unlimited**, not "3/10 min per IP"; MEDIUM because of mail-bombing)
  - p3prof C1, p3svc C1, p3lib C1
  - the AUTH-G7, THR-1 and CG-4 groups
  - the throttle legs of A-D12, prof-dash D7, svc D2, D6, D10, D17 and HST D3 (all refuted; §3)
  - authz D6 sub-claim (refuted)
- **Parity note:** OLD login, register and resend were unthrottled too (V-auth §0 †).

#### P2-4 · AUTH-G8: spurious logouts (refresh rotation race; a 429/5xx refresh clears the cookies)
- **Fix**, two independent parts:
  - (a) `F:lib/api/client.ts:241-251,389-401` `refreshAccessToken`: clear cookies only on 400/401, add a timeout, and forward the client IP and secret.
  - (b) Rotation race (`F:middlewares/withTokenRefresh.ts:47-110` + `base.py:282-283`): either a grace window for the previous refresh token, or don't delete cookies when the request's refresh token differs from the current cookie.
- **Absorbs:**
  - P3-D2 (C, MEDIUM; a live repro is advised)
  - S-D1 (C, MEDIUM)
  - A-D16 (session 3 d vs 7 d) is §5 D-04
- **Prereq:** EB-4 (`SIMPLE_JWT_REFRESH_LIFETIME_DAYS`).

#### P2-5 · AUTH-G10: simple users get no displayName, and reset/verification mails lose the name
- **Fix:**
  - `B:apps/accounts/services/registration.py:85-86`: set `display_name = formatDisplayName(display_name or username)` for both types.
  - Pass `user.display_name`/`username` to the mail tasks (`views/public/auth.py:86-91,145`).
  - Upgraded simple users then inherit a non-null `Profile.display_name` (`profile_updates.py:436`).
- **Absorbs:** A-D10 (C, MEDIUM), A-D19 (C, LOW), P3-C4.

#### P2-6 · AUTH-G11: guard and redirect gaps (no DASHBOARD self-heal for incomplete pros; support/editor sent to '/')
- **Fix:**
  - Port OLD `actions/auth/server.ts:409-438`: a missing image, category or subcategory at DASHBOARD → ONBOARDING, plus Brevo. Today `F:actions/auth/server.ts:183-185` returns null.
  - `F:app/.../callback/google/route.ts:94`: send support/editor to `/admin`.
  - The other A-D17 edges are at `server.ts:145-163,184-194,243-266`.
- **Absorbs:**
  - A-D7 (C, MEDIUM)
  - A-D17 (C, LOW)
  - P3-D6 (deliberate repair; §5 D-08)

#### P2-7 · Welcome email is now sent directly at verification (it may duplicate the Brevo automation)
- **Fix:** if the Brevo welcome automation is still active, remove `send_welcome_email.delay` (`B:apps/accounts/services/registration.py:231-233`). Otherwise keep it.
- **Context:** OLD imported `sendWelcomeEmail` but never called it.
- **Absorbs:** A-D18 (C, MEDIUM, live check).
- **Prereq:** BR-1.

#### P2-8 · XC-EN: backend errors reach users in English
- **Root cause:**
  - `LANGUAGE_CODE="en-us"`.
  - Hard-coded `"One or more fields are invalid."` and `"Too many requests…"` (`B:common/exceptions.py:57,80,129-135`).
  - `IsProfessional.message = "Professional account required."` (`B:apps/accounts/permissions/roles.py:52-53`).
  - The FE actions toast `err.message` as-is.
- **Fix:**
  1. Greek envelope texts in `common/exceptions.py`, with a Greek summary for DRF validation failures (first `details` message).
  2. A Greek `IsProfessional.message`.
  3. In the FE actions, map `code` (`validation_error`, `provider_error`, and so on) to OLD's per-action Greek strings.
  4. Restore the specific Greek texts listed per member below.
- **Absorbs** (all confirmed unless marked):
  - lib D3 (root, MEDIUM)
  - prof-dash D3 (MEDIUM), D14 (LOW, masked)
  - A-D12 (A, MEDIUM: duplicate email `registration.py:63`, English validation, OAuth-setup English `services/oauth.py:38-46`; the throttle part is refuted)
  - svc D6 (A, MEDIUM: envelope, `IsProfessional`, the draft cooldown `service_writes.py:239` vs OLD `create-service.ts:124`; the English throttle text **cannot occur**)
  - HST D3 (A, LOW: `submissions.py:19`, DRF min/max texts `serializers/taxonomy.py:10`, trim order; masked by P1-19)
  - bill D5 (C, MEDIUM: `cancel-subscription.ts:17` + `subscription_ops.py:32,106,115,219-243`, `providers.py:50,146-157,266,297-302`; the publish check is already Greek)
  - rev D3 (MEDIUM, `F:actions/reviews/create-review.ts:13-15`), rev D11 (401 text)
  - val D5, D8, D9 ("This field may not be blank.", the unreachable Greek category message `profile_updates.py:32-33`, empty name on report `:261-262`)
  - blog D1/lib D2's "Invalid category" text, blog N5 (generic 500)
  - msg D9's captcha English
  - the ERR-1 group (non-trim part), the CG-7 group (minus HST D2), the AUTH-G9 English parts, the BILL-G3 FE mapping
- **Count note:** "~79 files / 43 of 122 Greek" was not re-counted (V-xc).

#### P2-9 · COPY-1: success and other toast texts differ from OLD across the dashboard, services, reviews, contact and auth flows
- **Fix:** restore OLD strings, member by member:
  - **Dashboard profile, 7 flows (prof-dash D4).** OLD `additional-info.ts:139`, `coverage.ts:121`, `presentation.ts:139`, `portfolio.ts:126`, `billing.ts:133`, `verification.ts:159/224`, `update-account.ts:164`. NEW counterparts: `F:actions/profiles/{additional-info:32, coverage:20, presentation:29, portfolio:20, billing:22, verification:19}.ts`, `update-account.ts:29`. Verification needs `created` returned by the POST.
  - **Λογαριασμός (prof-dash D11).** OLD `change-password.ts:62`, `upgrade-to-pro.ts:105`, `delete-account.ts:15/49`. NEW `auth.py:123`, `account.py:156`, `F:` `delete-account.ts:16`.
  - **Services (svc D6 success part).** `F:actions/services/create-service.ts:45,60` (the draft text: `'Draft αποθηκεύτηκε'` → `'Η υπηρεσία αποθηκεύτηκε ως προσχέδιο!'`), `update-service.ts:20,61`, `report-service.ts:20`.
  - **Reviews.** rev D2 (MEDIUM: `F:actions/reviews/toggle-review-visibility.ts:15,17`, a fixed text and no `message` on error; consumer `recommendations-section.tsx:45`). rev D7 (`review_ops.py:46-47`).
  - **Contact.** msg D9 (`F:actions/messages/contact.ts:20`).
  - **Billing form.** bill D14 (`F:actions/profiles/billing.ts:22`).
  - **Auth (AUTH-G9).** A-D9 (onboarding toast), A-D14 (reset result copy; `form-reset-password.tsx:200` `includes('λήξει')`), A-D20 (login order and banned copy, `services/auth.py:77-92`), A-D22 (`views/public/account.py:90,156`, `services/account.py:46-48,68,196`).
  - **OAuth error.** P3-D7 (`/login?error=` → `form-auth-login.tsx:55` reads only `message`; map it to a Greek alert).
- **Absorbs:**
  - prof-dash D4 (MEDIUM), D11 (LOW)
  - svc D6 (part)
  - rev D2 (MEDIUM), rev D7 (LOW/MED)
  - msg D9 (A, LOW)
  - bill D14 (LOW)
  - A-D9, A-D14, A-D20, A-D22 (LOW)
  - P3-D7 (LOW)
  - adm D20 (LOW; listed again at P3-31)

#### P2-10 · Verification admin email lost its subject, the user's identity and the admin links
- **Fix:** restore OLD `email-config.ts:126-134`, subject `Νέο Αίτημα Πιστοποίησης - {displayName} ({email})`, with links. NEW: `B:apps/messaging/emails.py:171-178`, `profiles/services/verification.py:52`.
- **Absorbs:** prof-dash D5 (V-prof C, MEDIUM).

#### P2-11 · XC-MAIL-MECH (medium members): From/Reply-To, subjects, bodies and support-feedback email drift
- **Fix:**
  - **E1.** `send_email` in `B:apps/messaging/emails.py` must set `from_email` with the display name: `Doulitsa` / `Admin Doulitsa <noreply@doulitsa.gr>`. Set `reply_to=contact@doulitsa.gr` for contact-admin, contact-confirmation, service report, profile report and support feedback (OLD `email-config.ts:109,119,139,149,179`). Today `DEFAULT_FROM_EMAIL` defaults to `noreply@example.com` (`base.py:378`).
  - **E2.** Subjects as in lib D5. **Correction:** the old live Verification subject is `Επιβεβαίωση λογαριασμού στη Doulitsa` (`constants/email/templates/index.ts:36`), not the dead `EMAIL_CONFIG.VERIFICATION`.
  - **E3.** Bodies (copy D1):
    - the sign-off
    - reset "1 ώρα"
    - the new-profile/service-created dates
    - the raw category (`messaging/tasks.py:231`)
    - the contact-subject fallback `Επικοινωνία` → `Φόρμα Επικοινωνίας` (`support.py:77`)
    - `\n` collapsing inside `<p>`
  - **E8.** Support feedback (`B:apps/support/views/public/support.py:93-106`): a dedicated builder with OLD's subject and content (`email-config.ts:178-186`), Reply-To, and the tag.
- **Absorbs:**
  - lib D4 (C, MEDIUM)
  - lib D5 (A, MEDIUM)
  - blog D6 (A, MEDIUM)
  - copy D1 (C, MEDIUM; the empty-subject sub-claim is refuted)
  - blog D3 (C, MEDIUM)
  - the bill D15 from-address part
- **Prereq:**
  - EB-5 (`BREVO_SENDER_EMAIL`: does it embed a display name?)
  - **LC-11 first** (the anymail `sendinblue` alias; if it is broken, *all* email fails silently)

#### P2-12 · Unread-messages digest shows the 15 OLDEST messages instead of the 15 newest; the subject differs
- **Fix:** in `B:apps/messaging/tasks.py:87-94` + `emails.py:363`:
  - take `[:15]` of the desc-ordered list first, then reverse it (OLD `slice(0,15).reverse()`)
  - restore the subject (OLD `email-config.ts:241-245`; NEW `emails.py:360,391`)
- **Absorbs:**
  - msg D3 (V-adm A, MEDIUM)
  - blog D2 (V-xc C, MEDIUM)
  - the Brevo-attributes leg is refuted by both (§3)

#### P2-13 · CACHE-1: profile edits don't purge the owner's `service:page:{id}` (30 minutes), `archive:services` or `services:all`
- **Fix:**
  - In `B:apps/profiles/signals.py` post_save, also delete `service:page:{id}` for the profile's services. The cache key list is in `B:apps/profiles/services/cache.py:23-31`.
  - The FE profile actions must call `revalidatePublicService()` in addition to `revalidateMyPublicProfile`.
- **Absorbs:**
  - prof-dash D2 (V-prof C; citation nit: OLD purged via tags `service.byProfile`/`collections.services`, `revalidation.ts:146-151`, not via `revalidatePath`)
- **Shared with:** P1-24 (land this first).

#### P2-14 · Service writes don't refresh other service pages, the owner's profile page (Next layer), the categories page or suggestions
- **Fix:**
  - `B:apps/services/signals.py:20-36` and `F:lib/cache/revalidation.ts` `revalidatePublicService(id)`: also purge the related and additional-services collections (OLD tag `collections.services`), the owner profile tag, categories, and `services:suggest:*`. Today `service_reads.py:880` only writes to `services:suggest:*`.
  - The auto-refresh `.update()` (`B:apps/services/tasks.py:43-46`) skips `post_save`. Purge explicitly there.
- **Absorbs:**
  - cache D1 (C, MEDIUM)
  - cache D2 (C, MEDIUM)
  - cache C2
  - the svc D24 auto-refresh-purge bullet
  - blog D8 (purge part)

#### P2-15 · CG-8: taxonomy live-refresh misses in-process caches; the submission approve/reject purge is a no-op; the maps ETag can get stuck
- **Fix:**
  - `B:apps/taxonomy/services/cache.py:24-38`: also clear `core.taxonomy._pro_subcategories`, `_location_id_to_name` and the static `taxonomy_data._maps` (`taxonomy_data.py:33-35`), which feeds the duplicate checks at `submissions.py:73-90`.
  - `B:apps/taxonomy/services/admin_submissions.py:284-301`: `delete_many(["prefix*"])` deletes literal keys. Use `delete_pattern`, add `service:page:*`, and have the FE approve/reject actions (`F:actions/admin/taxonomy-submission.ts:37-58`) revalidate.
  - The approve `array_replace` SQL (`:262,275`) fires no signals. Purge explicitly.
  - Maps ETag: `B:apps/taxonomy/views/public/maps.py:50-69` reads the version before building. Re-read the version after building, or build under a lock, so a stale body can't be cached under the new ETag.
  - Lru fallback: `B:apps/core/taxonomy.py:25-41` and `locations.py:25+` pin the fallback forever if the first build fails. Don't cache the fallback.
  - `maps_builder.py:30-50` keeps raw `children`. Rebuild children and `byCategory` from the live tree.
- **Absorbs:**
  - HST D5 (C, MEDIUM)
  - HST D6 = adm D13 (C, MEDIUM; merged per §0.3-8)
  - HST D15 (C, LOW/MED)
  - cache D3 (C, MEDIUM)
  - cache D5 (C, LOW)
- **Related:** P2-16.

#### P2-16 · XC-ONCOMMIT: every purge signal fires before the transaction commits
- **Effect:** a concurrent read re-caches pre-write data.
- **Fix:**
  - Wrap the receivers in `transaction.on_commit` (today there are 0 `on_commit` uses):
    - `B:apps/profiles/signals.py:18-21`
    - `B:apps/services/signals.py:20-36`
    - `B:apps/reviews/signals.py:18-28`
    - `B:apps/taxonomy/signals.py:14-25`
  - The taxonomy `bump_version()` is the worst case, because it self-perpetuates through the ETag.
- **Absorbs:** cache D4 (V-xc C). MEDIUM for taxonomy and bulk commands; LOW for request paths.
- **Consolidator id.**

#### P2-17 · LOC-1: `coverageNormalized` is built from colliding location ids, which breaks location text search for the pro's services
- **Measured:** 834 of 1,489 ids differ, 29 of them county ids.
- **Fix:**
  - `B:apps/core/locations.py:26-52`: port OLD `getLocationName` (`datasets.ts:817-850`) literally. Counties first; then, per county, its areas and then its zipcodes.
  - Do **not** reuse `core/taxonomy._location_id_to_name`; it is not exact parity.
  - Re-normalize every profile whose coverage was written by NEW. The writers are `profile_updates.py:342` and `admin_profiles.py:246`; the reader is `service_reads.py:65`.
- **Absorbs:** P3-D2 (p3prof, C, MEDIUM) and p3prof C2.
- **Prereq:** AQ-11 (sizing: coverage writes since the new stack started).

#### P2-18 · CG-3: the location filter resolves an area to its own id instead of its parent county, and filters on unresolvable values instead of ignoring them
- **Fix:**
  - Add a helper that maps area → parent county (from `Location.parent_id`) and returns None when the value is unresolvable. It replaces `resolve_to_county_id = location_id_for_slug` (`B:apps/core/locations.py:111-137`).
  - In `B:apps/services/selectors/service_reads.py:135,153-158`, filter only when an id resolves.
  - Drop the `coverage.area`/`areas` and `county==nationwide` clauses (`:31-45`).
  - Apply the same helper in `profile_aggregations.py:78-87`.
- **Absorbs:**
  - svc D16 (C, MEDIUM)
  - P3-S2 and C2 (C, MEDIUM)
  - the `περιοχή` part of svc D21
  - arch D7 (C, MEDIUM)
  - p3arch C1

#### P2-19 · PLURAL-1: archive crumbs and pills use singular `.label` where OLD used `plural||label`; wrong gender-variant node
- **Fix:**
  - Use `plural ?? label` for the archive crumbs and pills in `F:actions/profiles/get-profiles.ts:125,137`.
  - For gender-duplicate slugs (13 of them), pick the in-category variant.
- **Absorbs:**
  - arch D4 (label part, MEDIUM)
  - arch D8 (labels part, MEDIUM)
  - arch D18 (C, LOW)

#### P2-20 · SORT-1: the featured shuffle runs only on the default sort; `sortBy` isn't validated
- **Fix:**
  - Validate `sortBy` in `archive_data` (`B:apps/profiles/selectors/profile_aggregations.py:204,238,413`): an invalid value or a list becomes `'default'`.
  - Always shuffle featured profiles to the front, like OLD `shuffleFeatured` (`get-profiles.ts:276`), unless the user decides otherwise (§5 D-02).
- **Absorbs:**
  - arch D6 (C, MEDIUM)
  - p3arch D4 (C, LOW)

#### P2-21 · XC-CARDCOV: the shared service card shows the profile's coverage modes instead of the service's own type
- **Fix:**
  - `F:components/shared/service-card.tsx:121-123`: use `service.type?.online` (OLD) instead of `service.profile?.coverage?.online`.
  - Saved cards: the badge level (`service-card.tsx:34` prefers the subcategory; `saved_reads.py:83-90`).
- **Absorbs:**
  - svc D11 (C, MEDIUM)
  - rev D4 (C, MEDIUM)
  - lib D10 (C, MEDIUM)

#### P2-22 · Service sidebar subcategory list is filtered and count-ordered
- **Context:** the `parent_row` lookup compares a slug against id-stored rows.
- **Fix:** `B:apps/services/selectors/service_reads.py:680-696`: return all subcategories that have services, in taxonomy order, with filtered children (OLD `get-services.ts:1125-1172`). Fix the slug-vs-id `parent_row` comparison.
- **Absorbs:** svc D13 (C, MEDIUM; the slug part is in P1-18).

#### P2-23 · BREVO-SYNC: missing Brevo list re-syncs after owner delete/archive and admin profile delete
- **Fix:** call `brevo_state_change` / `handleUserStateChange` in:
  - `B:apps/services/services/service_writes.py:441-452` (`delete_service`/`archive_service`; OLD `delete-service.ts:104,197`)
  - `B:apps/profiles/services/admin_profiles.py:309-313` (`delete_profile`; OLD `admin/profiles.ts:630`)
- **Absorbs:**
  - svc D9 (C, MEDIUM)
  - lib D7 (A: narrower; the admin service status and delete paths **do** re-sync now)
  - the Brevo part of adm D19

#### P2-24 · Service report email uses the generic contact template, has no service URL, and allows 10–4000 characters instead of 10–500
- **Fix:**
  - `B:apps/services/views/public/service.py:120-135`: a dedicated `sendServiceReportEmail` equivalent with the service URL.
  - Cap the message at 500 (`serializers/service.py:450`).
  - Check that `service_id` exists before mailing.
- **Absorbs:** svc D10 (V-svc A, MEDIUM; the throttle part is refuted). Pass-4 new: the `service_id` check.

#### P2-25 · BILL-G4 (env override): `WORLDLINE_BASE_URL`/`API_URL` override the mode endpoints; `.env.example` ships the sandbox URLs
- **Fix:**
  - `B:apps/billing/services/worldline.py:70-72`: ignore the overrides unless explicitly enabled.
  - Fix `.env.example:56-57`.
  - Stop the generic `MERCHANT_ID`/`SHARED_SECRET` from back-filling both modes (`:58-65`).
- **Absorbs:** bill D20 (C, MEDIUM env-conditional).
- **Prereq:** EB-1.

#### P2-26 · BILL-G4 (provider poisoning): a subscription is stored as `manual` when the MID is missing at first checkout
- **Fix:** `B:apps/billing/services/subscription_ops.py:36-45`: resolve the provider for incomplete rows as worldline. Use OLD's `existing.provider || 'worldline'`, and upsert only after success (`providers.py:236-250,78`).
- **Absorbs:** P3-B1 (C, MEDIUM). Parity caveat: an admin-manual row blocks re-checkout in both stacks.
- **Prereq:** Q3.

#### P2-27 · BILL-G2: the Cardlink proxy hop drops User-Agent, follows Django's 302 and has no catch or timeout; webhooks are throttled on the container IP
- **Effects:**
  - S2S acknowledgements become 200 HTML.
  - An S2S digest failure returns 200, so Cardlink won't retry.
  - A 429 on an advice means a lost renewal.
- **Fix**, preferred option:
  - Point Cardlink's confirm, cancel and advice URLs straight at Django.
  - On the webhook, advice and redirect views (`B:apps/billing/views/public/billing.py`), set `throttle_classes=[]`, `authentication_classes=[]` and `renderer_classes=[JSONRenderer]`.
- **Fix**, alternative: harden `F:app/api/webhooks/worldline/route.ts:26-33` and `advice/route.ts:24`:
  - forward `user-agent`
  - `redirect:'manual'`, passing `Location` and the status through
  - `try/catch` returning 502/503
  - `AbortSignal.timeout(20000)`
- **Absorbs:**
  - bill D3 (A, MEDIUM; the browser bounce works by accident)
  - P3-B2 (C, MEDIUM)
  - P3-B3 (C, LOW-MED)
  - SUMMARY P1 #20 (part)
- **Prereq:** CL-1 (which URLs are registered with Cardlink?).

#### P2-28 · Cancelling a subscription doesn't refresh the promote page (a second click sends another Cardlink cancel)
- **Fix:** `revalidatePath('/dashboard/promote')` in `F:actions/subscription/cancel-subscription.ts`, or `router.refresh()` in `promote/cancel-subscription-button.tsx` (OLD `cancel-subscription.ts:42`).
- **Absorbs:** bill D7 (C, MEDIUM).

#### P2-29 · BILL-G3: gateway cancel errors surface as a raw HTML 500 ("HTTP 500" toast) or the empty `<Message>`
- **Fix:**
  - Wrap `worldline_cancel` (`B:apps/billing/services/worldline.py:332,371,381`) in `try/except (RuntimeError, requests.RequestException)` and raise `ApiError(code="provider_error", 502)`.
  - Parser at `:387`: copy the `:283` guard (`if text and tag not in fields`).
  - Map the code to Greek in the FE (P2-8).
- **Absorbs:**
  - P3-B4 (C, LOW)
  - P3-B5 (C, LOW)
  - the bill D5 mechanics
- **Placement:** filed at P2 because bill D5 (MEDIUM) heads the group.

#### P2-30 · XC-CRONAUTH: the HTTP cron and webhook endpoints can never authenticate (SimpleJWT swallows `Bearer <CRON_SECRET>` → 401)
- **Affected views:** `ProcessEmailBatchesCronView`, `AutoRefreshCronView`, `WorldlineRenewalsCronView` (`billing.py:400-424`) and `RevalidateWebhookView` (`B:apps/core/views/admin/cache.py:44-60`).
- **Fix:**
  - **First** delete or 410 the renewals route and view and its `frontend/vercel.json` entry (P3-37). Otherwise this fix makes the double-billing hazard live.
  - Then set `authentication_classes=[]` on the remaining views (`B:common/permissions.py:54-68 IsCronOrAdmin` is dead in the same way).
- **Absorbs:**
  - p3blog N1, C2, C3 (C + extended; live-proven)
  - the authz §4 "fail closed" claim (A)
  - blog D10 Django twin
- **Prereq:** LC-1 (re-probe) and AQ-16 / Q8 (is beat deployed? is there a stale renewals row?). While beat runs, this is latent.

#### P2-31 · Admin can't remove an article's cover image (null is dropped on update)
- **Fix:** `UpdateArticleSerializer.to_internal_value` (`B:apps/blog/serializers/article.py:98-100`) must keep explicit `None`.
- **Absorbs:** p3blog N2 (C, MEDIUM).

#### P2-32 · Brevo list env-var names changed and the default list id was dropped
- **Fix:** accept OLD's `BREVO_LIST_EMPTYPROFILE/NOSERVICES/PROS` (default 6) in `base.py:386-391` / `brevo.py:52-61,277-280`, or set the new names in the env.
- **Absorbs:** lib D6 (C, MEDIUM).
- **Prereq:** EB-6.

#### P2-33 · XC-PROXYIP: all Next→Django calls share the frontend container's IP for the anon throttle (100/5s)
- **Fix:** forward the real client IP plus `INTERNAL_PROXY_SECRET` from every Next→Django fetch (`F:lib/api/client.ts`, including the refresh) so `common/throttling.py get_ident` keys correctly. Webhooks are covered by P2-27.
- **Absorbs:**
  - lib D12 (C mechanism; the page-500 effect is U under load)
  - the IP part of S-D1
  - the container-IP part of P3-B2
- **Consolidator id.**
- **Prereq:** EB-7 / EF-3 (`INTERNAL_PROXY_SECRET` on both apps).

#### P2-34 · Services with more than 3 addons or more than 5 FAQs (allowed by OLD) can no longer be edited
- **Fix:** drop `max_length=3/5` from the Update serializer (`B:apps/services/serializers/service.py:170-181`), or apply it only on create. OLD's update schema was uncapped.
- **Absorbs:** val D2 (V-svc C+U, V-xc C, MEDIUM).
- **Prereq:** AQ-12.

#### P2-35 · AUTH-G12 (support): support can set an admin's password, demote admins, ban them or edit them
- **Fix:** in `B:apps/accounts/services/admin_users.py:50-56,176-183,343-358` (views `views/admin/users.py:127-230`), refuse password, role, session, ban, delete and basic-info writes on admin-like targets unless the actor is admin.
- **Absorbs:** authz D3 = AZ-D3 (V-auth C MEDIUM; V-adm C; the OLD refusal is U).
- **Prereq:** OV-3 (Vercel `ADMIN_USER_IDS`).

#### P2-36 · AM-PAYLOAD (medium members): admin lists and details lack keys the copied UI reads
- **Fix:**
  - Add `taxonomyLabels` to `_admin_profile_row`/`_admin_row` (`admin-profiles-data-table.tsx:126-131`, `admin-services-data-table.tsx:147-153`).
  - Annotate `_count` in `get_profile_detail` (`admin_profiles.py:116-121`).
  - Add `banned`, `step`, `username`, `image` and `createdAt` to the nested `user` (`:90-93`).
- **Absorbs:**
  - adm D8 (C, MEDIUM)
  - adm D9 (C, MEDIUM)

#### P2-37 · AM-WIPE (medium members): admin presentation can't clear fields; admin billing writes `null`, which poisons the form; avatar removal clears the User but not the Profile
- **Fix:**
  - `admin_profiles.py:270-272` `update_profile`: honour explicit `None` as a clear. This covers the presentation fields (OLD: `value||null`, `visibility||{email:true}`, `socials||DbNull`).
  - `F:actions/admin/profiles/billing.ts:18-26`: send `''` instead of `null` (OLD).
  - `F:actions/admin/users.ts:300`: don't send `image:null` unless it was removed. When removed, also clear `Profile.image` (`profile_updates.py:68-70`).
  - Return `message` so `form-account.tsx:119-127` toasts.
  - Restore the 1–100 validation limits (`serializers/auth.py:71`).
- **Absorbs:**
  - adm D10 (C, MEDIUM)
  - p3adm D1 (C, MEDIUM)
  - adm D12 (A, MEDIUM: OLD never cleared the avatar; NEW half-clears it)
  - the AM-MSG member adm D12

#### P2-38 · BILL-G5 (drift): schema drift and enum columns (raw INSERTs, PG ENUM DataError 500s)
- **Fix:**
  - Covered by `prepare_prisma_dump` (P0-7) for `chat_members.id`, `users.password` and `last_login`.
  - The raw INSERT at `B:apps/messaging/services/chat_ops.py:277-284` must supply `joinedAt/lastSeen/muted/online`.
  - Validate the query-string enum values before filtering (otherwise `22P02` gives a 500) at:
    - `services/views/public/service.py:281-282` / `service_reads.py:730-731`
    - `reviews/views/admin/reviews.py:45-53` (and `int(rating)`)
    - `admin_submissions.py:59-62`
    - `submissions.py:126-127`
- **Absorbs:**
  - schema D3 (C, MEDIUM)
  - schema D4 (C, MEDIUM)
  - schema D5 (C, MEDIUM latent)
- **Prereq:** Q2, Q4, Q5, Q6.

#### P2-39 · Messaging: the open chat's unread badge never clears (the `read` event is ignored)
- **Fix:** handle `read` in `F:lib/hooks/chat/use-chat-list-subscription.ts:50-55`. It is already broadcast by `chat_ops.py:418` → `consumers.py:289-290`.
- **Absorbs:** msg D1 (V-adm C; the OLD ~30 s self-heal is U).
- **Prereq:** OV-2 (optional).

#### P2-40 · Messaging: chat page guards (non-member → 404 instead of redirect; empty chat not redirected)
- **Fix:** `[chatId]/page.tsx:44-46`: redirect like OLD `:57-82`, and add the empty-chat check.
- **Absorbs:** msg D2 (C, MEDIUM).

#### P2-41 · MSG-OPTIMISTIC: a failed send looks like a sent message; the temp bubble is interactive; the store is never cleared
- **Fix:** have `chat-messages.tsx` render the `error`/`sending` state from `use-message-optimistic.ts:34-56,119` (retry/remove), and clear the store on success or unmount.
- **Absorbs:** P3-D1 and C1 (p3msg, C, MEDIUM). The read-tick members are P3-24.

#### P2-42 · HST D14: `/categories/[category]` subcategory cards inherit the parent category's icon (all 88) and image (3)
- **Fix:** `F:actions/.../get-categories.ts:159-160`: drop the `icon: sub.icon ?? cat.icon` fallback (OLD had the icon commented out), and drop the image fallback.
- **Absorbs:** HST D14 (V-svc A, LOW→MEDIUM). Pass-4 extension: the icon.

#### P2-43 · NAV-AGG: the mega-menu and home aggregations include orphan/raw entries, break ties arbitrarily, and slice before resolving
- **Fix:**
  - `B:apps/services/selectors/service_reads.py:420-425,463,480-486,499-520`:
    - drop `_uncategorized`/`_` rows
    - add a taxonomy-position tiebreak
    - resolve before `[:limit]`
  - `F:` `get-categories.ts:305-355`, `get-home-data.ts:44-65,229-260`: service-only resolution and no pro fallback; derive hrefs from the taxonomy parent, not the stored row.
- **Absorbs:**
  - HST D7 (C, MEDIUM, data-dependent)
  - HST D8 (C, MEDIUM)
  - HST D9 (LOW/MED)
  - HST D10 (LOW)
  - N3 (LOW)
  - svc D23 (LOW)
- **Consolidator id.**
- **Prereq:** AQ-15.

#### P2-44 · REV-AUTHOR: review author name and avatar taken from Profile instead of User (empty for simple users)
- **Fix:** take displayName, username and image from the author **User** in:
  - `B:apps/reviews/selectors/review_reads.py:272-278` (public)
  - `review_reads.py:315-337` (admin `_admin_card`)
  - OLD reference: `get-reviews.ts:29-36`, `admin reviews.ts:80-87`
- **Absorbs:**
  - rev D1 (C, MEDIUM) and its p3rev correction (the scope includes public cards and the Google name)
  - adm D16 (C, LOW/MED)
- **Prereq:** AQ-18 (Google-name drift).

#### P2-45 · Old-format password-reset links give a raw JSON 404 that lists the whole API
- **Fix:** in `F:app/api/auth/[...all]/route.ts` (or Django `BetterAuthCatchAllView`):
  - `GET reset-password/<token>` → 302 `/reset-password?error=INVALID_TOKEN`
  - any other unknown GET → a plain 404 without the manifest
- **Absorbs:** routes D2 (V-xc C, live; LOW transitional plus info exposure).
- **Placement:** filed at P2 only because it bites at cutover day. Downgrade to P3 if the cutover happens more than an hour after the last old reset mail.

---

### P3 LOW

#### P3-1 · AUTH-G6b: server-side validation gaps (affect crafted requests only; the client zod schemas still block)
- **Fix:** port OLD's zod rules into the serializers:
  - consent must contain `terms` (parse the JSON; `F:actions/auth/register.ts:12`, `serializers/auth.py:35`)
  - confirmPassword
  - simple username of at least 3 characters (`registration.py:152-168`; OLD **rejected** short local parts)
  - email regex (`serializers/auth.py:20,39,62`)
  - onboarding: bio stripped to 80–5000, coverage refine, portfolio at most 10 (`views/public/onboarding.py:24-30`)
- **Absorbs:**
  - A-D8 (A)
  - A-D11 (A)
  - A-D21 (A; the 500 claim is refuted)
  - VM-D3 = val D3 (C)

#### P3-2 · Google OAuth `next` is an open redirect (near-unreachable)
- **Fix:** require `next` to start with `/` and not `//` (`oauth/google/login/route.ts:30,48`, `callback/google/route.ts:44,91-96`).
- **Absorbs:** AZ-D9 (V-auth A).

#### P3-3 · `/api/auth/[...all]` dot-segment traversal via a double-encoded `%252E%252E`
- **Fix:** reject `.`/`..` segments after decoding in `F:app/api/auth/[...all]/route.ts:19`.
- **Absorbs:** AZ-D8 (U).
- **Prereq:** LC-4.

#### P3-4 · OAuth setup creates an unpublished stub Profile for pros
- **Fix:** don't create the Profile in `services/oauth.py:84-89`; leave it to onboarding. Or keep it, and make sure no link points to it (msg D7).
- **Absorbs:** SM-D3 (C, LOW).

#### P3-5 · The registration store is persisted (OLD kept it in memory)
- **Fix:** drop `persist(...)` at `authStore.ts:51`.
- **Absorbs:** P3-D5 (C, LOW).

#### P3-6 · Onboarding no longer resets contact visibility to the default
- **Fix:** `onboarding.py:131-132` should always write `{email:false, phone:true, address:true}` (OLD `complete-onboarding.ts:158,176`).
- **Absorbs:** sm D5 (**not re-verified in pass 4**; from the pass-2 report).
- **Possibly intentional:** yes (§5 D-16).

#### P3-7 · AFM column is varchar(16) but the serializer allows 20
- **Fix:** align the serializer to 16, or widen the column.
- **Absorbs:** prof-dash D9 (C code; DB U).
- **Prereq:** AQ-13 (`\d verifications`).

#### P3-8 · Profile-form small deltas
- **Members:**
  - bio whitelist and normalization (`profile_updates.py:40-44,172-183`: `' '` and no trim; adds a/u/h1-6/blockquote; drops img)
  - account image unvalidated (`accounts/services/account.py:46-48`)
  - rate `"0"` is stored as 0 (`F:actions/profiles/additional-info.ts:22`)
  - laxer payload sanitization (`cloudinary.py:43-55`, presentation default visibility `profile_updates.py:386`)
- **Fix:** match OLD per item.
- **Absorbs:** prof-dash D8, D12, D13, D15 (all C, LOW).

#### P3-9 · SAVE-1: own-profile writes do a full-row `profile.save()`, which can revert a concurrent write (including a webhook's `featured` flip)
- **Fix:** pass `update_fields` in `update_basic_info` (~:168), `update_additional_info` (:262) and `update_presentation` (:388) in `B:apps/profiles/services/profile_updates.py`.
- **Absorbs:** P3-D4 (p3prof, C, LOW).

#### P3-10 · ORD-1: subdivision badges come in random order; directory count ties are arbitrary
- **Fix:**
  - Preserve first-seen order instead of a `set` at `profile_aggregations.py:596-602`.
  - Add a taxonomy-position tiebreak after `-count` (`:321,440`).
- **Absorbs:**
  - arch D11 (LOW-MED)
  - p3arch D2 (LOW-MED)

#### P3-11 · RAW-ID-1: unresolved taxonomy values render as raw ids
- **Locations:** the profile page (`F:` `get-profile.ts:150-170,185-204`) and service-card fallbacks (`service-media-card.tsx:80`, `_brief_service :652`).
- **Fix:** drop unresolved values and resolve hierarchically, as OLD did.
- **Absorbs:**
  - arch D12 (LOW-MED)
  - p3arch D6 (LOW)

#### P3-12 · Directory search on a gender-variant label also returns the sibling variants
- **Fix:** return matched node **ids** from `core/taxonomy.py:292-301` instead of slugs expanded through `taxonomy_value_candidates` (`profile_aggregations.py:126-139`).
- **Absorbs:** p3arch D1 (V-prof C, MEDIUM→LOW-MED).

#### P3-13 · XC-PAGEPARAMS: a bad `?limit`/`?page` or a repeated `?sortBy` shows the error page where OLD fell back to defaults
- **Locations:**
  - `/dir` → 500, category → 404, subcategory → 500 (p3arch C2)
  - `/ipiresies` (`page.tsx:43-45`)
  - `/dashboard/saved` (`saved/page.tsx:27-30`)
- **Fix:**
  - Sanitize in the pages: a NaN or out-of-range value becomes the default.
  - Make the serializers lenient (`profile_filters.py:26`, `services/serializers/service.py:443`, `saved.py:14-17`).
  - Guard `_SORT_MAP.get(list)` (`service_reads.py:170`).
- **Absorbs:**
  - arch D13 (C)
  - p3arch C2
  - P3-S4 (C)
  - p3rev N1 (C)
- **Consolidator id.**

#### P3-14 · XC-INTPARSE: a bare `int()` on query params gives a 500
- **Locations:**
  - `B:apps/services/views/public/service.py:154,223-226`
  - `service_reads.py:761-763`
  - `B:apps/messaging/views/public/chats.py:90,171` (a negative slice raises an AssertionError)
  - `B:apps/reviews/views/public/reviews.py:14-19`
  - `B:apps/blog/views/public/article.py:17-18` (page ≤ 0)
- **Fix:** parse with defaults and bounds.
- **Absorbs:**
  - N4 + extension (C)
  - msg D11 (C)
  - rev D11 (the int part)
  - blog D11 (C)
- **Consolidator id.**

#### P3-15 · CG-6: the archive base crumb links to `/ipiresies` instead of `/categories` (services) and to `/dir` instead of `/directory` (profiles)
- **Fix:** restore `baseHref` support. Services: `baseHref:'/categories'` (OLD `get-services.ts:1112-1116`; NEW `get-services.ts:285`). Profiles: `'/directory'`, with the `/dir` base crumb unlinked (`profile_aggregations.py:456`).
- **Absorbs:**
  - svc D15 = HST D13 (V-svc C, LOW)
  - lib D9 (V-xc C, MEDIUM; reconciled to LOW per §0.3-7)
  - the base-href part of arch D4

#### P3-16 · Service breadcrumb: flat lookup with a pro fallback; raw-id crumbs where OLD omitted the crumb
- **Fix:** use `r.label` and hierarchical resolution in `F:` `get-service.ts:220`. The plural branch changes nothing today (0 of 586 nodes differ).
- **Absorbs:** svc D14 (V-svc A, LOW).

#### P3-17 · Service write and draft small deltas
- **Members:**
  - PATCH skips the description ≥ 80 rule (API-only, `serializers/service.py:246-252`; svc D7)
  - draft side effects (svc D17 bullets 1, 3, 4, 5): stamps on submit (`service_writes.py:200`), `'Untitled'` (`:246`), no `canCreateService` gate on a draft, taxonomy filters (`:141-142`)
  - dashboard category Select is a no-op (`(list)/page.tsx:27-51`; svc D18)
  - dashboard search semantics (`service_reads.py:736-746`; svc D19)
  - archive tokenisation (`service_reads.py:160-163`; svc D20)
  - query params `online=false` and `popular` (`:128-130,663`; svc D21)
  - owner role gates: `IsProfessional` everywhere vs OLD "block only `user`" (svc D22)
  - smaller deltas (svc D24): media `ListField(JSONField)`, bleach `strip=True`, by-slug has no profile-published gate (`service_reads.py:250-251`), the `usePaymentsAccess` star gate
- **Fix:** match OLD per item.
- **Absorbs:** svc D7, D17, D18, D19, D20, D21, D22, D24 (all C or A, LOW).

#### P3-18 · Home and footer small deltas
- **Members:**
  - featured tabs hide empty categories (HST D11)
  - home profiles exclude `image=""` (HST D16)
  - the footer cookies link and button (HST D17)
- **Possibly intentional:** all three (§5 D-17).
- **Absorbs:** HST D11, D16, D17.

#### P3-19 · Admin taxonomy CRUD: duplicate slug → 409 instead of an auto-unique slug; order 0; the error reason is hidden
- **Fix:**
  - Port `generateUniqueSlug` into `B:apps/taxonomy/services/dataset_ops.py:60,89,100-101,130,140-141,244-245`.
  - Show the server reason in `edit-taxonomy-item-form.tsx` / `edit-pro-taxonomy-form.tsx` instead of `'Failed to save changes — please try again'`.
- **Absorbs:**
  - HST D18 (C)
  - adm D17 (C)
  - NEW-3 (pass-4 new)

#### P3-20 · AM-PAYLOAD (low members): chat messages and chat detail in admin
- **Members:**
  - messages table renders `authorId` instead of `author{…}`, and the sort is hard-coded (`admin-chat-messages-data-table.tsx:27,35`; `views/admin/chats.py:180,212-224`)
  - chat detail shows the email instead of the avatar and `@username`; `notFound()` is unreachable (`admin-chat-detail-stats.tsx:67-80`, `F:actions/admin/chats.ts:28-46`)
  - verification avatar, service "by" fallback, create toast (p3adm D8)
- **Absorbs:**
  - adm D14 (C, MEDIUM; filed here because the component regressed, not data)
  - adm D15 (C)
  - p3adm D8 (C)

#### P3-21 · Admin chat-list sort precedence (the table sort should win)
- **Fix:** `views/admin/chats.py:57-65`.
- **Absorbs:** p3adm D2 (LOW/MED).

#### P3-22 · AM-MSG (low members): blank or missing toasts because `wrap()` returns no `message`
- **Fix:**
  - Return a `message` from `F:actions/admin/reviews.ts:11-14,44-47` (consumer `admin-review-actions.tsx:114`).
  - Return or throw from `F:actions/messages/reactions.ts:9-19` so that `chat-messages.tsx:82-89` shows the toast.
- **Absorbs:**
  - p3adm D4 (C)
  - P3-D4 (p3msg, C)

#### P3-23 · Admin team, users and profiles small deltas
- **Members:**
  - team (adm D18): `assign_admin_role` sets the step only for admin-like roles; the `freelancer` fallback; search order and min length; the Blocked badge removed
  - profile list (adm D19): search has no email; delete returns ids; generic PATCH camelCase keys are dropped by `hasattr` (`views/admin/profiles.py:96-97`)
  - user side effects (adm D21): Brevo sync only on `sync_reason`; the impersonate Session row is unused
  - payments page size 10 → 25 (adm D23; `F:lib/api/admin.ts:158`)
  - no self-delete guard (p3adm D6; the OLD side is U)
- **Fix:** match OLD per item.
- **Absorbs:**
  - adm D18, D19 (minus Brevo, which is P2-23), D21, D23
  - p3adm D6

#### P3-24 · MSG-OPTIMISTIC (low members): read ticks were added (new) and show "seen" on every own message after a reload
- **Fix:** `F:actions/messages/messages.ts:48` `isRead: isOwn || …` must use the real read state. Or remove the ticks (OLD had none).
- **Absorbs:**
  - msg D5 (C)
  - P3-D3 (p3msg, C)

#### P3-25 · MSG-NAME: chat list vs header name/avatar source
- **Context:**
  - A list keying bug (`chat_ops.py:92` vs `:102`).
  - The header is Profile-first.
  - "Άγνωστος χρήστης" appears instead of "Χρήστης" when there is no other member.
- **Fix (parity):**
  - Use User fields (including `User.image`) in both the list and the header (`chat_ops.py:110-118,214-221`).
  - Fallback `'Χρήστης'` (`chat-list-item.tsx:43,55`, `dashboard-content.tsx:231`).
  - Alternatively, fix the keying at `:92` so the list and header agree (§5 D-11).
- **Absorbs:**
  - msg D6 (A; superseded by V-adm §2)
  - sm D4 (C)
  - sm C1 (C)
  - p3msg C1-confirm

#### P3-26 · Messaging small deltas
- **Members:**
  - header `type` derived from Profile (msg D7, a deliberate QA fix; §5 D-11)
  - presence semantics (msg D8, invisible)
  - message delete, reactions and blocking edges: `{}` vs null, a silent 204 on unblock, blocking a nonexistent id (msg D10; the outcome depends on Q6)
  - dashboard card avatar (msg D12)
  - `getChats` swallows errors (msg D13, `F:actions/messages/chats.ts:103-108`)
  - the WS token never refreshes after 15 minutes (P3-D2 p3msg; AM-JWT; recovered by the 60 s poll)
  - the no-service dialog reappears every ~15 minutes (payload D2; AM-JWT; `views/public/account.py:52-58` `session.id = jti`; make it a stable id)
- **Fix:** match OLD per item.
- **Absorbs:**
  - msg D7, D8, D10, D12, D13
  - P3-D2 (p3msg)
  - payload D2 (LOW/MED)
  - schema C2 (U)
  - the adm D21 impersonate leg

#### P3-27 · Deterministic chat `cid` + UNIQUE → a concurrent start-chat gives a 500
- **Fix:** catch `IntegrityError` and re-get (`chat_ops.py:246-276`).
- **Absorbs:** schema D6 (C).

#### P3-28 · Django-admin model validators block saving legacy rows
- **Fix:** relax the validators on the legacy TEXT-backed fields, or use admin forms with `validators=[]`.
- **Absorbs:** schema D7 (C).
- **Prereq:** Q7.

#### P3-29 · Saved toggle returns "saved" on an FK violation (false success; no orphans)
- **Fix:** have `B:apps/saved/services/toggle.py:23-27,36-39` return 404 on `IntegrityError` instead of True.
- **Absorbs:**
  - rev D8 (V-xc A)
  - schema C1 (C code)
- **Prereq:** Q6.

#### P3-30 · Reviews small deltas
- **Members:**
  - rounding is half-even vs JS `toFixed` (`review_reads.py:29,40`, `recalculate_ratings.py:30,51`; use `Decimal` ROUND_HALF_UP)
  - legacy `''` comments are excluded (`review_reads.py:154,172`)
  - unused-path drift (`review_ops.py:142-144`)
  - notifications use the literal `"PENDING"` vs `"pending"` (`admin_api/views/admin/notifications.py:126`)
  - the Django-admin Review bypass skips the recalc and approval email (`reviews/admin.py`; the bulk-delete purge still runs)
- **Fix:** match OLD per item.
- **Absorbs:**
  - rev D6, D9, D10
  - p3rev N2 (C)
  - p3rev N3 (A)

#### P3-31 · Admin profile success texts
- **Fix:** restore the strings tabulated in adm D20 (`F:actions/admin/profiles/*.ts`; username-taken `admin_users.py:204`).
- **Absorbs:** adm D20 (C).

#### P3-32 · XC-MAIL-MECH (low members)
- **Members:**
  - **E4.** The plain-text part is a tag-stripped mess (`emails.py` `_TAG_RE.sub`). Generate proper text twins (p3blog N6).
  - **E5.** Brevo tags: use OLD's enum values (`user_registration`, `contact_admin`, …), `emails.py:23-38` (p3blog N3).
  - **E9.** `FRONTEND_BASE_URL` defaults to `http://localhost:3000` (`base.py:416`; S-D2).
  - **E11.** The admin payment email: subject with the user's email; date via Athens `toLocaleString('el-GR')` (`emails.py:404-474`; bill D15).
  - The digest rewrites the recipient's `users` row (`messaging/tasks.py:111-112`): use `update_fields`/`.update()` (p3blog N4).
- **Fix:** per member, as above.
- **Absorbs:** p3blog N3, N4, N6; S-D2; bill D15.
- **Prereq:** EB-8 (`FRONTEND_BASE_URL`).

#### P3-33 · Support feedback: extra DB write, loosened validation, different texts
- **Fix:** `support.py:28-35`, matching OLD.
- **Absorbs:** blog D4 (C).

#### P3-34 · Blog small deltas
- **Members:**
  - article payload lacks `updatedAt`, so JSON-LD has no `dateModified` (`articles.py:~100-113`; blog D5)
  - the old slug is not purged on rename (`articles.py:325,361,375-383`; blog D9)
  - duplicate slug → 500 (no `IntegrityError` handling, `articles.py:255-287,305-362`; p3blog N5; the >255 half is moot)
  - empty-title draft can't be saved (`article.py:42-45,76-79`; val D5)
- **Fix:** match OLD per item.
- **Absorbs:** blog D5, D9, p3blog N5, val D5.

#### P3-35 · SEO and sitemap small deltas
- **Members:**
  - JSON-LD base env chain (`schema/article-schema.tsx:33`; lib D14)
  - static sitemap additions (lib D15, additive)
  - the backend serves divergent sitemaps and public docs on the API host (lib D16)
  - SEO via public endpoints (lib D17)
- **Fix:** match OLD per item.
- **Absorbs:** lib D14, D15, D16, D17.

#### P3-36 · Shared-component and client small deltas
- **Members:**
  - sidebar `usePaymentsAccess` gate, `next-link.tsx:84`, `dashboard/page.tsx:8` 60 vs 3600, avatar `referrerPolicy` (lib D18)
  - no fetch timeout in `client.ts` (lib D19)
  - unpinned `react-hook-form`, React 19.0.1 → 19.2.7 (S-D4, INFO)
  - `DJANGO_INTERNAL_URL=http://backend:8000` can't work with `SECURE_SSL_REDIRECT` (S-D3, a docs trap)
- **Fix:** match OLD per item.
- **Absorbs:** lib D18, D19, S-D3, S-D4.

#### P3-37 · The renewals HTTP cron route and view still exist (latent double-billing if XC-CRONAUTH gets "fixed")
- **Fix:**
  - Delete or 410 `WorldlineRenewalsCronView` (`billing.py:400-424`).
  - Remove `/api/cron/worldline-renewals` from `frontend/vercel.json`.
  - Disable any stale beat row (Q8).
- **Absorbs:** the bill D10 hazard part (V-bill: REFUTED as live, latent).
- **Ordering:** must precede P2-30.

#### P3-38 · Billing parse strictness and the concurrent browser + S2S race
- **Members:**
  - `isdigit`, `int()`, `or` vs `??`, naive timestamps (`subscription_ops.py:354`, `advice.py:113-114,251-259`). A stray-whitespace `Sequence` drops a recurring child.
  - The concurrent browser and S2S processing: no `select_for_update`, and the idempotency read is outside the transaction (`subscription_ops.py:378-386,458-508`). This gives a double attempt row and a double admin email in both stacks; NEW also loses concurrent field writes.
- **Fix:** match OLD parsing; add `select_for_update` and move the idempotency read inside the transaction.
- **Absorbs:**
  - P3-B6 (C)
  - billing §5 / P3-C4 (C)

#### P3-39 · Cardlink redirect interstitial lost the spinner, the styling and the no-JS sentence
- **Fix:** restore OLD `redirect/route.ts:41-78` markup in `billing.py:260-273`.
- **Absorbs:**
  - P3-B7 (C)
  - copy D2 (C)

#### P3-40 · Stripe success and cancel URLs point at `/dashboard/billing`, which never existed (latent)
- **Fix:** delete the Stripe and PayPal checkout paths (`providers.py:180-181`) as part of BILL-G4.
- **Absorbs:** routes D3 (C, latent).

#### P3-41 · OpenAPI/Swagger/Redoc are public; `/django-admin/` is exposed with an unthrottled login form
- **Fix:**
  - Set `SPECTACULAR_SETTINGS["SERVE_PERMISSIONS"]` to admin-only (`base.py:266-277`), or unmount the docs in prod (`config/urls.py:32-36,99`).
  - Throttle or IP-restrict `/django-admin/` (`:104`).
- **Absorbs:**
  - authz D5 (C live on test)
  - authz D6 (C; the sub-claim that "the DRF login has 10/min" is refuted)
- **Possibly intentional:** §5 D-18.
- **Prereq:** LC-6.

#### P3-42 · WebSocket consumers accept banned/blocked users (hardening; OLD was weaker)
- **Fix:** check `is_active` in `consumers.py:96-114,205-230`.
- **Absorbs:** authz D7 (V-adm A: hardening, not a regression).

#### P3-43 · Contact-reveal analytics changed from "never fires" (gtag undefined) to `trackEvent`; consent/GTM model changed
- **Fix:** none needed if intentional (§5 D-19).
- **Absorbs:**
  - p3arch D5 (C, probably intentional)
  - lib D8 (C, possibly intentional)
- **Prereq:** GTM container review (U).

#### P3-44 · Admin publish toggle (published → draft) now resyncs Brevo; OLD did not
- **Fix:** accept it as an improvement (§5 D-20), or remove the sync in `admin_services.py:249-254` for parity.
- **Absorbs:**
  - sm D6 (C via the p3adm §4 extension)
  - the p3adm §4 Settings-form extension

---

## 2. Fix-groups index

The **Entry** column points to where each group is fixed in §1. "Consolidator" marks groups created in this document by merging items that the verifiers listed separately.

| Group | Source | Members (report → id) | Entry |
|---|---|---|---|
| **AUTH-G1** email verification | V-auth | A-D1, P3-D3, A-D15, P3-C3 | P1-5 |
| **AUTH-G2** Google simple setup | V-auth | P3-D1, P3-C1 | P0-2 |
| **AUTH-G3** pro without a pro role | V-auth | A-D2, A-D3, VM-3b | P1-6 |
| **AUTH-G4** account status gating | V-auth (+V-adm) | A-D4, A-D5, adm D11 | P1-7 |
| **AUTH-G5** Google exchange / save hook | V-auth | SM-D1, SM-D2, P3-D4, AZ-D4 `confirmed` leg | P2-1 |
| **AUTH-G6a** password semantics | V-auth | A-D6 (→ §5 D-03), VM-D1, VM-D6 (INFO) | P2-2 (XC-TRIM) |
| **AUTH-G6b** server validation gaps | V-auth | A-D8, A-D11, A-D21, VM-D3 | P3-1 |
| **AUTH-G7** rate limiting | V-auth | A-D13, LS-D11, §0 | P2-3 (XC-THROTTLE) |
| **AUTH-G8** session / spurious logout | V-auth | P3-D2, S-D1, A-D16 (→ §5 D-04) | P2-4 |
| **AUTH-G9** copy and messages | V-auth | A-D9, A-D12, A-D14, A-D20, A-D22, P3-D7 | P2-8 / P2-9 |
| **AUTH-G10** display name | V-auth | A-D10, A-D19, P3-C4 | P2-5 |
| **AUTH-G11** guards and redirects | V-auth | A-D7, A-D17, P3-D6 | P2-6 |
| **AUTH-G12** admin authorization | V-auth + V-adm | AZ-D1 (= authz D1), AZ-D3 (= authz D3), p3adm D7, NEW-2 | P1-4, P2-35 |
| Auth standalone | V-auth | A-D18, SM-D3, A-D23, A-D24, P3-D5, AZ-D8, AZ-D9 | P2-7, P3-4, §3, P3-5, P3-3, P3-2 |
| **PRIV-1** | V-prof (+V-svc) | arch D3, rev D5, hst D4, prof-dash D10, payload §4 | P1-1 |
| **AUTHZ-PUB** | V-prof | authz D2, arch D17 side note, cache D8 (profiles) | P1-3 |
| **AFM-1** | V-prof | prof-dash D1, P3-D1 (p3prof), p3prof C3, prof-dash D7 (text) | P1-23 |
| **THR-1** | V-prof | p3prof C1, prof-dash D7 (throttle) | → XC-THROTTLE |
| **ERR-1** | V-prof | prof-dash D3, D6 (contract), D14, P3-D3 (trim) | P2-8; D6 → P1-19; trim → P2-2 |
| **COPY-1** | V-prof | prof-dash D4, D11 | P2-9 |
| **CACHE-1** | V-prof | prof-dash D2, arch D14 (billing part → P1-24) | P2-13 |
| **LOC-1** | V-prof | P3-D2 (p3prof), p3prof C2 | P2-17 |
| **TAX-HIER** | V-prof | arch D1, D4 (hierarchy), D5, D8, D10, p3arch D3 | P1-12 |
| **PLURAL-1** | V-prof | arch D4 (labels), D8 (labels), D18 | P2-19 |
| **DROP-1** | V-prof | arch D2, D9 | P1-13 |
| **SORT-1** | V-prof | arch D6, p3arch D4, arch D13 (→ XC-PAGEPARAMS) | P2-20 |
| **ORD-1** | V-prof | arch D11, p3arch D2 | P3-10 |
| **RAW-ID-1** | V-prof | arch D12, p3arch D6 | P3-11 |
| **SAVE-1** | V-prof | P3-D4 (p3prof) | P3-9 |
| **CG-1** bySlug collisions | V-svc | HST D1, P3-S1 (+C4), N2, N2b, routes D1, svc D13 (slug part) | P1-18 |
| **CG-2** tag slugs vs ids | V-svc | N1, p3hst C1, svc D19 (tag clause) | P1-20 |
| **CG-3** location resolver | V-svc | svc D16, P3-S2 (+C2), svc D21 (περιοχή), arch D7, p3arch C1 | P2-18 |
| **CG-4** throttle no-op | V-svc | throttle parts of svc D2, D6, D10, D17 b2, HST D3; p3svc C1; p3prof C1 | → XC-THROTTLE |
| **CG-5** status override | V-svc | svc D1, authz §1 note, count-cache poisoning (new), cache D8 (services) | P1-2 |
| **CG-6** crumb base | V-svc (+V-xc) | svc D15, HST D13, lib D9, arch D4 (base part) | P3-15 |
| **CG-7** error plumbing | V-svc | svc D6, HST D2, HST D3 texts, lib D3 cluster | HST D2 → P1-19; rest → P2-8 |
| **CG-8** taxonomy live-refresh | V-svc (+V-adm) | HST D5, D6 = adm D13, D15, cache D3, cache D5 | P2-15 |
| **BILL-G1** `.update()` purge | V-bill | bill D4, cache C3, sm C2, arch D14, renewals `_set_featured`, admin status/delete | P1-24 |
| **BILL-G2** Cardlink proxy hop | V-bill | bill D3, P3-B2, P3-B3 | P2-27 |
| **BILL-G3** gateway errors | V-bill | bill D5, P3-B4, P3-B5 | P2-29 (+P2-8) |
| **BILL-G4** payment env / gating | V-bill | bill D2, D20, P3-B1, routes D3 | P1-25, P2-25, P2-26, P3-40 |
| **BILL-G5** restore / schema drift | V-bill | schema D1, D2, D4, D5 (+D3) | P0-7, P1-26, P2-38 |
| **BILL-MID** (standalone) | V-bill | bill D1 | P0-1 |
| **AM-PAYLOAD** | V-adm | adm D1, D2 (read), D3 (read), D5, D8, D9, D14, D15, D16, p3adm D8, payload D1 | P0-3, P0-4, P0-5, P1-8, P1-11, P2-36, P3-20, P2-44 |
| **AM-WIPE** | V-adm | adm D2, D3, D10 (inverse), p3adm D1, adm D12 (avatar) | P0-4, P0-5, P2-37 |
| **AM-MSG** | V-adm | adm D12, p3adm D4, p3adm D8c, P3-D4 (p3msg) | P2-37, P3-22, P3-20 |
| **AM-JWT** | V-adm | adm D4, authz D3 (revoke leg), payload D2, P3-D2 (p3msg), adm D21 (impersonate) | P0-6, P3-26 |
| **AM-PURGE** | V-adm | adm D13 (→ CG-8), NEW-1 | P2-15; NEW-1 → see note ¹ |
| **MSG-NAME** | V-adm | msg D6, D7, sm D4, sm C1, p3msg C1 | P3-25, P3-26 |
| **MSG-OPTIMISTIC** | V-adm | P3-D1 (p3msg), P3-D3 (p3msg), msg D5 | P2-41, P3-24 |
| **XC-THROTTLE** | V-xc (= THR-1 = CG-4 = AUTH-G7) | p3prof C1, lib D11, A-D13, authz D6 sub-claim, plus all refuted throttle legs | P2-3 |
| **XC-CRONAUTH** | V-xc | p3blog N1, C2, C3, authz §4, `RevalidateWebhookView` | P2-30 (after P3-37) |
| **XC-EN** | V-xc | lib D3, rev D3, D11, val D5/D6/D8/D9, blog D1 (text), blog N5, + ERR-1, CG-7, BILL-G3 FE | P2-8 |
| **XC-MAIL-MECH** | V-xc | E1 lib D4/blog D6; E2 lib D5; E3 copy D1; E4 p3blog N6; E5 p3blog N3; E6 C1 (not a regression); E7 blog D2 = msg D3; E8 blog D3; E9 S-D2; E10 anymail (U); E11 bill D15; E12 recipients (same) | P2-11, P2-12, P3-32, LC-11 |
| **XC-DEADREVAL** | V-xc | cache D6, blog D10 (A), `RevalidateWebhookView` | see note ² |
| **XC-TTL** | V-xc | cache D7 | **REFUTED** (§3) |
| **XC-BLOGSLUG** | V-xc | blog D1, lib D2, p3blog C4 | P1-22 |
| **XC-CARDCOV** | V-xc | svc D11, rev D4, lib D10 | P2-21 |
| **XC-CRONTZ** | V-xc | blog D8 (time), lib D13 | P1-21 |
| **XC-TZ** (consolidator) | — | lib D1, P3-S3, p3adm D3, XC-CRONTZ | P1-21 |
| **XC-TRIM** (consolidator) | — | VM-D1, P3-D3 (p3prof), AUTH-G6a trim, ERR-1 trim | P2-2 |
| **XC-ONCOMMIT** (consolidator) | — | cache D4 | P2-16 |
| **XC-PROXYIP** (consolidator) | — | lib D12, S-D1 IP part, P3-B2 IP part | P2-33 |
| **XC-PAGEPARAMS** (consolidator) | — | arch D13, p3arch C2, P3-S4, p3rev N1 | P3-13 |
| **XC-INTPARSE** (consolidator) | — | N4 (+ext), msg D11, rev D11, blog D11 | P3-14 |
| **BREVO-SYNC** (consolidator) | — | svc D9, lib D7, adm D19 (Brevo) | P2-23 |
| **NAV-AGG** (consolidator) | — | HST D7, D8, D9, D10, N3, svc D23 | P2-43 |
| **REV-AUTHOR** (consolidator) | — | rev D1, adm D16 | P2-44 |

**Notes:**
1. **NEW-1** (LOW, AM-PURGE). Admin user/team actions call `revalidatePublicProfile()` *before* the Django write, and even when the write fails. This happens in 12 of 13 calls in `F:actions/admin/users.ts` (`:59-60, 68, 83, 102, 126, 143, 158, 169, 178, 187, 306-307`). **Fix:** move each call after the awaited API call, and run it only on success. It is folded here rather than given its own P3 number; treat it as a P3 item.
2. **XC-DEADREVAL / cache D6** (LOW, CONFIRMED). The admin "revalidate taxonomies / all" actions purge dead tag names (`F:actions/.../revalidate-taxonomies.ts:37-57`) and miss the tags actually set in `F:lib/api/{core,services,profiles,blog}.ts`. `adminApi.revalidateAll`/`adminTaxonomy.revalidate` have no callers. **Fix:** align the tag names. blog D10's FE GET is parity (§3). Treat it as a P3 item.

---

## 3. Refuted, intentional and dropped: do NOT re-report

### 3.1 Whole findings

| Finding | Status | Why (one line) | Verifier |
|---|---|---|---|
| adm D22 empty price → 0 | REFUTED | The pricing form always posts `price.toString()`, so both apps give 0 | V-adm |
| authz D4 / AZ-D4 Google links without `email_verified` | REFUTED (as parity) | OLD `mapProfileToUser` hard-codes `emailVerified:true`, so OLD linked unconditionally too†; hardening is optional (§5 D-15) | V-auth |
| cache D7 / XC-TTL stacking | REFUTED | Layers and TTLs are intentional design (Addendum); use it only to size purge gaps | V-xc |
| bill D8 "Χρέωση" shows the gross amount | INTENTIONAL | Displayed amount (Addendum) | V-bill |
| bill D9 manual/Stripe subs now cancellable | INTENTIONAL | Cancel rule (Addendum) | V-bill |
| bill D10 (expiry part) canceled-at-period-end never expire | INTENTIONAL | Renewal cron deliberately disabled; the net effect equals OLD. The hazard part → P3-37 | V-bill |
| bill D11 advice period anchoring | INTENTIONAL | Period anchoring (Addendum) | V-bill |
| bill D12 six C14N digest candidates | INTENTIONAL | Production verification fix, still bound to the secret | V-bill |
| bill D13 webhook edge paths | INTENTIONAL | Documented and deliberate; the `error=security` vs `config` difference is cosmetic and dropped | V-bill |
| bill D16 coupon copy | DROPPED | Coupon UI hidden in both apps (`COUPON_INPUT_VISIBLE=false`) | V-bill |
| bill D17 checkout pre-writes billing | INTENTIONAL | Harmless; the webhook overwrites it (`subscription_ops.py:487`) | V-bill |
| bill D18 history page clamped | INTENTIONAL | UI improvement | V-bill |
| bill D19 callback `window.location.href` | INTENTIONAL | Deliberate session fix | V-bill |
| bill D6 unfeature needs an active promoted sub | INTENTIONAL (borderline) | Entitlement rule; **ask the user** (§5 D-05) | V-bill |
| A-D23 exchange-token contract | INTENTIONAL / obsolete | — | V-auth |
| A-D24 `updateUserType` scoped to self | FIX (INFO) | OLD allowed any userId; NEW is correct | V-auth |
| adm D24 Git pages removed | INTENTIONAL | The only lost capability is the parent move (P1-10) | V-adm |
| copy D3 admin notifications are real data | INTENTIONAL (INFO) | Improvement over OLD's English mock | V-adm, V-xc |
| copy D4 admin taxonomy toasts | INTENTIONAL (INFO) | Wording only, English in both | V-adm, V-xc |
| arch D15 JSON-LD `?type=companies` | INTENTIONAL fix | OLD cast the raw value | V-prof |
| arch D16 subjectTitle fallback | trivial | Confirmed but negligible; no fix needed | V-prof |
| arch D17 count key includes role | FIX | Bug fix; only its `published` side note matters (P1-3) | V-prof |
| prof-dash D16 coverage restore / page guard | likely INTENTIONAL | `requireProUser` + DASHBOARD guard | V-prof |
| prof-dash D17 account form onBlur | likely INTENTIONAL | — | V-prof |
| p3prof C4 `requireProUser → /login` | no user impact | — | V-prof |
| p3arch C3 taxonomy-paths uncached | no user impact | — | V-prof |
| msg D4 OLD burns vs NEW retries digests | INTENTIONAL | NEW is safer | V-adm |
| val D11 / D12 new caps, admin loosening | INFO | API-only or admin-only | V-xc |
| VM-D6 / val D6 change/reset capped at 100 | INFO | Impact refuted: OLD's login max(100) made 101–128-character passwords unusable in OLD too; the OLD 128 cap is U | V-auth, V-xc |
| p3hst C3 snapshot drift | not re-verified | No finding attached | V-svc |

### 3.2 Refuted sub-claims (the parent finding stays, as adjusted)

- **Throttle legs**, all refuted by XC-THROTTLE:
  - A-D12 throttle message
  - A-D13 / LS-D11 "3/10 min per IP" (it is *unlimited*)
  - prof-dash D7 "new 10/min AFM throttle"
  - svc D2 "consumes the draft throttle slot" (also: a failed draft doesn't stamp `last_service_draft`)
  - svc D6 English "Request was throttled" text
  - svc D10 "5/hour report limit" (no limit, same as OLD)
  - svc D17 bullet 2
  - HST D3 "5/day submission throttle" (the service-layer 5/24 h on created rows still applies, same as OLD)
  - authz D6 "the DRF LoginView has a 10/min limit"
  - lib D12's throttle *working* premise (only the global anon/user throttles apply, and not on the scoped views)
- **A-D21:** "500 on a unique collision". Digits are suffixed instead (`''` → `'4821'`).
- **AZ-D1:** the "unauthenticated validation oracle" is parity (OLD's `validateAdminApiKey` was un-gated).
- **AZ-D9:** the "EMAIL_VERIFICATION user" example is wrong (the save hook advances the step first).
- **A-D5:** "OLD blocked Google users who were blocked". OLD checked only `banned`.
- **Privacy premise:** the claim that phone/viber/whatsapp were "hidden via visibility" (rev D5, hst D4, arch D3 phone part) is refuted. OLD rendered them publicly, and `visibility` governs email only.
- **prof-dash D2:** "OLD revalidatePath('/s/..')". It was tags only (the conclusion stands).
- **HST D1:** "wrong `/ipiresies/<div-slug>` URL". It is a duplicate suggestion with the same URL.
- **svc D14:** a "visible plural change". 0 of 586 nodes differ today.
- **N1:** "the dashboard has the same bug". That is not a regression; OLD's dashboard never label-matched either.
- **pass2-authz §4:** "service by-slug has the profile-published gate". Refuted: only the page bundle has it.
- **adm D2:** "the empty form is saved". The loss happens on the first add/edit; it is still CRITICAL.
- **adm D7:** "/pro taxonomy move". The pro form had no move in OLD.
- **adm D12:** "OLD cleared the avatar". OLD ignored the removal entirely.
- **adm D6:** the separate status action re-emailed on published→published in OLD too; only the Settings path regresses.
- **msg D3** (and copy-sweep §5 open question): "Brevo attributes USER_NAME/UNREAD_COUNT". No transactional email ever sent attributes (p3blog C1 / E6).
- **msg D6:** "list + header are Profile-first". Superseded by the V-adm §2 settlement (the list name is *not* Profile-first, because of a keying bug).
- **msg D9:** the validation-limit difference is unreachable from the UI (the client zod uses OLD's limits).
- **authz D7:** "regression". It is hardening; OLD sockets used the anon key.
- **sm C2:** "manual-create uses `.update()`". It uses `save()` (`subscription_ops.py:826`).
- **cache C3:** "cancel" as a trigger. Cancel doesn't change the promoted gate.
- **bill D4:** the admin status/delete paths as parity gaps. OLD admin didn't revalidate either (fix anyway).
- **bill D10:** the HTTP renewals double-bill as *live*. It is latent, blocked by XC-CRONAUTH.
- **p3rev N3:** "bulk delete skips the purge". Per-row `post_delete` fires when receivers exist.
- **copy D1:** "empty subject → `[Doulitsa] Επικοινωνία: `". `ContactView` supplies a fallback (only the wording differs).
- **lib D5 / blog D6:** the Verification "old subject". The real old subject is `Επιβεβαίωση λογαριασμού στη Doulitsa`.
- **lib D7:** the admin status-change and admin service-delete Brevo gaps. Those paths already re-sync.
- **blog D1:** the fix direction "change the backend". Revert the FE instead.
- **blog D10:** "the FE GET is open, a regression". It is identical to OLD.
- **p3blog N5 / val D5:** the ">255 slug DB error". Moot, because the restored columns are TEXT.
- **p3lib §4:** "the frontend Dockerfile adds TZ". It has no TZ line.
- **rev D8:** "orphan saved rows / counts". With the FKs present, it is a false success with no orphans.

### 3.3 Pass-2/3 correction sections: verdicts

| Correction | Verdict | Verifier |
|---|---|---|
| p3auth C1–C5 | All C (C5 freshAge moot †) | V-auth |
| p3prof C1 (throttles no-op), C2 (LOC-1), C3 (AFM fix insufficient), C4 | All C | V-prof |
| p3arch C1, C2, C3 | All C | V-prof |
| p3svc C1–C4 | C | V-svc |
| p3hst C1 (= N1), C2 (D12 stale snapshot) | C; C3 not re-verified | V-svc |
| p3bill C1 (manual create purges), C2 (interstitial), C4 (concurrency) | C | V-bill |
| sm C1 (list keying) | C | V-adm |
| sm C2 | A | V-bill |
| cache C1, C2, C3 | C; C3 A | V-xc, V-bill |
| schema C1, C2, C3, C4 | C (code), with FK presence U | V-bill |
| p3adm §4 | C | V-adm |
| p3msg C1, C2 | C | V-adm |
| p3blog C1–C5 | C | V-xc |
| p3lib "Dockerfile adds TZ" | **R** | V-xc |
| p3lib "SUMMARY `LIVE_URL`" and C1 | C | V-xc |
| copy "reset raw link exists" | C | V-xc |
| copy "welcome had no text twin" | C, extended (verification and reset had none either) | V-xc |
| pass2-authz §5, pass3-blog C1 (admin cluster) | C | V-adm |

---

## 4. Server-checks appendix: one deduplicated, runnable checklist

Run these on the **test** DB and env first, then on **prod at cutover**. Everything is read-only, except Q0c, which is remediation **after** the code fix.

### 4.1 SQL (psql on the Django DB)

```sql
-- ================= BILLING / SCHEMA (V-bill Q0–Q9) =================

-- Q0  P0-1: is the unique constraint live, and has the MID already been written?
SELECT indexname, indexdef FROM pg_indexes
 WHERE tablename = 'subscriptions' AND indexdef ILIKE '%providerCustomerId%';
SELECT "providerCustomerId", count(*) FROM subscriptions GROUP BY 1 ORDER BY 2 DESC;

-- Q0b P0-1 victims: money captured, subscription never activated
--     (cross-check orderIds in the Cardlink back-office, CL-2; the crash path writes no attempt row)
SELECT s.id, s.pid, s.status, s.provider, s."providerSubscriptionId", s."worldlineMasterOrderId", s."updatedAt"
  FROM subscriptions s
 WHERE s.status = 'incomplete' AND s.provider = 'worldline'
 ORDER BY s."updatedAt" DESC;

-- Q0c P0-1 remediation, ONLY after line 471 is deleted and deployed (NOT an audit step):
-- UPDATE subscriptions SET "providerCustomerId" = NULL WHERE "providerCustomerId" IS NOT NULL;

-- Q1  P1-26 / P0-7: do the allauth tables exist?
SELECT to_regclass('public.account_emailaddress'), to_regclass('public.account_emailconfirmation'),
       to_regclass('public.socialaccount_socialaccount'), to_regclass('public.socialaccount_socialtoken'),
       to_regclass('public.socialaccount_socialapp');
SELECT app, name FROM django_migrations WHERE app IN ('account','socialaccount') ORDER BY app, id;

-- Q2  P2-38: which status/type columns are still PG ENUMs?
SELECT table_name, column_name, data_type, udt_name
  FROM information_schema.columns
 WHERE (table_name, column_name) IN (('services','status'),('reviews','status'),('reviews','type'),
       ('blog_articles','status'),('taxonomy_submissions','type'),('taxonomy_submissions','status'),
       ('subscriptions','status'),('subscriptions','plan'),('subscriptions','provider'));

-- Q3  P2-26: rows already poisoned by a credential-less checkout
SELECT id, pid, provider, status, "createdAt" FROM subscriptions
 WHERE provider <> 'worldline' AND status = 'incomplete';

-- Q4  P0-7 / P2-38: chat_members shape
SELECT column_name, data_type, is_nullable, column_default, is_identity
  FROM information_schema.columns WHERE table_name = 'chat_members' ORDER BY ordinal_position;
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'chat_members'::regclass;

-- Q5  P0-7: users auth columns
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_name = 'users' AND column_name IN ('password','last_login');

-- Q6  P2-38 / P3-29 / P3-26 / sm D7: legacy FKs and DB defaults still present?
--     (also settles schema C1/C2, rev D8, msg D10 "block nonexistent id")
SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE contype = 'f' AND conrelid::regclass::text IN
       ('saved_services','saved_profiles','reviews','chats','messages','blocked_users','chat_members')
 ORDER BY 1, 2;
SELECT column_name, column_default FROM information_schema.columns
 WHERE table_name = 'chat_members' AND column_name IN ('joinedAt','lastSeen','muted','online');

-- Q7  P3-28: legacy values that Django-admin validators would reject
SELECT count(*) FROM profiles WHERE website IS NOT NULL AND website <> '' AND website !~ '^https?://';
SELECT count(*) FROM profiles WHERE length(phone) > 64 OR length(viber) > 64 OR length(whatsapp) > 64;

-- Q8  P3-37 / P2-30 (= AQ-16): a stale persisted renewals beat row? Is beat scheduling anything?
SELECT name, task, enabled, last_run_at FROM django_celery_beat_periodictask
 WHERE task ILIKE '%worldline%' OR name ILIKE '%worldline%';
SELECT name, task, enabled, last_run_at FROM django_celery_beat_periodictask ORDER BY last_run_at DESC NULLS LAST;

-- Q9  schema §5: NULL Prisma list columns (canonicalize_taxonomies.py:62,83)
SELECT count(*) FILTER (WHERE skills IS NULL) AS skills_null,
       count(*) FILTER (WHERE "contactMethods" IS NULL) AS cm_null FROM profiles;
SELECT count(*) FILTER (WHERE tags IS NULL) AS tags_null,
       count(*) FILTER (WHERE addons IS NULL) AS addons_null,
       count(*) FILTER (WHERE faq IS NULL) AS faq_null FROM services;

-- ================= AUTH (V-auth §5) =================

-- AQ-1  P1-7 severity: confirmed=false users, and expired bans that NEW still enforces
SELECT count(*) FROM users WHERE confirmed = false;
SELECT count(*) FROM users WHERE banned AND "banExpires" < now();

-- AQ-2  P0-2 victims: Google simple users stuck in setup
SELECT id, email, step, "createdAt" FROM users
 WHERE provider = 'google' AND type = 'user' AND step IN ('OAUTH_SETUP','TYPE_SELECTION');

-- AQ-3  P1-6 victims: pros without a pro role
SELECT id, email, provider, step FROM users WHERE type = 'pro' AND role = 'user';

-- AQ-4  P1-4: are DB API keys in use?
SELECT count(*) FROM api_keys;

-- ================= PROFILES (V-prof §3) =================

-- AQ-9  P1-12: profiles with a subcategory but no category (→ /dir/null/<sub> pills)
SELECT count(*) FROM profiles
 WHERE published AND "isActive" AND coalesce(subcategory,'') <> '' AND coalesce(category,'') = '';

-- AQ-11 P2-17 sizing: profiles whose coverage was written by NEW (adjust the cutover date)
SELECT count(*) FROM profiles WHERE coverage IS NOT NULL AND "updatedAt" >= DATE '<new-stack-start>';

-- AQ-13 P3-7: verifications.afm column type (psql meta-command)
-- \d verifications

-- ================= SERVICES / TAXONOMY (V-svc §D) =================

-- AQ-10 P1-20 severity: published services with tags; are the tags numeric ids?
SELECT count(*) FROM services WHERE status = 'published' AND cardinality(tags) > 0;
SELECT tags FROM services WHERE cardinality(tags) > 0 LIMIT 20;

-- AQ-12 P2-34: services that NEW can no longer edit (more than 3 addons or 5 FAQs)
SELECT count(*) FROM services
 WHERE jsonb_array_length(coalesce(addons,'[]')) > 3 OR jsonb_array_length(coalesce(faq,'[]')) > 5;

-- AQ-14 P1-18: do the 21 slug collisions survive admin edits?
SELECT slug, array_agg(level) FROM taxonomy_nodes WHERE space = 'service'
 GROUP BY slug HAVING count(*) > 1;

-- AQ-15 P2-43 / svc D23: orphan, wrong-parent and empty taxonomy values on published services
--       (join the result to taxonomy_nodes to find the orphans)
SELECT category, subcategory, subdivision, count(*) FROM services
 WHERE status = 'published' GROUP BY 1,2,3 ORDER BY 4 DESC;

-- ================= CROSS-CUTTING (V-xc §5) =================

-- AQ-17 P1-22: blog category slug distribution (run on PROD; test showed tips 7, symvoules 5, anakoinoseis 1, marketingk 1, nea 1)
SELECT "categorySlug", count(*) FROM blog_articles GROUP BY 1 ORDER BY 2 DESC;
-- \d blog_articles   (slug column TEXT? → settles p3blog N5 / val D5 moot claim on prod)

-- AQ-18 P2-44: Google-name drift (pass3-reviews §6). The exact query is in pass3-reviews-saved.md §6.
```

**psql meta-commands:**
- `\d verifications` (AQ-13)
- `\d blocked_users` (msg D10 / schema C2; also covered by Q6)
- `\d blog_articles` (AQ-17)

### 4.2 Env-var checks: BOTH Dokploy apps

**Backend (Django) app:**

| Id | Var(s) | Why |
|---|---|---|
| EB-1 | `PAYMENTS_TEST_MODE`, `PAYMENTS_ENABLED`, `WORLDLINE_BASE_URL`, `WORLDLINE_API_URL`, `WORLDLINE_RETURN_URL`, `WORLDLINE_CANCEL_URL`, `WORLDLINE_TEST_MID`, `WORLDLINE_LIVE_MID`, `WORLDLINE_MERCHANT_ID`, generic `MERCHANT_ID`/`SHARED_SECRET` | P1-25, P2-25. The test-mode default is True. The URL overrides beat the mode endpoints. |
| EB-2 | `STRIPE_SECRET_KEY` | P2-26 / P3-40 (provider poisoning → Stripe path) |
| EB-3 | `ADMIN_API_KEY` | P1-4 (it maps to the oldest admin) |
| EB-4 | `SIMPLE_JWT_REFRESH_LIFETIME_DAYS` (code default 14 d) | P2-4, §5 D-04 |
| EB-5 | `BREVO_SENDER_EMAIL` (does it contain a display name? default `noreply@example.com`) | P2-11 E1, P3-32 E11 |
| EB-6 | `BREVO_LIST_EMPTY_PROFILE`, `BREVO_LIST_NO_SERVICES`, `BREVO_LIST_ACTIVE_PROS` (default `""`) | P2-32 |
| EB-7 | `INTERNAL_PROXY_SECRET` | P2-33 (it must match the frontend) |
| EB-8 | `FRONTEND_BASE_URL` (default `http://localhost:3000`; `LIVE_URL` is not read by the backend) | P3-32 E9 |
| EB-9 | `ADMIN_EMAIL` (recipient; `ADMIN_NOTIFICATION_EMAIL` is undefined in settings) | E12 |
| EB-10 | `CRON_SECRET` (it only matters after P2-30) | P2-30 |

**Frontend (Next) app:**

| Id | Var(s) | Why |
|---|---|---|
| EF-1 | `TZ` (expect `Europe/Athens`); also run `date` inside the container | P1-21 |
| EF-2 | `PAYMENTS_TEST_MODE` (read in `F:lib/payment/test-mode.ts:15` as `=== 'true'`) | P1-25 (it must agree with the backend) |
| EF-3 | `INTERNAL_PROXY_SECRET` | P2-33 |
| EF-4 | `LIVE_URL`, `NEXT_PUBLIC_APP_URL` | P3-35 (JSON-LD base) |
| EF-5 | `DJANGO_INTERNAL_URL` (not `http://backend:8000` under prod SSL redirect) | P3-36 (S-D3) |

**Old prod (Vercel; read-only):**

| Id | Var | Why |
|---|---|---|
| OV-3 | `ADMIN_USER_IDS` | P2-35: who could set passwords and roles in OLD |

### 4.3 Live-curl and runtime checks

| Id | Command or action | Expect / settles |
|---|---|---|
| LC-1 | `curl -s -H 'Authorization: Bearer notasecret' https://api-test.doulitsa.gr/api/cron/process-email-batches` and `curl -s -XPOST -H 'Authorization: Bearer notasecret' https://api-test.doulitsa.gr/api/webhooks/revalidate-cache` | `token_not_valid` today (P2-30). After the fix, the view's own secret check should answer. |
| LC-2 | `curl -sI https://doulitsa.gr/api/cron/auto-refresh` (GET) | 405 confirms that OLD auto-refresh never ran (svc D12 / blog D7; the probe was not run in pass 4) |
| LC-3 | `curl -s -XPOST https://<public-api-host>/api/profiles/search -H 'content-type: application/json' -d '{"published":false}'` (and the same for `/api/profiles/count`, and `/api/services/search` `/count` with `{"status":"draft"}`) | Is the Django host publicly routed? Are unpublished rows returned? (P1-2, P1-3) |
| LC-4 | `curl -i 'https://test.doulitsa.gr/api/auth/%252E%252E/%252E%252E/api/health'` and `curl -i 'https://test.doulitsa.gr/api/auth/%2E%2E/%2E%2E/api/health'` | A 200 health body means traversal works (P3-3) |
| LC-5 | `curl -sI https://test.doulitsa.gr/ipiresies/zz-nope` and `curl -sI https://test.doulitsa.gr/categories/zz-nope` | 200 today; 404 after P1-18 |
| LC-6 | On the **prod** API host: `GET /api/docs/`, `/api/schema/`, `/django-admin/login/` | 200 on test today (P3-41) |
| LC-7 | `curl -i https://test.doulitsa.gr/api/auth/reset-password/abc123` | A JSON 404 with the `supported` map today; a 302 to `/reset-password?error=INVALID_TOKEN` after P2-45 |
| LC-8 | `curl -s https://api-test.doulitsa.gr/sitemap_index.xml` | Lists only s/profile/articles (lib D16) |
| LC-9 | `curl -sI https://test.doulitsa.gr/articles/marketingk` | 404 today; 200 after P1-22 |
| LC-10 | Backend container: `python manage.py shell` → `from apps.profiles.services.afm_lookup import lookup_afm; lookup_afm('094014201')`, with `print(result)` before parsing | Confirms the unwrap path and whether AADE rejects a non-empty `afm_called_by` (P1-23) |
| LC-11 | Backend container: `python -c "import anymail.backends.sendinblue"`, then one real test send | **Run this first.** If the alias is gone, *every* email fails silently (`send_email` catches and logs) (E10) |
| LC-12 | Frontend container: `date` | P1-21 |
| LC-13 | Django admin → Periodic tasks: check `billing-process-worldline-renewals`, and confirm that celery-beat is deployed on prod | P2-30 / P3-37 (beat is the only trigger for digests and auto-refresh) |
| LC-14 | `curl -s https://test.doulitsa.gr/ipiresies/sxediasmos` and the same path on `doulitsa.gr`: compare the base crumb `href` | `/categories` (old) vs `/ipiresies` (new) (P3-15) |
| OV-2 | On doulitsa.gr: open a chat that has unread messages and watch whether the sidebar badge clears within ~30–60 s | OLD self-heal for msg D1 (P2-39; the NEW fix is needed either way) |
| OV-4 | On old prod: try to delete your own admin account (`/admin/users/<ownId>`); expect `YOU_CANNOT_REMOVE_YOURSELF` | p3adm D6 (P3-23) |
| LC-15 | Live repro of the refresh-rotation race: two tabs, let the access token expire, fire parallel requests | P2-4 (P3-D2) |

### 4.4 Cardlink back-office checks

| Id | Check | Settles |
|---|---|---|
| CL-1 | Which confirm, cancel and **advice** URLs are registered: the Next proxy (`/api/webhooks/worldline`, `/advice`) or Django directly? | P2-27 (the preferred fix path) |
| CL-2 | List the CAPTURED transactions and cross-check their orderIds against Q0b `incomplete` subscriptions | P0-1 victims: refund or manually activate them |
| CL-3 | A sample real advice payload: is there a trailing `/` on `OrderId`? | billing §5 (U) |

### 4.5 Brevo checks

| Id | Check | Settles |
|---|---|---|
| BR-1 | Is the Brevo "welcome" automation still active? | P2-7 (A-D18 duplicate welcome) |
| BR-2 | Do the list ids behind `BREVO_LIST_*` exist? | P2-32 |

### 4.6 Library-source checks (†)

Read the better-auth **1.4.19** source (old prod pinned `>=1.4.19 <1.5`; the verifiers read 1.3.28). Each item can flip the verdict noted next to it:

- `@better-auth/core` social-providers google `getUserInfo` spread order (it could flip AZ-D4 to a regression)
- the `minPasswordLength` default (§5 D-03)
- whether `verifyEmail` is stateless (P1-5, P3-D3)
- `freshAge` (p3auth C5)
- whether the admin-plugin `removeUser` has a self-delete guard (p3adm D6)
- the built-in rate limiter scope (XC-THROTTLE parity)

---

## 5. Product decisions (the user must choose; the parity default is shown)

| Id | Decision | Parity default (OLD) | Source |
|---|---|---|---|
| D-01 | **Nightly auto-refresh** of promoted services: keep it or drop it? OLD never actually ran it (POST-only route vs Vercel's GET cron → 405). | Not running | svc D12, blog D7 (LC-2) |
| D-02 | **Featured shuffle**: shuffle featured profiles to the front on every sort (OLD), or only on the default sort (NEW)? | Always shuffle | arch D6 (P2-20) |
| D-03 | **Minimum password length**: 8 (OLD better-auth†) or 6 (NEW)? | 8 | A-D6 |
| D-04 | **Session length**: 3-day cookie / 14-day refresh (NEW) vs 7 d idle / 1 d update (OLD better-auth†); host-only vs crossSubDomain cookies | 7 d | A-D16 (EB-4) |
| D-05 | **Un-star after a lapse**: may a past_due or lapsed pro un-feature services they can no longer pay for? OLD allowed it; NEW requires an active promoted subscription. | Allowed | bill D6 (borderline) |
| D-06 | **`confirmed` in `is_active`**: should `confirmed=false` lock users out? Decide after AQ-1. | Not gating | A-D4 (P1-7) |
| D-07 | **Ban expiry for new admin bans**: honour the `banExpires` the admin UI now sends? OLD's UI always stored null (permanent), but better-auth auto-cleared expired bans on legacy rows. | Permanent from the UI; auto-clear legacy | adm D11, A-D4 |
| D-08 | **Pro lock and P3-D6 repair**: keep NEW's deliberate type=pro → /onboarding lock and the TYPE_SELECTION/OAUTH_SETUP → /onboarding repair? | OLD had neither | A-D17, P3-D6 |
| D-09 | **Draft → pending** only when title ≥ 5, description ≥ 20 and taxonomy are present (NEW) | Unconditional | svc D8 |
| D-10 | **Rate limits OLD lacked** (login, register, resend, AFM, report, draft): add them once XC-THROTTLE works, or stay at parity (none)? Forgot-password must be per-email 1/10 min regardless. | None except forgot-password | V-auth §0, THR-1 |
| D-11 | **Chat names from Profile or User**; keep the header `type` derived from "has a Profile" (QA fix)? | User fields; `user.type` | MSG-NAME, msg D7 |
| D-12 | **Search location boost**: OLD's boost was broken for 330/917 ids; NEW fires it county-first. Keep the fix? | Broken boost | HST D12 |
| D-13 | **Dashboard tag search**: also fix the label → id matching there (an improvement over OLD)? | No match | N1 |
| D-14 | **Taxonomy delete while referenced**: NEW refuses (409 Greek); OLD deleted recursively | Recursive delete | p3adm D5 |
| D-15 | **Google `email_verified` check** before linking (hardening; OLD linked unconditionally†) | No check | AZ-D4 |
| D-16 | **Re-onboarding visibility reset**: OLD reset it to the default; NEW keeps the previous setting | Reset | sm D5 (P3-6) |
| D-17 | **Home/footer extras**: hide featured tabs with no featured services; exclude `image=""` profiles; the footer cookie link and button | Show all; no cookie link | HST D11, D16, D17 |
| D-18 | **Public API docs and `/django-admin/`** in prod | n/a (new surface) | authz D5, D6 |
| D-19 | **Analytics and consent**: the contact-reveal `trackEvent` now fires; the GTM consent model changed | Never fired | p3arch D5, lib D8 |
| D-20 | **Admin unpublish → Brevo resync** (NEW does it; OLD didn't) | No resync | sm D6 |
| D-21 | **Drop the Stripe/PayPal checkout paths** and the renewals HTTP route entirely | n/a | routes D3, bill D10 |
| D-22 | **Email-verification token single-use** (NEW) vs reusable stateless (OLD†) | Reusable | P3-D3 |
| D-23 | **Admin payments page size** 10 (OLD) vs 25 | 10 | adm D23 |

---

## 6. Suggested fix order (from the verifiers' priority notes)

1. **LC-11** (could zero out all email) and **P0-1** (a one-line delete).
2. **P0-7 / P1-26** cutover prep (after Q1–Q6).
3. **P0-3..P0-6** (admin crash, the two wipes, session revoke).
4. **P0-2**, then **P1-5..P1-7** together with **P2-1**.
5. **P1-1..P1-4** (exposure and keys), then **P1-25**.
6. **P2-13**, then **P1-24** (purge).
7. **P3-37**, then **P2-30**.
8. The remaining P1 items, then P2 and P3.

---

## 7. Pass-5 addendum (new cuts after consolidation; full detail in the pass5-* reports)

Pass 5 ran four NEW cuts after this document was consolidated. Its findings are
NOT yet absorbed into the numbered P-entries above; treat this section as the
delta. Yield was low (saturation): 21 findings, one vein of substance.

### 7.1 The useSession vein — ONE root cause, fix together (pass5-client-state.md)
`frontend/src/lib/auth/client.ts:74-101` replaced the old shared session store
with per-component useState + an unstable `refetch`. One fix (shared store,
memoized refetch) resolves all five:
- **P5-CS-1 MEDIUM** — saved hearts empty after email login; tapping a saved
  heart DELETES the item (SavedStateProvider keeps the logged-out session).
- **P5-CS-2 MEDIUM** — dashboard sidebar/header keep the OLD identity after
  username/avatar/name changes; "Προφίλ" links to a 404.
- **P5-CS-3 MEDIUM (live-check)** — login-success effect loops (repeated
  getSession + router.push; the 429 loop other forms already guard against).
- **P5-CS-4 LOW** — error toasts re-fire on every keystroke (change-username,
  upgrade-to-pro). **P5-CS-5 LOW** — avatar menu flashes to skeleton.
Also: **P5-CS-6 LOW** leaked WebSockets (channels-ws.ts:76-81 no closed
re-check); **P5-CS-7 INFO** review-card visibility is a deliberate FIX — do
not revert. Correction: deleted own message returns as a ghost bubble after
chat switch (extends MSG-OPTIMISTIC).

### 7.2 Backend runtime (pass5-backend-runtime.md) — mostly LOW
- **P5-BR-1 LOW-MED** — Channels consumers share one DB thread per process;
  reconnect storms after deploy can stall chat delivery seconds.
- **P5-BR-2 LOW** — beat schedules `cleanup_expired_pending_registrations`
  which DOES NOT EXIST (hourly "unregistered task" + rows never cleaned).
- **P5-BR-3..11 LOW** — email tasks: acks_late without retries, digest has no
  run lock; Brevo per-user tasks race (can resurrect a GDPR-deleted contact);
  username change no longer atomic (swallowed Profile sync); billing full-row
  save can resurrect an admin-deleted subscription as ACTIVE; 4 silent
  `except: pass` enqueue sites; DB errors in CookieJWTAuthentication read as
  "logged out" (feeds S-D1); AFM zeep client re-downloads WSDL per request,
  no timeout; bare except in channels_routing can leave ZERO ws routes while
  health passes; CONN_MAX_AGE under ASGI + DOKPLOY.md wrongly calls Celery
  "optional" (without a worker no email ever sends).

### 7.3 Route wiring (pass5-route-wiring.md) — tree/guards/metadata all MATCH old
- **P5-RW-1 LOW (live-reproduced)** — home regeneration trips "static→dynamic"
  via the no-store taxonomy-maps refresh; ~30-40s extra staleness + error log
  per idle period. Old used force-static.
- **P5-RW-2 LOW (live-verified)** — /ipiresies, /categories, /dir sitemaps
  rebuilt on EVERY request (api client no-store path); declared 3600.

### 7.4 Dead-UI sweep (pass5-dead-ui.md) — ~190 API paths all exist
- **P5-DU-1 LOW** — /admin/chats/[cid] never 404s (wrap() result always
  truthy; fix `if (!chat.success || !chat.data) notFound()`).
- §"Broken in old too": 11 controls broken in BOTH apps (parity, not
  regressions) — recorded so they are never re-reported; candidates for
  improvement work later.

### 7.5 Pass-6 (live E2E) reports
pass6-e2e-test-public.md and pass6-e2e-local.md verify this document's
public-facing and locally-reproducible entries against running systems.
