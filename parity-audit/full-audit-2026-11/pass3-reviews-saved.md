# Reviews & ratings + Saved/favorites — pass 3 (fresh re-audit) — 2026-11-05

Dedupe baseline: SUMMARY.md, reviews-saved.md (D1–D11), pass2-schema-db.md (C1: Prisma FKs survive the restore, so saving a non-existent id silently no-ops), pass2-state-machines.md (2.5, NEW-D7), pass2-caching-matrix.md, pass2-validation-matrix.md, pass2-copy-sweep.md, admin.md (D16). Nothing below repeats those findings.

Method: every old file in scope was re-read in full. Every old/new UI file at the same path was diffed. All backend `apps/reviews/**` and `apps/saved/**` files were read, plus every place outside those apps that touches `Review` / `SavedService` / `SavedProfile` / rating columns.

## 1. Coverage

### OLD files read
- `src/actions/reviews/create-review.ts`: createReview, plus canUserReview (unused).
- `src/actions/reviews/update-rating.ts`: profile/service denormalized rating (2 dp) and reviewCount.
- `src/actions/reviews/get-review-stats.ts`: live totals and 1 dp average.
- `src/actions/reviews/get-reviews.ts`: public profile/service/other-services lists, author fields from the User row, image from the author's Profile.
- `src/actions/reviews/get-user-reviews.ts`: all 7 dashboard reads.
- `src/actions/reviews/moderate-review.ts`: unused moderate/pending.
- `src/actions/reviews/toggle-review-visibility.ts`: owner toggle.
- `src/actions/reviews/index.ts`: barrel.
- `src/actions/saved/toggle-save.ts`, `get-saved-items.ts`, `get-saved-state.ts`, `index.ts`.
- `src/actions/admin/reviews.ts`: all of it (updateReviewStatus, deleteReview, toggleAdminReviewVisibility, updateReviewStatusAction, stats). Read for the lifecycle; the admin UI belongs to the admin domain.
- `src/lib/validations/review.ts`, `src/lib/prisma/schema/review.prisma`, `saved.prisma`, `src/lib/database/selects/saved.ts`, `src/lib/types/reviews.ts`, `src/lib/types/saved.ts`, `src/lib/utils/rating.ts`, `src/lib/providers/saved-state-provider.tsx`.
- `src/lib/email/services/review-emails.ts`, `admin-emails.ts` (`sendNewReviewEmail`), `src/constants/email/templates/review-approved.ts`, `email-config.ts` (REVIEW_APPROVED / NEW_REVIEW entries). Checked recipient and trigger only.
- Account/name sources, read for the author-name semantics:
  - `src/lib/auth/config.ts` (Google `mapProfileToUser`)
  - `src/actions/auth/oauth-setup.ts`
  - `src/actions/auth/update-account.ts`
  - `src/actions/auth/complete-onboarding.ts` (displayName lines)
- UI:
  - `components/review/*`: all 10.
  - `components/dashboard/reviews/*`: all 19.
  - `components/dashboard/saved/saved-pagination.tsx`, `components/dashboard/menu-saved.tsx`.
  - `components/shared/{save-button,breadcrumb-buttons,rating-display,service-card}.tsx`.
  - `components/archives/{archive-profile-card,archive-service-card}.tsx`.
  - `app/(dashboard)/dashboard/{reviews,saved}/page.tsx`.
  - The review/breadcrumb portions of `app/(profile)/profile/[username]/page.tsx` and `app/(service)/s/[slug]/page.tsx`, `actions/profiles/get-profile.ts` (reviews and breadcrumbButtons), `actions/services/get-service.ts` (reviews, breadcrumbButtons, archive card transform).
  - `lib/seo/schema/{profile,service}-schema.tsx` (aggregateRating).

### NEW files read
- frontend:
  - `actions/reviews/*` (7), `actions/saved/*` (4).
  - `lib/api/{reviews,saved}.ts`, `lib/api/client.ts` (buildUrl, error envelope, 401 retry).
  - `lib/taxonomies/enrich.ts`.
  - Every same-path UI file above, diffed. Only `service-card.tsx` (known D4), auth-session plumbing, and the dead `dashboard-review-card.tsx` differ.
  - Both page files and `seo/schema/*`.
