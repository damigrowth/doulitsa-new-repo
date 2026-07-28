# Domain: Reviews — Migration Parity Audit (AUDIT-ONLY)

OLD = Next.js + Prisma server actions (`app_before_migrations/src/actions/reviews/**`).
NEW = Django/DRF (`backend/apps/reviews/**`) + Next frontend (`frontend/src/actions/reviews/**`, `frontend/src/lib/api/**`).
Golden rule: NEW must reproduce ALL OLD behavior. Differences = bugs.

Method note: OLD has NO route handlers for reviews — every operation is a server action (`src/app/api` has no review routes; only `webhooks/revalidate-cache/route.ts`). So OLD = server actions only.

---

## Parity matrix

| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Create review | endpoint | create-review.ts:19-222 | POST `/api/reviews/` views/public/reviews.py:20-36 → services/review_ops.py:23-69 | ⚠️ | Several OLD business-rule checks missing (see gaps G1-G4). |
| Create — rating range 1..5 | validation | validations/review.ts:8-14 | serializers/review.py:8 (`min 1 max 5`) + review_ops.py:31-32 | ✅ | Both enforce 1..5. |
| Create — comment max length | validation | validations/review.ts:15-19 (max **350**) | serializers/review.py:9 (max **4000**) | ❌ | NEW allows 4000 chars; OLD capped at 350. |
| Create — comment optional/null→trim | validation | create-review.ts:58, validations:15-20 | review_ops.py:61 `(comment or "").strip() or None` | ✅ | Equivalent. |
| Create — profileId is cuid | validation | validations/review.ts:21 (`.cuid()`) | serializers/review.py:10 (plain CharField) | ⚠️ | NEW drops cuid format check. |
| Create — profile must exist | business rule | create-review.ts:75-91 | (none) review_ops.py:23-69 | ❌ | NEW never checks target profile exists (FK has `db_constraint=False`). |
| Create — profile must HAVE ≥1 service | business rule | create-review.ts:93-100 | (none) | ❌ G1 | Missing entirely in NEW. |
| Create — serviceId REQUIRED | business rule | create-review.ts:102-108 | serializer serviceId optional; review_ops.py:62 allows PROFILE type | ❌ G2 | OLD effectively forces a serviceId; NEW permits null → PROFILE review. |
| Create — service belongs to profile | business rule | create-review.ts:118-132 | (none) | ❌ G3 | NEW never verifies `service.pid == profileId`. |
| Create — block self-review | authorization | create-review.ts:110-116 | review_ops.py:34-45 | ✅ | Both block (NEW 403). |
| Create — one review per user/profile(+service) | business rule | create-review.ts:134-151 | review_ops.py:47-54 | ✅ | Same dedupe key (author+profile+service). |
| Create — status pending / published false / type auto | data | create-review.ts:155-166 | review_ops.py:56-66 | ⚠️ | NEW sets `visibility=bool(comment)` (review_ops.py:65); OLD always defaults `visibility=false` (schema review.prisma:13) — see G7. |
| Create — admin "new review" email | side-effect | create-review.ts:171-190 | review_ops.py:67 TODO only (not sent) | ❌ | Email not implemented. |
| Create — cache revalidation | side-effect | create-review.ts:192-209 | n/a (Django, no Next cache) | ➖ | Acceptable tech change. |
| Create — success message text | response | create-review.ts:214 `"...υποβλήθηκε με επιτυχία!"` | views/public/reviews.py:36 `"Η αξιολόγηση υποβλήθηκε"` | ⚠️ | Different wording. |
| canUserReview | endpoint | create-review.ts:228-303 | GET `/api/reviews/can-review` reviews.py:39-51 → review_ops.py:72-90 | ⚠️ | NEW requires auth (IsAuthenticated) → 401; OLD returns `{canReview:false, reason:'Απαιτείται σύνδεση'}` for anon (G5). Reasons are codes vs Greek text. |
| List profile reviews | endpoint | get-reviews.ts:81-113 (`getProfileReviews`) | GET `/api/reviews/profile/{id}` reviews.py:68-73 → review_reads.py:35-37 | ⚠️ | visibility filter dropped (G6); shape differs (R1-R3). |
| List profile reviews — filter status/published/visibility | filter | get-reviews.ts:22-27 (visibility:true in WHERE) | review_reads.py:12-14,36 (only status+published) | ❌ G6 | NEW does NOT filter `visibility=true`; returns hidden-comment reviews and counts them. |
| List profile reviews — order by createdAt desc | sort | get-reviews.ts:45 | review_reads.py:36 `-created_at` | ✅ | Match. |
| List profile reviews — pagination default limit | pagination | get-reviews.ts:83 (default **10**) | reviews.py:14 (default **20**) | ❌ | Default page-size differs 10→20. |
| List service reviews | endpoint | get-reviews.ts:181-213 | GET `/api/reviews/service/{id}` reviews.py:76-81 → review_reads.py:40-42 | ⚠️ | Same visibility/pagination/shape gaps as profile list. |
| List service reviews — service=null in payload | response | get-reviews.ts:172 (sets `service:null`) | review_reads.py:144-156 `_card` (no `service`, has `serviceId`) | ❌ | Shape differs. |
| Other-service reviews | endpoint | get-reviews.ts:282-314 | GET `/api/reviews/profile/{id}/other-services` reviews.py:84-93 → review_reads.py:45-54 | ⚠️ | visibility filter dropped; default limit 5→20 (G8); `total` bug (G9). |
| Other-service — exclude current service | filter | get-reviews.ts:232-234 | review_reads.py:51-52 | ✅ | Both exclude. Note OLD `sid:{not:null}` + NEW `service_id__isnull=False` match. |
| Other-service — default limit | pagination | get-reviews.ts:285 (default **5**) | reviews.py:92 / review_reads.py:47 (default **20**) | ❌ | Default differs 5→20. |
| Profile review stats (avg+count) | endpoint | get-review-stats.ts:8-48 | GET `/api/reviews/profile/{id}/stats` reviews.py:54-58 → review_reads.py:17-23 | ⚠️ | Rounding differs (G10). |
| Service review stats | endpoint | get-review-stats.ts:51-91 | GET `/api/reviews/service/{id}/stats` reviews.py:61-65 → review_reads.py:26-32 | ⚠️ | Rounding differs (G10). |
| Stats — averageRating rounded to 1 dp | data | get-review-stats.ts:26-31 (`toFixed(1)`) | review_reads.py:22,31 (`float(avg)` raw) | ❌ G10 | NEW returns un-rounded float (e.g. 4.333333). |
| User total received count | endpoint | get-user-reviews.ts:10-44 | GET `/api/reviews/me/received/total` reviews.py:99-103 → review_reads.py:60-61 | ⚠️ | OLD filters `published:true` (line 35); NEW omits `published` (G11). |
| User reviews given (list) | endpoint | get-user-reviews.ts:47-141 | GET `/api/reviews/me/given` reviews.py:129-134 → review_reads.py:80-86 | ⚠️ | NEW missing `reviewedProfile` nesting (R4); shape differs. |
| User received stats (5★/1★) | endpoint | get-user-reviews.ts:144-201 | GET `/api/reviews/me/received/stats` reviews.py:106-110 → review_reads.py:64-69 | ⚠️ | OLD filters `published:true`; NEW omits (G11). |
| User given stats (5★/1★) | endpoint | get-user-reviews.ts:319-366 | GET `/api/reviews/me/given/stats` reviews.py:137-141 → review_reads.py:72-77 | ⚠️ | OLD filters `published:true`; NEW omits (G11). |
| User received w/ comments | endpoint | get-user-reviews.ts:204-316 | GET `/api/reviews/me/received/with-comments` reviews.py:121-126 → review_reads.py:108-115 | ⚠️ | OLD filters `published:true`; NEW omits published (G11). Comment-not-null match. |
| User given w/ comments | endpoint | get-user-reviews.ts:369-468 | GET `/api/reviews/me/given/with-comments` reviews.py:144-149 → review_reads.py:98-105 | ✅ (mostly) | Both filter approved+comment; OLD also `published:true` (G11), missing `reviewedProfile` (R4). |
| User reviews received (list) | endpoint | get-user-reviews.ts:471-568 | GET `/api/reviews/me/received` reviews.py:113-118 → review_reads.py:89-95 | ✅ (mostly) | Filter parity; shape differs (R1-R3). |
| Toggle review visibility (owner) | endpoint | toggle-review-visibility.ts:15-104 | POST `/api/reviews/{id}/visibility/toggle` reviews.py:152-159 → review_ops.py:115-134 | ⚠️ | NEW drops the "only approved+published" guard (G12). |
| Toggle visibility — only profile owner | authorization | toggle-review-visibility.ts:51-56 | review_ops.py:125-130 | ✅ | Both require `profile.uid == user.id` → 403. |
| Toggle visibility — only approved+published | business rule | toggle-review-visibility.ts:58-64 | (none) | ❌ G12 | NEW lets owner toggle any review (pending/rejected). |
| Moderate review (approve/reject) | endpoint | moderate-review.ts:19-172 | PATCH `/api/admin/reviews/{id}/status` views/admin/reviews.py:86-100 → review_ops.py:93-112 | ⚠️ | Admin perm model differs; "already moderated" guard missing (G13). |
| Moderate — admin authorization | authorization | moderate-review.ts:29-34 (`role==='admin'`) | reviews.py:89 `HasResourcePermission(REVIEWS,'edit')` | ⚠️ | Resource-perm vs simple role flag; behavior may match if perms seeded. ❓ verify. |
| Moderate — block re-moderation | business rule | moderate-review.ts:93-99 | (none) review_ops.py:93-112 | ❌ G13 | NEW lets you re-approve/re-reject; recalc runs again. |
| Moderate — recompute profile+service rating on approve | side-effect | moderate-review.ts:112-118 → update-rating.ts | review_ops.py:106-109 → recalculate_ratings.py:13-52 | ⚠️ | NEW recalcs on BOTH approve and reject (review_ops.py:106-109 unconditional); also writes `stars` (G14, G15). |
| Moderate — approval email | side-effect | moderate-review.ts:120-134 | review_ops.py:111 TODO only | ❌ | Email not implemented. |
| Recompute rating — formula avg, count | data | update-rating.ts:38-52, 96-111 | recalculate_ratings.py:19-32, 41-52 | ⚠️ | OLD rounds `toFixed(2)`; NEW raw float (G15). NEW writes `stars` breakdown OLD never wrote (G14). |
| Get pending reviews (admin) | endpoint | moderate-review.ts:179-257 | GET `/api/admin/reviews/pending` admin/reviews.py:127-146 | ⚠️ | Default limit 20→10 (G16); shape differs. |
| Admin review list (search/filter/sort) | endpoint | (none in OLD actions) | GET `/api/admin/reviews` admin/reviews.py:29-65 | ❓ NEW-only | No OLD action counterpart found in scope; likely OLD admin page used different source. Flag for verification. |
| Admin review detail | endpoint | (none in OLD actions) | GET `/api/admin/reviews/{id}` admin/reviews.py:68-77 | ❓ NEW-only | No OLD counterpart in reviews actions. |
| Admin delete review | endpoint | (none in OLD actions) | DELETE `/api/admin/reviews/{id}` admin/reviews.py:79-83 → review_ops.py:146-160 | ❓ NEW-only | OLD reviews actions have NO delete. ❓ verify OLD never deleted. |
| Admin review stats (counts by status) | endpoint | (none in OLD actions) | GET `/api/admin/reviews/stats` admin/reviews.py:103-114 | ❓ NEW-only | No OLD counterpart. |
| Admin toggle visibility | endpoint | (none — OLD only owner-toggle) | POST `/api/admin/reviews/{id}/visibility/toggle` admin/reviews.py:117-124 → review_ops.py:137-143 | ❓ NEW-only | New admin capability. |

