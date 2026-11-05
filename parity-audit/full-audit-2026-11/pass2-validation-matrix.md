# Validation matrix (pass 2) parity audit — 2026-11-05

Scope: every user-submittable surface, compared field by field across four
layers: OLD client (zod form schema), OLD server (server action zod plus inline
checks, better-auth), NEW client (`frontend/src/lib/validations`, form-inline
schemas), and NEW server (DRF serializer plus service-layer checks).
Dedupe rule applied: findings already in SUMMARY.md or the 11 pass-1 reports
are only referenced in the matrix ("known → report Dn"), not re-reported.
§3 lists only NEW findings; §3b lists corrections to pass-1.

## 1. Coverage

### OLD files read
- `src/lib/validations/shared.ts`: email/phone/url/password/username/slug patterns.
- `src/lib/validations/auth.ts`: login, register (server and form), password change/reset, account update, delete account.
- `src/lib/validations/user.ts`: changeUsername, upgradeToPro, admin user CRUD (mostly unused).
- `src/lib/validations/profile.ts`: basic/additional/presentation/socials/billing/verification/coverage/portfolio/onboarding/report schemas.
- `src/lib/validations/service.ts`: addon/faq (form and draft), create, draft, update-info, media, admin edit-* schemas, report, delete.
- `src/lib/validations/review.ts`: createReview, moderateReview.
- `src/lib/validations/chat.ts`: unused by any action (verified by grep).
- `src/lib/validations/media.ts`: unused (no importer).
- `src/lib/validations/subscription.ts`: checkout/cancel.
- `src/lib/validations/support.ts`, `contact.ts`, `blog.ts`, `taxonomy-submission.ts`, `taxonomy-drafts.ts` (admin draft helper only), `admin.ts` (all admin schemas), `index.ts`.
- Server actions with parse calls (all 90 `safeParse`/`.parse` sites grepped). Read in full: `auth/{register,login,change-username,oauth-setup}.ts`, `profiles/{basic-info,additional-info,portfolio,coverage}.ts`, `admin/profiles/{presentation,basic-info,additional-info}.ts`, `services/{create-service,update-service}.ts`, `admin/services.ts` (create-for-profile, status), `messages/{contact,messages,reactions,blocking}.ts`, `reviews/create-review.ts`, `taxonomy-submission.ts`, `subscription/create-checkout-session.ts`, `blog/manage-articles.ts`, `admin/action-wrappers.ts`, `admin/{tags,skills,taxonomies,pro-taxonomies}.ts` (schema wiring).
- `src/lib/utils/form.ts`: `extractFormData`/`getFormInt`/`getFormBoolean`/`populateFormData` (empty-input defaults).
- `src/lib/utils/text/html.ts`: `stripHtmlTags` (trims).
- `src/lib/auth/config.ts`: better-auth username plugin (3–30, `[a-zA-Z0-9_-]`).
- `src/app/api/sign-cloudinary-params/route.ts`: signs any params.
- Client forms: `components/forms/profile/*` (diffed against new), `forms/auth/form-oauth-setup.tsx`, `forms/auth/form-reset-password.tsx`, `forms/service/form-service-create.tsx`/`form-service-edit.tsx`, `review/review-form.tsx`, `components/media/upload/*` (size/format caps).
- Prisma schema enums: `src/lib/prisma/schema/{user,subscription}.prisma`.

### NEW files read
- `frontend/src/lib/validations/*` (diffed against old: identical except `service.ts` enum shim, `profile.ts:116` (`address` nullable) and `:508-509` (visibility phone/address required), and `index.ts` (no chat/media re-export)).
- `frontend/src/actions/{auth/register,auth/login,profiles/*,services/create-service,services/update-service,reviews/create-review,messages/contact,admin/profiles/{presentation,basic-info},admin/users}.ts`.
- `frontend/src/components/forms/profile/*`, `forms/auth/form-oauth-setup.tsx`, `admin/article-form.tsx`, `messages/messages-container.tsx`.
- Backend serializers: `accounts/serializers/{auth,admin_users}.py`, `profiles/serializers/{profile_updates,admin_profile_serializers}.py`, `services/serializers/service.py`, `reviews/serializers/review.py`, `taxonomy/serializers/taxonomy.py`, `blog/serializers/article.py`, `media/serializers/sign.py`.
- Inline view serializers: `accounts/views/public/{onboarding,oauth_setup,auth}.py`, `support/views/public/support.py`, `messaging/views/public/chats.py`, `billing/views/{public,admin}/billing.py`, `admin_api/views/admin/api_keys.py`, `services/views/{public,admin}/service.py`, `profiles/views/admin/profiles.py`.
- Services: `accounts/services/{registration,auth,account,oauth}.py`, `profiles/services/profile_updates.py`, `taxonomy/services/submissions.py`, `blog/services/articles.py`, `services/services/admin_services.py`, `media/services/cloudinary_signing.py`.
- Models (column caps): `profiles/models/profile.py`, `accounts/models/user.py`, `services/models/service.py`, `blog/models/blog_article.py`, `support/models/contact.py`, `taxonomy/models/*`.
- DRF `fields.py` source (CharField `trim_whitespace` defaults to True).