- backend:
  - `apps/reviews/{admin.py, signals.py, models/review.py, serializers/review.py, services/review_ops.py, services/recalculate_ratings.py, selectors/review_reads.py, views/public/reviews.py, views/admin/reviews.py, urls/*}`
  - `apps/saved/{admin.py, models/*, serializers/saved.py, services/toggle.py, selectors/saved_reads.py, views/public/saved.py, urls.py}`
  - `apps/messaging/{tasks.py, emails.py}` (review tasks)
  - `apps/profiles/selectors/profile_reads.py` (summary/card serializers), `profile_aggregations.py` (page bundle), `apps/profiles/signals.py`
  - `apps/services/selectors/service_reads.py` (page bundle, `_card`), `apps/services/signals.py`
  - `apps/accounts/services/{oauth,google_oauth,registration}.py` (name/display_name)
  - `apps/admin_api/views/admin/notifications.py`
  - grep sweep for every other `Review.objects` / rating writer (only seed commands and admin counts)

### Delegated elsewhere
- Admin review UI and actions → **admin**. N2 and N3 are reported here because they change the review lifecycle; admin may want to co-own them.
- Email HTML/copy → **emails / copy-sweep**. Recipients and triggers were re-verified (§4).

## 2. Mapping
Unchanged from reviews-saved.md §2. Re-verified line by line; no mapping gaps found.

## 3. NEW DIFFERENCES

### N1. `/dashboard/saved` shows an error page for malformed, zero, or >100 page/limit URL params, where old fell back to defaults — LOW
- OLD: `get-saved-items.ts:59-62`: `params?.servicesPage || 1`, `params?.servicesLimit || 12` (same for profiles). The page's `parseInt('abc')` gives `NaN`, and `NaN` or `0` falls back to 1 / 12. Any positive limit is accepted, so `?servicesLimit=200` renders 200 cards.
- NEW:
  - The page is byte-identical and still sends `parseInt(...)`.
  - `buildUrl` serialises `NaN` as the string `"NaN"` (`frontend/src/lib/api/client.ts:434-437`). `SavedListQuerySerializer` (`backend/apps/saved/serializers/saved.py:13-16`) requires an integer with `min_value=1`, `max_value=100`. So `?servicesPage=abc`, `?servicesPage=0`, `?profilesLimit=0` and `?servicesLimit=200` all return a 400.
  - `getSavedItems` turns this into `{success:false, error}` (`actions/saved/get-saved-items.ts:56-59`). The page then renders the red error card with DRF's generic message (English "One or more fields are invalid.", see lib-shared D3) instead of the list.
- Impact: hand-edited or truncated links break the whole saved page, both tabs. The UI's own selector offers only 12/24/48, so normal navigation is unaffected.
- Fix hint: either sanitise in the action (`Number.isFinite(n) && n > 0 ? n : default`), or make the serializer fall back to defaults instead of rejecting. Keep the 100 cap only if intended.
- Possibly intentional?: the cap maybe; the error page no.

### N2. Pending reviews never appear in the admin notifications feed (status literal `"PENDING"`) — LOW (new-only feature defect)
- OLD: no live feed. The old notifications page was a hard-coded mock (pass2-copy-sweep D3), so there is nothing to keep parity with.
- NEW: `backend/apps/admin_api/views/admin/notifications.py:126` runs `Review.objects.filter(status="PENDING")`. Review statuses are lowercase (`ReviewStatus.PENDING = "pending"`, `reviews/models/review.py:27`), and `reviews.status` is still the PG enum `"Status"` (pass2-schema-db D3). The query therefore raises DataError (invalid enum input), or matches nothing if the column is TEXT. In both cases the surrounding `except Exception: pass` (line 140) swallows it. The pending-services block just above correctly uses `"pending"`.
- Impact: the feed's "Αξιολόγηση προς έλεγχο" items never show, so admins get no notification-feed signal for reviews awaiting moderation. The admin new-review email still goes out. On Postgres the failed statement is harmless because `ATOMIC_REQUESTS=False`.
- Fix hint: `status=ReviewStatus.PENDING`.
- Possibly intentional?: no (typo).

