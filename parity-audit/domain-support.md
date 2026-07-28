# Migration Parity Audit — Doulitsa

## Domain: Support

Scope per brief: contact forms, verifications, email batches, pending registrations.
Tables: `contacts`, `verifications`, `verification` (Better-Auth email tokens), `email_batches`, `pending_registrations`.

NOTE on ownership: In OLD, "support" operations are spread across several action folders
(`actions/support`, `actions/messages`, `actions/profiles`, `actions/admin`). In NEW they are
split between `apps/support` (contact + feedback) and `apps/profiles` (verifications). The
verification feature is implemented in `apps/profiles`, not `apps/support`, but is audited here
because the brief assigned the `verifications` table to the Support domain.

---

### Parity matrix

| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Submit contact form (public) | endpoint | `app_before_migrations/src/actions/messages/contact.ts:19` | `backend/apps/support/views/public/support.py:54` (`ContactView.post`); url `backend/apps/support/urls.py:13` | ⚠️ | Core flow present; email side-effects missing (see Gap C1), subject handling differs (C5). |
| Submit contact — frontend action | frontend | `app_before_migrations/src/actions/messages/contact.ts:19` | `frontend/src/actions/messages/contact.ts:8` → `frontend/src/lib/api/support.ts:5` (`submitContact`) | ✅ | Maps name/email/message/subject/captchaToken. |
| Contact reCAPTCHA verify | business rule | `contact.ts:47-70` | `support.py:39-51` (`_verify_recaptcha`) + `support.py:68-69` | ✅ | Same Google siteverify call. Minor diff: NEW returns 400 only when secret configured; OLD failed open when no token but verified when token present. Acceptable parity. |
| Contact — create row | side-effect | `contact.ts:73-81` (`prisma.contact.create`, subject `'Contact Form Submission'`, status `new`) | `support.py:61-66` (`Contact.objects.create`) | ⚠️ | Row created; subject sourced differently (C5). |
| Contact — send ADMIN email | side-effect | `contact.ts:94` → `lib/email/services/contact-emails.ts:14` (`sendContactAdminEmail`) | `support.py:67` `TODO(messaging)` — NOT sent | ❌ | Gap C1. |
| Contact — send USER confirmation email | side-effect | `contact.ts:94` → `contact-emails.ts:58` (`sendContactConfirmationEmail`) | none | ❌ | Gap C1. |
| Submit feedback (auth) | endpoint | `app_before_migrations/src/actions/support/submit-feedback.ts:14` | `support.py:90` (`FeedbackView.post`); url `urls.py:14` | ⚠️ | Persists row in NEW (OLD did not persist); admin email missing (C2). issueType enum changed (C6). |
| Submit feedback — frontend action | frontend | `submit-feedback.ts:14` | `frontend/src/actions/support/submit-feedback.ts:8` → `lib/api/support.ts:13` | ✅ | |
| Feedback — send admin email | side-effect | `submit-feedback.ts:69` (`sendSupportFeedbackEmail`) | `support.py:97` `TODO(messaging)` — NOT sent | ❌ | Gap C2. |
| Request verification (create) | endpoint | `app_before_migrations/src/actions/profiles/verification.ts:21,161-173` | `backend/apps/profiles/views/public/profile.py:232` (`MyVerificationView.post`) → `services/verification.py:23` `submit_verification`; url `profiles/urls/public.py:29` | ⚠️ | Logic present (update_or_create); AFM validation stricter (C3); admin email missing (C4). |
| Resubmit verification (update, reset→PENDING) | business rule | `verification.ts:96-108` (update existing, status→PENDING) | `services/verification.py:39-50` (`update_or_create` defaults status PENDING) | ✅ | Same "create-or-reset-to-PENDING" semantics. No explicit pending-guard in OLD either; parity holds. |
| Verification — role guard (freelancer/company) | authorization | `verification.ts:31` (`hasAnyRole(['freelancer','company'])`) | `services/verification.py:30` (`user.is_professional()`), `accounts/models/user.py:49` (`_PRO_LIKE_ROLES={FREELANCER,COMPANY}`) | ✅ | Same role set. |
| Verification — profile-exists guard | business rule | `verification.ts:83-89` | `services/verification.py:34-36` | ✅ | Returns 404/profile_missing. |
| Verification — send admin email | side-effect | `verification.ts:122,187` (`sendNewVerificationEmail`, recipient=admin) | `services/verification.py:53` `TODO(messaging)` — NOT sent | ❌ | Gap C4. |
| Verification status (read-own) | endpoint | `verification.ts:273` (`getVerificationStatus`) | `profile.py:250` (`MyVerificationView.get`) → `services/verification.py:60` | ⚠️ | Read-own parity OK; response-shape/404 differs (S1). |
| Verification status — frontend action | frontend | `app_before_migrations/.../profiles/verification.ts:273` | `frontend/src/actions/profiles/verification.ts:25` → `lib/api/profiles.ts:62` (`getMyVerification`) | ✅ | NEW maps 404→`{data:null}` (verification.ts:30). |
| Verification submit — frontend action | frontend | OLD `profiles/verification.ts:21` | `frontend/src/actions/profiles/verification.ts:8` → `lib/api/profiles.ts:59` (`submitVerification`) | ✅ | |
| Admin: list verifications (filter/paginate/sort) | endpoint | `app_before_migrations/src/actions/admin/verifications.ts:21` | `backend/apps/profiles/views/admin/verifications.py:21` → `services/admin_profiles.py:list_verifications`; url `profiles/urls/admin.py:48` | ⚠️ | Present; search adds `profile.username` (OLD searched afm+name only); row drops `image`/`type` (S2). |
| Admin: get single verification | endpoint | `admin/verifications.ts:105` | `verifications.py:35` (`AdminVerificationDetailView.get`); url admin.py:50 | ⚠️ | Present; row shape thinner than OLD include (S2). |
| Admin: update verification status (+sync profile.verified) | endpoint | `admin/verifications.ts:153,183-198` | `verifications.py:62` (`AdminVerificationStatusView.patch`) → `admin_profiles.update_verification_status`; url admin.py:52 | ✅ | Sets profile.verified=(status==APPROVED). Matches OLD APPROVED→true / REJECTED|PENDING→false. |
| Admin: update status — FormData variant | endpoint | `admin/verifications.ts:311` (`updateVerificationStatusAction`) | (covered by JSON PATCH; frontend builds JSON) | ✅ | FormData wrapper is a frontend concern; behavior equivalent. |
| Admin: delete verification (+unverify profile) | endpoint | `admin/verifications.ts:222,250-255` | `verifications.py:44` (`AdminVerificationDetailView.delete`) → `admin_profiles.delete_verification`; url admin.py:50 | ✅ | Unverifies profile then deletes. |
| Admin: verification stats | endpoint | `admin/verifications.ts:276` | `verifications.py:73` (`AdminVerificationStatsView`) → `admin_profiles.get_verification_stats`; url admin.py:49 | ✅ | total/pending/approved/rejected. |
| Admin: verification authz (view/edit/full) | authorization | `admin/verifications.ts:25,157,226` (`ADMIN_RESOURCES.VERIFICATIONS`) | `verifications.py:15-17` (`HasResourcePermission(VERIFICATIONS, view/edit/full)`) | ✅ | view=list/get/stats, edit=status, full=delete. Matches. |
| Admin: list contacts | endpoint | none — OLD never reads `contacts` back (write-only; admin notified by email) | none | ✅ | NOT an OLD capability; non-gap. ❓ if a UI list is desired later, neither side has it. |
| email_batches | table/feature | (no OLD support action found) | model lives in `backend/apps/messaging/models/chat.py:101` (`EmailBatch`, db_table `email_batches`) | ❓ | Out of Support domain — owned by messaging. No support-side operation to compare. |
| pending_registrations | table/feature | OLD prisma `auth.prisma:57` (Better-Auth registration flow) | model `backend/apps/accounts/models/pending_registration.py:25` | ❓ | Auth domain, not Support. Audit under auth/accounts domain. |
| `verification` table (Better-Auth email tokens) | table | `auth.prisma:35-43` (`@@map("verification")`) | accounts (Better-Auth/email-token, distinct from `verifications`) | ❓ | Distinct from profile `verifications`. Auth domain. |

