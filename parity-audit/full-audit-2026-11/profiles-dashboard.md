# Profile dashboard (pro's own profile management) parity audit — 2026-11-05

## 1. Coverage

### OLD files read (oldnext/)
Actions (write/me side)
- `src/actions/profiles/basic-info.ts`: updateProfileBasicInfo (tagline/bio/category/subcategory/speciality/skills, normalization, cache purge)
- `src/actions/profiles/additional-info.ts`: updateProfileAdditionalInfo (rate, commencement→experience, methods, budget, terms)
- `src/actions/profiles/coverage.ts`: updateCoverage (coverageSchema, coverageNormalized)
- `src/actions/profiles/portfolio.ts`: updateProfilePortfolio (sanitizeCloudinaryResources, DbNull when empty)
- `src/actions/profiles/presentation.ts`: updateProfilePresentation and getProfilePresentation (phone/website/viber/whatsapp/visibility/socials)
- `src/actions/profiles/billing.ts`: updateProfileBilling (billingSchema, JSON snapshot)
- `src/actions/profiles/lookup-afm.ts`: lookupAfm (raw SOAP 1.2 call to AADE RgWsPublic2)
- `src/actions/profiles/verification.ts`: submitVerificationRequest and getVerificationStatus
- `src/actions/auth/update-account.ts`: updateAccount (Λογαριασμός tab: displayName/image, synced to the profile)
- `src/actions/auth/{change-password,change-username,upgrade-to-pro,delete-account}.ts`: read for the Λογαριασμός tab's UI-facing messages only. The server logic is delegated (see below).
- `src/actions/taxonomy-submission.ts`: read because the basic-info form calls it for "new skill" proposals

Pages (`src/app/(dashboard)/dashboard/profile/`)
- `layout.tsx`: shows ProfileSidebar for pro users only
- `page.tsx`: redirects to /account
- `account/page.tsx`: Λογαριασμός (AccountForm and AccountPageActions)
- `basic/page.tsx`: Βασικά στοιχεία (BasicInfoForm and PortfolioForm)
- `coverage/page.tsx`: Τρόποι Παροχής
- `contact-details/page.tsx`: Επικοινωνία (PresentationInfoForm)
- `additional/page.tsx`: Πρόσθετα Στοιχεία
- `verification/page.tsx`: Πιστοποίηση (VerificationStatus and VerificationForm)

Forms and components (`src/components/forms/profile/`)
- `form-account.tsx`, `account-page-actions.tsx`, `form-change-username.tsx`, `form-change-password.tsx`, `form-delete-account.tsx`, `form-upgrade-to-pro.tsx`: Λογαριασμός tab
- `form-basic-info.tsx`, `form-portfolio.tsx`, `form-coverage.tsx`, `form-presentation-info.tsx`, `form-additional-info.tsx`, `form-verification.tsx`, `verification-status.tsx`: the other tabs
- `form-billing.tsx`: billing details form (used in checkout/promote and admin)
- `profile-sidebar.tsx`: tab nav. `documents-interface.tsx`: types. `index.ts`: barrel.
- Supporting files: `src/lib/validations/profile.ts` (all schemas and Greek messages), `src/lib/validations/{user,auth,shared}.ts`, `src/lib/utils/form.ts`, `src/lib/utils/datasets.ts` (coverage helpers, generateCoverageNormalized), `src/lib/utils/cloudinary.ts` (sanitize, processImageForDatabase), `src/lib/utils/text/{html,sanitize,normalize}.ts`, `src/lib/utils/zod.ts`, `src/lib/utils/cooldown.ts`, `src/lib/cache/revalidation.ts` (revalidateProfile), `src/lib/prisma/json-types.ts` (cloudinaryResourceSchema), `src/lib/prisma/schema/user.prisma` (Profile/ProfileVerification), `src/constants/email/{email-config.ts,templates/new-verification.ts}`, `src/lib/email/services/admin-emails.ts` (sendNewVerificationEmail), `src/components/ui/{lazy-combobox,selectbox,multi-select,year-select,currency,switch,checkbox,textarea,input,form,pulsating-dot,rich-text-editor}.tsx`, `src/components/media/**`, `src/components/shared/{button-form,profile-badges}.tsx`, `src/constants/datasets/options.ts`, `src/app/api/sign-cloudinary-params/route.ts`, `src/actions/cloudinary/get-media-library-token.ts`, `src/actions/auth/server.ts` (getCurrentUser, requireProUser)