### Delegated elsewhere
- Payment amounts, coupons, webhooks → billing-payments.md.
- Cron/secret-gated routes (`app/api/cron/*`, `webhooks/*`) → blog-support-media-crons.md / billing.
- Chat query-param bounds → messaging.md D11.

## 2. Validation matrix

Legend: `=` same; **L** = NEW looser (bad data now accepted); **S** = NEW stricter (previously valid input now rejected); **C≠S** = client and server disagree inside NEW. "known → X" = already reported in pass 1. Lengths are characters.

### 2.1 Auth

| Surface / field | OLD client | OLD server | NEW client | NEW server | Flag |
|---|---|---|---|---|---|
| Register email | `min(1)` + `type=email` | zod v4 `z.email()` regex (ASCII, TLD letters ≥2) + better-auth, lowercased | same | DRF `EmailField` (Django EmailValidator: allows `user@localhost`, `[1.2.3.4]`, IDN, `!#$%&*/=?^{|}~` in local part), lowercased | **L** → D3 |
| Register password | 6–100 | better-auth min 8 / max 128; **not trimmed** | 6–100 | 6–100, **trimmed** | min known (auth D6); trim → **D1** |
| Register confirmPassword | must equal | checked in action | must equal | not sent | known (auth D11) |
| Register username (pro) | `^[a-zA-Z0-9_-]*$`, ≤30, ≥3 for pro | plugin 3–30 `[a-zA-Z0-9_-]+`, lowercased | same | `RegexField ^[a-zA-Z0-9_-]{3,30}$`; stored as typed | case known (auth D21) |
| Register username (simple, auto) | — | local part stripped to `[a-zA-Z0-9_-]`; plugin rejects <3 or >30 | — | no length check | known (auth D21) |
| Register displayName | pro required (trim≠'') | none | same | ≤80, pro required (strip) | known (auth D21) |
| Register role | freelancer/company for pro | `role \|\| 'freelancer'` → `userRoleSchema` (any role string) | same | Choice freelancer/company, required for pro | **S** (hardening; old defaulted to freelancer, but the UI always sends a role, so no visible effect) |
| Register consent | array ≥1 | must include `'terms'` | same | list ≥1 (JSON string passes) | known (auth D11) |
| Login identifier | 2–50 | 2–50, must contain '@' | same + '@' | 2–255, email or username | known (auth D20) |
| Login password | 6–100 | 6–100 | ≥6 (action) | 1–255, **trimmed** | **D1** |
| Change password current/new/confirm | each ≥6, new≠current, new=confirm | same + better-auth max 128 | same | each 6–100, **trimmed** | **D1**, **D6** |
| Forgot / resend email | `z.email` | `z.email` | same | `EmailField` | **L** → D3 |
| Reset password | form 8–100 | `passwordSchema` ≥6 + better-auth 8/128 | same | 6–100, trimmed | min known (auth D6) |
| Update account displayName | 5–50 | 5–50 | same | 5–50 (strip) | = |
| Update account image | any | `processImageForDatabase` (https, no blob) | any | stored raw | known (dashboard D12) |
| Change username | 3–30 `[a-zA-Z0-9_-]+`, lowercased, confirm (ci) | same + uniqueness + 30-day cooldown | same | `RegexField` same; lowercased; confirm cs | confirm case known (auth D22) |
| Upgrade to pro | username regex 3–30 + role enum | same | ≥3 + role (action) | `RegexField` + Choice | = |
| OAuth setup (pro) | role **enum**, username regex 3–30, displayName 2–50 | role check (Greek), plugin username rules | role `z.string().min(1)`, default may be `'user'` | Choice role, `RegexField`, displayName ≤80 | known (auth D3) |
| Delete account | username = confirm | same | same | same (strip) | = |