---

### Detailed gaps (per ❌/⚠️)

**C1 — Contact form emails not sent (admin + user confirmation).** ❌
- OLD: `contact.ts:94` calls `sendContactFormEmails` → sends (a) admin notification (`contact-emails.ts:14`, critical, re-throws on failure) and (b) user confirmation (`contact-emails.ts:58`, non-critical). Email failure does NOT fail the action (`contact.ts:97-100`).
- NEW: `support.py:67` is a `# TODO(messaging)` comment only — neither email is sent.
- Impact: Admins are no longer notified of new contact submissions; submitters get no confirmation. Silent loss of a core support channel.
- Suggested Django fix: implement `apps.messaging.tasks.send_contact_admin_email.delay(contact.id)` and `send_contact_confirmation_email.delay(contact.id)` (Celery), invoked after `Contact.objects.create`; mirror OLD's "admin critical / confirmation best-effort, but never fail the request" semantics.

**C2 — Feedback admin email not sent.** ❌
- OLD: `submit-feedback.ts:69` calls `sendSupportFeedbackEmail(reporterInfo, feedbackDetails, submissionUrl)` to admin; submission URL falls back to `${APP_URL}/dashboard` (`submit-feedback.ts:66`). OLD did NOT persist any DB row.
- NEW: `support.py:97` is a `TODO`; instead NEW persists a `Contact` row (`support.py:92-96`) tagged `Feedback: <issueType>`. Email never sent.
- Impact: Feedback reports are stored but admins are not notified (no email). Different storage model (Contact row vs email-only) — acceptable as an improvement, but the notification is a missing OLD side-effect.
- Suggested Django fix: enqueue `send_feedback_admin_email.delay(...)` with reporter + issueType + description + pageUrl (default page → `${APP_URL}/dashboard`).

