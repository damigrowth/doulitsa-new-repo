# Blog / Support / Media-Cloudinary / Emails & Crons parity audit — 2026-11-05

Auditor scope: blog (actions + public UI), support feedback dialog, Cloudinary
signing + upload widgets, GitHub dataset actions, crons (vercel.json), revalidate
webhook, debug/time, email batching + email template parity.
Zero code changes were made. No git commands beyond read-only inspection.

## 1. Coverage

### OLD files read (every one, with role)
- `oldnext/vercel.json` — 3 Vercel crons: process-email-batches `*/15 * * * *`, auto-refresh `0 0 * * *`, worldline-renewals `0 6 * * *` (Vercel cron schedules are UTC).
- `src/actions/blog/get-article.ts` — published article by slug (+ authors with full profile), unstable_cache tags `article:slug`, `blog:articles`, TTL ARTICLE_PAGE=1800s.
- `src/actions/blog/get-articles.ts` — paginated published list (default limit 12, order publishedAt desc, filters category/author/featured/search), related articles (same category, exclude slug, limit 4).
- `src/actions/blog/manage-articles.ts` — admin create/update/delete/list/get, category validation against static dataset, author validation, slug generation `createSlug(title)-base36(ms)`, publishedAt on first publish, `revalidateArticle`.
- `src/app/(blog)/layout.tsx` — HeaderRelative + nav data.
- `src/app/(blog)/articles/page.tsx` — /articles archive: featured hero (page 1), 6-card grid, "Πρόσφατα" compact list, pagination; empty state copy.
- `src/app/(blog)/articles/[slug]/page.tsx` — slug = blog category → category page (3 horizontal cards, "Πρόσφατα", "Δείτε Ακόμα"), else article page (breadcrumb, header, TOC, content, "Δημοσιεύθηκε από", "Σχετικά Άρθρα"), metadata/OG, ArticleSchema.
- `src/app/(blog)/articles/sitemap.ts` — published articles sitemap (updatedAt).
- `src/components/blog/*` (12 files: article-card, article-content, article-header, article-toc, author-box, blog-pagination, blog-section-header, category-badge, compact-article-row, featured-article-hero, horizontal-article-card, index) — diffed vs new.
- `src/constants/datasets/blog-categories.ts`, `src/lib/utils/blog.ts`, `src/lib/validations/blog.ts`, `src/lib/types/blog.ts`, `src/lib/seo/schema/article-schema.tsx`, `src/lib/cache/revalidation.ts` (revalidateArticle), `src/lib/cache/config.ts` (TTL values) — supporting.
- `src/actions/support/submit-feedback.ts` — validates, requireAuth, emails admin via `sendSupportFeedbackEmail`; no DB write.
- `src/lib/validations/support.ts` — enum problem|option|feature; description 10..500.
- `src/lib/email/services/admin-emails.ts` (`sendSupportFeedbackEmail`), `src/constants/email/templates/support-feedback.ts`, `src/constants/email/email-config.ts` (all 16 configs: to/from/replyTo/subject), `src/lib/email/workflow-config.ts`, `src/lib/email/providers/brevo/workflows.ts` (triggerWorkflow → Brevo transactional w/ sender, replyTo, text, tag).
- `src/lib/email/services/message-emails.ts`, `src/constants/email/templates/unread-messages.ts` — unread digest.
- `src/components/dashboard/support-feedback-dialog.tsx` — dialog UI.
- `src/actions/cloudinary/get-media-library-token.ts` — admin-only Media Library signature.
- `src/app/api/sign-cloudinary-params/route.ts` — any logged-in user; signs `body.paramsToSign`; returns `{signature}`.
- `src/components/media/upload/*` (cloudinary-upload-widget, gallery-upload, index, media-upload, media-upload-simple, profile-image-upload, resource-preview, cloudinary-next.txt) + `src/components/media/cloudinary-media-picker.tsx`, `src/lib/utils/media.ts` (uploadFileToCloudinary / generateUploadFormData), `src/lib/utils/cloudinary.ts`.
- Upload call-sites (folder/preset/size): form-account, form-onboarding (x2), form-portfolio, form-service-edit-media, service steps/media-step, admin edit-service-media-form, admin edit-user-image-form.
- `src/actions/github/operations.ts` — Octokit helpers (branch, file content, dataset files diff, createCommit, recent commits, commits-ahead, latest SHA) used by `actions/admin/git-operations.ts` for the old admin “edit taxonomies → commit dataset files to damigrowth/nextjs” workflow. `src/lib/github/client.ts` (DATASET_FILES: service-taxonomies, pro-taxonomies, skills, tags).
- `src/app/api/cron/auto-refresh/route.ts` — **POST only**, Bearer CRON_SECRET; bumps refreshedAt+sortDate for published services of active promoted subs; revalidates services/archive tags.
- `src/app/api/cron/process-email-batches/route.ts` — GET, Bearer CRON_SECRET; per-user unread digest with EmailBatch dedupe.
- `src/app/api/webhooks/revalidate-cache/route.ts` — Vercel deploy webhook; HMAC-SHA1 when secret set; skip preview; `revalidateAllCaches()`; GET variant with `?secret`.
- `src/app/api/debug/time/route.ts` — temporary unauthenticated TZ debug endpoint.
- `src/actions/admin/revalidate-caches.ts` — diffed (identical in new).

