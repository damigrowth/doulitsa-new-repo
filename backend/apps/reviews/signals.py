"""Auto-invalidate cached public payloads when a review changes.

Reviews render inside the cached `profile:page:{username}` and
`service:page:{id}` payloads (lists + aggregate stats), so a created,
moderated, hidden or deleted review must purge both — otherwise it stays
invisible until the 30-min Redis TTL lapses (same bug class as
apps/profiles/services/cache.py).
"""
from __future__ import annotations

from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.reviews.models import Review


@receiver(post_save, sender=Review, dispatch_uid="reviews_cache_post_save")
@receiver(post_delete, sender=Review, dispatch_uid="reviews_cache_post_delete")
def _invalidate_review_caches(sender, instance: Review, **kwargs) -> None:
    try:
        keys = ["core:home"]
        if instance.service_id:
            keys.append(f"service:page:{instance.service_id}")
        username = getattr(instance.profile, "username", None) if instance.profile_id else None
        if username:
            keys.append(f"profile:page:{username}")
        cache.delete_many(keys)
    except Exception:  # pragma: no cover - defensive
        import logging

        logging.getLogger(__name__).exception("review_cache_invalidation_failed")