**C3 — AFM validation is stricter in NEW.** ⚠️ (behavior bug)
- OLD: `verificationFormSchema` (`validations/profile.ts:428-431`) — `afm: string, min(1), max(20)`. Accepts any 1–20 char string.
- NEW: `SubmitVerificationSerializer.afm` (`profiles/serializers/profile_updates.py:66`) — `RegexField(r"^\d{9}$")`. Requires exactly 9 digits.
- Impact: Submissions that OLD accepted (non-9-digit or non-numeric AFM) now 400. Could block legitimate users whose AFM data differs, or change error UX. A real divergence.
- Suggested Django fix: relax to `CharField(min_length=1, max_length=20)` to match OLD, OR confirm with product that strict 9-digit is intended and update OLD-side expectations. Flag as decision needed.

**C4 — Verification submit admin email not sent.** ❌
- OLD: both create and update branches call `sendNewVerificationEmail(user, profile.id, verification.id)` to admin (`verification.ts:122,187`; recipient=admin per `admin-emails.ts:21` "Send email to admin").
- NEW: `services/verification.py:53` is a `TODO(messaging)`.
- Impact: Admins not notified of new/resubmitted verification requests → verifications may sit unreviewed.
- Suggested Django fix: enqueue `send_new_verification_email.delay(verification.id, user.id)` after `update_or_create`.

**C5 — Contact subject sourced differently.** ⚠️
- OLD: always hardcodes `subject: 'Contact Form Submission'` (`contact.ts:78`); the email subject is the Greek `'Φόρμα Επικοινωνίας'` (`contact.ts:89`). Client cannot set subject.
- NEW: `ContactSerializer.subject` is a client-supplied optional field (`support.py:24`); stored as-is or null (`support.py:65`). The frontend action forwards a `subject` form field (`frontend/.../messages/contact.ts:17`).
- Impact: Stored `contacts.subject` will be null/blank instead of `'Contact Form Submission'` when the client omits it; admin-side filtering/display may rely on a populated subject.
- Suggested Django fix: default `subject` to `"Contact Form Submission"` when blank, to match OLD stored value.

