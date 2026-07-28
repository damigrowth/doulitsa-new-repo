"""Celery tasks for messaging. Scheduled via CELERY_BEAT_SCHEDULE.

- `process_email_batches`  every 15 min — send unread-message email digests
                                          (row 10)
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)


def _sender_name(author) -> str:
    """OLD getSenderName fallback (templates/unread-messages.ts:49-54)."""
    if author is None:
        return "Χρήστης"
    return getattr(author, "display_name", None) or getattr(author, "username", None) or "Χρήστης"


def _preview(content: str, max_len: int = 120) -> str:
    """OLD truncateMessage (templates/unread-messages.ts:41-44)."""
    return content if len(content) <= max_len else content[:max_len] + "..."


def _athens_time(dt) -> str:
    """24h HH:MM in Europe/Athens (templates/unread-messages.ts formatEmailMessageTime)."""
    try:
        from zoneinfo import ZoneInfo
        return dt.astimezone(ZoneInfo("Europe/Athens")).strftime("%H:%M")
    except Exception:
        return dt.strftime("%H:%M")


@shared_task(name="apps.messaging.tasks.process_email_batches")
def process_email_batches() -> dict[str, int]:
    """Send unread-message email digests.

    Faithful port of OLD api/cron/process-email-batches/route.ts:32-129:
    per-message dedupe via EmailBatch.messageIds (a user can receive several
    digests per day but never the same message twice), NO cooldown and NO age
    window, and the email is sent BEFORE the batch row is recorded so a
    provider failure doesn't permanently burn those messages.
    """
    from apps.accounts.models import User
    from apps.messaging.models import EmailBatch, Message

    sent = 0
    skipped = 0
    errors = 0

    # Candidate recipients: chat members with any unread, non-deleted message.
    recipient_ids = set(
        Message.objects.filter(read=False, deleted=False)
        .values_list("chat__members__user_id", flat=True)
    )
    for user_id in recipient_ids:
        if not user_id:
            continue
        try:
            user = User.objects.filter(id=user_id).first()
            if user is None or not user.email:
                continue
            unread = list(
                Message.objects.filter(
                    chat__members__user_id=user_id, read=False, deleted=False,
                )
                .exclude(author_id=user_id)
                .select_related("author")
                .order_by("-created_at")
            )
            if not unread:
                continue
            # All message ids ever emailed to this user (OLD route.ts:85-103).
            already: set[str] = set()
            for batch_ids in EmailBatch.objects.filter(user_id=user_id).values_list(
                "message_ids", flat=True,
            ):
                already.update(str(mid) for mid in (batch_ids or []))
            new_messages = [m for m in unread if str(m.id) not in already]
            if not new_messages:
                skipped += 1
                continue
            previews = [
                {
                    "sender": _sender_name(m.author),
                    "content": _preview(getattr(m, "content", "") or "", 120),
                    "time": _athens_time(m.created_at),
                }
                for m in reversed(new_messages)
            ]
            # Send first (synchronous builder call — mirrors OLD ordering); only
            # record the batch when the send actually went out, so failed sends
            # are retried on the next run instead of silently lost.
            ok = send_unread_digest_email(
                email=user.email,
                user_name=user.display_name or user.username,
                unread_count=len(new_messages),
                previews=previews,
            )
            if not ok:
                errors += 1
                continue
            EmailBatch.objects.create(
                user=user,
                message_ids=[str(m.id) for m in new_messages],
                message_count=len(new_messages),
            )
            user.last_unread_email_sent_at = datetime.now(timezone.utc)
            user.save(update_fields=["last_unread_email_sent_at", "updated_at"])
            sent += 1
        except Exception:  # noqa: BLE001 — one bad user must not stop the run
            logger.exception("email_batches: user %s failed", user_id)
            errors += 1
    logger.info(
        "email_batches.processed", extra={"sent": sent, "skipped": skipped, "errors": errors},
    )
    return {"processed": sent, "skipped": skipped, "errors": errors}


# --- Transactional email tasks --------------------------------------------
# Thin Celery wrappers around apps.messaging.emails builders so callers fire and
# forget (`.delay(...)`). Each builder is best-effort and never raises.


@shared_task(name="apps.messaging.tasks.send_verification_email")
def send_verification_email(email, token, display_name=None, username=None):
    from apps.messaging import emails
    return emails.send_verification_email(
        email=email, token=token, display_name=display_name, username=username
    )


@shared_task(name="apps.messaging.tasks.send_password_reset_email")
def send_password_reset_email(email, token, display_name=None):
    from apps.messaging import emails
    return emails.send_password_reset_email(email=email, token=token, display_name=display_name)


@shared_task(name="apps.messaging.tasks.send_welcome_email")
def send_welcome_email(email, display_name=None, username=None):
    from apps.messaging import emails
    return emails.send_welcome_email(email=email, display_name=display_name, username=username)


@shared_task(name="apps.messaging.tasks.send_contact_admin_email")
def send_contact_admin_email(name, email, subject, message):
    from apps.messaging import emails
    return emails.send_contact_admin_email(name=name, email=email, subject=subject, message=message)


@shared_task(name="apps.messaging.tasks.send_contact_user_email")
def send_contact_user_email(email, name=None):
    from apps.messaging import emails
    return emails.send_contact_user_email(email=email, name=name)


@shared_task(name="apps.messaging.tasks.send_verification_request_email")
def send_verification_request_email(profile_id, afm=None):
    from apps.messaging import emails
    return emails.send_verification_request_admin_email(profile_id=profile_id, afm=afm)


@shared_task(name="apps.messaging.tasks.send_new_review_email")
def send_new_review_email(rating=None, review_id=None, author_email=None,
                          receiver_name=None, receiver_email=None,
                          comment=None, service_name=None):
    from apps.messaging import emails
    return emails.send_new_review_email(
        rating=rating,
        review_id=review_id,
        author_email=author_email,
        receiver_name=receiver_name,
        receiver_email=receiver_email,
        comment=comment,
        service_name=service_name,
    )


@shared_task(name="apps.messaging.tasks.send_review_approved_email")
def send_review_approved_email(email, rating=None, comment=None, service_name=None):
    from apps.messaging import emails
    return emails.send_review_approved_email(
        email=email, rating=rating, comment=comment, service_name=service_name,
    )


@shared_task(name="apps.messaging.tasks.send_new_profile_email")
def send_new_profile_email(profile_id, profile_name, username, user_email, user_type=None):
    """Notify admin of a newly onboarded pro profile. Ports sendNewProfileEmail
    (complete-onboarding.ts:199 → admin-emails.ts:230)."""
    from apps.messaging import emails
    return emails.send_new_profile_email(
        profile_id=profile_id,
        profile_name=profile_name,
        username=username,
        user_email=user_email,
        user_type=user_type,
    )


# --- Service notification email tasks --------------------------------------


@shared_task(name="apps.messaging.tasks.send_service_created_email")
def send_service_created_email(service_id):
    """Notify admin of a new (non-draft) service. Ports sendServiceCreatedEmail
    (create-service.ts:379 / update-service.ts:424 → service-emails.ts)."""
    from apps.messaging import emails
    from apps.services.models import Service

    service = Service.objects.select_related("profile", "profile__user").filter(id=service_id).first()
    if service is None:
        return False
    user = getattr(service.profile, "user", None)
    creator_name = (
        (user.display_name if user else None)
        or (user.username if user else None)
        or "Unknown"
    )
    creator_email = (user.email if user else "") or ""
    return emails.send_service_created_email(
        service_title=service.title,
        service_description=service.description or "",
        service_id=str(service.id),
        creator_name=creator_name,
        creator_email=creator_email,
        category=service.category,
    )


@shared_task(name="apps.messaging.tasks.send_service_published_email")
def send_service_published_email(service_id):
    """Notify the owner that their service was published. Ports
    sendServicePublishedEmail (admin/services.ts → service-emails.ts)."""
    from apps.messaging import emails
    from apps.services.models import Service

    service = Service.objects.select_related("profile", "profile__user").filter(id=service_id).first()
    if service is None:
        return False
    user = getattr(service.profile, "user", None)
    if user is None or not user.email:
        return False
    user_name = user.display_name or user.username or None
    return emails.send_service_published_email(
        email=user.email,
        service_title=service.title,
        service_slug=service.slug or "",
        service_id=str(service.id),
        user_name=user_name,
    )


# --- Unread-messages digest task -------------------------------------------


@shared_task(name="apps.messaging.tasks.send_unread_digest_email")
def send_unread_digest_email(email, user_name, unread_count, previews):
    from apps.messaging import emails
    return emails.send_unread_digest_email(
        email=email, user_name=user_name, unread_count=unread_count, previews=previews,
    )


# --- Subscription payment admin notification --------------------------------


@shared_task(name="apps.messaging.tasks.send_subscription_payment_email")
def send_subscription_payment_email(
    profile_id, profile_name, username, user_email, subscription_id,
    plan, billing_interval, amount_cents, currency, is_renewal,
    payment_count=None, discount_code=None, order_id=None,
    payment_ref=None, paid_at=None,
):
    from apps.messaging import emails
    return emails.send_subscription_payment_email(
        profile_id=profile_id, profile_name=profile_name, username=username,
        user_email=user_email, subscription_id=subscription_id, plan=plan,
        billing_interval=billing_interval, amount_cents=amount_cents,
        currency=currency, is_renewal=is_renewal, payment_count=payment_count,
        discount_code=discount_code, order_id=order_id, payment_ref=payment_ref,
        paid_at=paid_at,
    )


# --- Brevo contact / list sync tasks ---------------------------------------


@shared_task(name="apps.messaging.tasks.brevo_state_change")
def brevo_state_change(user_id, reason="state_change"):
    """Re-sync a user to their correct Brevo list after a state change.

    Ports `brevoWorkflowService.handleUserStateChange` (workflows.ts:370-434):
    loads the user and delegates to `brevo.sync_user_to_correct_list`, which
    applies the USERS/EMPTYPROFILE/NOSERVICES/ACTIVEPROS rules. Best-effort /
    no-op when Brevo is unconfigured.
    """
    from apps.accounts.models import User
    from apps.messaging import brevo

    user = User.objects.filter(id=user_id).first()
    if user is None:
        logger.warning("brevo_state_change: user not found", extra={"user_id": user_id})
        return False
    brevo.sync_user_to_correct_list(user)
    return True


@shared_task(name="apps.messaging.tasks.brevo_delete_contact")
def brevo_delete_contact(email):
    """Hard-delete a Brevo contact (GDPR on account delete). Ports
    `brevoListManager.deleteContact` (list-management.ts:338-370)."""
    from apps.messaging import brevo

    return brevo.delete_contact(email)


@shared_task(name="apps.messaging.tasks.brevo_first_service")
def brevo_first_service(user_id):
    """First non-draft service → move NOSERVICES to ACTIVEPROS. Ports
    `handleFirstServiceCreated` (create-service.ts:398 / update-service.ts:448
    → list-management.ts onFirstServiceCreated)."""
    from apps.accounts.models import User
    from apps.messaging import brevo

    user = User.objects.filter(id=user_id).first()
    if user is None:
        return False
    brevo.first_service_created(user)
    return True
