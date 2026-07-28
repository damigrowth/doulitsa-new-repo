"""Save/unsave toggle. Idempotent via unique constraint."""
from __future__ import annotations

from django.db import IntegrityError

from apps.accounts.models import User
from apps.saved.models import SavedProfile, SavedService
from common.exceptions import FieldErrors


def toggle(user: User, *, item_type: str, item_id: str | int) -> bool:
    """Return True if the item is now saved, False if it was unsaved."""
    if item_type == "service":
        try:
            service_id = int(item_id)
        except (TypeError, ValueError):
            raise FieldErrors(details={"itemId": ["Invalid service ID"]})

        existing = SavedService.objects.filter(user=user, service_id=service_id).first()
        if existing:
            existing.delete()
            return False
        try:
            SavedService.objects.create(user=user, service_id=service_id)
        except IntegrityError:
            # Race: another tab saved it first. Treat as saved.
            pass
        return True

    if item_type == "profile":
        profile_id = str(item_id)
        existing = SavedProfile.objects.filter(user=user, profile_id=profile_id).first()
        if existing:
            existing.delete()
            return False
        try:
            SavedProfile.objects.create(user=user, profile_id=profile_id)
        except IntegrityError:
            pass
        return True

    raise FieldErrors(details={"itemType": ["Must be 'service' or 'profile'"]})


def get_saved_state(user: User) -> dict[str, list]:
    """O(1)-lookup-friendly sets of IDs the caller saved."""
    return {
        "serviceIds": list(
            SavedService.objects.filter(user=user).values_list("service_id", flat=True)
        ),
        "profileIds": list(
            SavedProfile.objects.filter(user=user).values_list("profile_id", flat=True)
        ),
    }
