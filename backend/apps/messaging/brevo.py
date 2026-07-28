"""Brevo (Sendinblue) contacts REST client + list-assignment logic.

Ported from the OLD app's `src/lib/email/providers/brevo/list-management.ts`
and `workflows.ts` (`handleUserStateChange` → `syncUserToCorrectList`).

Everything here is best-effort: when Brevo isn't configured (no API key — e.g.
local dev) every call is a NO-OP that logs and returns, mirroring
`apps.messaging.emails._configured()`. A provider error is logged and swallowed
so a failed Brevo sync NEVER breaks the request/transaction that triggered it
(OLD wrapped every list call in try/catch with "Don't throw — Brevo sync should
never block the main operation").

List-assignment rules (verbatim from OLD `syncUserToCorrectList`,
`list-management.ts:277-331`, mirrored in `actions/admin/profiles.ts:852-858`):
  - blocked or banned         → removed from ALL lists
  - type == 'user'            → USERS list
  - type == 'pro' and (step != 'DASHBOARD' or incomplete profile) → EMPTYPROFILE
  - type == 'pro' + DASHBOARD + 0 published services → NOSERVICES
  - type == 'pro' + DASHBOARD + >=1 published service → ACTIVEPROS (OLD: PROS)
A "complete profile" means image + category + subcategory all present
(`workflows.ts:405-409`).
"""
from __future__ import annotations

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3"
_TIMEOUT = 10  # seconds


def _api_key() -> str:
    return (getattr(settings, "ANYMAIL", {}) or {}).get("SENDINBLUE_API_KEY") or ""


def _configured() -> bool:
    return bool(_api_key())


def _headers() -> dict[str, str]:
    return {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": _api_key(),
    }


def _list_ids() -> dict[str, int]:
    """settings.BREVO_LISTS ids coerced to int, dropping any unset/blank ones."""
    out: dict[str, int] = {}
    for key, raw in (getattr(settings, "BREVO_LISTS", {}) or {}).items():
        try:
            if raw not in (None, ""):
                out[key] = int(raw)
        except (TypeError, ValueError):
            logger.warning("brevo.bad_list_id", extra={"key": key, "value": raw})
    return out


# ----- low-level list operations (list-management.ts) ----------------------