---

## Detailed gaps (per ❌/⚠️)

### G1 — Profile-must-have-services check missing (❌)
- OLD: create-review.ts:93-100 rejects review if `targetProfile._count.services === 0` with a specific Greek message.
- NEW: review_ops.py:23-69 has no such check.
- Impact: Reviews can be created for profiles with zero services; OLD forbade it.
- Fix: In `create_review`, after loading profile, count `Service.objects.filter(pid=profile_id)`; raise `ApiError` if 0.

### G2 — serviceId no longer required (❌)
- OLD: create-review.ts:102-108 — if `!data.serviceId` returns error "Επιλέξτε την υπηρεσία...". Effectively every real review is SERVICE-typed.
- NEW: serializer `serviceId` optional (serializers/review.py:11); review_ops.py:62 happily creates a PROFILE-type review when service_id is None.
- Impact: NEW allows profile-only reviews OLD blocked; also changes `type` distribution and dedupe semantics (author+profile+NULL).
- Fix: Require serviceId in create flow (serializer `required=True` or guard in service) unless PROFILE reviews are intentionally re-enabled.

### G3 — Service-belongs-to-profile check missing (❌)
- OLD: create-review.ts:118-132 verifies `service.pid === data.profileId`.
- NEW: no verification.
- Impact: A review can attach a `serviceId` that belongs to a different profile.
- Fix: Validate the service's profile FK equals `profile_id` before create.