### 2.2 Onboarding

| Field | OLD client | OLD server | NEW client | NEW server | Flag |
|---|---|---|---|---|---|
| image | `onboardingImageSchema` (no blob, https) | same | same | required, no blob, https (view) | = |
| bio | stripped 80–5000 | same | same | raw 20–20000 | known (auth D8) |
| category/subcategory | min 1 | min 1 | same | ≤64, required | = |
| coverage | `coverageSchema` refines | same | same | any JSON | known (auth D8) |
| portfolio | ≤10 cloudinary items | same | same | no max | known (auth D8) |

### 2.3 Profile dashboard tabs (own and admin)

| Tab / field | OLD client | OLD server (user) | OLD server (admin action) | NEW client | NEW server (user and admin share the serializer) | Flag |
|---|---|---|---|---|---|---|
| Basic tagline | '' or 10–100 | same | same | same | '' / null or 10–100 (strip) | = |
| Basic bio | stripped 80–5000 | same | same | same | stripped (untrimmed) 80–5000 | trim known (dashboard D8) |
| Basic category/subcategory | min 1 (Greek) | same | same | same | ≤64, blank → DRF English (Greek `validate_category` unreachable) | → D8 |
| Basic speciality | optional | optional | optional | same | ≤64 | **S** (IDs only, no impact) |
| Basic skills | ≤10 | ≤10 | ≤10 | same | ≤10, each ≤64 | = |
| Additional rate | int ≥0 | int ≥0, `\|\| null` | same | same | int ≥0, 0 stored | 0 known (dashboard D13) |
| Additional commencement | string | string; experience = year − parseInt | same | same | ≤32; same experience math | = (caps INFO, D11) |
| Additional budget | string | string | string | same | ≤64 | INFO (D11) |
| Additional terms | input `maxLength 1000` | string, no max | same | same | ≤4000 | INFO (D11) |
| Additional contact/payment/settlement methods | string[] | string[] (no enum check) | same | same | string[] | = |
| Presentation phone/viber/whatsapp | lenient schema; input `maxLength 10` | **lenient** (`profilePresentationUpdateSchema`) | **`^\d{10,12}$`** (`presentationSchema`) | same | ≤64, any chars | admin **L** → **D4** |
| Presentation website | `z.url()` (any scheme) | same | same | same | `^https?://` prefix only | scheme **S** known (dashboard D3); prefix-only **L** → D7 |
| Presentation socials | per-platform `z.url()`; unknown keys stripped | same | same | same | per-platform `^https?://` prefix; unknown keys kept | keys known (dashboard D15); prefix → D7 |
| Presentation visibility | `{email}`, phone/address optional | default `{email:false}` | default `{email:true}` | phone/address **required** booleans (form always supplies them) | any JSON; default `{email:false,phone:true,address:true}` | known (dashboard D15, admin D10) |
| Billing receipt/invoice | ≥1 | same | same | same | same | = |
| Billing invoice fields | all required if invoice; AFM 9 digits | same | same | same (AFM input maxLength 9) | same + doy/name/profession ≤255, address ≤512 | INFO (D11) |
| Coverage | `coverageSchema` (booleans required; onbase→4 fields; onsite→counties ≥1) | same | same | `address` nullable | same rules via `bool()`, raw dict stored | texts known (D14/D15); truthiness → D10 |
| Portfolio | ≤10 cloudinary items | same | same | same | ≤10, items unvalidated | known (dashboard D15) |
| Verification | afm 1–20, name 2–100, address 5–200, phone 1–50 | same | — | same | same; model afm 16 | known (dashboard D9) |
| AFM lookup | 9 digits | 9 digits | — | same | `^\d{9}$` | = |
| Report profile | description 10–500 | same; name/username any string (incl. '') | — | same | description 10–500; name/username **non-blank** ≤255 | **S** → D9 |

### 2.4 Services