### N3. `/django-admin/` Review edits and deletes bypass the moderation side effects — LOW (new-only surface; possibly intentional)
- OLD: every status change and delete went through `updateReviewStatus` / `deleteReview` (`actions/admin/reviews.ts:195-376`). Those sync `published` with `status`, recalculate profile/service rating and reviewCount across the approved boundary, and email the owner on a change into approved.
- NEW: `apps/reviews/admin.py` registers a plain `ModelAdmin` for Review. Editing `status`/`published` there, or bulk "delete selected" (a queryset delete), skips all of that (`review_ops.moderate_review` / `admin_delete_review`). Only the cache-purge signal fires, and not even that on a bulk delete, which sends no per-object signals. The same applies to `SavedService` / `SavedProfile` admin, which only matters for counts.
- Impact: a superuser editing a review in Django admin leaves `profiles.rating` / `reviewCount` stale (cards, sort order, JSON-LD aggregateRating) until the next real moderation on that profile. The pro also gets no approval email. Per pass2-authz D-notes, only `is_superuser`-level admins can do this.
- Fix hint: make `status`, `published` and `rating` read-only in `ReviewAdmin`, or override `save_model` / `delete_model` / `delete_queryset` to call `review_ops`.
- Possibly intentional?: possibly. Django admin is a support back door, but it is still a way to put ratings out of sync that old did not have.

## 4. Corrections to earlier reports

- **reviews-saved.md D1: the impact is understated. The same root cause also changes the public review cards (profile and service pages), not just the dashboard.**
  - OLD public lists select `author{id,name,displayName,username}` from the **User** row (`get-reviews.ts:29-36,135-142,238-246`).
  - NEW `_card` takes `displayName`/`username` from the author's **Profile** (`review_reads.py:272-278`). `ReviewCard` renders `displayName || name || username` (`components/review/review-card.tsx:14-18`).
  - Cases where the public card now shows a different name:
    - (a) **Legacy Google simple users.** Old `mapProfileToUser` set `User.name` = Google full name (`lib/auth/config.ts:177`). The user's chosen `displayName` was written at oauth-setup without touching `name` (`oauth-setup.ts:83-93`). Such a reviewer now appears publicly under their **Google real full name** instead of the display name they chose. That is a mild privacy regression. New signups are unaffected because `oauth.py:71-72` syncs `name`.
    - (b) **Pro reviewers whose Profile.displayName was changed via admin profile edit** (`admin/profiles.ts:268`, which does not sync User). They show the Profile name instead of the User name.
  - The D1 fix (source `displayName`/`username` from `User`, keep `image` from Profile) covers both, so this is a correction to the scope, not a new fix.
- **pass2-state-machines 2.5 / reviews-saved §4 "the moderation used by admin matches": still true. One nuance to record:** old ran the update and the rating recalculations without a transaction (`admin/reviews.ts:228-277`). New wraps them in `transaction.atomic()` (`review_ops.py:183-193`). This is stricter; a failed recalc now rolls the status back. Not a bug.
- No pass-1 "confirmed same" claim was proven wrong (see §5).

## 5. Re-verified same (fresh check of each pass-1 claim)
- **Create gates and order:**
  - The order is: auth, then profile exists (`'Το προφίλ δεν βρέθηκε'`), then ≥1 service of any status, then serviceId required, then no self-review, then the service belongs to the profile, then one review per author+profile+service.
  - Old `create-review.ts:75-151` and new `review_ops.py:38-84` match line for line, apart from the known D7 copy and transport status codes.
  - There is no order or chat prerequisite in either app.
  - The type is always SERVICE, because a serviceId is always required in both.
