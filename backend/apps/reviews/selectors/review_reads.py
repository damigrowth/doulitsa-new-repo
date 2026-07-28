"""Read queries for review endpoints (rows 77-88, 171-177).

Mirrors OLD `actions/reviews/{get-reviews,get-review-stats,get-user-reviews}.ts`.
Card shape matches OLD `ReviewWithAuthor`/`DashboardReviewCardData`
(types/reviews.ts:13-58) so the frontend renders exactly as before.
"""
from __future__ import annotations

from typing import Any

from django.db.models import Avg, Count

from apps.accounts.models import User
from apps.reviews.models import Review, ReviewStatus


def _published_qs(qs):
    """Approved + published — what shows up to the public."""
    return qs.filter(status=ReviewStatus.APPROVED, published=True)


def get_profile_review_stats(profile_id: str) -> dict[str, Any]:
    qs = _published_qs(Review.objects.filter(profile_id=profile_id))
    aggs = qs.aggregate(avg=Avg("rating"), n=Count("id"))
    n = int(aggs["n"] or 0)
    # OLD get-review-stats.ts:24-32 — averageRating rounded to 1 dp, 0 when none.
    return {
        "totalReviews": n,
        "averageRating": round(float(aggs["avg"]), 1) if n > 0 else 0,
    }


def get_service_review_stats(service_id: int) -> dict[str, Any]:
    qs = _published_qs(Review.objects.filter(service_id=service_id))
    aggs = qs.aggregate(avg=Avg("rating"), n=Count("id"))
    n = int(aggs["n"] or 0)
    # OLD get-review-stats.ts:66-75 — averageRating rounded to 1 dp, 0 when none.
    return {
        "totalReviews": n,
        "averageRating": round(float(aggs["avg"]), 1) if n > 0 else 0,
    }


def list_profile_reviews(profile_id: str, *, page: int = 1, limit: int = 10) -> dict[str, Any]:
    # Public lists exclude hidden reviews entirely (rows AND count), matching OLD
    # get-reviews.ts:26-27,54-55 — not just nulling the comment.
    # OLD getProfileReviews default limit 10 (get-reviews.ts:84).
    qs = (
        _published_qs(Review.objects.filter(profile_id=profile_id))
        .filter(visibility=True)
        .select_related("author", "author__profile", "profile")
        .order_by("-created_at")
    )
    return _paginate(qs, page, limit, with_service=True)


def list_service_reviews(service_id: int, *, page: int = 1, limit: int = 10) -> dict[str, Any]:
    # OLD getServiceReviews default limit 10 (get-reviews.ts:184); service list sets
    # service:null on each card (get-reviews.ts:172).
    qs = (
        _published_qs(Review.objects.filter(service_id=service_id))
        .filter(visibility=True)
        .select_related("author", "author__profile", "profile")
        .order_by("-created_at")
    )
    return _paginate(qs, page, limit, with_service=False, service_null=True)


def list_profile_other_service_reviews(
    profile_id: str, *, exclude_service_id: int | None, limit: int = 5
) -> dict[str, Any]:
    # OLD getProfileOtherServiceReviews default limit 5 (get-reviews.ts:285);
    # total = length of returned (capped) rows (get-reviews.ts:275).
    qs = (
        _published_qs(
            Review.objects.filter(profile_id=profile_id, service_id__isnull=False)
        )
        .filter(visibility=True)
        .select_related("author", "author__profile", "profile")
    )
    if exclude_service_id:
        qs = qs.exclude(service_id=exclude_service_id)
    rows = list(qs.order_by("-created_at")[:limit])
    cards = _cards(rows, with_service=True)
    return {"reviews": cards, "total": len(cards)}


# ----- user's reviews dashboard -------------------------------------------


def user_total_received(user: User) -> dict[str, int]:
    # OLD get-user-reviews.ts:31-37 — approved + published.
    return {
        "total": Review.objects.filter(
            profile__user_id=user.id, status=ReviewStatus.APPROVED, published=True
        ).count()
    }


