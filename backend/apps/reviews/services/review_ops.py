"""Review creation, moderation, visibility toggles.

Mirrors `actions/reviews/{create-review,moderate-review,toggle-review-
visibility}.ts`.
"""
from __future__ import annotations

import logging

from django.db import transaction

from apps.accounts.models import User
from apps.reviews.models import Review, ReviewStatus, ReviewType
from apps.reviews.services.recalculate_ratings import (
    recalculate_profile_rating,
    recalculate_service_rating,
)
from common.exceptions import ApiError, FieldErrors

logger = logging.getLogger(__name__)


def create_review(
    *,
    author: User,
    profile_id: str,
    service_id: int | None,
    rating: int,
    comment: str | None,
) -> Review:
    # rating range mirrors OLD validations/review.ts:8-14.
    if rating < 1 or rating > 5:
        raise FieldErrors(details={"rating": ["Πρέπει να είναι 1-5"]})

    from apps.profiles.models import Profile
    from apps.services.models import Service

    # 1. Target profile must exist (OLD create-review.ts:75-91).
    target_profile = Profile.objects.filter(id=profile_id).only("id", "user_id").first()
    if target_profile is None:
        raise ApiError("Το προφίλ δεν βρέθηκε", code="profile_not_found", status_code=404)

    # 2. Profile must have at least one service (OLD create-review.ts:93-100).
    if not Service.objects.filter(profile_id=profile_id).exists():
        raise ApiError(
            "Πρέπει να επιλεγεί μια υπηρεσία προς αξιολόγηση. Το προφίλ του "
            "επαγγελματία δεν έχει προσθέσει κάποια υπηρεσία.",
            code="profile_has_no_services",
            status_code=400,
        )

    # 3. serviceId is required (OLD create-review.ts:102-108).
    if not service_id:
        raise ApiError(
            "Επιλέξτε την υπηρεσία που θα αξιολογηθεί",
            code="service_required",
            status_code=400,
        )

    # 4. Block self-review (OLD create-review.ts:110-116).
    if target_profile.user_id == author.id:
        raise ApiError(
            "Δεν μπορείτε να αξιολογήσετε τον εαυτό σας",
            code="self_review_forbidden",
            status_code=403,
        )

    # 5. Service must belong to this profile (OLD create-review.ts:118-132).
    if not Service.objects.filter(id=service_id, profile_id=profile_id).exists():
        raise ApiError(
            "Η υπηρεσία δεν βρέθηκε ή δεν ανήκει σε αυτό το προφίλ",
            code="service_mismatch",
            status_code=400,
        )

    # 6. One review per author per profile+service (OLD create-review.ts:134-151).
    if Review.objects.filter(
        author=author, profile_id=profile_id, service_id=service_id
    ).exists():
        raise ApiError(
            "Έχετε ήδη αξιολογήσει αυτή την υπηρεσία",
            code="duplicate_review",
            status_code=409,
        )

    # 7. Create — pending / unpublished / visibility default false
    #    (OLD create-review.ts:155-166 + schema review.prisma:13 default false).
    review = Review.objects.create(
        author=author,
        profile_id=profile_id,
        service_id=service_id,
        rating=rating,
        comment=(comment or "").strip() or None,
        type=ReviewType.SERVICE,  # serviceId always present here
        status=ReviewStatus.PENDING,
        published=False,
        visibility=False,
    )
    # Notify the ADMIN that a new review needs moderation (best-effort, async).
    # Mirrors OLD create-review.ts:173-190 → sendNewReviewEmail (admin recipient),
    # NOT the profile owner.
    _meta = (
        Profile.objects.filter(id=profile_id)
        .values_list("user__email", "display_name", "username")
        .first()
    )
    _owner_email, _display_name, _username = _meta or (None, None, None)
    _receiver_name = _display_name or _username or ""
    _service_name = (
        Service.objects.filter(id=service_id).values_list("title", flat=True).first()
        if service_id
        else None
    )
    from apps.messaging.tasks import send_new_review_email
    send_new_review_email.delay(
        rating=rating,
        review_id=str(review.id),
        author_email=getattr(author, "email", None),
        receiver_name=_receiver_name,
        receiver_email=_owner_email,
        comment=review.comment,
        service_name=_service_name,
    )
    logger.info("review_created", extra={"review_id": review.id, "author_id": author.id})
    return review


def can_user_review(*, user: User, profile_id: str, service_id: int | None) -> dict:
    # Mirrors OLD canUserReview (create-review.ts:228-303): graceful reasons
    # (Greek text), never throws for anon/not-found.
    if not user or not user.is_authenticated:
        return {"canReview": False, "reason": "Απαιτείται σύνδεση"}

    from apps.profiles.models import Profile

    target = Profile.objects.filter(id=profile_id).only("id", "user_id").first()
    if target is None:
        return {"canReview": False, "reason": "Το προφίλ δεν βρέθηκε"}

    if target.user_id == user.id:
        return {"canReview": False, "reason": "Δεν μπορείτε να αξιολογήσετε τον εαυτό σας"}

    exists = Review.objects.filter(
        author=user, profile_id=profile_id, service_id=service_id
    ).exists()
    if exists:
        return {
            "canReview": False,
            "reason": (
                "Έχετε ήδη αξιολογήσει αυτή την υπηρεσία"
                if service_id
                else "Έχετε ήδη αξιολογήσει αυτό το προφίλ"
            ),
        }

    return {"canReview": True}