### NEW files read
- Backend blog: `apps/blog/services/articles.py`, `views/public/article.py`, `views/admin/article.py`, `urls/public.py`, `urls/admin.py`, `serializers/article.py`, `models/blog_article.py`, `constants.py`, `admin.py`; `config/urls.py` mounts.
- Backend SEO: `apps/core/views/public/sitemaps.py` (`SitemapEntriesView kind=articles`).
- Frontend blog: `src/actions/blog/{get-article,get-articles,manage-articles}.ts`, `src/lib/api/blog.ts`, `src/app/(blog)/**` (diffed), `src/components/blog/*` (diffed), `src/constants/datasets/blog-categories.ts`, `src/lib/types/blog.ts`, `src/lib/cache/revalidation.ts` (`revalidatePublicBlog`), admin articles create/[id] pages (category source).
- Support: `apps/support/views/public/support.py`, `urls.py`, `models/contact.py`, `admin.py`; `apps/messaging/emails.py` (all builders), `apps/messaging/tasks.py`; frontend `src/actions/support/submit-feedback.ts`, `src/lib/api/support.ts`, `src/components/dashboard/support-feedback-dialog.tsx` (diffed).
- Media: `apps/media/services/cloudinary_signing.py`, `views/public/sign.py`, `urls/{public,admin}.py`, `serializers/sign.py`, `models/media.py`; `common/utils/cloudinary.py`; `apps/accounts/permissions/roles.py` (IsAdmin); frontend `src/app/api/sign-cloudinary-params/route.ts`, `src/actions/cloudinary/get-media-library-token.ts`, `src/lib/api/media.ts`, `src/components/media/**` (diffed), `src/lib/utils/media.ts` (diffed).
- Crons/webhooks: `config/settings/base.py` (CELERY_BEAT_SCHEDULE, TIME_ZONE, email settings), `apps/services/tasks.py`, `apps/services/views/public/cron.py`, `apps/messaging/views/public/cron.py`, frontend `src/app/api/cron/{auto-refresh,process-email-batches}/route.ts`, `src/app/api/webhooks/revalidate-cache/route.ts`; `docker-compose.yml` (celery-beat), `DOKPLOY.md`/`DEPLOY-doulitsa-test.md` (beat command).

### Delegated elsewhere
- `src/app/api/cron/worldline-renewals/route.ts`, `src/app/api/webhooks/worldline/route.ts`, `src/app/api/webhooks/worldline/advice/route.ts` → payments/billing domain (cron disabled intentionally per instructions; but see Open Q3 about the DB-scheduler row).
- `src/actions/admin/git-operations.ts` + admin taxonomy/dataset UI → admin domain (functionality superseded by Django-DB taxonomies, intentional).
- Admin article list/editor UI (`components/admin/article-form.tsx`, admin-articles-*) → admin domain; I only verified the category-slug source because it feeds D1.
- Contact form (`/api/support/contact`, CONTACT_ADMIN/CONTACT_CONFIRMATION emails), profile/service report emails, auth emails (verification/welcome/reset), review emails, new-profile/service-created/published, subscription-payment emails → owning domains (auth, contact, reviews, profiles, services, billing). I list a subject/from/reply-to cross-check in D6 so owners can confirm.
- Upload call-site forms (profile, portfolio, service media) → profiles/services domains; folder/preset/size props verified identical here.