### G4 — Form-data extraction / serviceId==0 coercion (⚠️)
- OLD: create-review.ts:50-53 converts `serviceId 0 → undefined`.
- NEW: serializer takes `serviceId` directly; `0` would pass as falsy → PROFILE type (review_ops.py:62) but `service_id=0` stored. Edge case.
- Impact: minor; depends on frontend never sending 0.

### G5 — canUserReview auth handling (⚠️)
- OLD: returns success with `{canReview:false, reason:'Απαιτείται σύνδεση'}` for anonymous (create-review.ts:236-242).
- NEW: `permission_classes=[IsAuthenticated]` (reviews.py:42) → anonymous gets 401, never reaches the graceful reason. review_ops.py:73-74 branch is dead for the endpoint.
- Impact: Frontend that expected `{canReview:false, reason}` now gets an error.
- Fix: Make the view `AllowAny` and let `can_user_review` handle the anon case.

### G6 — List endpoints drop the `visibility=true` filter (❌ HIGH)
- OLD: get-reviews.ts:26-27, 54-55, 132-133, 153-155, 228 — `visibility: true` is part of the **WHERE** (and COUNT) for profile, service, and other-service lists. Reviews whose comment is hidden are EXCLUDED and not counted.
- NEW: review_reads.py `_published_qs` (12-14) filters only `status=approved, published=true`. `_card` (138) merely nulls the comment when `visibility=false`, but the row is still returned and counted.
- Impact: NEW returns extra rows (hidden reviews) and inflated `total`; pagination windows shift. Behavioral + count + pagination divergence on the most-used public endpoints.
- Fix: Add `.filter(visibility=True)` to `list_profile_reviews`, `list_service_reviews`, `list_profile_other_service_reviews` (NOT to the `/me/*` owner views, which OLD did not visibility-filter).