def moderate_review(*, review_id: str, status: str, reason: str | None = None) -> Review:
    """Admin approve/reject — mirrors OLD admin action `updateReviewStatus`
    (app_before_migrations/src/actions/admin/reviews.ts:195-311), which is the
    action the admin UI actually invokes.

    NOTE: this admin path intentionally has NO "already moderated" guard — OLD
    allowed re-setting status and recalculated ratings on any status change that
    crosses the `approved` boundary (admin/reviews.ts:264-277). The guarded
    `actions/reviews/moderate-review.ts` flow is a separate, unused-by-admin path.
    """
    # OLD admin schema allows pending|approved|rejected (validations/admin.ts:504).
    if status not in {ReviewStatus.PENDING, ReviewStatus.APPROVED, ReviewStatus.REJECTED}:
        raise FieldErrors(details={"status": ["Πρέπει να είναι pending, approved ή rejected"]})

    review = Review.objects.filter(id=review_id).first()
    if review is None:
        raise ApiError("Review not found", code="review_not_found", status_code=404)

    prev_status = review.status
    status_changed = prev_status != status
    involves_approved = (
        status == ReviewStatus.APPROVED or prev_status == ReviewStatus.APPROVED
    )

    with transaction.atomic():
        review.status = status
        review.published = (status == ReviewStatus.APPROVED)  # sync published with status
        review.save(update_fields=["status", "published", "updated_at"])

        # Recalc ratings when the status change crosses the `approved` boundary
        # (OLD admin/reviews.ts:264-277).
        if status_changed and involves_approved:
            recalculate_profile_rating(review.profile_id)
            if review.service_id:
                recalculate_service_rating(review.service_id)

    # Email the PROFILE OWNER (the professional) only when a status change *into*
    # approved happens (OLD admin/reviews.ts:280-295 → sendReviewApprovedEmail with
    # `review.profile.user.email`), NOT the review author.
    if status_changed and status == ReviewStatus.APPROVED:
        from apps.profiles.models import Profile
        from apps.services.models import Service

        _owner_email = (
            Profile.objects.filter(id=review.profile_id)
            .values_list("user__email", flat=True)
            .first()
        )
        if _owner_email:
            _service_name = (
                Service.objects.filter(id=review.service_id)
                .values_list("title", flat=True)
                .first()
                if review.service_id
                else None
            )
            from apps.messaging.tasks import send_review_approved_email
            send_review_approved_email.delay(
                _owner_email,
                rating=review.rating,
                comment=review.comment,
                service_name=_service_name,
            )
    return review


def toggle_visibility(*, user: User, review_id: str) -> bool:
    """Profile-owner toggle: hide/show the comment publicly.

    Only the *owner of the target profile* may toggle. Rating remains
    visible regardless — this only hides the text comment.
    """
    review = Review.objects.select_related("profile").filter(id=review_id).first()
    if review is None:
        raise ApiError("Η αξιολόγηση δεν βρέθηκε", code="review_not_found", status_code=404)

    # Only the owner of the reviewed profile may toggle (OLD toggle-review-visibility.ts:51-56).
    if review.profile and review.profile.user_id != user.id:
        raise ApiError(
            "Δεν έχετε δικαίωμα να επεξεργαστείτε αυτή την αξιολόγηση",
            code="not_owner",
            status_code=403,
        )

    # Only approved + published reviews may be toggled (OLD toggle-review-visibility.ts:58-64).
    if review.status != ReviewStatus.APPROVED or not review.published:
        raise ApiError(
            "Μόνο εγκεκριμένες και δημοσιευμένες αξιολογήσεις μπορούν να εμφανιστούν",
            code="not_toggleable",
            status_code=400,
        )

    review.visibility = not review.visibility
    review.save(update_fields=["visibility", "updated_at"])
    return review.visibility


def admin_toggle_visibility(*, review_id: str) -> bool:
    review = Review.objects.filter(id=review_id).first()
    if review is None:
        raise ApiError("Review not found", code="review_not_found", status_code=404)
    review.visibility = not review.visibility
    review.save(update_fields=["visibility", "updated_at"])
    return review.visibility


def admin_delete_review(*, review_id: str) -> None:
    review = Review.objects.filter(id=review_id).first()
    if review is None:
        raise ApiError("Review not found", code="review_not_found", status_code=404)

    was_active = review.status == ReviewStatus.APPROVED and review.published
    profile_id = review.profile_id
    service_id = review.service_id

    with transaction.atomic():
        review.delete()
        if was_active:
            recalculate_profile_rating(profile_id)
            if service_id:
                recalculate_service_rating(service_id)