### NEW files read
- frontend: `src/actions/profiles/{basic-info,additional-info,coverage,portfolio,presentation,billing,lookup-afm,verification}.ts`, `src/actions/auth/{update-account,change-password,change-username,upgrade-to-pro,delete-account,server}.ts`, `src/actions/taxonomy-submission.ts`, `src/lib/api/{profiles,client}.ts`, `src/lib/cache/revalidation.ts`, every page under `src/app/(dashboard)/dashboard/profile/` (diffed), every file under `src/components/forms/profile/` (diffed), the same supporting validations/utils/ui/media files (diffed), and `src/app/api/sign-cloudinary-params/route.ts`
- backend: `apps/profiles/urls/public.py`, `views/public/profile.py`, `serializers/profile_updates.py`, `services/{profile_updates,verification,afm_lookup,cache}.py`, `selectors/profile_reads.py`, `models/{profile,profile_verification}.py`, `migrations/0001_initial.py` (afm column), `signals.py`, `apps/services/signals.py`, `apps/services/selectors/service_reads.py` (service:page cache), `apps/accounts/views/public/account.py`, `apps/accounts/services/account.py` (update_account), `apps/accounts/permissions/roles.py`, `apps/messaging/{tasks,emails}.py` (verification email), `apps/media/views/public/sign.py`, `common/utils/{cloudinary,normalize}.py`, `common/exceptions.py`, `common/throttling.py`, `config/settings/base.py` (throttle rates), `apps/core/locations.py`

### Delegated elsewhere
- `src/actions/profiles/get-profile.ts`, `get-profiles.ts`, `get-directory.ts`, `report-profile.ts`: public profile page / archives / directory domain
- `src/components/forms/profile/form-onboarding.tsx`, `onboarding-form-skeleton.tsx`: onboarding/auth domain (the new copy differs by 119 diff lines, which that domain should check)
- `src/actions/auth/{change-password,change-username,upgrade-to-pro,delete-account}.ts` server logic (cooldown, Brevo sync, cascade delete, token reissue): auth/account domain. I verified only the UI-facing messages (D11).
- `src/actions/admin/profiles/*` and the `adminMode` branches of every profile form: admin domain
- The checkout/promote pages that embed `BillingForm`: subscription/payments domain
- The Cloudinary signing endpoint and upload widgets: media domain. The widget files are identical. The new `/api/sign-cloudinary-params` proxies to Django `SignCloudinaryParamsView` (IsAuthenticated), which matches the old auth-only gate.
- Taxonomy-submission server logic (dedup, 5/day limit): taxonomy-submission domain. Only the UI-contract bug D6 is reported here.
- The verification approval/rejection flow (admin side): admin domain

## 2. Mapping (old → new)

| OLD | NEW frontend action | Django endpoint | Page/UI |
|---|---|---|---|
| updateProfileBasicInfo | actions/profiles/basic-info.ts | PATCH /api/profiles/me/basic-info (MyBasicInfoView, IsAuthenticated+IsProfessional) → services.update_basic_info | /dashboard/profile/basic (identical form) |
| updateProfilePortfolio | actions/profiles/portfolio.ts | PATCH /api/profiles/me/portfolio → update_portfolio | /dashboard/profile/basic (PortfolioForm) |
| updateCoverage | actions/profiles/coverage.ts | PATCH /api/profiles/me/coverage → update_coverage | /dashboard/profile/coverage |
| updateProfilePresentation / getProfilePresentation | actions/profiles/presentation.ts | PATCH / GET /api/profiles/me/presentation | /dashboard/profile/contact-details |
| updateProfileAdditionalInfo | actions/profiles/additional-info.ts | PATCH /api/profiles/me/additional-info | /dashboard/profile/additional |
| updateProfileBilling | actions/profiles/billing.ts | PATCH /api/profiles/me/billing (IsAuthenticated; service allows pro or admin) | BillingForm (checkout/promote) |
| lookupAfm | actions/profiles/lookup-afm.ts | POST /api/profiles/lookup-afm (IsAuthenticated, AfmLookupThrottle 10/min) → afm_lookup (zeep) | BillingForm / VerificationForm autofill |
| submitVerificationRequest / getVerificationStatus | actions/profiles/verification.ts | POST / GET /api/profiles/me/verification | /dashboard/profile/verification |
| updateAccount | actions/auth/update-account.ts | PATCH /api/auth/account → update_account + sync_account_to_profile | /dashboard/profile/account |
| getCurrentUser (profile row) | actions/auth/server.ts getCurrentUser | GET /api/profiles/me (serialize_profile_owner) | all tabs |