| Field | OLD client (steps/edit) | OLD server create | OLD server draft | OLD server update | NEW server create / update / draft | Flag |
|---|---|---|---|---|---|---|
| title | 10–100 | 10–100 | ≤100 | 10–100 | same (strip); draft blank → `'Untitled'` | draft title known (services D17) |
| description | stripped 80–5000 | same | ≤5000 | 80–5000 | create 80–5000; update ≤5000; draft ≤5000 | update known (services D7) |
| category/subcategory/subdivision | min 1 | min 1 | optional | optional | create required ≤64; else optional | = |
| tags | ≤10 | ≤10 | ≤10 | ≤10 | ≤10, ids ≤64 | = |
| price | int ≤10000 | int ≤10000, fixed→≥5 | int 0–10000 | same as create | same | = |
| duration (empty → ?) | int 0–365 | `\|\| undefined` → 0 OK | `\|\| undefined` → empty OK; min 1 | `Number()\|\|0` → 0 OK | create/update 0–365; draft min 1 receives 0 | draft known (services D2) |
| fixed (missing) | boolean | default `true` | default `true` | only if sent | `=== 'true'` → `false` | = in practice (forms always send it) |
| subscriptionType | 5-value enum | enum, not nullable | enum | enum | Choice, nullable; update drops null | = |
| type refines | presence\|online; presence→onbase\|onsite; online→oneoff\|sub; sub→period | same | none | when sent | same, via `bool()` truthiness | truthiness → D10 |
| addons | ≤3 (step UI), 5–100/10–500/5–5000 €, unique | items validated, **no max** | ≤3, relaxed | items, no max | create/update **≤3**; draft ≤3 | max known (services D24); legacy-data impact → **D2** |
| faq | ≤5, 10–200 / 2–1000, unique | no max | ≤5 | no max | create/update **≤5** | same → **D2** |
| media | ≤10 cloudinary | ≤10 | ≤10 | — (media endpoint ≤10) | ≤10, items unvalidated | known (services D24) |
| report | 10–500 | same | — | — | 10–4000 | known (services D10) |
| Admin edit-basic/taxonomy/pricing/addons/faq/settings | same as owner | edit-* schemas (addons/faq **no max**; status 6-enum) | — | — | `UpdateServiceSerializer` partial (addons ≤3, faq ≤5); status checked against `ServiceStatus` (6 values) | addons/faq → **D2**; pricing empty known (admin D22) |
| Admin status rejectionReason | — | ≤500 (not stored) | — | — | unbounded (not stored) | INFO (D12) |
| Upload size/format | widget: images jpg/jpeg/png/webp; 3 MB avatar, 15 MB portfolio/edit-media, 50 MB create step; maxFiles 10 | signing endpoint signs anything | — | — | identical components; signing endpoint signs anything | = |

### 2.5 Reviews, messaging, support, taxonomy, blog, billing, admin

