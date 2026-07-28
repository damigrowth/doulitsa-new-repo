"""Recalculate rating aggregates on Profile / Service.

Mirrors OLD `actions/reviews/update-rating.ts`. Counts approved + published
reviews (visibility ignored) and stores `rating` (rounded to 2 dp) and
`reviewCount`. OLD never wrote the `stars` breakdown here, so neither do we.
"""
from __future__ import annotations

from django.db.models import Avg, Count

from apps.reviews.models import Review, ReviewStatus


def recalculate_profile_rating(profile_id: str) -> None:
    qs = Review.objects.filter(
        profile_id=profile_id,
        status=ReviewStatus.APPROVED,
        published=True,
    )
    aggs = qs.aggregate(avg=Avg("rating"), n=Count("id"))

    try:
        from apps.profiles.models import Profile
    except ImportError:
        return
    profile = Profile.objects.filter(id=profile_id).first()
    if profile is None:
        return
    # OLD update-rating.ts:49 — Number(avgRating.toFixed(2)); 0 when no reviews.
    profile.rating = round(float(aggs["avg"]), 2) if aggs["n"] else 0
    profile.review_count = int(aggs["n"] or 0)
    profile.save(update_fields=["rating", "review_count", "updated_at"])


def recalculate_service_rating(service_id: int) -> None:
    qs = Review.objects.filter(
        service_id=service_id,
        status=ReviewStatus.APPROVED,
        published=True,
    )
    aggs = qs.aggregate(avg=Avg("rating"), n=Count("id"))

    try:
        from apps.services.models import Service
    except ImportError:
        return
    service = Service.objects.filter(id=service_id).first()
    if service is None:
        return
    # OLD update-rating.ts:108 — Number(avgRating.toFixed(2)); 0 when no reviews.
    service.rating = round(float(aggs["avg"]), 2) if aggs["n"] else 0
    service.review_count = int(aggs["n"] or 0)
    service.save(update_fields=["rating", "review_count", "updated_at"])