## 3. DIFFERENCES

### D1. AFM lookup sends the AADE username as `afm_called_by` and ignores AADE's error record — HIGH (not verified live)
- OLD: `lookup-afm.ts:52-57` sends `<ns3:afm_called_by/>` (empty). `:92-97` reads `error_code`/`error_descr` and returns AADE's own `error_descr` text to the user (e.g. an invalid-AFM or not-authorized reason). It falls back to `'ΑΦΜ δεν βρέθηκε'`.
- NEW: `backend/apps/profiles/services/afm_lookup.py:58-60` calls `INPUT_REC={"afm_called_by": creds["USERNAME"], "afm_called_for": afm}`, so the AADE *username* goes into a field that expects an AFM (or empty). The result's `error_rec` is never read. Any failure that comes back without `basic_rec.onomasia` becomes a 404 `'ΑΦΜ δεν βρέθηκε'` (`:70-76`).
- Impact: if AADE rejects a non-AFM `afm_called_by`, every lookup fails and the invoice/verification autofill shows "ΑΦΜ δεν βρέθηκε" for valid AFMs. Even when the call works, AADE's specific error texts are lost.
- Fix: pass `afm_called_by=""` (or omit it), and if `result.error_rec.error_code` is present and not 0, raise with `error_rec.error_descr` (fallback `'ΑΦΜ δεν βρέθηκε'`).
- Possibly intentional?: no.

### D2. Profile edits no longer purge the owner's service pages — MEDIUM
- OLD: every own-profile write (basic-info.ts:133-150, additional-info.ts:116-131, coverage.ts:96-112, presentation.ts:118-134, portfolio.ts:103-119, billing.ts:110-126, update-account.ts:135-160, verification.ts:129-149) calls `revalidateProfile({... includeServices: true})`. This revalidates `user.services`, `profile.services`, `service.byProfile`, `collections.services`, plus `revalidatePath('/s/<slug>')` for each published service (lib/cache/revalidation.ts:146-151).
- NEW: the frontend only calls `revalidateMyPublicProfile()` (frontend/src/lib/cache/revalidation.ts:79-88), which covers the profile page, `archive:profiles`, home and `/`. The Django Profile post_save signal (`apps/profiles/signals.py` → `services/cache.py:20-37`) purges `profile:page:*`, `profiles:directory:*`, `profiles:count:*` and `core:home`. Nothing purges `service:page:{id}`, which is a 30-minute Redis cache. That bundle embeds `displayName`, `image`, `coverage`, `verified` and similar fields (`apps/services/selectors/service_reads.py:177-191`). The `service:id:*` / `archive:services` frontend tags are not purged either.
- Impact: after a pro changes their display name, image, tagline/bio, coverage or contact details, their service pages (and service archive cards) show the old data for up to about 30 min (Redis) plus 5 min (Data Cache).
- Fix: in the Profile post_save signal, also delete `service:page:{id}` for the profile's services and `services:count:*`. In the profile actions, call `revalidatePublicService()` (no id → `services:all` + `archive:services`).
- Possibly intentional?: no. The cache architecture is intentional, but the purge scope was narrowed.