| Surface / field | OLD client | OLD server | NEW client | NEW server | Flag |
|---|---|---|---|---|---|
| Review rating | Ναι/Όχι → 5/1 | int 1–5 (`parseInt`) | same | action `Number` 1–5; DRF int 1–5 | copy known (reviews D3) |
| Review comment | UI 25–350 counter | ≤350 then trim, '' → null | same | ≤350 after trim | = |
| Review profileId / serviceId | — | cuid / positive int | — | ≤64 / any int (0 → None) | **L** (API-only, INFO) |
| Moderate review notes | — | ≤1000 | — | ≤1000 | = |
| Chat send content | no limit | trim, no limit | same | 1–20000 after trim | known (messaging D11) |
| Chat edit content | ≤5000 (UI) | trim | same | 1–20000 | known (messaging D11) |
| Mark read / batch unread ids | — | none | — | ≤200 ids | INFO (UI sends ≤ page size; batch-unread action unused) |
| Contact form | name 2–50, email, msg 10–500 | same; captcha only if token | same | name 2–255, `EmailField`, msg 10–20000; captcha only if token | limits known (messaging D9); email → D3; captcha = |
| Support feedback | enum 3, 10–500 | same | same | enum 6, 10–20000, `URLField` pageUrl | known (blog-support D4) |
| Taxonomy submission | — | label 2–60 then trim; skill needs category; 5/day | — | trim then 2–60; same refine in service; throttle | trim order: negligible; throttle known (home D3) |
| Admin taxonomy CRUD (tags/skills/service/pro) | slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`, label ≤255, description ≤1000, plural required | same zod in server action | same zod in server action (`createCrudActions` kept) | DRF: no slug regex, slug optional, description ≤4000, plural optional | **L** API-only (the Next action still enforces); duplicate slug known (admin D17) |
| Blog article | title ≤200 ('' allowed for draft); publish → title ≥5, content ≥50, category | same | same | title **non-blank** ≤200; same publish refine; slug ≤300 vs model 255 | **S** → **D5** |
| Checkout | interval month/year, coupon optional | same | same | same | coupon copy known (billing D16) |
| Admin manual subscription | profileId cuid, parseable date | same | same | any string, ISO datetime | INFO |
| Admin user basic-info / create / ban / set password | displayName 5–50, username ≥5, name required on create, banReason ≤500, password ≥6 | same | same | known differences (admin D21); set password **trimmed**, 6–100 | trim → D1 |
| Admin verification notes | ≤1000 | ≤1000 | same | ≤2000 | INFO (D12) |
| Admin API keys | name ≥3, expiresIn 1–365 | same | — | same | = |

## 3. DIFFERENCES (new findings only)

### D1. Passwords are now whitespace-trimmed on the server. Legacy users whose password starts or ends with a space can no longer log in or change their password — HIGH (auth)
- OLD: passwords were never trimmed. `actions/auth/login.ts:22-25` passes `getFormString(formData,'password')` straight into `loginSchema` (no `.trim()`) and on to better-auth. Registration, reset and change-password are not trimmed either. Better-auth hashed and compared the exact string, so `"Nikos1987 "` (a trailing space is common on mobile keyboards after autocomplete) was a valid, stored password.
- NEW: every DRF `CharField` defaults to `trim_whitespace=True` (DRF `fields.py:733,766`), and none of the password fields override it:
  - `accounts/serializers/auth.py`: `LoginSerializer.password` (:16), `RegisterSerializer.password` (:21), `ChangePasswordSerializer.currentPassword/newPassword/confirmPassword` (:46-48), `ResetPasswordSerializer.newPassword` (:63).
  - `accounts/serializers/admin_users.py`: `AdminCreateUserSerializer.password` (:84), `AdminSetPasswordSerializer.newPassword` (:111).
  - Login then verifies the trimmed string against the legacy better-auth bcrypt hash (`services/auth.py:120-140`).
- Impact: an existing user whose password has a leading or trailing space types it exactly as before and gets "Λάθος email ή κωδικός πρόσβασης". They cannot change the password in the dashboard either (the current password is trimmed), so the only way out is "forgot password". New registrations stay self-consistent: a password like `" abc123 "` is silently saved as `"abc123"` (and `" abcde"` now fails the 6-character minimum).
- Fix: add `trim_whitespace=False` to all seven password fields.
- Possibly intentional?: no.
- Live check: the number of affected users can't be queried (the passwords are hashed). Watch login-failure logs after cutover.

### D2. Services with more than 3 addons or more than 5 FAQs (allowed by the old server) can no longer be edited at all — MEDIUM (needs a DB count)
- OLD: neither the owner update schema (`updateServiceInfoSchema`, validations/service.ts:1541-1542: `addons: z.array(formServiceAddonSchema).optional()`, with no `.max`) nor the admin `editServiceAddonsSchema`/`editServiceFaqSchema` (:1718-1788) capped the arrays. The edit form validates with `createServiceSchema` (form-service-edit.tsx:118), which has no max either. Only the create-wizard step limited the counts.
- NEW: `CreateServiceSerializer.addons max_length=3` and `faq max_length=5` (serializers/service.py:183-194), inherited by `UpdateServiceSerializer`, which also backs the admin Addons/FAQ/Basic/Pricing sub-views (views/admin/service.py:67-82). The edit form re-sends `addons` and `faq` on every save (`jsonFields: ['type','tags','addons','faq']`, form-service-edit.tsx:295).
- Impact: for any legacy or Strapi-migrated service with 4+ addons or 6+ FAQs, every owner edit fails with "Μπορείτε να προσθέσετε έως 3 extra υπηρεσίες". That includes a title-only fix, even though the user never touched the addons. Admin edits of those sections fail the same way. Pass-1 services.md D24 noted the new cap but not this impact on existing data.
- DB check: `SELECT count(*) FROM services WHERE jsonb_array_length(coalesce(addons,'[]'))>3 OR jsonb_array_length(coalesce(faq,'[]'))>5;`
- Possibly intentional?: the cap matches the wizard. Breaking edits of existing rows is not intentional.

### D3. Email format validation is looser (Django's validator instead of zod's) on register, forgot/resend, contact and admin user forms — LOW
- OLD: server-side `emailSchema = z.email()` (validations/shared.ts:13). zod v4's pattern (`zod/v4/core/regexes.js:31`) is `^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$`: ASCII only, with a dotted domain and a letter TLD. The register form itself only checks `min(1)` (auth.ts:65), so the server was the real gate. The contact schema is the same.
- NEW: DRF `EmailField` / Django `EmailValidator`. It accepts `user@localhost` (allowlisted), IP-literal domains (`a@[10.0.0.1]`), IDN/Greek-letter domains (punycode-converted), numeric/hyphenated TLDs, and the RFC local-part specials `! # $ % & * / = ? ^ { | } ~` and backtick. Affected endpoints: `RegisterSerializer.email`, `ResendVerificationSerializer`, `ForgotPasswordSerializer` (accounts/serializers/auth.py:20,39,59), `ContactSerializer.email` (support.py:22), and `AdminCreateUserSerializer`/`AdminUpdateBasicInfoSerializer` (admin_users.py:83,116).
- Impact: accounts with undeliverable addresses (for example `x@localhost`) can now be created. They sit in EMAIL_VERIFICATION forever and the verification email bounces. A few addresses old rejected, such as `a!b@site.gr`, now register.
- Fix: add a `RegexValidator` with the zod pattern, or reject domains without a dot.
- Possibly intentional?: no.