### G7 — visibility default on create (⚠️)
- OLD: schema default `visibility=false` (review.prisma:13); create-review.ts never sets it → always false.
- NEW: review_ops.py:65 sets `visibility=bool(comment)` → true when a comment exists.
- Impact: Once approved, NEW reviews would be visible-by-default; OLD required the owner to opt-in via toggle. Combined with G6, comment visibility semantics diverge significantly.
- Fix: Set `visibility=False` on create to match OLD.

### G8 / G9 — Other-service reviews: default limit & total bug (❌)
- OLD: default limit 5 (get-reviews.ts:285); `total = reviewsWithImages.length` (line 275) = count of returned (already capped at limit).
- NEW: default limit 20 (review_reads.py:47); review_reads.py:54 computes `total` as `qs.count()` AFTER slicing `qs[:limit]` (line 53). On a sliced QuerySet, `.count()` returns the sliced length, but the logic is fragile and `hasattr(qs,'count')` is always true. Default 5→20 still a parity break.
- Impact: more rows returned than OLD; `total` semantics differ.
- Fix: default limit 5; compute total before slicing or mirror OLD `len(returned)`.

### G10 — Stats averageRating not rounded (❌)
- OLD: get-review-stats.ts:26-31, 69-74 round to 1 decimal (`toFixed(1)`), 0 when none.
- NEW: review_reads.py:22, 31 return `float(aggs["avg"] or 0)` un-rounded.
- Impact: `averageRating` like `4.333333333` instead of `4.3`; UI/format mismatch.
- Fix: `round(avg, 1)`.