## 2. Mapping (old → new)

| Old | New frontend | New Django | Notes |
|---|---|---|---|
| `getArticles` | `actions/blog/get-articles.ts#getArticles` → `lib/api/blog.listArticles` (Data Cache 300s, tag `blog:articles`) | `GET /api/blog/articles` → `services/articles.list_published_articles` (Redis `blog:list:*` 30 min) | |
| `getRelatedArticles(cat, slug, 4)` | `getRelatedArticles` (ignores cat arg) | `GET /api/blog/articles/<slug>/related` → resolves article, `get_related` | |
| `getArticle(slug)` | `getArticle` (404→data null) | `GET /api/blog/articles/<slug>` (Redis `blog:article:{slug}` 60 min) | missing `updatedAt` (D5) |
| `create/update/deleteArticle`, `listArticlesAdmin`, `getArticleAdmin` | `actions/blog/manage-articles.ts` + `revalidatePublicBlog` | `/api/admin/blog/articles[/<id>]` (BLOG view/edit/full perms) | category validation mismatch (D1) |
| `(blog)/articles` pages + sitemap | same files (only `revalidate=3600` → `force-dynamic`), sitemap via `/api/seo/sitemap-entries?kind=articles` | | |
| `submitFeedback` | `actions/support/submit-feedback.ts` → `POST /api/support/feedback` | `FeedbackView` → Contact row + `send_contact_admin_email` | D3, D4 |
| `getMediaLibraryToken` | `actions/cloudinary/get-media-library-token.ts` | `POST /api/admin/media/cloudinary/media-library-token` (IsAdmin) | same |
| `/api/sign-cloudinary-params` | Next proxy route (forwards Cookie/Authorization) | `POST /api/sign-cloudinary-params` (+ `/api/media/sign-cloudinary-params`) IsAuthenticated | same |
| `actions/github/operations.ts` | none | none | intentional (taxonomies in Django DB) |
| cron `process-email-batches` (*/15 UTC) | Next proxy route (GET) | `/api/cron/process-email-batches` + beat `messaging-process-email-batches` `crontab(minute="*/15")` | D2 |
| cron `auto-refresh` (0 0 UTC, POST-only) | Next proxy (GET+POST) | `/api/cron/auto-refresh` + beat `services-auto-refresh-promoted` `crontab(0,0)` Europe/Athens | D7, D8 |
| cron `worldline-renewals` | proxy | disabled in beat (intentional) | delegated |
| webhook `revalidate-cache` | same route (POST now fails closed w/o secret) | — | D10 |
| `api/debug/time` | none | none | intentional removal (file said "DELETE once verified") |
| — | — | beat `accounts-cleanup-pending-registrations` hourly | new-only (auth domain) |

Every old cron has a new home; **no old cron is missing**.

## 3. DIFFERENCES

### D1. Blog category slugs out of sync between frontend and Django → admin cannot save articles in 5 categories; old category URLs 404 — HIGH
- OLD: one dataset `oldnext/src/constants/datasets/blog-categories.ts` with slugs `dimiourgia-periechomenou`, `eyexia-frontida`, `marketingk`, `technika`, `ypostirixi` (+8 others). Used both for admin validation (`manage-articles.ts:27-29,105-107` `getBlogCategoryBySlug`) and for routing `/articles/[slug]` (`[slug]/page.tsx:44,90`).
- NEW frontend: `frontend/src/constants/datasets/blog-categories.ts:20-32` renamed them to `dimiourgia-periexomenou`, `eveksia-frontida`, `marketing`, `texnika`, `ypostiriksi` (comment claims a SQL migration rewrote `blog_articles.categorySlug`). The admin create/edit pages feed this list to the form (`app/(admin)/admin/articles/create/page.tsx:14`, `[id]/page.tsx:21`).
- NEW backend: `backend/apps/blog/constants.py:11-25` still holds the OLD slugs; `services/articles.py:260,311` rejects anything else with `Invalid category: <slug>`.
- Impact: (a) Creating an article in Δημιουργία Περιεχομένου / Ευεξία & Φροντίδα / Μάρκετινγκ / Τεχνικά / Υποστήριξη fails with "Invalid category: marketing" etc.; editing any existing article in those categories fails too (the form always resubmits categorySlug). (b) If the DB really was migrated to new slugs, everything else works; if it was NOT, those categories' public pages are empty and `resolveCategoryLabel` returns null for those articles. (c) Old indexed URLs `/articles/marketingk`, `/articles/technika`, … are no longer categories → fall through to article lookup → 404; no redirects exist (grep of frontend/next.config/middleware found none).
- Fix: update `backend/apps/blog/constants.py` to the frontend slugs (and confirm the DB rows were rewritten; add 301s old→new slug for `/articles/<old>`).
- Possibly intentional?: the slug rename is intentional (comment), but the backend not following it is a bug.

