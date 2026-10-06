"""Auto-invalidate cached public profile payloads on any Profile DB write.

Every Profile mutation goes through `Profile.save()` / `.delete()` (the
services layer always uses `save(update_fields=...)`, never queryset
`.update()`), so these signals are the one choke point that catches ALL
write paths — dashboard forms, account/username syncs, onboarding, admin
actions, verification — without wiring each call site by hand.
"""
from __future__ import annotations

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.profiles.models import Profile
from apps.profiles.services.cache import invalidate_profile_caches


@receiver(post_save, sender=Profile, dispatch_uid="profiles_cache_post_save")
@receiver(post_delete, sender=Profile, dispatch_uid="profiles_cache_post_delete")
def _invalidate_profile_caches(sender, instance: Profile, **kwargs) -> None:
    invalidate_profile_caches(instance.username)