### G11 — `/me/*` queries omit `published=true` in several places (⚠️)
- OLD consistently filters `status:'approved', published:true` for received total (get-user-reviews.ts:33-37), received stats (170-184), given stats (335-349), received-with-comments (234-238).
- NEW: review_reads.py — `user_total_received` (61), `user_received_stats` (65), `user_given_stats` (73), `user_received_with_comments` (110) filter only `status=APPROVED` (no `published`). (`user_given`/`user_received`/`*_with_comments`-given DO include `published=True`.)
- Impact: counts/lists may include approved-but-unpublished rows OLD excluded. (In practice published syncs with approved, so usually equal — but not guaranteed; flag.)
- Fix: add `published=True` to those four to match OLD exactly.

### G12 — Toggle visibility drops approved+published guard (❌)
- OLD: toggle-review-visibility.ts:58-64 only allows toggling when `status==='approved' && published`.
- NEW: review_ops.py:115-134 toggles any review regardless of status.
- Impact: Owner can flip visibility on pending/rejected reviews.
- Fix: add the status/published guard before toggling.

### G13 — Moderation: no "already moderated" guard (❌)
- OLD: moderate-review.ts:93-99 rejects if status already approved/rejected ("Η αξιολόγηση έχει ήδη ελεγχθεί").
- NEW: review_ops.py:93-112 always applies; re-approving re-runs recalc, re-rejecting flips published.
- Impact: idempotency lost; rating could be double-processed / unexpected state transitions.
- Fix: if `review.status in {approved, rejected}` raise ApiError.