### D2. Unread-messages digest shows the 15 OLDEST new messages instead of the 15 NEWEST; subject copy changed — MEDIUM
- OLD: messages fetched `orderBy createdAt desc` (`cron/process-email-batches/route.ts:78`); template does `messages.slice(0, 15).reverse()` (`templates/unread-messages.ts:61,172`) → the 15 most recent, displayed oldest-first. Subject `Έχεις 1 αδιάβαστο μήνυμα - Doulitsa` / `Έχεις N αδιάβαστα μηνύματα - Doulitsa` (`email-config.ts:237-246`). From `Doulitsa <noreply@doulitsa.gr>`. Explicit text part (`UNREAD_MESSAGES_TEXT`).
- NEW: `apps/messaging/tasks.py:87-94` builds previews from `reversed(new_messages)` (oldest-first, full list), then `emails.py:363` takes `previews[:15]` → the 15 oldest. Subject `Νέο Μήνυμα — Doulitsa` / `Νέα Μηνύματα — Doulitsa` (`emails.py:358,391`). Body texts ("Γεια σου {name}!", "Έλαβες … τα τελευταία λεπτά.", "Δες τα Μηνύματά σου", "... και N ακόμη …", 120-char truncation, HH:MM Athens) match.
- Impact: users with >15 new unread messages see stale messages and miss the latest; subject line differs from production.
- Fix: take `new_messages[:15]` then reverse (or `previews[-15:]`); restore old subject strings.
- Possibly intentional?: no.

### D3. Support feedback email: different subject, content, sender, no Reply-To, wrong tag — MEDIUM
- OLD (`admin-emails.ts:293-360`, `email-config.ts:176-184`, `templates/support-feedback.ts`): to `ADMIN_EMAIL||contact@doulitsa.gr`; from `Admin Doulitsa <noreply@doulitsa.gr>`; **replyTo = reporter email**; subject `${issueTypeLabel} από ${reporterName}` with labels problem→"Αναφορά Προβλήματος", option→"Προσθήκη μιας νέας επιλογής", feature→"Πρόταση νέας δυνατότητας"; body "Νέα Φόρμα Υποστήριξης / Αναφοράς", Είδος Ζητήματος, Περιγραφή, reporter ID / Όνομα / Email / Username, link "Προβολή Αναφέροντα στο Admin →" (`/admin/users/{id}`), page URL, date (el-GR); Brevo tag `support_feedback`. reporterName = displayName || username || 'Unknown User'. pageUrl fallback `${APP_URL}/dashboard`.
- NEW (`apps/support/views/public/support.py:93-106` → `emails.send_contact_admin_email` `emails.py:151-158`): generic contact template "Νέο μήνυμα επικοινωνίας"; subject `[Doulitsa] Επικοινωνία: Feedback: problem` (raw enum value, no Greek label); body only name/email/subject/description + `page: <url>`; no user ID, username, admin link or date; from = `DEFAULT_FROM_EMAIL` (no "Admin Doulitsa" name); **no Reply-To**; tag `contact-admin`. Name fallback display_name || email (not username). Empty pageUrl → "page: " (no /dashboard fallback).
- Impact: admin can't hit Reply to answer the user; can't tell issue type in Greek or jump to the user in admin; Brevo stats mix feedback with contact-form.
- Fix: dedicated `send_support_feedback_email` porting the old template/subject/labels/replyTo/tag.
- Possibly intentional?: no.

