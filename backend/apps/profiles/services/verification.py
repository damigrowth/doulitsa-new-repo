"""Profile verification submission + status lookup.

Mirrors `actions/profiles/verification.ts`: submitting creates or updates
the user's ProfileVerification with status='PENDING' and emails admins.
"""
from __future__ import annotations

import logging
from typing import Any

from django.db import transaction

from apps.accounts.models import User
from apps.profiles.models import Profile, ProfileVerification
from common.exceptions import ApiError

logger = logging.getLogger(__name__)


def submit_verification(
    *,
    user: User,
    afm: str,
    name: str,
    address: str,
    phone: str,
) -> ProfileVerification:
    if not user.is_professional():
        raise ApiError(
            "Δεν έχετε δικαίωμα υποβολής επαλήθευσης",
            code="not_professional",
            status_code=403,
        )
    profile = Profile.objects.filter(user_id=user.id).first()
    if profile is None:
        raise ApiError("Το προφίλ δεν βρέθηκε", code="profile_missing", status_code=404)

    with transaction.atomic():
        verification, created = ProfileVerification.objects.update_or_create(
            profile=profile,
            defaults={
                "uid": user.id,
                "afm": afm,
                "name": name,
                "address": address,
                "phone": phone,
                "status": "PENDING",
            },
        )

    from apps.messaging.tasks import send_verification_request_email
    send_verification_request_email.delay(profile.id, afm)
    logger.info(
        "verification_submitted",
        extra={"verification_id": verification.id, "user_id": user.id, "created": created},
    )
    return verification


def get_verification_status(user: User) -> dict[str, Any] | None:
    profile = Profile.objects.filter(user_id=user.id).select_related("verification").first()
    if profile is None:
        return None
    verification = ProfileVerification.objects.filter(profile=profile).first()
    if verification is None:
        return None
    return {
        "status": verification.status,
        "afm": verification.afm,
        "name": verification.name,
        "address": verification.address,
        "phone": verification.phone,
        "createdAt": verification.created_at.isoformat() if verification.created_at else None,
        "updatedAt": verification.updated_at.isoformat() if verification.updated_at else None,
    }


# ----- Profile reporting --------------------------------------------------


def report_profile(
    *,
    reporter: User,
    profile_id: str,
    profile_name: str,
    profile_username: str,
    description: str,
) -> None:
    """Send admin email about a reported profile. Doesn't persist a row in
    the current Next.js code — it just sends the email."""
    target = Profile.objects.filter(id=profile_id).first()
    if target is None:
        raise ApiError("Το προφίλ δεν βρέθηκε", code="profile_not_found", status_code=404)
    from apps.messaging.tasks import send_contact_admin_email
    send_contact_admin_email.delay(
        reporter.display_name or reporter.email,
        reporter.email,
        f"Καταγγελία προφίλ: {profile_username}",
        f"Reported profile {profile_name} ({profile_id})\n\n{description}",
    )
    logger.info(
        "profile_reported",
        extra={
            "reporter_id": reporter.id,
            "target_profile_id": target.id,
            "username": profile_username,
        },
    )