### D3. Server-side validation errors show an English generic message — MEDIUM
- OLD: on a Zod failure the actions return a Greek message with field errors, e.g. `'Μη έγκυρα δεδομένα προφίλ'` (basic-info.ts:82-85), `'Μη έγκυρα δεδομένα τρόπων παροχής'` (coverage.ts:49-53), `'Μη έγκυρα πρόσθετα στοιχεία προφίλ'`, `'Μη έγκυρα δεδομένα'` (presentation), `'Μη έγκυρα δεδομένα χαρτοφυλακίου'`, `'Μη έγκυρα δεδομένα τιμολόγησης'`, `'Μη έγκυρα δεδομένα πιστοποίησης'`. Non-pro users get `'Δεν έχετε δικαίωμα ενημέρωσης προφίλ'`.
- NEW: DRF ValidationError becomes `{"message": "One or more fields are invalid."}` (common/exceptions.py:126-133), and every action toasts only `err.message` (e.g. frontend/src/actions/profiles/basic-info.ts:32-33). The Greek per-field texts in `serializers/profile_updates.py` stay in `details` and are never shown. A non-pro caller on the IsProfessional views gets `"Professional account required."` (accounts/permissions/roles.py:52-55).
- Impact: whenever server validation fires and the client did not catch it (e.g. a website like `ftp://…` or `mailto:` that zod `.url()` accepts but the server's `^https?://` rejects, a phone longer than 64 characters, or an AFM longer than 16 characters, see D9), the user sees an English toast with no field highlighted.
- Fix: in the actions, map `err.code === 'validation_error'` to the old Greek per-action message (or the first message from `err.details`), and give IsProfessional a Greek `message`.
- Possibly intentional?: no.

### D4. Success toast texts changed on 7 save flows — MEDIUM (copy)
Each action hard-codes its message, and the forms toast `state.message`.
| Flow | OLD (file:line) | NEW (file) |
|---|---|---|
| Πρόσθετα | `'Τα πρόσθετα στοιχεία ενημερώθηκαν επιτυχώς!'` (additional-info.ts:135-137) | `'Τα στοιχεία ενημερώθηκαν'` (frontend actions/profiles/additional-info.ts) |
| Τρόποι Παροχής | `'Οι περιοχές κάλυψης ενημερώθηκαν επιτυχώς!'` (coverage.ts:116-119) | `'Η κάλυψη ενημερώθηκε'` |
| Επικοινωνία | `'Τα στοιχεία επικοινωνίας ενημερώθηκαν επιτυχώς!'` (presentation.ts:138-141) | `'Τα στοιχεία προβολής ενημερώθηκαν'` |
| Portfolio | `'Τα δείγματα εργασιών ενημερώθηκαν επιτυχώς!'` (portfolio.ts:123-126) | `'Το portfolio ενημερώθηκε'` |
| Billing | `'Τα στοιχεία τιμολόγησης ενημερώθηκαν επιτυχώς!'` (billing.ts:130-133) | `'Τα στοιχεία χρέωσης ενημερώθηκαν'` |
| Πιστοποίηση | `'Το αίτημα πιστοποίησης υποβλήθηκε επιτυχώς! Θα εξεταστεί από την ομάδα μας.'` (new request) / `'Το αίτημα πιστοποίησης ενημερώθηκε επιτυχώς! Θα εξεταστεί από την ομάδα μας.'` (resubmission) (verification.ts:151-154, 210-213) | always `'Η αίτηση επαλήθευσης υποβλήθηκε'` |
| Λογαριασμός | `'Ο λογαριασμός σας ενημερώθηκε επιτυχώς!'` (update-account.ts:164-167) | `'Ο λογαριασμός ενημερώθηκε'` |
- Basic-info (`'Τα βασικά στοιχεία ενημερώθηκαν επιτυχώς!'`) matches. To support the create/update distinction for verification, the Django POST needs to return `created`.
- Possibly intentional?: no.

### D5. Verification admin email lost its subject, user identity and admin links — MEDIUM
- OLD: `sendNewVerificationEmail(user, profileId, verificationId)` (verification.ts:118-127, 177-186). Subject `Νέο Αίτημα Πιστοποίησης - {displayName} ({email})` (email-config.ts:126-134). The body names the user and email and has buttons to `/admin/verifications/{verificationId}`, `/admin/profiles/{profileId}` and `/admin/verifications` (templates/new-verification.ts). Sent on both create and resubmit. displayName falls back to username, then 'Unknown'.
- NEW: `send_verification_request_email.delay(profile.id, afm)` → `emails.send_verification_request_admin_email` (messaging/emails.py:171-178). Subject `"[Doulitsa] Νέο αίτημα επαλήθευσης"`. The body shows only the raw profile id and the AFM, with no user name/email and no links.
- Impact: admins can't tell who requested verification or click through to review it.
- Possibly intentional?: no. The email domain may report this too.

### D6. "New skill" proposal errors fall back to a generic toast — MEDIUM
- OLD: `submitTaxonomySubmission` returns `{success:false, message}` with specific Greek reasons: `Η δεξιότητα "X" υπάρχει ήδη`, `'Έχετε φτάσει το μέγιστο όριο υποβολών (5) για σήμερα'`, `Η υποβολή "X" εκκρεμεί ήδη για έγκριση` (taxonomy-submission.ts:29-112). The form shows `result.message` (form-basic-info.tsx:230).
- NEW: frontend/src/actions/taxonomy-submission.ts:16-17 returns `{success:false, error}` and never sets `message`. The unchanged form therefore always toasts `'Σφάλμα κατά την υποβολή'`.
- Fix: also return `message: err.message`.
- Possibly intentional?: no.

### D7. AFM lookup error texts changed and a new rate limit was added — LOW
- OLD (lookup-afm.ts): invalid → `'Μη έγκυρο ΑΦΜ'`; missing creds → `'Σφάλμα διαμόρφωσης AADE'`; HTTP error → `'Σφάλμα σύνδεσης με AADE'`. No rate limit.
- NEW: invalid → `'Το ΑΦΜ πρέπει να είναι 9 ψηφία'` (frontend lookup-afm.ts:25); missing creds → English `"AADE credentials not configured"` (afm_lookup.py:44-48); network → `'Αποτυχία επικοινωνίας με την υπηρεσία ΑΑΔΕ'`; zeep missing → English. A 10/min throttle (settings base.py:258) returns DRF's English throttle text.
- Possibly intentional?: the throttle may be intentional. The texts are not.

### D8. Rich-text bio sanitization uses a different tag whitelist, and bio normalization differs — LOW
- OLD: `sanitizeRichText` (utils/text/sanitize.ts) allows `p,strong,em,h2,h3,ul,ol,li,br,img[src,alt,width,height]` with https only. `bioNormalized = normalizeTerm(stripHtmlTags(bio))`, where stripHtmlTags removes tags with `''` and then trims. Validation counts the trimmed text.
- NEW: `services/profile_updates.py:172-183` uses bleach with `p,br,strong,b,em,i,u,ul,ol,li,a[href,title,target,rel],blockquote,h1-h6` and no img. `_strip_html` (:40-44) replaces tags with `' '` and does not trim, so `<p>a</p><p>b</p>` normalizes to `" a  b "` where old gave `"ab"`. The serializer's validate_bio (serializers:56-67) counts untrimmed text.
- Impact: small differences in search matching on `bioNormalized`. Pasted `<h1>/<a>/<u>` markup is now kept where old stripped it (the editor can't create these, but pasted HTML can). Whitespace-padded bios count slightly longer.
- Possibly intentional?: the space-separation arguably improves search, but it differs from old.

### D9. ProfileVerification.afm column is 16 characters but the serializer allows 20 — LOW
- OLD: Prisma `afm String?` (text), zod max 20 (validations/profile.ts:426-429).
- NEW: `models/profile_verification.py:17` `CharField(max_length=16)` (migration 0001 line 83), `SubmitVerificationSerializer.afm max_length=20`.
- Impact: if the column really is varchar(16) in the DB, a 17–20 character AFM causes a DB error (500) instead of saving.
- Possibly intentional?: no. Whether the prod DB column is text or varchar is unverified (§5).

### D10. Owner profile payload has no `email`, so the Επικοινωνία tab may preview a different email — LOW
- OLD: getCurrentUser returns the full Prisma Profile row, including `profile.email`. form-presentation-info.tsx:111 shows `initialProfile?.email || initialUser?.email` next to the "show email" toggle.
- NEW: `serialize_profile_owner` / `serialize_profile_summary` (selectors/profile_reads.py:78-165) never include `email`, so the form always falls back to `user.email`.
- Impact: where Profile.email differs from User.email (legacy data, email changes), the dashboard previews a different address from the one the public page shows.
- Possibly intentional?: no.

### D11. Λογαριασμός tab sub-flow texts — LOW (server logic delegated to auth)
- Change password: old `'Ο κωδικός άλλαξε επιτυχώς!'` → new `'Ο κωδικός άλλαξε επιτυχώς'` (no "!").
- Upgrade to pro: old `'Ο λογαριασμός σας αναβαθμίστηκε! Θα μεταφερθείτε στη σελίδα ολοκλήρωσης προφίλ.'` → new `'Έγινες επαγγελματίας'` (accounts/views/public/account.py UpgradeToProView). Old validation errors from upgradeToProSchema are replaced by frontend checks `'Το username πρέπει να έχει τουλάχιστον 3 χαρακτήρες'` / `'Επίλεξε ρόλο: freelancer ή company'`.
- Delete account: the old zod messages (`'Το username δεν ταιριάζει'`, `'Το username δεν ταιριάζει με τον λογαριασμό σας'`) become `'Η επιβεβαίωση δεν ταιριάζει'` (frontend delete-account.ts:15-16).
- Change username: the message and data shape match (`'Το username άλλαξε επιτυχώς!'` plus newUsername).

### D12. Account image is no longer validated before saving — LOW
- OLD: `processImageForDatabase` (utils/cloudinary.ts:494-525) rejects `blob:` and non-https URLs (stores null) before writing User/Profile image. displayName is stored as typed.
- NEW: `accounts/services/account.py:44-48` stores `image.secure_url || image.url` or the raw string without the blob/https check, and strips displayName.
- Impact: a blob/http URL could be persisted, giving a broken avatar.
- Possibly intentional?: no.

### D13. Rate "0" is saved as 0 instead of being cleared — LOW
- OLD: additional-info.ts:101 `rate: data.rate || null` stores 0 as null.
- NEW: frontend additional-info.ts:20 `rate ? Number(rate) : null` keeps the string "0" (truthy) as 0, and update_additional_info stores 0 (profile_updates.py:253). Despite the comment, this does not reproduce `|| null`.
- Impact: a rate of 0 is stored (and may display as 0 €) instead of being hidden.

### D14. Coverage server error texts differ from old refine messages — LOW
- OLD (validations/profile.ts:151, 164): `'Συμπλήρωση Διεύθυνσης και Τ.Κ. του χώρου.'` and `'Προσθήκη νομών ή των υποπεριοχών τους που εξυπηρετείς.'`.
- NEW (serializers/profile_updates.py:170-182): `'Πληκτρολογήστε τη Διεύθυνση και τον Τ.Κ. του χώρου σας.'` and `'Επιλέξτε τουλάχιστον έναν νομό που εξυπηρετείτε'`. These are currently hidden behind D3. The client form still uses the old schema, so users normally see the old texts.

### D15. Payload sanitization is laxer or different (unknown keys, item validation) — LOW
- Coverage: old zod strips unknown keys and requires the three booleans. New stores the raw dict (`update_coverage`) and treats missing booleans as false.
- Socials: old socialMediaSchema strips non-platform keys. New stores the whole dict (only the known platforms are URL-checked).
- Portfolio: old validated each item against cloudinaryResourceSchema (requires public_id, secure_url and a resource_type enum) and kept `folder, etag, signature, metadata, batch_id, upload_status`. New `sanitize_resource` (common/utils/cloudinary.py:43-55) does no item validation, drops those keys and adds `duration`.
- Visibility default when omitted: old `{email:false}` (presentation.ts:107-109). New `{email:false, phone:true, address:true}` (profile_updates.py:386). The new form also always sends phone/address `true`. Nothing reads visibility.phone/address in either app, so there is no visible effect.
- Empty optional strings: old stores `''` for tagline/speciality. New stores null (frontend basic-info.ts:21-25). The rendered result is the same.

### D16. Coverage form restores fields on re-check, and the Coverage page guard changed — LOW
- OLD: form-coverage.tsx: unchecking onbase/onsite clears address/zipcode/area/county or counties/areas, and re-checking leaves them empty. `coverage/page.tsx` redirects non-pro users to `/dashboard/profile/account` and lets a pro still in ONBOARDING open the page.
- NEW: form-coverage.tsx:210-243 stashes the cleared fields and restores them on re-check, plus `form.trigger()`. `coverageSchema.address` is now `.nullable()` (validations/profile.ts:116) so `isValid` isn't stuck. `coverage/page.tsx` adds `requireProUser()` and redirects a pro who isn't in the DASHBOARD step to `/dashboard`.
- Possibly intentional?: yes, they look like deliberate fixes (comments explain them). Listed so they can be confirmed.

### D17. Account form validates on blur instead of on change; commencement uses field.onChange — LOW
- form-account.tsx:78 `mode: 'onChange'` → `'onBlur'`: displayName errors (min 5 / max 50) now appear on blur instead of while typing. The comment cites a render loop fix.
- form-additional-info.tsx:272: `setValue(..., {shouldDirty, shouldValidate})` → `field.onChange`. In RHF this is equivalent; noted only.
- Possibly intentional?: yes (perf / loop fixes).

## 4. Confirmed same
- All 8 dashboard profile pages: same titles, subtitles, metadata (`Λογαριασμός`, `Βασικά στοιχεία`, `Τρόποι Παροχής`, `Επικοινωνία`, `Πρόσθετα Στοιχεία`, `Πιστοποίηση`), the hasProfile guard (`role∈{freelancer,company}` and `step==='DASHBOARD'` → else `/dashboard`), and requireProUser → `/dashboard/profile/account`. The only difference is D16.
- Byte-identical: `profile-sidebar.tsx` (tab labels and order), `account-page-actions.tsx`, `verification-status.tsx`, `form-change-username.tsx`, `form-change-password.tsx`, `form-upgrade-to-pro.tsx`, `documents-interface.tsx`, and all UI primitives used by the forms (including rich-text-editor and media upload widgets).
- Form field sets, labels, placeholders, char counters and client validation: identical apart from the import of `Profile`. This covers bio ≥80 / ≤5000 on stripped HTML, tagline empty or 10–100, category/subcategory required, skills ≤10, portfolio ≤10, billing refines (one type, all invoice fields, 9-digit AFM), verification min/max lengths, socials URL checks, displayName 5–50, and every Greek message in validations/profile.ts.
- Server rules ported correctly: tagline/bio/category/subcategory/skills limits and Greek texts; additional-info rate ≥0 int (lenient update schema); billing refines and texts; verification lengths; AFM 9-digit check; portfolio max 10.
- Write semantics: tagline/bio normalization (null when empty, NFD accent strip and lowercase); category/subcategory/speciality/skills written; basic-info does not touch coverage (the form sends no image); additional-info writes every field and computes experience as currentYear − parseInt(commencement); billing JSON snapshot uses `''` for unset fields and allows pro or admin on their own row; coverage writes coverage and coverageNormalized (areas → counties → legacy area/county, deduped, space-joined; same algorithm); portfolio drops pending/blob items, strips `_pending`, and stores null when empty; presentation writes every field with `X || null` and socials null when empty; account syncs displayName, displayNameNormalized and image to the profile and leaves the image untouched when none is sent.
- Verification: upsert on profile with status reset to PENDING on every (re)submit; pro-only; GET returns status/afm/name/address/phone/createdAt/updatedAt. When there is no record, the page renders the "no verification" state in both apps (new reaches it through an error path; see §5).
- Role gates: freelancer/company for basic/additional/coverage/portfolio/presentation/verification; freelancer/company/admin for billing.
- New additions that look intentional: taxonomy FK resolution on basic-info (`apply_profile_node_fks`), Django Redis purges on Profile save, and the old-username page purge on username change.

## 5. Open questions / couldn't verify
- D1: I couldn't run AADE without credentials. Whether RgWsPublic2 rejects a non-AFM `afm_called_by` needs a live test on test.doulitsa.gr, e.g. a known AFM such as 094014201 in the billing form.
- D9: whether the `verifications.afm` column in the restored production DB is `text` (Prisma) or `varchar(16)` (Django migration) depends on how the migrations were applied (faked or real). Check with `\d verifications`.
- GET /api/profiles/me/verification returns `Response(None)` when no record exists. DRF renders that as an empty body with a JSON content-type, so the frontend's `res.json()` throws and `getVerificationStatus` returns `success:false`. The page then treats it as null, so the visible result is the same, but it relies on an exception. Returning `{}`/204 or `null` JSON explicitly would be cleaner.
- The onboarding form (`form-onboarding.tsx`) differs by about 119 diff lines. It was not reviewed here (onboarding domain).
- I didn't check whether the public profile page renders `rate: 0` (D13) or legacy profile emails (D10); the public profile domain should confirm.