### D4. Support feedback: extra DB write + loosened validation + different success/error texts — LOW
- OLD: no persistence (email only); server Zod enum `problem|option|feature`, description 10..500 (`validations/support.ts`), error 'Μη έγκυρα δεδομένα αναφοράς'; success message 'Η αναφορά σας υποβλήθηκε επιτυχώς. Θα την εξετάσουμε άμεσα.'; email failures swallowed (always success).
- NEW: also creates a `Contact` row (`support.py:93-99`) so feedback shows up among contact-form messages; serializer accepts `bug|question|other` too and description up to 20000 (`support.py:31-35`); frontend action defaults missing issueType to 'other' (`actions/support/submit-feedback.ts:12`); `pageUrl` must be a valid URL (old any string); success 'Ευχαριστούμε για την αναφορά' (dialog shows its own static "Η αναφορά σας υποβλήθηκε επιτυχώς!" so not user-visible); if Celery broker is down `.delay()` raises after the Contact row is saved → user gets an error although it was stored.
- Impact: UI dialog still enforces 10..500 client-side (same schema, `zodResolver(supportFormSchema)`), so mostly API-level. Contact admin list gets feedback rows (possibly useful).
- Possibly intentional?: the persistence likely yes (comment "so admins see it on the same dashboard"); validation widening no.
- Dialog UX changes (neutral 10-char hint, always-active button, errors after attempt) are intentional — not reported.

### D5. Article detail payload lacks `updatedAt` (and `status`) → JSON-LD `dateModified` missing — LOW
- OLD: `getArticle` returns full Prisma row incl. `updatedAt`; `[slug]/page.tsx:244` passes `updatedAt` to `ArticleSchema` → `dateModified` (`article-schema.tsx:64-65`).
- NEW: `services/articles.py:80-84` detail = `_public_card` + content + authors; `_public_card` has no `updatedAt`. ArticleSchema silently omits `dateModified`.
- Impact: SEO structured data regression on every article page.
- Fix: add `"updatedAt"` (and `status`) to the detail payload.
- Possibly intentional?: no (comment at :100 mirrors card select, but detail used the full model).

### D6. Global email sender/Reply-To/subject drift across all transactional emails — MEDIUM (cross-domain; owners please confirm)
- OLD: each config sets `from` (`Admin Doulitsa <noreply@doulitsa.gr>` for admin mails, `Doulitsa <noreply@doulitsa.gr>` for user mails), Reply-To for CONTACT_ADMIN/SERVICE_REPORT/PROFILE_REPORT/SUPPORT_FEEDBACK (= reporter/sender email) and CONTACT_CONFIRMATION (`contact@doulitsa.gr`), plus a hand-written text part (`email-config.ts:83-246`).
- NEW: `emails.send_email` (`emails.py:84-106`) never sets `from_email` (uses `DEFAULT_FROM_EMAIL` = env `BREVO_SENDER_EMAIL`, default `noreply@example.com`) nor `reply_to`; text part is tag-stripped HTML. All bodies use the generic `_layout`.
- Subject differences found (old → new): CONTACT_ADMIN `Νέα Φόρμα Επικοινωνίας - {email}` → `[Doulitsa] Επικοινωνία: {subject}`; CONTACT_CONFIRMATION `Λάβαμε το μήνυμα σου!` → `Λάβαμε το μήνυμά σου — Doulitsa`; VERIFICATION `Επαληθεύστε το email σας - Doulitsa` → `Επαλήθευση του email σου — Doulitsa`; WELCOME `Καλώς ήρθες στο Doulitsa, {name}!` → `Καλώς ήρθες στη Doulitsa`; PASSWORD_RESET `Επαναφορά κωδικού πρόσβασης - Doulitsa` → `Επαναφορά κωδικού — Doulitsa`; NEW_PROFILE `Νέο Επαγγελματικό Προφίλ - {name} ({email})` → `Νέο προφίλ - {name} - από {email}`; NEW_VERIFICATION `Νέο Αίτημα Πιστοποίησης - {displayName} ({email})` → `[Doulitsa] Νέο αίτημα επαλήθευσης`; SUBSCRIPTION_PAYMENT `{label} - {profileName} ({email}) - {amount}` → `{label}: {name} — {amount}`; SERVICE_REPORT `Αναφορά Υπηρεσίας - {title}` → `[Doulitsa] Επικοινωνία: Αναφορά υπηρεσίας: {title}` (sent through contact-admin builder, `services/views/public/service.py:121-131`); UNREAD_MESSAGES see D2; SUPPORT_FEEDBACK see D3. Matching: SERVICE_CREATED, SERVICE_PUBLISHED, NEW_REVIEW, REVIEW_APPROVED.
- Impact: admins replying to contact/report/feedback mails reply to noreply; inbox filters keyed on old subjects break; if `BREVO_SENDER_EMAIL` unset, Brevo rejects sends from example.com.
- Possibly intentional?: partly (templates were simplified during port) — but parity rule says differences are bugs.

