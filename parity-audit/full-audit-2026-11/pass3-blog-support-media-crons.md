# Blog / Support / Media / Emails & Crons — PASS 3 re-audit — 2026-11-05

Fresh old-vs-new comparison of the blog-support-media-crons.md domain. Dedupe
rule applied: everything in SUMMARY.md, the 11 pass-1 reports and the 8 pass-2
reports (incl. pass2-copy-sweep D1 + its 2 corrections, pass2-routes-urls,
pass2-payload-contracts D1 author picker, pass2-validation D5 empty-title
draft, billing D10, messaging D3/D4) is NOT repeated. Zero code changes; no git
commands. Two read-only live probes were made against the test stack
(`test.doulitsa.gr`, `api-test.doulitsa.gr`) and one against old prod
(`doulitsa.gr`) — all anonymous GETs with no side effects.

## 1. Coverage

### OLD files read (re-derived scope)
- `vercel.json` (3 crons, UTC).
- Blog: `actions/blog/{get-article,get-articles,manage-articles}.ts`, `app/(blog)/{layout,articles/page,articles/[slug]/page,articles/sitemap}.tsx|ts`, `components/blog/*` (12), `constants/datasets/blog-categories.ts`, `lib/validations/blog.ts`, `lib/types/blog.ts`, `lib/utils/blog.ts`, `lib/cache/revalidation.ts#revalidateArticle`, `lib/cache/keys.ts#ArticleCacheKeys`, `lib/prisma/schema/blog.prisma`, admin `app/(admin)/admin/articles/page.tsx`, `components/admin/{article-form,admin-articles-table-section,admin-articles-filters}.tsx`.
- Support: `actions/support/submit-feedback.ts`, `lib/validations/support.ts`, `components/dashboard/support-feedback-dialog.tsx`.
- Media/Cloudinary: `app/api/sign-cloudinary-params/route.ts`, `actions/cloudinary/get-media-library-token.ts`, `components/media/**` (picker, upload widget, gallery, media-upload, profile-image-upload, resource-preview, index, media-upload-simple, cloudinary-next.txt), `lib/utils/{media,cloudinary}.ts`, `lib/types/cloudinary.ts`, `lib/prisma/json-types.ts#cloudinaryResourceSchema`, `lib/prisma/schema/media.prisma` (Media model — no reader/writer anywhere in old), every `signed=` upload call-site (8).
- Emails (mechanics — **missed by pass 1**): `lib/email/{index,constants,workflow-config,auth-integration}.ts`, `lib/email/providers/brevo/{client,workflows,types,index}.ts`, `lib/email/services/{admin,contact,message,review,service,index}-emails.ts`, `constants/email/email-config.ts` (all to/from/replyTo), all 16 `constants/email/templates/*.ts` (link/recipient/newline handling only — copy is known), `lib/prisma/schema/email.prisma`, `user.prisma#lastUnreadEmailSentAt`; every old email call-site (22, grep `send*Email(`).
- Crons/webhooks: `app/api/cron/{auto-refresh,process-email-batches}/route.ts`, `app/api/webhooks/revalidate-cache/route.ts`, `app/api/debug/time/route.ts`, `actions/github/operations.ts`, `lib/github/client.ts`.

