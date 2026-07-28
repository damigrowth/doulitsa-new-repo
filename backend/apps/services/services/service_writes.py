"""Service create / update / delete / archive / refresh.

Mirrors:
- `actions/services/create-service.ts`  (createServiceAction + draft)
- `actions/services/delete-service.ts`  (deleteService + archiveService)
- `actions/services/update-service.ts`  (updateServiceMedia + updateServiceInfo)
- `actions/services/refresh-service.ts` (refresh with rate limit)
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import re

from django.db import transaction

from apps.accounts.models import User
from apps.core import taxonomy
from apps.services.models import Service, ServiceStatus
from common.exceptions import ApiError, FieldErrors
from common.utils.cloudinary import sanitize_resources
from common.utils.normalize import normalize_term
from common.utils.slug import generate_service_slug

logger = logging.getLogger(__name__)

REFRESH_PER_SERVICE_COOLDOWN = timedelta(hours=24)
# Manual-refresh daily cap per plan (SUBSCRIPTION_PLANS.maxDailyRefreshes):
# free 3/day, promoted unlimited.
FREE_REFRESH_DAILY_LIMIT = 3
DRAFT_RATE_LIMIT = timedelta(seconds=30)


def _refresh_daily_limit(user: User) -> int | None:
    """None = unlimited (promoted plan)."""
    from apps.services.selectors.service_reads import _active_plan
    return None if _active_plan(user) == "promoted" else FREE_REFRESH_DAILY_LIMIT


def _strip_html_tags(html: str | None) -> str:
    """Mirror OLD `stripHtmlTags` (utils/text/html.ts): drop tags, trim. Used to
    build descriptionNormalized from the HTML description, exactly like OLD."""
    if not html:
        return ""
    return re.sub(r"<[^>]*>", "", html).strip()


def _sanitize_description(html: str | None) -> str:
    """Sanitize the rich-text description, mirroring OLD `sanitizeRichText`
    (utils/text/sanitize.ts): a strict tag/attr/scheme whitelist matching the
    Tiptap editor output. Prevents stored XSS — the FE renders this via
    `dangerouslySetInnerHTML`. `bleach` is installed (6.x); the profiles app's
    bio sanitizer uses the same library."""
    if not html:
        return ""
    import bleach

    return bleach.clean(
        html,
        tags=["p", "strong", "em", "h2", "h3", "ul", "ol", "li", "br", "img"],
        attributes={"img": ["src", "alt", "width", "height"]},
        protocols=["https"],
        strip=True,
    )


# Map each taxonomy level to its Service `*_node` FK attribute name. The READ
# side filters listings/archive/nav on these FK columns (service_reads.py
# `_apply_filters`, `get_categories_page`, `get_featured_services`), so the WRITE
# side must populate them or new/edited services never appear in any listing.
_NODE_LEVEL_ATTRS = {
    "category": "category_node_id",
    "subcategory": "subcategory_node_id",
    "subdivision": "subdivision_node_id",
}


def _resolve_node_id(level: str, value: str | None) -> str | None:
    """Resolve a stored taxonomy string (slug or id) to its service-space
    TaxonomyNode id — the exact resolver the READ side uses
    (`taxonomy.taxonomy_node_ids("service", level, value)`). Takes the first
    matching node id, or None when unresolved (collision/legacy-tolerant)."""
    if not value:
        return None
    ids = taxonomy.taxonomy_node_ids("service", level, value)
    return ids[0] if ids else None


def _apply_node_fks(service: Service, taxonomy_values: dict[str, str | None]) -> None:
    """Set the `*_node` FK for each taxonomy level present in `taxonomy_values`.
    Pass only the levels you intend to (re)resolve — on partial update we resolve
    just the levels whose string the form actually sent."""
    for level, fk_attr in _NODE_LEVEL_ATTRS.items():
        if level in taxonomy_values:
            setattr(service, fk_attr, _resolve_node_id(level, taxonomy_values[level]))


def _require_profile(user: User):
    if not user.is_professional():
        raise ApiError(
            "Δεν έχετε δικαίωμα δημιουργίας υπηρεσιών",
            code="not_professional",
            status_code=403,
        )
    try:
        from apps.profiles.models import Profile
    except ImportError as exc:
        raise ApiError("Profiles app required", code="dependency", status_code=500) from exc
    profile = Profile.objects.filter(user_id=user.id).first()
    if profile is None:
        raise ApiError(
            "Πρέπει να ολοκληρώσεις το προφίλ σου πρώτα",
            code="profile_missing",
            status_code=400,
        )
    return profile


def _common_service_fields(payload: dict[str, Any]) -> dict[str, Any]:
    title = (payload.get("title") or "").strip()
    # OLD create/draft sanitize the rich-text description with sanitizeRichText
    # and derive descriptionNormalized from the *stripped* HTML
    # (create-service.ts:237/315), not the raw markup.
    description = _sanitize_description((payload.get("description") or "").strip())
    return {
        "title": title,
        "description": description,
        "title_normalized": normalize_term(title),
        "description_normalized": normalize_term(_strip_html_tags(description)),
        "category": payload.get("category"),
        "subcategory": payload.get("subcategory"),
        "subdivision": payload.get("subdivision"),
        "tags": payload.get("tags") or [],
        "fixed": bool(payload.get("fixed")),
        "price": payload.get("price") or 0,
        "type": payload.get("type") or {},
        "subscription_type": payload.get("subscriptionType"),
        "duration": payload.get("duration") or 0,
        "addons": payload.get("addons") or [],
        "faq": payload.get("faq") or [],
        # OLD sanitizes media via sanitizeCloudinaryResources before persisting on
        # both create and draft (create-service.ts:207, 270/348), stripping
        # _pending/pending_*/blob: junk.
        "media": sanitize_resources(payload.get("media")) if payload.get("media") is not None else None,
    }


def _validate_required(payload: dict[str, Any]) -> None:
    errors = {}
    if not payload.get("title") or len(payload["title"]) < 5:
        errors["title"] = ["Ο τίτλος είναι υποχρεωτικός (≥5 χαρ.)"]
    if not payload.get("description") or len(payload["description"]) < 20:
        errors["description"] = ["Η περιγραφή είναι υποχρεωτική (≥20 χαρ.)"]
    if not payload.get("category"):
        errors["category"] = ["Επίλεξε κατηγορία"]
    if not payload.get("subcategory"):
        errors["subcategory"] = ["Επίλεξε υποκατηγορία"]
    if not payload.get("subdivision"):
        errors["subdivision"] = ["Επίλεξε υποτμήμα"]
    if errors:
        raise FieldErrors(details=errors)


def create_service(*, user: User, payload: dict[str, Any]) -> Service:
    """Submit a new service for moderation. Mirrors createServiceAction."""
    profile = _require_profile(user)
    _validate_required(payload)

    # Plan limit gate (create-service.ts:102 `canCreateService`).
    from apps.services.selectors.service_reads import _can_create_more
    if not _can_create_more(user):
        raise ApiError(
            "Έχετε φτάσει το μέγιστο όριο υπηρεσιών για το πλάνο σας.",
            code="service_limit_reached",
            status_code=403,
        )

    with transaction.atomic():
        now = datetime.now(timezone.utc)
        service = Service.objects.create(
            profile=profile,
            status=ServiceStatus.PENDING,
            sort_date=now,
            **_common_service_fields(payload),
        )
        service.slug = generate_service_slug(service.title, service.id)
        # Populate the taxonomy `*_node` FKs so the new service is visible in
        # every category/archive/nav listing (which filter on these columns).
        _apply_node_fks(service, {
            "category": payload.get("category"),
            "subcategory": payload.get("subcategory"),
            "subdivision": payload.get("subdivision"),
        })
        service.save(update_fields=[
            "slug", "category_node", "subcategory_node", "subdivision_node",
        ])

        profile.last_service_draft = now
        profile.save(update_fields=["last_service_draft", "updated_at"])

    # OLD create-service.ts:379-409: notify admin of the new (non-draft) service,
    # and if it's the user's FIRST non-draft service move NOSERVICES → ACTIVEPROS.
    _notify_service_submitted(user=user, profile=profile, service=service)
    logger.info("service_created", extra={"service_id": service.id, "profile_id": profile.id})
    return service


def _notify_service_submitted(*, user: User, profile, service: Service) -> None:
    """Best-effort post-commit hooks for a new/transitioned non-draft service.

    Mirrors OLD create-service.ts:379-409 / update-service.ts:421-465:
      1. send the SERVICE_CREATED admin email;
      2. if this is the user's first non-draft service, move them to the
         ACTIVEPROS Brevo list (handleFirstServiceCreated).
    Never raises — a queue/import hiccup must not break the write.
    """
    try:
        from apps.messaging.tasks import brevo_first_service, send_service_created_email

        send_service_created_email.delay(service.id)

        non_draft_count = profile.services.exclude(status=ServiceStatus.DRAFT).count()
        if non_draft_count == 1 and user.email:
            brevo_first_service.delay(user.id)
    except Exception:  # pragma: no cover - defensive
        logger.exception("service_submit_hooks.failed", extra={"service_id": service.id})


def save_service_as_draft(*, user: User, payload: dict[str, Any]) -> Service:
    """30-second rate-limit between drafts (per Profile.last_service_draft)."""
    profile = _require_profile(user)

    if profile.last_service_draft:
        elapsed = datetime.now(timezone.utc) - profile.last_service_draft
        if elapsed < DRAFT_RATE_LIMIT:
            raise ApiError(
                "Περίμενε λίγο πριν αποθηκεύσεις ξανά",
                code="draft_throttled",
                status_code=429,
            )

    # OLD draft defaults a blank title to 'untitled' (create-service.ts:284);
    # description/media/etc. are sanitized & normalized by _common_service_fields.
    title = (payload.get("title") or "Untitled").strip()
    now = datetime.now(timezone.utc)
    with transaction.atomic():
        service = Service.objects.create(
            profile=profile,
            status=ServiceStatus.DRAFT,
            sort_date=now,
            **{
                **_common_service_fields(payload),
                "title": title,
                "title_normalized": normalize_term(title),
            },
        )
        # OLD draft create generates a slug from title+id (create-service.ts:284).
        service.slug = generate_service_slug(service.title, service.id)
        # Resolve taxonomy `*_node` FKs (None when a draft hasn't picked a level
        # yet) so a draft published later via update is listing-visible.
        _apply_node_fks(service, {
            "category": payload.get("category"),
            "subcategory": payload.get("subcategory"),
            "subdivision": payload.get("subdivision"),
        })
        service.save(update_fields=[
            "slug", "category_node", "subcategory_node", "subdivision_node",
        ])

        profile.last_service_draft = now
        profile.save(update_fields=["last_service_draft", "updated_at"])
    return service


# Validated-payload key (camelCase) → Service model attribute (snake_case) for
# the PARTIAL info update. `media` is deliberately ABSENT: media has its own
# `updateServiceMedia` endpoint and the info form never re-sends it, so touching
# it here would wipe every photo/video (OLD update-service.ts excludes media from
# the info path). `title`/`description` are handled specially (slug/normalized).
_INFO_DIRECT_FIELDS = {
    "category": "category",
    "subcategory": "subcategory",
    "subdivision": "subdivision",
    "tags": "tags",
    "price": "price",
    "fixed": "fixed",
    "type": "type",
    "duration": "duration",
    "addons": "addons",
    "faq": "faq",
}


def update_service_info(*, user: User, service_id: int, payload: dict[str, Any]) -> Service:
    """PARTIAL update of service fields. Mirrors `updateServiceInfo`
    (update-service.ts:190): builds the update set ONLY from fields actually
    present in the validated payload (never clobbering unsent fields), and NEVER
    touches `media` (that has its own endpoint — editing info must not wipe
    photos). Transitions DRAFT → PENDING when the service is publish-ready,
    regenerates the slug when the title changes, and applies the car.gr
    "refresh-on-edit" boost when the user has refresh credits and the service is
    >24h since its last refresh."""
    profile = _require_profile(user)
    service = _owner_or_404(service_id, profile)

    was_draft = service.status == ServiceStatus.DRAFT
    title_provided = "title" in payload and bool((payload.get("title") or "").strip())

    # Effective publish-ready values = payload value when sent, else the service's
    # currently-stored value (a draft being published may not re-send every
    # field). Used only to gate the draft→pending transition.
    def _eff(key: str, attr: str) -> Any:
        return payload[key] if key in payload else getattr(service, attr)

    eff_title = (_eff("title", "title") or "").strip()
    eff_desc_raw = _eff("description", "description") or ""
    eff_desc_len = len(_strip_html_tags(eff_desc_raw))
    transitioning = (
        was_draft
        and len(eff_title) >= 5
        and eff_desc_len >= 20
        and bool(_eff("category", "category"))
        and bool(_eff("subcategory", "subcategory"))
        and bool(_eff("subdivision", "subdivision"))
    )

    # Plan limit gate on the draft→pending transition (update-service.ts:245).
    if was_draft:
        from apps.services.selectors.service_reads import _can_create_more
        if not _can_create_more(user):
            raise ApiError(
                "Έχετε φτάσει το μέγιστο όριο υπηρεσιών για το πλάνο σας.",
                code="service_limit_reached",
                status_code=403,
            )

    # car.gr refresh-on-edit eligibility (update-service.ts:255-278).
    now = datetime.now(timezone.utc)
    today = now.date()
    last_day = (
        profile.last_service_refresh_date.date() if profile.last_service_refresh_date else None
    )
    current_daily = profile.daily_service_refresh_count or 0
    if last_day != today:
        current_daily = 0
    daily_limit = _refresh_daily_limit(user)
    has_credits = daily_limit is None or current_daily < daily_limit
    service_24h_passed = (
        not service.refreshed_at
        or (now - service.refreshed_at) >= REFRESH_PER_SERVICE_COOLDOWN
    )
    can_refresh = has_credits and service_24h_passed

    # Track which DB columns we touch so save(update_fields=...) only writes the
    # fields the form actually changed (a true partial update).
    changed: set[str] = set()
    # Resolve taxonomy `*_node` FKs only for the levels whose string was re-sent,
    # keeping new/edited services visible in every category/archive/nav listing.
    node_levels: dict[str, str | None] = {}

    with transaction.atomic():
        for key, attr in _INFO_DIRECT_FIELDS.items():
            if key in payload:
                setattr(service, attr, payload[key])
                changed.add(attr)
                if key in _NODE_LEVEL_ATTRS:
                    node_levels[key] = payload[key]

        if "subscriptionType" in payload:
            # OLD: `value || null` (update-service.ts:377).
            service.subscription_type = payload["subscriptionType"] or None
            changed.add("subscription_type")

        if "title" in payload:
            title = (payload["title"] or "").strip()
            service.title = title
            service.title_normalized = normalize_term(title)
            changed.update(["title", "title_normalized"])

        if "description" in payload:
            # OLD: sanitizeRichText + descriptionNormalized from stripped HTML
            # (update-service.ts:359-360).
            desc = _sanitize_description((payload["description"] or "").strip())
            service.description = desc
            service.description_normalized = normalize_term(_strip_html_tags(desc))
            changed.update(["description", "description_normalized"])

        if node_levels:
            _apply_node_fks(service, node_levels)
            changed.update(
                _NODE_LEVEL_ATTRS[level].removesuffix("_id") for level in node_levels
            )

        # Regenerate slug when the title changes (update-service.ts:351), or
        # backfill a missing slug.
        if title_provided or not service.slug:
            service.slug = generate_service_slug(service.title, service.id)
            changed.add("slug")

        if transitioning:
            service.status = ServiceStatus.PENDING
            changed.add("status")
        if can_refresh:
            service.refreshed_at = now
            service.sort_date = now
            changed.update(["refreshed_at", "sort_date"])

        if changed:
            changed.add("updated_at")
            service.save(update_fields=list(changed))

        if can_refresh:
            profile.daily_service_refresh_count = current_daily + 1
            profile.last_service_refresh_date = now
            profile.save(update_fields=[
                "daily_service_refresh_count", "last_service_refresh_date", "updated_at",
            ])

    if transitioning:
        # OLD update-service.ts:421-465: draft → pending fires the same admin
        # notification + first-service Brevo move as a fresh non-draft create.
        _notify_service_submitted(user=user, profile=profile, service=service)
    return service


def update_service_media(*, user: User, service_id: int, media: list[dict]) -> Service:
    profile = _require_profile(user)
    service = _owner_or_404(service_id, profile)
    # OLD updateServiceMedia filters out pending/blob resources before persist
    # (update-service.ts:139-144): `validData.media?.filter(...) ?? null`. The
    # `?? null` only fires when media itself is absent — an empty filter result
    # stays as `[]`.
    from common.utils.cloudinary import sanitize_resources
    service.media = sanitize_resources(media) if media is not None else None
    service.save(update_fields=["media", "updated_at"])
    return service


def archive_service(*, user: User, service_id: int) -> None:
    profile = _require_profile(user)
    service = _owner_or_404(service_id, profile)
    service.status = ServiceStatus.INACTIVE
    service.save(update_fields=["status", "updated_at"])


def delete_service(*, user: User, service_id: int) -> None:
    profile = _require_profile(user)
    service = _owner_or_404(service_id, profile)
    service.delete()


def refresh_service(*, user: User, service_id: int) -> dict[str, Any]:
    """Boost service to top of listings. Rate-limited per-service (24h) and
    per-user per-plan (free 3/day, promoted unlimited). Mirrors refresh-service.ts."""
    profile = _require_profile(user)
    service = _owner_or_404(service_id, profile)

    now = datetime.now(timezone.utc)

    # Per-service 24h cooldown
    if service.refreshed_at and now - service.refreshed_at < REFRESH_PER_SERVICE_COOLDOWN:
        remaining = REFRESH_PER_SERVICE_COOLDOWN - (now - service.refreshed_at)
        raise ApiError(
            "Αυτή η υπηρεσία ανανεώθηκε πρόσφατα",
            code="service_refresh_cooldown",
            status_code=429,
            details={"retryAfterSeconds": int(remaining.total_seconds())},
        )

    # Per-user 10/day limit
    today = now.date()
    last_day = profile.last_service_refresh_date.date() if profile.last_service_refresh_date else None
    if last_day != today:
        profile.daily_service_refresh_count = 0

    daily_limit = _refresh_daily_limit(user)
    if daily_limit is not None and profile.daily_service_refresh_count >= daily_limit:
        raise ApiError(
            f"Όριο {daily_limit} ανανεώσεων ανά ημέρα",
            code="daily_refresh_limit",
            status_code=429,
            details={"remainingRefreshes": 0},
        )

    with transaction.atomic():
        service.refreshed_at = now
        service.sort_date = now
        service.save(update_fields=["refreshed_at", "sort_date", "updated_at"])

        profile.last_service_refresh_date = now
        profile.daily_service_refresh_count += 1
        profile.save(update_fields=[
            "last_service_refresh_date", "daily_service_refresh_count", "updated_at",
        ])

    return {
        "refreshedAt": service.refreshed_at.isoformat(),
        # Promoted (unlimited) mirrors OLD refresh-service.ts:142-144 → 0.
        "remainingRefreshes": (
            max(daily_limit - profile.daily_service_refresh_count, 0)
            if daily_limit is not None
            else 0
        ),
    }


def _owner_or_404(service_id: int, profile) -> Service:
    service = Service.objects.filter(id=service_id, profile=profile).first()
    if service is None:
        raise ApiError("Service not found", code="service_not_found", status_code=404)
    return service