### D4. Admin presentation save lost the strict 10–12-digit phone/viber/whatsapp rule — LOW
- OLD: the admin action `actions/admin/profiles/presentation.ts:72` validates with the FORM schema `presentationSchema` (validations/profile.ts:313-347): phone/viber/whatsapp `^\d{10,12}$` or `''`, website `.url()`, socials per-platform URLs. (The pro's own action used the lenient `profilePresentationUpdateSchema`.)
- NEW: `AdminProfilePresentationView` (profiles/views/admin/profiles.py:250-262) reuses the lenient `UpdatePresentationSerializer` (phone/viber/whatsapp any string ≤64, serializers/profile_updates.py:227-236).
- Impact: an admin can now save `"+30 694 123 4567"`, `"abc"` and so on as a pro's phone. Old admin saves of such values failed with "Enter a valid phone number (10-12 digits)". Arguably the old rule blocked admins from saving legacy formatted numbers, so confirm which behaviour is wanted.
- Possibly intentional?: unclear (the new comment at profile_updates.py:217-225 reasons only about the user action).

### D5. Blog admin cannot save a draft with an empty title — LOW
- OLD: `title: z.string().max(200)` (validations/blog.ts:16). An empty string is allowed for drafts, and the min-5 rule runs only for non-draft (:39-50). An empty-title draft got slug `-<base36>` (manage-articles.ts:45).
- NEW: `CreateArticleSerializer.title = CharField(max_length=200)` and `UpdateArticleSerializer.title = CharField(required=False, max_length=200)` (blog/serializers/article.py:43,85). DRF's default `allow_blank=False` rejects `""` with English "This field may not be blank." before the draft branch is reached. The admin form's client schema (identical to old) lets it through, so the client and server disagree.
- Impact: the "Πρόχειρο" save of a not-yet-titled article fails with an English error.
- Fix: `allow_blank=True` on both title fields.
- Possibly intentional?: no.
- Related: the serializer allows a slug of up to 300 characters (:51) but `BlogArticle.slug` is `max_length=255` (models/blog_article.py:21). A 256–300-character slug gives a DB error if the column is varchar(255).

### D6. Change/reset password is capped at 100 characters on the server; old allowed up to better-auth's 128 — LOW / INFO
- OLD: `passwordChangeSchema` has no max (auth.ts:146-170). better-auth's `maxPasswordLength` defaults to 128 (not re-verified in vendored source; oldnext has no node_modules). The reset form caps at 100 client-side.
- NEW: `ChangePasswordSerializer` caps current/new/confirm at 100 (serializers/auth.py:46-48). The change-password form (identical to old) has no client max, so the client and server disagree and the user sees an English error.
- Impact: a user who set a 101–128-character password through old change-password can still log in (login max 255) but cannot change it again.
- Possibly intentional?: no (edge case).

### D7. Server URL checks for website and socials are prefix-only — LOW (the client still blocks)
- OLD: `z.string().url()`. zod v4 `$ZodURL` (schemas.js:187-222) runs `new URL()`, which rejects `"https://"`, `"http://a b"` and similar.
- NEW: `validate_website` / `validate_socials` only test `re.match(r"^https?://", …)` (serializers/profile_updates.py:243-262). So `"https://"`, `"https:// spaces here"` and `"http://<script>"` pass the API. Pass-1 profiles-dashboard D3 already covers the stricter side (new rejects `ftp:`/`mailto:`, and also `javascript:`, which old accepted, so that part is an improvement).
- Impact: API-only bad data. These values are rendered as hrefs on the public profile.
- Fix: use DRF `URLField` (http/https schemes).
- Possibly intentional?: no.

### D8. Greek "Η κατηγορία/υποκατηγορία είναι υποχρεωτική" messages on basic-info are unreachable — LOW
- `UpdateBasicInfoSerializer.category/subcategory = CharField(max_length=64)` (profile_updates.py:33-34). DRF's built-in blank check fires before `validate_category`/`validate_subcategory` (:68-78), so an empty value returns English "This field may not be blank." (shown through the generic English envelope in pass-1 D3).
- Fix: add `error_messages={"blank": …}` as done in `CreateServiceSerializer` (services/serializers/service.py:164-166).
- Admin basic-info uses the same serializer.

### D9. Reporting a profile with an empty display name now fails — LOW
- OLD: `reportProfileSchema.profileName: z.string()` (profile.ts:622-630) accepts `''`.
- NEW: `ReportProfileSerializer.profileName/profileUsername = CharField(max_length=255)` (profile_updates.py:270-273) rejects blank values. The dialog passes the profile's displayName and username as props (report-profile-dialog.tsx:39-68).
- Impact: a legacy pro with a null or empty displayName cannot be reported. The visitor gets an English error.
- Possibly intentional?: no.

### D10. Coverage and service-type flags use Python truthiness instead of real booleans — LOW (API-only)
- OLD: `coverageSchema` requires `online/onbase/onsite: z.boolean()` (profile.ts:113-115), and `serviceTypeConfigSchema` requires booleans.
- NEW: `UpdateCoverageSerializer` uses `bool(data.get("online"))` (profile_updates.py:139-141), and the service `type` refines use `bool(type_cfg.get(key))` (services/serializers/service.py:209-210, 268-269). Strings such as `"false"`, `"0"` or `"no"` count as **true**. The raw dict is stored unchanged, so a later reader that does `=== true` and a reader that does a truthy check disagree.
- Impact: none through the UI, which sends JSON booleans. Malformed API payloads pass validation and are stored with ambiguous flags.
- Fix: `isinstance(v, bool)` checks, or a nested `Serializer` with `BooleanField`s (one exists but is unused: `ServiceTypeField`, service.py:22-28).

### D11. New server-side length caps with no old equivalent — INFO (stricter only at the API or for legacy data)
None of these are reachable through today's UI except with legacy data. Listed so a data check can confirm no existing row exceeds them (a later re-save would fail):
- additional-info: `terms ≤4000` (client 1000), `budget ≤64`, `commencement ≤32`.
- basic-info: `speciality ≤64`, skill ids ≤64.
- presentation: phone/viber/whatsapp ≤64.
- billing: doy/name/profession ≤255, address ≤512.
- services: taxonomy ids and tag ids ≤64.
- reviews: `profileId ≤64`.
- onboarding: `bio` raw HTML ≤20000 (a 5000-visible-character bio with heavy markup could exceed it).
- `CreateReviewSerializer.serviceId` has no positivity check (old `.positive()`). INFO.

### D12. Admin-only loosening — INFO
- Service status `rejectionReason`: old ≤500, new unbounded (neither stores it; views/admin/service.py:155-158).
- Verification `notes`: old ≤1000 (admin.ts), new ≤2000 (admin_profile_serializers.py:28).
- `AdminUpdateProfileSerializer`: tagline ≤500 / bio ≤20000 / any image URL. Old `adminUpdateProfileSchema`: tagline ≤200, bio ≤1000, website `.url()`, experience ≤100. No UI caller found.
- Admin taxonomy DRF serializers lack the slug regex, make slug optional, allow description ≤4000 and make `plural` optional. The Next server actions still run the old zod schemas (`createCrudActions` in frontend/src/actions/admin/{tags,skills,taxonomies,pro-taxonomies}.ts), so only direct API calls are affected.
- `ManualSubSerializer.profileId` accepts any string (old: cuid).

## 3b. Corrections / extensions to pass-1

- **services.md D24** ("NEW server enforces addons ≤3 / faq ≤5; OLD server had no max"): this is accurate, but it understates the impact. Because the edit form re-sends addons/faq on every save, it blocks all edits of legacy over-cap services. See D2 above (MEDIUM, needs a DB count).
- **auth-accounts.md §4** ("Client validation schemas are byte-identical: lib/validations/auth.ts …"): this is true for `lib/validations`. Note that the per-form inline schema in `form-oauth-setup.tsx` did change (role enum → `z.string().min(1)`); auth D3 already covers that consequence. No other inline form schema differs (all `components/forms/profile/*` diffs are non-validation, except the `presentation` visibility defaults already in dashboard D15).
- **auth-accounts.md D21** ("RegisterSerializer.displayName has max 80"): the same 80 cap is also on `OAuthSetupSerializer.displayName` (views/public/oauth_setup.py:27). The client caps at 50, so there is no user impact.
- **auth-accounts.md D6 / SUMMARY "Password min length 8→6"**: when deciding this, also apply D1 (trim). The two together change which passwords are accepted.

## 4. Confirmed same (verified)

- `frontend/src/lib/validations/*` is byte-identical to old apart from the enum shim, `coverageSchema.address` (now `.nullable()`) and the visibility phone/address booleans (the form always supplies them, user and admin).
- The username charset is identical everywhere (register, OAuth setup, change username, upgrade to pro, admin): `[a-zA-Z0-9_-]`, 3–30, lowercased, with case-insensitive uniqueness against User.username. The displayUsername original case is preserved on change-username. There is no reserved-username list in either app.
- Service slug, profile slug (username) and taxonomy slug (Next action regex) rules are unchanged.
- Service create rules are field-for-field (title, description, taxonomy, tags ≤10, price int ≤10000 with fixed→≥5, duration 0–365, type refines, subscription period, addon/FAQ item rules + uniqueness, media ≤10). The draft relaxed rules match except duration (known).
- Profile tagline, bio (stripped), skills ≤10, billing refines (including AFM 9 digits only when invoice), verification lengths, AFM-lookup regex, coverage refine logic, portfolio ≤10 and report-profile description 10–500 are the same.
- Review: rating int 1–5, comment ≤350 (trimmed), and the identical client form (25–350 counter).
- Taxonomy submission: label 2–60 (trim), skill→category required, `pending_<cuid>` ids (≤64 OK).
- Blog: max lengths, status enum (draft/pending/published) and the publish refinement are the same; content is unsanitized in both (admin-only).
- Checkout: interval enum month/year, coupon optional, SubscriptionStatus enum (6 values) for admin status.
- Admin API keys (name ≥3, expiresIn 1–365); user role/type/step enums are identical (6/2/5 values).
- Upload caps: identical client components (formats jpg/jpeg/png/webp; 3 / 15 / 50 MB; maxFiles 10). The signing endpoint signs arbitrary params in both apps (no server-side cap in either). `media-upload-simple.tsx` was dropped, but it had no importer in old.
- reCAPTCHA: verified only when a token is supplied, in both apps.
- Empty-input defaults: additional-info empty → null for commencement/budget/terms and [] for method arrays; portfolio unparsable → [] → stored null; coverage unparsable → validation error; service price empty → 0; create/update duration empty → 0 (valid). These are the same in both apps except the known draft duration (services D2), rate 0 (dashboard D13), admin price (admin D22), speciality ''→null (dashboard D15) and support issueType (blog-support D4).

## 5. Open questions / couldn't verify

- D1: better-auth's exact trim behaviour was confirmed from the old action code (no `.trim()` anywhere on password paths). Whether any real user has a whitespace-padded password can't be determined from hashes. Monitor post-cutover login failures, or temporarily log failed logins where a stripped-vs-raw difference exists (the raw value is available before the serializer).
- D2: needs the DB count query above on production data.
- D6: better-auth `maxPasswordLength` default (128) was not re-verified in vendored source.
- DB column types: models declare varchar caps (Profile.phone 64, afm 16, BlogArticle.slug 255, …) but the comments say Prisma owned the DDL during cutover. Whether production columns are `text` or `varchar(n)` decides whether the D11 caps can also surface as 500s. Check with `\d profiles`, `\d profile_verifications`, `\d blog_articles` on prod.
