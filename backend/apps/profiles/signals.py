"""Auto-invalidate cached public profile payloads on any Profile DB write.

Every Profile mutation goes through `Profile.save()` / `.delete()` (the
services layer always uses `save(update_fields=...)`, never queryset
`.update()`), so these signals are the one choke point that catches ALL
write paths — dashboard forms, account/username syncs, onboarding, admin
actions, verification — without wiring each call site by hand.

Known bypass (frozen billing code): `Profile.objects...update(featured=...)`
in apps/billing skips post_save (BILL-G1, P1-24) — not handled here.
"""
from __future__ import annotations

from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.profiles.models import Profile
from apps.profiles.services.cache import invalidate_profile_caches


@receiver(post_save, sender=Profile, dispatch_uid="profiles_cache_post_save")
@receiver(post_delete, sender=Profile, dispatch_uid="profiles_cache_post_delete")
def _invalidate_profile_caches(sender, instance: Profile, **kwargs) -> None:
    username = instance.username
    # CACHE-1: the owner's service pages embed this profile — collect their ids
    # now (inside the write's transaction) and purge them with the rest.
    service_ids: list[int] = []
    try:
        from apps.services.models import Service

        service_ids = list(Service.objects.filter(profile_id=instance.pk).values_list("id", flat=True))
    except Exception:  # pragma: no cover - defensive
        pass
    # XC-ONCOMMIT (P2-16): purge only AFTER the write commits; purging inside
    # the transaction let a concurrent read re-cache the pre-write row. Outside
    # an atomic block on_commit runs immediately.
    transaction.on_commit(
        lambda: invalidate_profile_caches(username, service_ids=service_ids)
    )