### NEW files read
- Backend: `apps/blog/{services/articles.py,views/public/article.py,views/admin/article.py,serializers/article.py,constants.py,models/blog_article.py}`, `apps/core/views/public/sitemaps.py`, `apps/support/views/public/support.py`, `apps/media/{services/cloudinary_signing.py,views/public/sign.py,serializers/sign.py,urls/*}`, `common/utils/cloudinary.py`, `common/authentication.py`, `apps/accounts/permissions/{admin,roles}.py`, `apps/accounts/models/user.py#save`, `apps/messaging/{emails.py,tasks.py,views/public/cron.py,models/chat.py#EmailBatch}`, `apps/services/{tasks.py,views/public/cron.py,services/admin_services.py,services/service_writes.py#_notify_service_submitted}`, `apps/billing/views/public/billing.py#WorldlineRenewalsCronView`, `apps/reviews/services/review_ops.py` (email triggers), `apps/profiles/services/verification.py#report_profile`, `apps/services/views/public/service.py#ReportServiceView`, `config/settings/base.py` (REST auth classes, SIMPLE_JWT, Celery, email, CLOUDINARY), `config/urls.py`, `docker-compose.yml`, `DEPLOY-doulitsa-test.md`, `DOKPLOY.md`.
- Frontend: `actions/blog/*`, `lib/api/{blog,media,support,admin}.ts`, `app/(blog)/**` (diff), `components/blog/*` (diff), `components/admin/article-form.tsx` (diff = identical), `components/media/**` (diff), `lib/utils/media.ts` (diff), `actions/support/submit-feedback.ts`, `components/dashboard/support-feedback-dialog.tsx` (diff), `actions/cloudinary/get-media-library-token.ts`, `app/api/{cron/*,webhooks/revalidate-cache,sign-cloudinary-params}/route.ts`, `middleware.ts` (matcher), `vercel.json`, `lib/cache/revalidation.ts#revalidatePublicBlog`.

### Delegated elsewhere
- Worldline webhooks/renewals cron → billing; auth email triggers (verify/welcome/reset) → auth; review/service/profile email trigger conditions → reviews/services/profiles (checked only that each old call-site has a new one — all 22 do); Brevo list management → lib-shared/state-machines; `app/api/verify-email` → auth.

## 2. Mapping (deltas vs pass 1 only)

| Old | New | Note |
|---|---|---|
| Brevo REST `POST /v3/smtp/email` (`brevo/client.ts`), tag = workflow enum value | anymail `sendinblue` backend, `msg.tags=[EMAIL_TAGS[..]]` | N3 |
| Vercel cron → `Authorization: Bearer $CRON_SECRET` | Django cron views (+ Next proxies) behind DRF default auth classes | N1 |
| All 22 old `send*Email` call-sites | 1:1 `.delay()` call-sites found (`grep` in §1) | recipients identical (admin = `ADMIN_EMAIL‖contact@doulitsa.gr`) |

## 3. DIFFERENCES (new findings only)