**C6 — Feedback issueType enum values changed.** ⚠️
- OLD: `supportFormSchema.issueType = enum(['problem','option','feature'])` (`validations/support.ts`).
- NEW: `FeedbackSerializer.issueType = ChoiceField(('bug','feature','question','other'))` (`support.py:31`). NEW frontend also uses `bug|feature|question|other` (`frontend/src/lib/api/support.ts:14`).
- Impact: Enum value set diverged (`problem`/`option` → `bug`/`question`/`other`). Only `feature` overlaps. Any persisted historical mapping or admin filter on old values breaks; this is an intentional-looking change but is a divergence from OLD contract.
- Suggested Django fix: confirm intended; if parity required, restore `('problem','option','feature')`. Otherwise document as accepted change.

**C7 — Verification list search scope widened; status filter parity.** ⚠️
- OLD: search filters on `afm` + `name` only (`admin/verifications.ts:42-47`). status enum `['all','PENDING','APPROVED','REJECTED']` (`validations/admin.ts:430`); sortBy enum `['createdAt','updatedAt','status']` (admin.ts:433).
- NEW: search also includes `profile__username` (`admin_profiles.list_verifications`, `Q(afm)|Q(name)|Q(profile__username)`). status filter passes through raw query param (no enum validation at view; service compares `!= 'all'`). sortBy only maps `createdAt`/`updatedAt`; `status` sort silently falls back to `created_at`.
- Impact: (a) wider search is a superset — low risk. (b) `sortBy=status` is accepted by OLD but silently ignored by NEW (falls back to createdAt) → sorting bug. (c) NEW does not enum-validate `status` query param.
- Suggested Django fix: add `"status": "status"` to the sort map in `list_verifications`; validate the `status` query param against the enum.

---

### Response-shape mismatches

**S1 — Verification status (read-own).**
- OLD `getVerificationStatus` returns `{success, data: {status, afm, name, address, phone, createdAt, updatedAt} | null}` where dates are JS `Date` objects (`verification.ts:273-304`); when no profile/verification → `data: null` (HTTP 200).
- NEW `MyVerificationView.get` returns the dict from `get_verification_status` (`services/verification.py:60-72`): same keys, but `createdAt`/`updatedAt` are ISO-8601 strings; when none exists the service returns `None` → DRF renders `null` body with HTTP 200. Frontend additionally treats 404→null (`frontend/.../profiles/verification.ts:30`), but service returns 200/null, not 404. Functionally compatible; date type changed Date→ISO string (expected cross-stack).
- Submit response: OLD returns only `{success, message}`; NEW returns `{message, status}` (`profile.py:249`) — extra `status` key (additive, low risk). No `success` envelope in NEW raw API (frontend re-wraps).

**S2 — Admin verification row (list/detail) drops profile fields.**
- OLD includes `profile: {id, displayName, image, type, user:{id,email}}` (`admin/verifications.ts:58-72`); detail also includes `user.name`, `user.role` (`admin/verifications.ts:113-122`).
- NEW `_verification_row` returns `profile: {id, username, displayName, email}` and `user: {id, email}` (`admin_profiles._verification_row`). 
- Mismatches: NEW adds `profile.username`, `profile.email`; NEW DROPS `profile.image` and `profile.type`; detail drops `user.name`/`user.role`. If the admin verifications table UI renders avatar (`image`) or profile `type`, those columns will be empty.
- Suggested Django fix: add `image` and `type` to the `profile` block in `_verification_row` (and `user.role` for detail) to restore OLD shape.

**S3 — Casing.** Both OLD and NEW use camelCase keys (`createdAt`, `displayName`, `searchQuery`, `sortDirection`). Pagination envelope `{verifications, total, limit, offset}` matches OLD exactly (`admin/verifications.ts:83-90` vs `admin_profiles.list_verifications`). ✅

---

### Counts

- matched (✅): 16
- partial (⚠️): 9  (Contact submit, Contact create-row, Feedback submit, Verification create, Verification status read, Admin list, Admin get, + sub-rows C3/C5/C6/C7 captured within these)
- missing (❌): 4  (C1 admin contact email, C1 user confirmation email, C2 feedback admin email, C4 verification admin email)
- needs_verification (❓): 4  (admin list-contacts intent, email_batches ownership, pending_registrations ownership, Better-Auth `verification` token table)

Counting unique capability rows in the matrix: matched=16, partial=7 rows, missing=4 (email side-effects), needs_verification=4.