### G14 — recalc writes `stars` breakdown that OLD never wrote (⚠️)
- OLD: update-rating.ts:46-52 updates ONLY `rating` and `reviewCount` on Profile; never `stars`.
- NEW: recalculate_ratings.py:20,31 computes and writes `profile.stars` (1..5 buckets).
- Impact: New side-effect on a column OLD left untouched. Could be desirable, but it is a behavior change vs OLD; verify the OLD `stars` field was maintained elsewhere or is intentionally left stale. (Service has no `stars` field — NEW correctly doesn't set it: recalculate_ratings.py:43-52.) ❓
- Fix/flag: confirm whether populating `stars` here is intended parity-wise.

### G15 — recalc rounding (⚠️)
- OLD: update-rating.ts:49, 108 store `Number(avgRating.toFixed(2))` (2 dp).
- NEW: recalculate_ratings.py:29, 50 store raw `float(avg)`.
- Impact: stored `profile.rating`/`service.rating` un-rounded vs OLD 2-dp.
- Fix: `round(avg, 2)`.

### G16 — Pending queue default limit 20→10 (⚠️)
- OLD: getPendingReviews default limit 20 (moderate-review.ts:181).
- NEW: AdminReviewPendingQueueView default 10 (admin/reviews.py:134).
- Impact: page size differs.
- Fix: default 20.

### Admin-only NEW endpoints (❓ needs verification)
Admin list/detail/delete/stats/admin-toggle-visibility (admin/reviews.py:29-124) have NO counterpart in `src/actions/reviews/**`. They are NEW capabilities. Need to verify whether OLD implemented these elsewhere (e.g. a generic admin table action) — out of the reviews-actions scope but in the reviews domain. Notably OLD has NO review DELETE anywhere in reviews actions; NEW adds one with rating-recalc side-effect.

---

## Response-shape mismatches

OLD list/card shape (`ReviewWithAuthor`, types/reviews.ts:13-28 + get-reviews.ts:67-73):
```
{ id, rating, comment, status, type, published, visibility, createdAt, updatedAt,
  author: { id, name, displayName, username, image },
  service?: { id, title, slug } | null }
```
NEW `_card` (review_reads.py:132-157):
```
{ id, rating, comment(nulled if !visibility), status, type, published, visibility,
  createdAt, serviceId,
  profile: { id, username, displayName, image },
  author: { id, email, displayName, image } }
```

- **R1 — `updatedAt` dropped.** OLD includes it (types/reviews.ts:23); NEW `_card` omits it. Frontend that reads `updatedAt` breaks.
- **R2 — `author` keys changed.** OLD: `name`, `displayName`, `username`, `image`. NEW: `displayName`, `email`, `image` (NO `name`, NO `username`; ADDS `email`). `author.email` is a **PII leak** never present in OLD public lists, and `author.name`/`author.username` consumers get `undefined`.
- **R3 — `service` → `serviceId`.** OLD nests `service:{id,title,slug}` (profile + other-service lists) or `service:null` (service list). NEW returns flat `serviceId` only, plus a `profile` object OLD lists did not include. Service title/slug no longer available to the client.
- **R4 — `reviewedProfile` missing on given-reviews.** OLD `getUserReviewsGiven`/`getUserGivenReviewsWithComments` attach `reviewedProfile:{id,displayName,username,image}` (get-user-reviews.ts:118-124, 446-451). NEW `user_given`/`user_given_with_comments` return generic `_card` (which has `profile`, but keyed differently and without `username` parity). Dashboard "given" cards lose the reviewed-profile block under the expected key.
- **R5 — comment hiding moved server-side into the payload.** OLD lists excluded hidden reviews entirely (G6); NEW returns them with `comment:null`. So clients now receive null-comment rows they never saw before.
- **R6 — Envelope.** OLD server actions return `{success, message, data:{reviews,total}}` (ActionResponse). NEW endpoints return the bare `{reviews,total}` (no envelope); the frontend `lib/api/client.ts` returns the raw body and the new frontend actions (get-reviews.ts:5-13) wrap minimally / swallow errors to `{reviews:[],total:0}`. Acceptable as a tech change IF every consumer was updated — ❓ verify components read `.reviews/.total` directly.
- **R7 — stats shape** `{totalReviews, averageRating}` matches keys (review_reads.py:20-23) ✅, but value rounding differs (G10).
- **R8 — createdAt format.** NEW `created_at.isoformat()` (review_reads.py:143) → string; OLD returned a Date object serialized by Next. Likely compatible but ❓ verify timezone/format expectations.

### Performance note (not strictly parity but a regression)
NEW `review_reads.py` list functions do NOT `select_related("author","profile")` (only the admin views do). `_card` accesses `r.author` and `r.profile` per row → N+1 queries. OLD explicitly batch-fetched author images in a single query (get-reviews.ts:59-65) to avoid N+1. Suggest adding `.select_related("author","profile")` to the public/me selectors.

---

## Counts

- matched (✅): 12
- partial (⚠️): 21
- missing (❌): 14
- needs_verification (❓): 8

(Capabilities counted from the parity matrix rows; a row may carry multiple sub-gaps.)