def add_contact_to_list(email: str, list_id: int, attributes: dict | None = None) -> bool:
    """Create/update a contact and assign it to `list_id`.

    Ports `addContactToList` (list-management.ts:15-54): POST /contacts with
    updateEnabled=true. A duplicate contact (400 duplicate_parameter) is treated
    as success.
    """
    if not _configured() or not email:
        return False
    try:
        resp = requests.post(
            f"{BREVO_API_URL}/contacts",
            headers=_headers(),
            json={
                "email": email,
                "listIds": [list_id],
                "attributes": attributes or {},
                "updateEnabled": True,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (200, 201, 204):
            return True
        if resp.status_code == 400:
            data = _safe_json(resp)
            if data.get("code") == "duplicate_parameter":
                return True  # contact already exists, updated
        logger.warning("brevo.add_to_list_failed", extra={
            "email": email, "list_id": list_id, "status": resp.status_code,
        })
        return False
    except Exception:
        logger.exception("brevo.add_to_list_error", extra={"email": email, "list_id": list_id})
        return False


def remove_contact_from_list(email: str, list_id: int) -> bool:
    """Remove a contact from `list_id`.

    Ports `removeContactFromList` (list-management.ts:59-99): POST
    /contacts/lists/{id}/contacts/remove. "Already removed / not in list"
    (400 invalid_parameter or "does not exist") is treated as success.
    """
    if not _configured() or not email:
        return False
    try:
        resp = requests.post(
            f"{BREVO_API_URL}/contacts/lists/{list_id}/contacts/remove",
            headers=_headers(),
            json={"emails": [email]},
            timeout=_TIMEOUT,
        )
        if resp.status_code in (200, 201, 204):
            return True
        if resp.status_code == 400:
            data = _safe_json(resp)
            msg = data.get("message") or ""
            if data.get("code") == "invalid_parameter" or "does not exist" in msg:
                return True  # not in list or already removed
        logger.warning("brevo.remove_from_list_failed", extra={
            "email": email, "list_id": list_id, "status": resp.status_code,
        })
        return False
    except Exception:
        logger.exception("brevo.remove_from_list_error", extra={"email": email, "list_id": list_id})
        return False


def delete_contact(email: str) -> bool:
    """Hard-delete the contact from Brevo entirely (all lists + data).

    Ports `deleteContact` (list-management.ts:338-370): DELETE
    /contacts/{email}. A missing contact (404 / document_not_found) is success.
    GDPR cleanup on account delete.
    """
    if not _configured() or not email:
        return False
    try:
        resp = requests.delete(
            f"{BREVO_API_URL}/contacts/{_quote(email)}",
            headers=_headers(),
            timeout=_TIMEOUT,
        )
        if resp.status_code in (200, 204):
            return True
        if resp.status_code == 404:
            return True  # not found / already deleted
        data = _safe_json(resp)
        if data.get("code") == "document_not_found":
            return True
        logger.warning("brevo.delete_contact_failed", extra={
            "email": email, "status": resp.status_code,
        })
        return False
    except Exception:
        logger.exception("brevo.delete_contact_error", extra={"email": email})
        return False


def move_contact_between_lists(email: str, from_key: str | None, to_key: str,
                               attributes: dict | None = None) -> bool:
    """Remove from one list (if given) then add to another.

    Ports `moveContactBetweenLists` (list-management.ts:105-138). `from_key`/
    `to_key` are BREVO_LISTS keys (USERS/EMPTYPROFILE/NOSERVICES/ACTIVEPROS).
    """
    if not _configured() or not email:
        return False
    lists = _list_ids()
    to_id = lists.get(to_key)
    if to_id is None:
        logger.warning("brevo.missing_list_id", extra={"key": to_key})
        return False
    if from_key is not None:
        from_id = lists.get(from_key)
        if from_id is not None:
            remove_contact_from_list(email, from_id)
    return add_contact_to_list(email, to_id, attributes)


def first_service_created(user) -> None:
    """First non-draft service: move NOSERVICES → ACTIVEPROS.

    Ports `onFirstServiceCreated` (list-management.ts:211-226), invoked from
    OLD create-service.ts:398 / update-service.ts:448 when the user's first
    non-draft service is submitted. Best-effort.
    """
    if not _configured():
        return
    email = getattr(user, "email", None)
    if not email:
        return
    attributes = {
        "DISPLAY_NAME": user.display_name or None,
        "USERNAME": user.username or None,
        "USER_TYPE": user.type,
        "USER_ROLE": user.role,
    }
    attributes = {k: v for k, v in attributes.items() if v is not None}
    move_contact_between_lists(email, "NOSERVICES", "ACTIVEPROS", attributes)


# ----- state-change sync (workflows.ts handleUserStateChange) --------------


def sync_user_to_correct_list(user) -> None:
    """Re-evaluate a user's correct Brevo list and ensure they're in exactly it.

    Ports `syncUserToCorrectList` (list-management.ts:277-331) +
    `handleUserStateChange`'s state fetch (workflows.ts:370-434). Best-effort:
    NO-OP when Brevo unconfigured, never raises.
    """
    if not _configured():
        logger.info("brevo.sync skipped (not configured)", extra={"user_id": getattr(user, "id", None)})
        return

    email = getattr(user, "email", None)
    if not email:
        return

    from apps.accounts.models.user import UserType

    lists = _list_ids()
    all_ids = list(lists.values())

    attributes = {
        "DISPLAY_NAME": user.display_name or user.username or None,
        "USERNAME": user.username or None,
        "USER_TYPE": user.type,
        "USER_ROLE": user.role,
    }
    attributes = {k: v for k, v in attributes.items() if v is not None}

    try:
        # Blocked/banned → remove from all lists (list-management.ts:293-298).
        if user.blocked or user.banned:
            for list_id in all_ids:
                remove_contact_from_list(email, list_id)
            return

        # Resolve the user's profile state for the pro branches.
        published_count = 0
        has_complete_profile = False
        if user.type == UserType.PRO:
            try:
                from apps.profiles.models.profile import Profile
                from apps.services.models import ServiceStatus

                profile = Profile.objects.filter(user_id=user.id).first()
                if profile is not None:
                    has_complete_profile = bool(
                        profile.image and profile.category and profile.subcategory
                    )
                    published_count = profile.services.filter(
                        status=ServiceStatus.PUBLISHED
                    ).count()
            except ImportError:
                pass

        # Determine the correct list key (list-management.ts:300-316).
        if user.type == UserType.PRO:
            if user.step != "DASHBOARD" or not has_complete_profile:
                correct_key = "EMPTYPROFILE"
            elif published_count == 0:
                correct_key = "NOSERVICES"
            else:
                correct_key = "ACTIVEPROS"
        else:
            correct_key = "USERS"

        correct_id = lists.get(correct_key)
        if correct_id is None:
            logger.warning("brevo.missing_list_id", extra={"key": correct_key})
            return

        # Remove from every other list, then add to the correct one
        # (list-management.ts:318-326).
        for list_id in all_ids:
            if list_id != correct_id:
                remove_contact_from_list(email, list_id)
        add_contact_to_list(email, correct_id, attributes)
    except Exception:
        # Mirror OLD: Brevo sync must never block the main operation.
        logger.exception("brevo.sync_error", extra={"user_id": getattr(user, "id", None)})


# ----- helpers -------------------------------------------------------------


def _safe_json(resp) -> dict:
    try:
        return resp.json() or {}
    except Exception:
        return {}


def _quote(value: str) -> str:
    from urllib.parse import quote
    return quote(value, safe="")
