"""Auto-invalidate cached public service payloads on any Service DB write.

The public selectors cache `service:page:{id}` (30 min) and
`services:count:*` (30 min) in Redis with no purge on writes, so service
edits stayed invisible until the TTL lapsed (same bug class as the profile
page — see apps/profiles/services/cache.py). The owner's profile page embeds
the service cards, and the home page features services, so both are purged
too.
"""
from __future__ import annotations

from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.profiles.models import Profile
from apps.services.models import Service


@receiver(post_save, sender=Service, dispatch_uid="services_cache_post_save")
@receiver(post_delete, sender=Service, dispatch_uid="services_cache_post_delete")
def _invalidate_service_caches(sender, instance: Service, **kwargs) -> None:
    try:
        keys = [f"service:page:{instance.id}", "core:home"]
        username = (
            Profile.objects.filter(id=instance.profile_id)
            .values_list("username", flat=True)
            .first()
        )
        if username:
            keys.append(f"profile:page:{username}")
        cache.delete_many(keys)
        try:
            cache.delete_pattern("services:count:*")
        except AttributeError:  # non-redis backend (tests) — fall back to TTL
            pass
    except Exception:  # pragma: no cover - defensive
        import logging

        logging.getLogger(__name__).exception("service_cache_invalidation_failed")