- **Stored on create:** pending, `published=false`, `visibility=false` (Prisma default and Django default agree). The comment is trimmed with empty stored as NULL; legacy `''` is D9. Success text and `id` match. The form shows the same 25–350 counter.
- **Notifications:** the admin gets NEW_REVIEW on create (`_admin_email()`, subject `Νέα Αξιολόγηση για {displayName||username}`). The **profile owner** gets REVIEW_APPROVED only when the status changes into `approved`; the recipient is `profile.user.email` and the subject is `Νέα Αξιολόγηση!`. The body logic matches (rating==5 sentiment, comment block plus "make it public" prompt, /dashboard/reviews button). Sign-off is a known copy-sweep item.
- **Moderation:**
  - Statuses are pending/approved/rejected, and `published = (status == approved)`.
  - Recalculation runs only when the status changes **and** one side is approved. approved→approved does nothing and sends no email.
  - Admin delete recalculates only if the review was approved+published. Admin visibility toggle does no recalculation.
- **Rating math:**
  - Aggregates count approved+published only, ignore visibility, store 2 dp, and write 0 with no reviews. `review_count` is updated alongside; `stars` is never written.
  - Page stats are live with 1 dp (half-even ties are known D6; recomputed: 4.25→4.2 new vs 4.3 old, and 4.625 stored 4.62 vs 4.63).
  - Recalc `.save()` bumps `updated_at` in both (Prisma `@updatedAt`), so the effect on recent/default sort is the same.
- **Public lists:**
  - approved+published+visibility filter for both rows and count, ordered createdAt desc.
  - Page bundles use limits 10/10/5; the service list sets `service:null`.
  - Other-services excludes the current sid. Old's `where.sid.not = exclude` overwrites `not:null`, but SQL `<>` drops NULLs, so the result is the same as new's `isnull=False` + exclude, with total = returned length.
  - Author image comes from the author's Profile.
  - ReviewsContainer props are identical on both pages, and `profileServices` = published services.
  - JSON-LD `aggregateRating` uses the same denormalized `rating`/`reviewCount` (identical schema components).
- **Visibility toggle:** owner-only (profile.user), approved+published only, plain flip, no recalc. The UI switch shows only for status=approved. The texts are known D2.
- **Dashboard:**
  - Received section and share link only for role freelancer/company; page `isPro` = `type==='pro'`.
  - Page size 3; params `r_page/g_page/rec_page/g_rec_page`, with `Number(x)||1`.
  - Positive = 5, negative = 1. All lists are approved+published only, and the with-comments lists require a non-null comment (D9 for `''`).
  - The given cards use `reviewedProfile` from the reviewed Profile; that shape is the same in old.
  - Given lists now carry `author.image` (old `null`), which no component renders.
- **Saved toggle:**
  - Delete if it exists, otherwise create; returns `{isSaved}`.
  - Service id is parsed as int, and a bad id gives `'Invalid service ID'`.
  - Optimistic UI with revert; logged-out users get the auth dialog; own items hide the button (`ownerId` = `profile.user_id` on every card and on both breadcrumb bundles).
  - A non-existent id silently no-ops (known C1).
- **Saved state:** id sets, `Number()`-coerced service ids, empty for anonymous or on error. The provider and layout mount are identical.
- **Saved page:**
  - Identical page and pagination, createdAt desc, 12 by default with options 12/24/48.
  - Tab counts are all rows; with the restored FKs (C1) these equal the rendered cards.
  - No status filtering in either app.
  - Profile cards resolve taxonomyLabels, skills, speciality and coverage like old. Service cards resolve profile coverage like old; the badge and online/onsite sources are known D4, and the profile-card PII is known D5.
- **Archive service card:** profile rating/reviewCount are carried in both (`get-services.ts:617-618` vs `service_reads._card:193-194`).
- **Cache:** the Review signal purges `profile:page:{username}`, `service:page:{sid}` and `core:home`. Recalcs use `.save()`, so the Profile/Service signals purge too. The frontend toggle and moderate actions revalidate public tags (architecture is intentional; there is no purge gap beyond what the caching matrix already records).

## 6. Open questions
- Whether any legacy Google simple users actually have `users.name <> users."displayName"`. This sizes the D1 correction. Check with `select count(*) from users where type='user' and provider='google' and name is distinct from "displayName";`.