### D7. Auto-refresh now actually runs daily; old prod never ran it via Vercel — MEDIUM (possibly intentional?)
- OLD: `cron/auto-refresh/route.ts` exports **only `POST`**; Vercel crons invoke with **GET** → 405 every night. No other caller found in the repo. Effectively promoted services were never auto-bumped on production.
- NEW: Celery beat `services-auto-refresh-promoted` (`base.py:327-330`) calls `auto_refresh_promoted` (`services/tasks.py:19-48`) daily; Django cron view + Next proxy accept GET and POST.
- Impact: in the new stack, every published service of an active promoted subscriber gets `refreshedAt/sortDate = now` nightly → those services jump to the top of sortDate-ordered archives every day. That is the *intended* feature (feature-gate "auto-refresh") but a visible ranking change versus what prod users actually saw.
- Possibly intentional?: yes, likely (it is the documented intent of the old code) — needs product confirmation.

### D8. Auto-refresh schedule time & cache invalidation & response shape — LOW
- OLD: `0 0 * * *` in Vercel = 00:00 UTC (02:00/03:00 Athens); revalidates `collections.services` + `archive.all` tags immediately; response `{refreshed, profiles}`.
- NEW: `crontab(minute=0, hour=0)` with `CELERY_TIMEZONE=Europe/Athens` (`base.py:52,312,329`) = 00:00 Athens (21:00/22:00 UTC); comment at `base.py:315-316` wrongly asserts Vercel used Athens time. `queryset.update()` fires no signals and no frontend tag revalidation → archive/home reflect the bump only after Data Cache TTL (≤5 min) / `core:home` (5 min). Response `{refreshed}` only (no `profiles`).
- Same for process-email-batches (*/15 — timezone irrelevant).
- Possibly intentional?: no (time) / acceptable (cache, ≤5 min).

### D9. Blog detail cache not purged for the OLD slug on slug rename — LOW
- OLD: detail cache tagged `blog:articles`; any mutation revalidates that tag (`revalidation.ts:282`) → old-slug entry dropped.
- NEW: `_purge_cache` (`services/articles.py:375-383`) deletes only `blog:article:{new slug}` + `blog:list:*`. After a slug change, `blog:article:{old slug}` stays in Redis for up to 60 min, so the old URL keeps serving the article (the frontend tag revalidation refetches from Django, which returns the stale Redis copy). TTLs also differ: detail 60 min vs old 30 min; list 30 min vs old 60 min (both purged on writes).
- Fix: purge the previous slug in `update_article` (capture before assigning).

### D10. revalidate-cache webhook: POST fails closed, GET still open without secret; nothing calls it on Dokploy — LOW
- OLD: both POST and GET skip auth when `REVALIDATE_CACHE_WEBHOOK_SECRET` is unset.
- NEW: `frontend/src/app/api/webhooks/revalidate-cache/route.ts:40-44` POST rejects 401 when secret unset; GET (`:106-123`) still revalidates everything unauthenticated when the secret is unset. Dokploy has no Vercel deploy webhook, so this route is effectively dead unless wired manually; Django Redis caches (blog 30/60 min, profile/service page caches) survive redeploys and are not flushed by it.
- Possibly intentional?: POST hardening yes; GET inconsistency no.

### D11. Blog list API: `page<=0` / non-integer → 500 — LOW
- OLD: Prisma skip negative → error → page shows empty state.
- NEW: `views/public/article.py:17-18` `int()` on raw params; `page=0` → negative slice → AssertionError 500; non-numeric → ValueError 500. Public pages clamp with `Math.max(1, …)`, so only direct API callers / `?page=abc` (NaN) hit it; UI result (empty state) is the same as old.

