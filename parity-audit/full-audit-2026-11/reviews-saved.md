# Reviews & ratings + Saved/favorites parity audit — 2026-11-05

## 1. Coverage

### OLD files read (every one)
Actions — `oldnext/src/actions/reviews/`
- `create-review.ts` — `createReview` (form action: validation, eligibility gates, pending insert, admin email, tag revalidation) + `canUserReview` (eligibility probe, unused by UI)
- `update-rating.ts` — `updateProfileRating` / `updateServiceRating` (denormalized rating 2dp + reviewCount, approved+published, visibility ignored)
- `get-review-stats.ts` — `getProfileReviewStats` / `getServiceReviewStats` (live totals, average 1dp)
- `get-reviews.ts` — `getProfileReviews` / `getServiceReviews` / `getProfileOtherServiceReviews` (public lists: approved+published+visibility, createdAt desc, author image from author's Profile)
- `get-user-reviews.ts` — dashboard reads: total received, given list, received stats, received-with-comments, given stats, given-with-comments, received list
- `moderate-review.ts` — `moderateReview` (guarded approve/reject; **no callers in old app**) + `getPendingReviews` (**no callers**)
- `toggle-review-visibility.ts` — owner-only visibility toggle (approved+published only)
- `index.ts` — barrel

Actions — `oldnext/src/actions/saved/`
- `toggle-save.ts` — toggle save/unsave service|profile
- `get-saved-items.ts` — `/dashboard/saved` data (paginated, createdAt desc, card transforms)
- `get-saved-state.ts` — id sets for heart state
- `index.ts` — barrel

Supporting (read for exact behaviour)
- `src/lib/validations/review.ts` — zod schemas + Greek messages
- `src/lib/database/selects/saved.ts` — `SAVED_SERVICE_INCLUDE` / `SAVED_PROFILE_INCLUDE`
- `src/lib/prisma/schema/review.prisma`, `saved.prisma` — defaults, FKs and cascades
- `src/lib/types/reviews.ts` — `ReviewWithAuthor`, `DashboardReviewCardData`
- `src/lib/utils/rating.ts` — formatRating / labels
- `src/lib/providers/saved-state-provider.tsx` — client saved-state cache
- `src/actions/admin/reviews.ts` lines 195-380 (`updateReviewStatus`, `deleteReview`): read to check the moderation state machine, since this is the path the admin UI really uses
- `src/lib/email/services/review-emails.ts`, `src/lib/email/services/admin-emails.ts` (`sendNewReviewEmail`), `src/constants/email/templates/review-approved.ts`, `new-review.ts` (header fields only)
- `src/actions/auth/register.ts` lines 125-160 (User.name = User.displayName at signup)

UI
- `components/review/index.ts`, `rating-stars.tsx`, `review-card.tsx`, `review-form.tsx`, `review-stars.tsx`, `review-stats-enhanced.tsx`, `review-success.tsx`, `reviews-container.tsx`, `simple-rating-display.tsx`
- `components/review/review-stats.tsx`: **dead code** in old (no importers)
- `components/profile/profile-rating.tsx`: **dead code** in old (no importers)
- `components/dashboard/reviews/*`: all 19 files (`dashboard-review-card.tsx` (**dead code**, no importers), `dashboard-review-card-skeleton.tsx`, `given-recommendations-section.tsx`, `given-review-card.tsx`, `given-reviews-async.tsx`, `given-reviews-section.tsx`, `given-reviews-summary-card.tsx`, `index.ts`, `received-reviews-async.tsx`, `received-reviews-section.tsx`, `recommendations-section.tsx`, `reviews-container.tsx`, `reviews-empty-state.tsx`, `reviews-pagination.tsx`, `reviews-section-skeleton.tsx`, `reviews-summary-card.tsx`, `share-review-link-async.tsx`, `share-review-link.tsx`)
- `app/(dashboard)/dashboard/reviews/page.tsx`, `app/(dashboard)/dashboard/saved/page.tsx`
- `components/dashboard/saved/saved-pagination.tsx`, `components/dashboard/menu-saved.tsx`
- `components/shared/save-button.tsx`, `components/shared/breadcrumb-buttons.tsx` (save toggle part), `components/shared/rating-display.tsx`, `components/shared/service-card.tsx`
- `components/shared/profile-card.tsx`: **dead code** in old (no importers)
- `components/archives/archive-profile-card.tsx` (SaveButton / rating usage only)
- `app/(profile)/profile/[username]/page.tsx` and `app/(service)/s/[slug]/page.tsx`: the `<ReviewsContainer>` and breadcrumb-button props only

### NEW files read
- `frontend/src/actions/reviews/*` (all 7), `frontend/src/actions/saved/*` (all 4)
- `frontend/src/lib/api/reviews.ts`, `frontend/src/lib/api/saved.ts`, `frontend/src/lib/api/admin.ts` (adminReviews), `frontend/src/lib/api/client.ts` (ApiError / envelope)
- `frontend/src/lib/taxonomies/enrich.ts` (enrichProfileCard / enrichServiceCard)
- `frontend/src/actions/auth/server.ts` (session shape: role/type)
- Every new UI file at the same path as the old one, all diffed against old (results in §4). Missing in new: `components/review/review-stats.tsx`, `components/profile/profile-rating.tsx`, `components/shared/profile-card.tsx` (all dead in old, so no impact)
- `backend/apps/reviews/`: `models/review.py`, `services/review_ops.py`, `services/recalculate_ratings.py`, `selectors/review_reads.py`, `serializers/review.py`, `views/public/reviews.py`, `views/admin/reviews.py`, `urls/public.py`, `urls/admin.py`, `signals.py`, migrations 0001/0002
- `backend/apps/saved/`: `models/*`, `services/toggle.py`, `selectors/saved_reads.py`, `serializers/saved.py`, `views/public/saved.py`, `urls.py`, migrations 0001/0002
- `backend/apps/profiles/selectors/profile_reads.py` (`serialize_profile_summary`), `profile_aggregations.py` (page bundle: reviews / reviewStats / breadcrumbButtons), `profiles/services/profile_updates.py` (`ensure_profile_exists`), `accounts/services/oauth.py` (profile only for PRO)
- `backend/apps/services/selectors/service_reads.py` (page bundle review part)
- `backend/apps/messaging/tasks.py` and `emails.py` (`send_new_review_email`, `send_review_approved_email`)
- `backend/common/exceptions.py` (error envelope)

### Delegated elsewhere
- `oldnext/src/actions/admin/reviews.ts`, `app/(admin)/admin/reviews/**`, `components/admin/admin-review*.tsx`, `admin-reviews-*.tsx`: **admin** domain. I read the status/delete logic only, and it matches (see §4).
- Email templates and full HTML parity of NEW_REVIEW / REVIEW_APPROVED: **emails** domain. Side note: the new templates interpolate `comment` / `service_name` into HTML without escaping. The old templates did the same, so this is not a parity gap.
- The rest of the profile page and service page bundles, including the profile-page `breadcrumbButtons.subjectTitle` fallback (`display_name or username` in new, `displayName || ''` in old): **profiles / services** domains.
- `components/shared/service-card.tsx` online/onbase/onsite source change (affects home and saved): reported here as D4 because it is visible on the saved page. **home / services** domains may also want to own it.
- `serialize_profile_summary` carrying phone/viber/whatsapp/firstName/lastName: reported here as D5 for `/api/saved`. The same serializer feeds home and `profiles/by-username`, which belong to the **profiles / home** domains.
- `components/dashboard/dashboard-content.tsx` (uses `getUserTotalReviewCount`): **dashboard** domain. The action semantics match.

## 2. Mapping (old → new)

| OLD | NEW frontend action | Django endpoint | NEW page/consumer |
|---|---|---|---|
| `createReview` | `actions/reviews/create-review.ts` `createReview` | `POST /api/reviews/` → `review_ops.create_review` | `ReviewForm` (profile + service pages) |
| `canUserReview` (unused) | `canUserReview` (unused) | `GET /api/reviews/can-review` | — |
| `getProfileReviewStats` / `getServiceReviewStats` | same names (return raw object, not ActionResult) | `GET /api/reviews/{profile,service}/{id}/stats`; also inlined in page bundles | `ReviewStatsEnhanced` |
| `getProfileReviews` / `getServiceReviews` / `getProfileOtherServiceReviews` | same names | `GET /api/reviews/profile/{id}`, `/service/{id}`, `/profile/{id}/other-services`; page bundles call the selectors directly (limit 10 / 10 / 5) | `ReviewsContainer` |
| `getUserTotalReviewCount` | same | `GET /api/reviews/me/received/total` | dashboard-content |
| `getUserReviewsGiven` / `getUserReviewsReceived` | same | `/me/given`, `/me/received` | dashboard reviews |
| `getUserReviewStats` / `getUserGivenReviewStats` | same | `/me/received/stats`, `/me/given/stats` | summary cards |
| `getUserReviewsWithComments` / `getUserGivenReviewsWithComments` | same | `/me/received/with-comments`, `/me/given/with-comments` | Συστάσεις sections |
| `toggleReviewVisibility` | same | `POST /api/reviews/{id}/visibility/toggle` | `RecommendationsSection` switch |
| `moderateReview` (unused; admin uses `updateReviewStatus`) | `moderateReview({..})` → admin PATCH | `PATCH /api/admin/reviews/{id}/status` → `review_ops.moderate_review` | (no caller) |
| `getPendingReviews` (unused) | same | `GET /api/admin/reviews/pending` | (no caller) |
| `updateProfileRating` / `updateServiceRating` | — | `recalculate_profile_rating` / `recalculate_service_rating` | — |
| `toggleSave` | `actions/saved/toggle-save.ts` | `POST /api/saved/toggle` | `SaveButton`, `BreadcrumbButtons` |
| `getSavedItems` | `actions/saved/get-saved-items.ts` (+ enrich) | `GET /api/saved` | `/dashboard/saved` |
| `getUserSavedState` | `actions/saved/get-saved-state.ts` | `GET /api/saved/state` | `SavedStateProvider` |

## 3. DIFFERENCES

### D1. Dashboard "Συστάσεις" (received) shows an empty author name for reviews written by simple users — MEDIUM
- OLD: the `author` relation is the **User** row. `select {id,name,displayName,username}` comes from User (`get-user-reviews.ts:250-257`). `recommendations-section.tsx:77` renders `Από: {displayPerson.displayName}` with no fallback. User.displayName is always set at signup (`register.ts:136-137`).
- NEW: `review_reads._card` (`backend/apps/reviews/selectors/review_reads.py:260-278`) takes `author.displayName` and `author.username` from the **author's Profile**, not the User. Simple users (type `user`) have no Profile: profiles are created only for PRO users (`accounts/services/oauth.py:83-89`, `profile_updates.ensure_profile_exists` called from onboarding). So `displayName` is `null`.
- Impact: on `/dashboard/reviews` the pro sees `Από:  - (dd/MM/yyyy)` with no name for every recommendation written by a non-pro customer, which is most reviewers. The public `ReviewCard` (`review-card.tsx:14-18`) falls back to `author.name`, so the public page mostly looks right there (name = displayName at signup; OAuth users can differ). `author.username` is also `null` for these users, where old had User.username.
- Fix hint: in `_card`, source `displayName`/`username` from `User.display_name`/`User.username`, as old did. Keep `image` from the author's Profile (old did that too, `get-reviews.ts:59-73`). The selector comment cites the TS `Pick<Profile,…>` type, but at runtime old read the User row.
- Possibly intentional?: no.

### D2. Visibility-toggle toasts: wrong success text, and backend error reason lost — MEDIUM
- OLD: on success, `toggle-review-visibility.ts:91-95` returns message `'Η αξιολόγηση είναι τώρα ορατή'` / `'Η αξιολόγηση είναι τώρα κρυφή'`, shown by `recommendations-section.tsx:43`. On error it returns a specific `message` (`'Δεν έχετε δικαίωμα…'`, `'Μόνο εγκεκριμένες και δημοσιευμένες αξιολογήσεις μπορούν να εμφανιστούν'`, `'Η αξιολόγηση δεν βρέθηκε'`, `'Αποτυχία ενημέρωσης εμφάνισης αξιολόγησης'`), shown via `toast.error(result.message || …)`.
- NEW: `frontend/src/actions/reviews/toggle-review-visibility.ts:15` always returns `message: 'Η ορατότητα άλλαξε'`. On failure it returns only `{success:false, error}` with no `message` (line 17), so the toast falls back to the generic `'Αποτυχία ενημέρωσης εμφάνισης'`. The backend Greek messages are correct (`review_ops.py:233-249`) but never reach the toast.
- Impact: the pro sees a different success toast, and never sees the specific error reason.
- Fix hint: return `message: res.visibility ? 'Η αξιολόγηση είναι τώρα ορατή' : 'Η αξιολόγηση είναι τώρα κρυφή'`, and put `message: err.message` on failure.
- Possibly intentional?: no.

### D3. Review form: wrong Greek validation text when Ναι/Όχι was not chosen — MEDIUM
- OLD: rating 0 fails zod with `'Επιλέξτε εάν συστήνετε την υπηρεσία'` (`validations/review.ts:9-13`), shown in the form Alert (`review-form.tsx:192-196`).
- NEW: `frontend/src/actions/reviews/create-review.ts:13-15` short-circuits with `'Επίλεξε αξιολόγηση 1-5'`. The backend fallback is also different: `"Πρέπει να είναι 1-5"` (`review_ops.py:33`), plus DRF's English `"One or more fields are invalid."` from the serializer.
- Impact: a user who clicks "Αξιολόγηση" without picking Ναι/Όχι sees star-rating wording that doesn't fit the like/unlike UI.
- Fix hint: use `'Επιλέξτε εάν συστήνετε την υπηρεσία'` for rating < 1, and `'Η βαθμολογία πρέπει να είναι από 1 έως 5'` for > 5.
- Possibly intentional?: no.

### D4. Saved-page service cards: wrong badge taxonomy level and wrong online/onbase/onsite source — MEDIUM
- OLD: `get-saved-items.ts:102-122` sends `category: <category label>`, `type: service.type`, and **no** `taxonomyLabels`. `service-card.tsx` badge = `taxonomyLabels?.subcategory || taxonomyLabels?.category || service.category`, so it shows the **category** label. Location icons use `service.type?.online/onbase/onsite` (old `service-card.tsx:121-123`).
- NEW: `saved_reads._service_card` (`backend/apps/saved/selectors/saved_reads.py:83-90`) adds `taxonomyLabels.subcategory`, so the badge shows the **subcategory** label. The payload has no `type`, and new `service-card.tsx:121-123` was changed to read `service.profile?.coverage?.online/onbase/onsite` (the profile's coverage, not the service's type).
- Impact: on `/dashboard/saved`, cards show a different chip (subcategory instead of category). A service's online/onsite/onbase markers come from the owner's profile coverage rather than the service itself, so a service that is online-only can show onsite, and the reverse. The second change is in the shared card, so the home page is affected too.
- Fix hint: drop `taxonomyLabels` from the saved service card (or set `subcategory` to the category label), add `type: service.type`, and revert service-card lines 121-123 to `service.type?.…`. Do the revert only once every ServiceCard payload carries `type`.
- Possibly intentional?: the selector comment says "taxonomyLabels carried for parity with the directory card", but the old saved card didn't carry them. Treat as a bug.

### D5. `/api/saved` profile cards include contact PII that the old card never carried — MEDIUM (privacy)
- OLD: `get-saved-items.ts:126-177` maps each saved profile to `ArchiveProfileCardData`: id, uid, username, displayName, tagline, taxonomy, skills, rating, reviewCount, verified, featured, top, rate, coverage, image, role. No phone/viber/whatsapp/first or last name/terms.
- NEW: `saved_reads.py:55-60` uses `serialize_profile_summary` (`profiles/selectors/profile_reads.py:80-131`), which includes `phone`, `viber`, `whatsapp`, `firstName`, `lastName`, `terms`, `bio`, `portfolio`, `visibility` and more. `serialize_profile_card` exists to strip these (`profile_reads.py:136-145`) but isn't used here.
- Impact: any logged-in user can save any profile and then `GET /api/saved` to read its phone/whatsapp/viber and real name, even if the pro hid them via visibility. The cards are server components, so the browser HTML doesn't leak them; the API response does.
- Fix hint: use `serialize_profile_card` in `saved_reads`. The same serializer is used elsewhere (home featured, `profiles/by-username`), so check with the profiles/home domains.
- Possibly intentional?: no.

### D6. Rating rounding: Python half-even vs JS `toFixed` on exact ties — LOW
- OLD: `Number(avg.toFixed(1))` for the stats shown on profile/service pages (`get-review-stats.ts:26-31`), and `toFixed(2)` for the stored `rating` (`update-rating.ts:49,108`). On exact binary ties, `toFixed` rounds half up.
- NEW: `round(float(avg), 1)` (`review_reads.py:29,40`) and `round(…, 2)` (`recalculate_ratings.py:30,51`). Python rounds exact ties half-to-even.
- Impact: example with 13 positive (5) and 3 negative (1) reviews: avg = 68/16 = 4.25. Old shows **4.3**, new shows **4.2**. Any x.25 average with an even tenths digit is affected, e.g. 2.25 → 2.2 vs 2.3. Stored 2dp values differ for e.g. 1.125 (1.12 vs 1.13) and 4.625 (4.62 vs 4.63); that rarely changes the 1dp card display.
- Fix hint: use `Decimal(str(avg)).quantize(Decimal('0.1'), ROUND_HALF_UP)`, or `math.floor(avg*10+0.5)/10`.
- Possibly intentional?: no.

### D7. "Profile has no services" error copy differs — LOW/MEDIUM (copy)
- OLD: `'Πρέπει να επιλεγεί μια υπηρεσία προς αξιολόγηση. Το προφίλ του επαγγελματία δεν έχει αναρτήσει καμία υπηρεσία.'` (`create-review.ts:97-98`)
- NEW: `'… Το προφίλ του επαγγελματία δεν έχει προσθέσει κάποια υπηρεσία.'` (`review_ops.py:46-47`)
- Impact: shown when someone submits a review on a profile page of a pro with no services.
- Possibly intentional?: no.

### D8. Saved toggle accepts non-existent ids; saved totals can count orphans (depends on DB FKs) — LOW (open question)
- OLD: Prisma FKs `saved_services.serviceId → services.id` and `saved_profiles.profileId → profiles.id`, both `onDelete: Cascade` (`saved.prisma:10-11,25-26`). Saving a bad id fails with `'Failed to update saved status'` and the UI reverts. Deleting a service/profile removes its saved rows.
- NEW: `service_id` / `profile_id` are plain columns with no FK (`saved/models/*.py`), and `toggle.py:19-40` creates rows without checking existence. `saved_reads.py:31,36` counts all saved rows, but cards only render for rows that still resolve (lines 48, 59).
- Impact: if the restored-dump FK constraints are gone (or on a fresh Django-built DB), the "Υπηρεσίες (N)" / "Προφίλ (N)" counts and page count include deleted items while showing fewer cards. Also, a crafted call can save a non-existent id.
- Possibly intentional?: no. See §5: I couldn't verify whether the Prisma FK constraints still exist in the live DB.

### D9. Recommendation lists drop legacy empty-string comments — LOW
- OLD: `comment: { not: null }` (`get-user-reviews.ts:236-238,391-393`) includes `''`. Old create stored `''` for whitespace-only comments: `"   " || null` keeps the string, then zod `.trim()` makes it `''`.
- NEW: `.exclude(comment="")` (`review_reads.py:154,172`). New creates store `None`.
- Impact: legacy rows with `''` don't appear in "Συστάσεις", and the counts are lower than old. In old these rows rendered with no comment text but still had the visibility switch.
- Possibly intentional?: possibly (cleanup), but it is a difference.

### D10. Unused-path drift in `moderateReview` / `canUserReview` / stats actions — LOW
- Old `moderateReview(reviewId, status, reason)` had admin-only, cuid-validated, "Η αξιολόγηση έχει ήδη ελεγχθεί" guard, messages `'Η αξιολόγηση εγκρίθηκε επιτυχώς'` / `'…απορρίφθηκε επιτυχώς'`. New `moderateReview({…})` has no guard and messages `'Η αξιολόγηση εγκρίθηκε'` / `'…απορρίφθηκε'`. Neither app calls it; admin uses `updateReviewStatus`, which new matches (§4).
- `can_user_review` with no `serviceId` filters `service_id IS NULL` (`review_ops.py:143-145`). Old dropped the sid filter and matched any review on the profile (`create-review.ts:270-276`). Unused by the UI.
- `getProfileReviewStats` / `getServiceReviewStats` / `getProfileReviews` etc. return raw objects instead of `{success,data}`. No callers outside the page bundles.
- Possibly intentional?: harmless today. Fix them so future callers get old behaviour.

### D11. Minor envelope/text diffs — LOW
- An expired JWT on review submit shows DRF's English 401 text in the form Alert. Old's `requireAuth` went through `handleBetterAuthError`.
- An invalid page/limit query in `_page_limit` (`views/public/reviews.py:14-19`) raises a 500. Old would just produce NaN skip.
- Django `SavedListQuerySerializer` defaults to limit 20 (`serializers/saved.py:14-16`) where old used 12. The page always passes 12, so nothing visible.
- Saved page error text was English in old (`'Failed to fetch saved items'`) and is Greek or the Django message in new. New also returns success+empty on 401 where old returned an error.

## 4. Confirmed same
- Eligibility order and gates for create: login required (UI shows the "Για να αξιολογήσεις πρέπει να έχεις λογαριασμό" dialog; API IsAuthenticated), then profile exists, then profile has ≥1 service (any status), then serviceId required ("Επιλέξτε την υπηρεσία που θα αξιολογηθεί"), then no self-review, then service belongs to profile, then one review per author+profile+service ("Έχετε ήδη αξιολογήσει αυτή την υπηρεσία"). There is no chat or order prerequisite in either app.
- New review is stored as `status=pending, published=false, visibility=false, type=SERVICE`. The comment is trimmed and limited to 350 chars (UI maxLength 350 in both). Success response `'Η αξιολόγησή σας υποβλήθηκε με επιτυχία!'` plus id, which leads to the ReviewSuccess card (same texts).
- Admin is notified on create (not the owner). Subject `Νέα Αξιολόγηση για {displayName||username}`.
- Moderation as actually used (admin `updateReviewStatus` vs `moderate_review`): statuses pending/approved/rejected; `published` = (status == approved); ratings recalculated only when the status changes across the approved boundary; the owner gets the approval email only on a change into approved. Delete recalculates only if the review was approved+published.
- Pending reviews appear nowhere publicly or in the dashboard. All dashboard lists filter approved+published, and the pending/rejected badges exist only in dead `DashboardReviewCard`. They appear only in admin.
- Denormalized aggregates: approved+published, visibility ignored, 0 when none, `review_count` updated alongside. The `stars` breakdown is never written in either app.
- Public lists: approved+published+visibility=true for both rows and count; createdAt desc; limits 10/10/5; the service list sets `service:null`; other-services excludes the current sid and null sid, with total = returned length. Author image comes from the author's Profile.
- Stats are counted regardless of visibility, so the "Βαθμολογία N αξιολογήσεις" header shows even when every comment is hidden. Empty-state texts and the "1 αξιολόγηση / N αξιολογήσεις από άλλες υπηρεσίες" texts match (identical components).
- Visibility toggle: owner-only, approved+published only, flips the boolean, no rating recalculation. The UI switch shows only for status=approved.
- Dashboard: received section only for freelancer/company roles; page size 3; query params `r_page/g_page/rec_page/g_rec_page`; positive = rating 5, negative = rating 1; share link `https://doulitsa.gr/profile/{username}#review`.
- All review UI components and the dashboard review components are byte-identical, except auth-session plumbing and the dead `DashboardReviewCard`, which in new reads `visibility` instead of `published`. That fixes an old bug, but the component is unused in both apps.
- Saved toggle semantics: delete if it exists, otherwise create; returns `{isSaved}`. The client does an optimistic update and reverts on failure; logged-out users get the auth dialog "Για να αποθηκεύσεις στα αγαπημένα πρέπει να έχεις λογαριασμό". Own items: the button is hidden. The breadcrumb "Αποθήκευση/Αποθηκεύτηκε" button works the same way (identical component, and the bundles carry the same `saveType`/`id`/`ownerId`).
- Saved state: id sets, empty for anonymous or on error. The provider is identical.
- Saved page: identical page and pagination components; saved-row createdAt desc; 12 per tab; tab counts; empty-state texts; no service-status filtering in either app.
- Cache: Django signals purge `profile:page:*`, `service:page:*` and `core:home` on review save/delete. Frontend toggle/moderate revalidate public tags (intentional architecture).

## 5. Open questions / couldn't verify
- Whether the live Postgres (a restored Prisma dump) still has the FK constraints with `ON DELETE CASCADE` on `saved_services` / `saved_profiles` and `ON DELETE SET NULL` on `reviews.sid`. Django declares `db_constraint=False` or plain int columns, so the cascade behaviour (D8, and reviews pointing at deleted services) depends on the DB, not the code. I had no DB access.
- Exact HTML parity of the NEW_REVIEW / REVIEW_APPROVED emails, and whether the Brevo attributes `PROFILE_OWNER_NAME` / `REVIEWER_NAME` (sent by old, not passed by new tasks) are used by the Brevo transactional templates. Delegated to the emails domain.
- Admin review UI behaviour (filters, search on `author__display_name`, buttons). Delegated to the admin domain. The status-update and delete logic were verified above.