def user_received_stats(user: User) -> dict[str, int]:
    # OLD get-user-reviews.ts:168-185 — approved + published.
    qs = Review.objects.filter(
        profile__user_id=user.id, status=ReviewStatus.APPROVED, published=True
    )
    return {
        "positiveCount": qs.filter(rating=5).count(),
        "negativeCount": qs.filter(rating=1).count(),
    }


def user_given_stats(user: User) -> dict[str, int]:
    # OLD get-user-reviews.ts:333-350 — approved + published.
    qs = Review.objects.filter(author=user, status=ReviewStatus.APPROVED, published=True)
    return {
        "positiveCount": qs.filter(rating=5).count(),
        "negativeCount": qs.filter(rating=1).count(),
    }


def user_given(user: User, *, page: int = 1, limit: int = 10) -> dict[str, Any]:
    # OLD getUserReviewsGiven default limit 10 (get-user-reviews.ts:49); attaches
    # reviewedProfile (get-user-reviews.ts:118-124).
    qs = (
        Review.objects
        .filter(author=user, status=ReviewStatus.APPROVED, published=True)
        .select_related("author", "author__profile", "profile")
        .order_by("-created_at")
    )
    return _paginate(qs, page, limit, with_service=True, with_reviewed_profile=True)


def user_received(user: User, *, page: int = 1, limit: int = 10) -> dict[str, Any]:
    # OLD getUserReviewsReceived default limit 10 (get-user-reviews.ts:473).
    qs = (
        Review.objects
        .filter(profile__user_id=user.id, status=ReviewStatus.APPROVED, published=True)
        .select_related("author", "author__profile", "profile")
        .order_by("-created_at")
    )
    return _paginate(qs, page, limit, with_service=True)


def user_given_with_comments(user: User, *, page: int = 1, limit: int = 10) -> dict[str, Any]:
    # OLD getUserGivenReviewsWithComments default limit 10 (get-user-reviews.ts:371);
    # approved + published + comment not null; attaches reviewedProfile.
    qs = (
        Review.objects
        .filter(
            author=user,
            status=ReviewStatus.APPROVED,
            published=True,
            comment__isnull=False,
        )
        .exclude(comment="")
        .select_related("author", "author__profile", "profile")
        .order_by("-created_at")
    )
    return _paginate(qs, page, limit, with_service=True, with_reviewed_profile=True)


def user_received_with_comments(user: User, *, page: int = 1, limit: int = 10) -> dict[str, Any]:
    # OLD getUserReviewsWithComments default limit 10 (get-user-reviews.ts:206);
    # approved + published + comment not null (get-user-reviews.ts:232-238).
    qs = (
        Review.objects
        .filter(
            profile__user_id=user.id,
            status=ReviewStatus.APPROVED,
            published=True,
            comment__isnull=False,
        )
        .exclude(comment="")
        .select_related("author", "author__profile", "profile")
        .order_by("-created_at")
    )
    return _paginate(qs, page, limit, with_service=True)


# ----- shared paginator + serializer --------------------------------------


def _paginate(
    qs,
    page: int,
    limit: int,
    *,
    with_service: bool = False,
    service_null: bool = False,
    with_reviewed_profile: bool = False,
) -> dict[str, Any]:
    page = max(1, int(page or 1))
    limit = max(1, min(100, int(limit or 10)))
    offset = (page - 1) * limit
    total = qs.count()
    rows = list(qs[offset:offset + limit])
    return {
        "reviews": _cards(
            rows,
            with_service=with_service,
            service_null=service_null,
            with_reviewed_profile=with_reviewed_profile,
        ),
        "total": total,
    }


def _service_map(rows) -> dict[int, dict[str, Any]]:
    """Batch-fetch service {id,title,slug} for cards that nest the service.

    `Review.service_id` is a plain int column (no FK relation), so resolve in a
    single query to avoid N+1.
    """
    ids = {r.service_id for r in rows if r.service_id}
    if not ids:
        return {}
    try:
        from apps.services.models import Service
    except ImportError:
        return {}
    out: dict[int, dict[str, Any]] = {}
    for sid, title, slug in Service.objects.filter(id__in=ids).values_list("id", "title", "slug"):
        out[sid] = {"id": sid, "title": title, "slug": slug}
    return out