## 4. Confirmed same
- Public list: status=published, order `-published_at`, default limit 12, filters category/author/featured/search (title OR titleNormalized icontains, raw term), response `{articles,total,totalPages,hasMore}`, card fields incl. nested authors ordered by `order`.
- Related: same category, exclude current slug, published, `-published_at`, limit 4; not called when article has no category.
- Detail: published-only, 404 otherwise; author detail fields (authorBio, subcategory, rating, reviewCount).
- Admin CRUD: permissions view/edit/full, category + author-existence validation messages, slug `createSlug(title)-base36(ms)` or verbatim, titleNormalized, publishedAt only on first publish, ""→null coercions, authors replaced when `authorProfileIds` provided, Greek refinement messages (title ≥5, content ≥50, category required unless draft), max lengths 200/300/500, admin list order `-created_at`, limit 20.
- Public blog UI: layout, archive page (featured hero only page 1, 6-card grid, "Πρόσφατα", pagination), category page (3 horizontal + "Πρόσφατα" + "Δείτε Ακόμα"), article page (breadcrumb Άρθρα → category, TOC, "Δημοσιεύθηκε από", "Σχετικά Άρθρα"), metadata/OG, empty-state Greek copy, all 12 blog components (only change: `authors?.[0]` null-safety). Sitemap: published, `-updated_at`, `/articles/{slug}`.
- Cache invalidation on admin writes: frontend `revalidatePublicBlog` (`article:slug`, `blog:articles`) + Django Redis purge.
- Support dialog: same fields/labels/login-register gate/success screen; captures `window.location.href`; client Zod schema identical; auth required (401 vs redirect).
- Cloudinary: sign endpoint auth (any logged-in user), signs arbitrary `paramsToSign`, returns `{signature}`; media-library token admin-only `{signature,timestamp,apiKey,cloudName}` signing `{timestamp}`; all upload components and `lib/utils/media.ts` upload/sign logic identical; call-site folders (`users/{username}/profile|portfolio|services/{id}|services/media`, admin `users/{userId}/services/{id}`), presets (`doulitsa_profile_images`, `doulitsa_new`), size caps (3MB avatar, 15MB portfolio/service edit, 50MB service create media-step), widget formats jpg/jpeg/png/webp, maxFiles 10 — all identical. Neither stack deletes assets from Cloudinary.
- Email batching logic: every user with unread non-deleted messages from others, dedupe vs all previous EmailBatch.messageIds, batch row with ids+count, 15-min cadence, preview truncation 120 chars, sender fallback "Χρήστης", Athens HH:MM, overflow line, dashboard link `/dashboard/messages`. (New records the batch only when the send succeeds — old recorded it even on failure; improvement, LOW, possibly intentional.)
- auto-refresh selection: active + promoted subs → their published services → refreshedAt = sortDate = now; CRON_SECRET bearer guard.
- `revalidateAllCaches` action identical.
- GitHub actions: no counterpart; superseded by Django-DB taxonomies (intentional).
- `api/debug/time`: removed (old file was marked temporary). `media-upload-simple.tsx`, `cloudinary-next.txt`, and old admin `edit-user-image-form.tsx` were unused/dead in old (no importers).

## 5. Open questions / couldn't verify
1. **DB state of blog categorySlug** — whether the SQL rewrite to new slugs was actually applied to the production/test `blog_articles` table (no migration file in repo). Determines D1(b) severity.
2. **Shared latent bug (both stacks)**: `cloudinary-upload-widget.tsx:281-285` posts `JSON.stringify(paramsToSign)` (unwrapped) while both old route and new serializer require `{paramsToSign}` → widget-mode *signed* uploads fail in both. Gallery/direct uploads wrap correctly. Not a parity difference; flagging for awareness.
3. **django-celery-beat DatabaseScheduler (`-S django`)** syncs entries *from* `CELERY_BEAT_SCHEDULE` into DB but does not delete/disable rows removed from the dict. If any earlier deploy registered `billing-process-worldline-renewals`, that PeriodicTask row may still be enabled and firing (double billing risk the settings comment warns about). Verify in Django admin → Periodic tasks. The comment at `base.py:320-321` ("they regenerate from this dict") is misleading. (Payments owner.)
4. Sign-cloudinary proxy forwards only the browser cookie; if the `dj_access` cookie is expired and no refresh happens in this path, uploads fail with "Failed to get upload signature" (old better-auth session was long-lived). Not tested at runtime.
5. Whether `BREVO_SENDER_EMAIL` / `ADMIN_EMAIL` are set on Dokploy (default sender `noreply@example.com`) — env not visible.
6. No runtime tests were executed (static audit only).