### N1. The HTTP cron endpoints can never authenticate: SimpleJWT swallows the `Bearer <CRON_SECRET>` header — MEDIUM (ops; latent while beat runs)
- OLD: Vercel cron calls `/api/cron/process-email-batches` (and the others) with `Authorization: Bearer ${CRON_SECRET}`; the route compares the header itself (`cron/process-email-batches/route.ts:20-29`). That is the ONLY way the old crons ran.
- NEW: `ProcessEmailBatchesCronView`, `AutoRefreshCronView` (`apps/{messaging,services}/views/public/cron.py`) and `WorldlineRenewalsCronView` (`billing/views/public/billing.py:400-424`) are `AllowAny` but inherit `DEFAULT_AUTHENTICATION_CLASSES` (`config/settings/base.py:221-229`), which include `rest_framework_simplejwt.authentication.JWTAuthentication` with `AUTH_HEADER_TYPES=("Bearer",)` (:285). DRF runs authentication in `APIView.initial()` before the handler, so any `Bearer <non-JWT>` header raises `InvalidToken` → 401 before the view's own `CRON_SECRET` check is reached. The correct secret (`openssl rand -hex 16`, per DEPLOY doc) is never a JWT, so it is rejected too.
- Live proof (test stack, through the Next proxy): `GET /api/cron/auto-refresh` with `Authorization: Bearer not-the-secret` → `401 {"error":{"code":"token_not_valid","message":"{'detail': ErrorDetail(string='Given token not valid for any token type'…"}}` (SimpleJWT), while the same request with no header → `401 {"error":"Unauthorized"}` (the view). Different body = the view never ran.
- Impact: unread-digest and auto-refresh can ONLY run via celery-beat. Any external scheduler / manual ops trigger / Vercel-style cron (the documented `CRON_SECRET` path, and the proxies' stated purpose "so existing Vercel cron config keeps firing") fails. If the Dokploy `celery-beat` app is down or not deployed, there is no working fallback and nothing alerts (beat failures are silent). Response is also `text/plain` from the proxies.
- Fix: `authentication_classes = []` on the cron views (keep `permission_classes=[AllowAny]` + the secret check). WARNING: applying it to `WorldlineRenewalsCronView` turns billing D10's hazard live — leave that view as is or remove its route.
- Possibly intentional?: no (code + docstrings expect the header to reach the view).

### N2. Admin cannot remove an article's cover image (null is silently dropped on update) — MEDIUM
- OLD: `coverImage: cloudinaryResourceSchema.nullable().optional()` (`validations/blog.ts:28`); `updateArticle` does `data.coverImage = updateData.coverImage || null` (`manage-articles.ts:132`) → removing the image in the picker clears it.
- NEW: the form is identical — `CloudinaryMediaPicker` remove calls `onChange(null)` (`components/media/cloudinary-media-picker.tsx:132`) and the form submits `coverImage: null`. But `UpdateArticleSerializer.to_internal_value` returns `{k: v for k, v in data.items() if v is not None}` (`apps/blog/serializers/article.py:98-100`), so `coverImage` never reaches `update_article` (`services/articles.py:318-331`). Response is success, toast "Το άρθρο ενημερώθηκε επιτυχώς", image stays.
- Impact: once an article has a cover image it can only be replaced, never removed; the public card/hero/OG image keep showing it.
- Fix: exclude `coverImage` (any field where null means "clear") from the None-filter, e.g. keep keys present in `self.initial_data`.
- Possibly intentional?: no.

### N3. Brevo statistics tags changed for every transactional email — LOW
- OLD: `triggerWorkflow` tags each send with the workflow enum value, except two overrides (`brevo/workflows.ts:36-42`, enum `types.ts:160-183`): verification/welcome/reset → `user_registration` (all three, `auth-integration.ts`); contact-admin AND contact-confirmation → `contact_admin` (`contact-emails.ts:75`); `service_published`, `new_verification`, `service_report`, `profile_report`, `support_feedback`, `unread_messages`, `review_approved`, `subscription_payment`, `new_profile`; only `service-created` and `new-review` used the hyphenated `EMAIL_TAGS`.
- NEW: `emails.py:23-38` uses hyphenated per-email tags (`email-verification`, `password-reset`, `welcome`, `contact-admin`, `contact-confirmation`, `verification-request`, `unread-messages`, `service-published`, `review-approved`, `subscription-payment`, `new-profile`, …).
- Impact: Brevo dashboard stats/filters/saved reports keyed on the old tags stop accumulating at cutover; history and new data don't line up. (Pass 1 D3 noted only the support-feedback tag.)
- Possibly intentional?: maybe (new follows the old `EMAIL_TAGS` constant the old code mostly ignored). Confirm with whoever reads Brevo stats.

### N4. Every unread digest rewrites the recipient's `users` row (`lastUnreadEmailSentAt` + `updatedAt`) — LOW
- OLD: the cron writes only an `email_batches` row (`process-email-batches/route.ts:114-121`); `User.lastUnreadEmailSentAt` exists in the schema but nothing sets it, and the user row is untouched.
- NEW: `tasks.py:111-112` `user.save(update_fields=["last_unread_email_sent_at","updated_at"])` after each send. That goes through `User.save()` (`accounts/models/user.py:187-212`, the journey auto-advance hook) and bumps `updated_at`.
- Impact: admin Χρήστες table "Updated" column (sortable, `admin-users-data-table.tsx:105-115`) shows the last digest time instead of the last real account change, every 15 min for active chatters; sorting by Updated becomes meaningless. Side effect: a user stuck at `EMAIL_VERIFICATION` with `email_verified=true` gets silently auto-advanced/confirmed by a digest.
- Fix: `User.objects.filter(pk=…).update(last_unread_email_sent_at=now)` (or drop it — nothing reads it).
- Possibly intentional?: no.

### N5. Duplicate article slug → unhandled 500 instead of an error message — LOW
- OLD: Prisma unique violation is caught and returned as `{success:false, error: error.message}` (`manage-articles.ts:79-85,174-180`) → toast shows the reason.
- NEW: `BlogArticle.slug unique=True`; `create_article`/`update_article` (`services/articles.py:273-283,313-345`) don't catch `IntegrityError` and `common/exceptions.py` has no handler → 500; admin sees the generic error toast. Same for a slug >255 chars (serializer allows 300, model 255 — the length half is known pass2-validation D5).
- Fix: catch `IntegrityError` → `ApiError("Το slug χρησιμοποιείται ήδη", 409)`.
- Possibly intentional?: no.

### N6. Plain-text part of every email is run-together and shows raw HTML entities — LOW (extends known lib-shared D5 "text = stripped HTML")
- OLD: hand-written `*_TEXT` twins with line breaks for every admin/user email except welcome/verification/reset (Brevo derived those).
- NEW: `send_email` body = `_TAG_RE.sub("", html)` (`emails.py:92-95`): no newline per `<p>`/`<br>`/`<tr>`, entities not unescaped. E.g. contact-admin text reads `Νέο μήνυμα επικοινωνίαςΑπό: Name &lt;a@b.gr&gt;Θέμα: …`; every email ends `…Ή αντίγραψε τον σύνδεσμο: https://…Doulitsa · Αυτό το μήνυμα…` on one line; digest previews merge into one paragraph.
- Impact: text-only clients/previews (and spam scoring) see garbled text.
- Fix: `html2text`-style conversion (block tags → `\n`, `html.unescape`), or Brevo-side auto text.

## 4. Corrections to earlier reports

- **C1 — messaging.md D3 ("OLD Brevo attributes USER_NAME/UNREAD_COUNT … NEW: no Brevo attributes") and pass2-copy-sweep §5 (Brevo automations may depend on attribute names):** the old transactional path never sent attributes. `triggerWorkflow`'s subject/message branch builds `sendTransactionalEmail({to, sender, subject, htmlContent, textContent, replyTo, tags})` only (`brevo/workflows.ts:31-64`); `data.attributes` is ignored, and no `params` are sent. So no transactional email ever carried attributes and "no attributes" in NEW is not a regression. Only list-management (contact create/update) sends attributes. Also old `to.name` = the email address (callers never pass `name`).
- **C2 — billing-payments.md D10 hazard ("if the frontend is ever deployed on Vercel with CRON_SECRET, that GET would run the full renewal path"):** currently false. The Bearer header is rejected by SimpleJWT before `WorldlineRenewalsCronView` runs (N1, live-verified). The hazard becomes real only if N1 is "fixed" on that view. The beat-row / DatabaseScheduler part of D10 stands.
- **C3 — blog-support-media-crons.md "Confirmed same: auto-refresh … CRON_SECRET bearer guard":** wrong in effect. The guard code matches, but no request can reach it (N1).
- **C4 — blog-support-media-crons.md Open Q1 (DB state of blog `categorySlug`):** resolved for TEST. Live `api-test.doulitsa.gr/api/blog/articles?limit=50` returns 15 articles: tips 7, symvoules 5, anakoinoseis 1, nea 1, **marketingk 1** (`digital-marketing-odigos-gia-arxarious`). Every new-slug query (`marketing`, `texnika`, `ypostiriksi`, `eveksia-frontida`, `dimiourgia-periexomenou`) returns 0. The SQL rewrite the frontend comment claims was NOT applied. Live effects of D1(b):
  - `test.doulitsa.gr/articles/marketing` shows "Δεν υπάρχουν άρθρα σε αυτή την κατηγορία.";
  - `/articles/marketingk` → 404 (old prod: 200);
  - the article page shows "Μάρκετινγκ" 4× vs 7× on old prod (category badge/breadcrumb unresolved).
  
  Before choosing a D1 fix direction, check prod.
- **C5 — blog-support-media-crons.md Open Q4 (sign proxy forwards only the cookie; expired `dj_access` → failed uploads):** moot. All 8 upload call-sites in both stacks pass `signed={false}` (form-account, form-onboarding ×2, form-portfolio, form-service-edit-media, media-step, admin edit-service-media-form, old admin edit-user-image-form). `generateUploadFormData` only calls the signature endpoint when `signed` is true (`lib/utils/media.ts:794`), so `/api/sign-cloudinary-params` has no live caller. Open Q2's "widget signed uploads broken in both" is likewise unreachable. Note also that `/api/*` is excluded from the token-refresh middleware matcher (`middleware.ts:21`), which would matter if signing were ever enabled.

## 5. Re-verified same (pass-1 "Confirmed same" items re-checked from code)

- Public list/related/detail queries, filters, ordering, defaults, response keys. Old `unstable_cache` keys include the call args, so search/featured were never mis-cached in old.
- Admin CRUD: permission levels view/edit/full (support has blog full in both), category/author validation texts, slug rule, publishedAt-on-first-publish, ""→null coercions, author replace semantics, list order/limit, `status=all` handling. Admin list page/filters/table-section are byte-identical.
- Blog pages/components: identical except force-dynamic and `authors?.[0]`. Sitemap: published, `-updated_at`.
- Revalidation: new `revalidatePublicBlog` + Django purge cover what old `revalidateArticle` tags/paths did. Old path revalidation isn't needed because the pages are now dynamic.
- Support: dialog diff = only the intentional UX change. Server action → `POST /support/feedback` (IsAuthenticated).
- Media Library token: admin-only in both (`role==='admin'` vs `IsAdmin`), same `{signature,timestamp,apiKey,cloudName}`, signs `{timestamp}`.
- Cloudinary persistence:
  - Old Zod `cloudinaryResourceSchema` strips unknown keys.
  - New `sanitize_resource` whitelist is near-equivalent. New drops folder/etag/signature/metadata/batch_id/upload_status and keeps `duration`. None of these are read by UI components.
  - Neither stack ever deletes Cloudinary assets. The old `Media` table is unused in both.
- Email recipients/triggers: every old `send*Email` call-site has a new `.delay()` counterpart. All admin mails go to `ADMIN_EMAIL‖contact@doulitsa.gr` and user mails go to the same user.
- Unread digest selection/dedupe (all-time EmailBatch ids), sender fallback, the 120-char truncation, and Athens HH:MM all match. The old route accepted `Bearer undefined` when `CRON_SECRET` was unset; new fails closed (improvement).
- Auto-refresh selection (active+promoted → published services, refreshedAt=sortDate=now). New also sets `updated_at`. That only matters under the known D7 product decision, since old never ran.
- Revalidate-cache webhook: only the known POST fail-closed delta.

## 6. Open questions

1. Is the Dokploy `celery-beat` app actually deployed and running on prod? With N1 it is the only trigger for digests and auto-refresh.
2. Prod `blog_articles.categorySlug` values: run the same check as C4 against prod before the D1 fix.
3. Installed `django-anymail` version: `pyproject.toml` pins `>=12.0` with `EMAIL_BACKEND = anymail.backends.sendinblue`. Confirm the deprecated `sendinblue` alias still exists in the deployed version. The local `.venv` is empty, so this couldn't be verified here.