def _cards(
    rows,
    *,
    with_service: bool = False,
    service_null: bool = False,
    with_reviewed_profile: bool = False,
) -> list[dict[str, Any]]:
    svc_map = _service_map(rows) if with_service else {}
    return [
        _card(
            r,
            with_service=with_service,
            service_null=service_null,
            with_reviewed_profile=with_reviewed_profile,
            svc_map=svc_map,
        )
        for r in rows
    ]


def _card(
    r: Review,
    *,
    with_service: bool = False,
    service_null: bool = False,
    with_reviewed_profile: bool = False,
    svc_map: dict[int, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Mirror OLD `ReviewWithAuthor` (types/reviews.ts:13-28).

    OLD `author` = Pick<User,'id'|'name'> & Pick<Profile,'displayName'|'username'
    |'image'> — i.e. `name` from the User row, `displayName`/`username`/`image`
    from the author's *Profile*.
    """
    author = getattr(r, "author", None)
    author_profile = getattr(author, "profile", None) if author else None
    card: dict[str, Any] = {
        "id": r.id,
        "rating": r.rating,
        "comment": r.comment,
        "status": r.status,
        "type": r.type,
        "published": r.published,
        "visibility": r.visibility,
        "createdAt": r.created_at.isoformat() if r.created_at else None,
        "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
        "author": {
            "id": author.id if author else None,
            "name": getattr(author, "name", None) if author else None,
            "displayName": author_profile.display_name if author_profile else None,
            "username": author_profile.username if author_profile else None,
            "image": author_profile.image if author_profile else None,
        } if author else None,
    }

    if service_null:
        # OLD service-list sets service: null on every card (get-reviews.ts:172).
        card["service"] = None
    elif with_service:
        svc_map = svc_map or {}
        card["service"] = svc_map.get(r.service_id) if r.service_id else None

    if with_reviewed_profile:
        # OLD given lists attach reviewedProfile (get-user-reviews.ts:118-124,446-451).
        profile = getattr(r, "profile", None)
        card["reviewedProfile"] = {
            "id": profile.id if profile else None,
            "displayName": (profile.display_name or "") if profile else "",
            "username": (profile.username or "") if profile else "",
            "image": profile.image if profile else None,
        } if profile else None

    return card


# ----- admin (NEW-only) card ----------------------------------------------
# These endpoints have NO OLD counterpart in actions/reviews (they back the
# new admin moderation tables). The admin UI consumes a richer shape than the
# public OLD card (author.email, nested profile + service, raw FK columns).


def admin_cards(rows) -> list[dict[str, Any]]:
    svc_map = _service_map(rows)
    return [_admin_card(r, svc_map) for r in rows]


def admin_card(r: Review) -> dict[str, Any]:
    return _admin_card(r, _service_map([r]))


def _admin_card(r: Review, svc_map: dict[int, dict[str, Any]]) -> dict[str, Any]:
    author = getattr(r, "author", None)
    author_profile = getattr(author, "profile", None) if author else None
    profile = getattr(r, "profile", None)
    return {
        "id": r.id,
        "rating": r.rating,
        "comment": r.comment,
        "status": r.status,
        "type": r.type,
        "published": r.published,
        "visibility": r.visibility,
        "sid": r.service_id,
        "pid": r.profile_id,
        "authorId": r.author_id,
        "createdAt": r.created_at.isoformat() if r.created_at else None,
        "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
        "author": {
            "id": author.id if author else None,
            "name": getattr(author, "name", None) if author else None,
            "email": getattr(author, "email", None) if author else None,
            "role": getattr(author, "role", None) if author else None,
            "displayName": author_profile.display_name if author_profile else None,
            "image": author_profile.image if author_profile else None,
        } if author else None,
        "profile": {
            "id": profile.id if profile else None,
            "displayName": profile.display_name if profile else None,
            "username": profile.username if profile else None,
            "type": getattr(profile, "type", None) if profile else None,
            "image": profile.image if profile else None,
        } if profile else None,
        "service": svc_map.get(r.service_id) if r.service_id else None,
    }
