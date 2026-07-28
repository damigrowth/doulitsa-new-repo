"""Admin service operations (rows 189-204)."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from django.db import transaction
from django.db.models import Count

from apps.services.models import Service, ServiceStatus
from common.exceptions import ApiError

logger = logging.getLogger(__name__)


def list_services(filters: dict[str, Any]) -> dict[str, Any]:
    """Mirrors OLD `listServices` (admin/services.ts:137-329)."""
    from django.db.models import Q

    from common.utils.normalize import normalize_term

    qs = Service.objects.select_related("profile").all()

    # Search: accent-normalized title/description plus profile displayName /
    # username (case-insensitive), plus exact id when the query is numeric
    # (admin/services.ts:165-189).
    search_query = filters.get("searchQuery")
    if search_query:
        normalized = normalize_term(search_query)
        cond = (
            Q(title_normalized__contains=normalized)
            | Q(description_normalized__contains=normalized)
            | Q(profile__display_name__icontains=search_query)
            | Q(profile__username__icontains=search_query)
        )
        if str(search_query).isdigit():
            cond |= Q(id=int(search_query))
        qs = qs.filter(cond)

    # status / category / subcategory / subdivision / subscriptionType: plain
    # equality, skipping 'all' (admin/services.ts:192-232).
    for col in ("status", "category", "subcategory", "subdivision", "subscriptionType"):
        v = filters.get(col)
        if v is not None and v != "" and v != "all":
            db_col = "subscription_type" if col == "subscriptionType" else col
            qs = qs.filter(**{db_col: v})

    # type filter: JSON path equals true — `where.type = { path:[type], equals:true }`
    # (admin/services.ts:215-220). Match services where type.<key> is true.
    type_filter = filters.get("type")
    if type_filter and type_filter != "all":
        qs = qs.filter(**{f"type__{type_filter}": True})

    # Featured filter sends 'featured' / 'not-featured' (admin/services.ts:208-212).
    featured = filters.get("featured")
    if featured == "featured":
        qs = qs.filter(featured=True)
    elif featured == "not-featured":
        qs = qs.filter(featured=False)

    # Pricing filter: `pricing=fixed` / `pricing=not-fixed` → `fixed` boolean
    # (admin/services.ts:223-227).
    pricing = filters.get("pricing")
    if pricing == "fixed":
        qs = qs.filter(fixed=True)
    elif pricing == "not-fixed":
        qs = qs.filter(fixed=False)

    # profileId → pid (admin/services.ts:235-237).
    if profile_id := filters.get("profileId"):
        qs = qs.filter(profile_id=profile_id)

    # Default sort: createdAt desc (admin validations sortBy default 'createdAt').
    sort = filters.get("sortBy") or "createdAt"
    direction = filters.get("sortDirection") or "desc"
    sort_col = {
        "createdAt": "created_at", "updatedAt": "updated_at",
        "rating": "rating", "title": "title", "price": "price",
    }.get(sort, "created_at")
    if direction == "desc":
        sort_col = f"-{sort_col}"
    qs = qs.order_by(sort_col)

    limit = max(1, min(100, int(filters.get("limit", 10))))
    offset = max(0, int(filters.get("offset", 0)))
    total = qs.count()
    rows = list(qs[offset:offset + limit])
    return {
        "services": [_admin_row(s) for s in rows],
        "total": total,
        "page": (offset // limit) + 1,
        "limit": limit,
        "offset": offset,
        "totalPages": -(-total // limit) if limit else 0,
    }


def _admin_row(s: Service) -> dict[str, Any]:
    profile = getattr(s, "profile", None)
    return {
        "id": s.id,
        "slug": s.slug,
        "title": s.title,
        "category": s.category,
        "subcategory": s.subcategory,
        "subdivision": s.subdivision,
        "tags": s.tags or [],
        "fixed": s.fixed,
        "price": s.price,
        "type": s.type,
        "subscriptionType": s.subscription_type,
        "duration": s.duration,
        "media": s.media,
        "featured": s.featured,
        "rating": s.rating,
        "reviewCount": s.review_count,
        "status": s.status,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
        "updatedAt": s.updated_at.isoformat() if s.updated_at else None,
        "refreshedAt": s.refreshed_at.isoformat() if s.refreshed_at else None,
        "profile": {
            "id": profile.id if profile else None,
            "username": profile.username if profile else None,
            "displayName": profile.display_name if profile else None,
        } if profile else None,
    }


def get_service_detail(service_id: int) -> dict[str, Any] | None:
    s = Service.objects.select_related("profile").filter(id=service_id).first()
    if s is None:
        return None
    out = _admin_row(s)
    try:
        from apps.reviews.models import Review
        reviews_qs = Review.objects.filter(service_id=service_id).order_by("-created_at")[:10]
        out["recentReviews"] = [{
            "id": r.id, "rating": r.rating, "comment": r.comment,
            "status": r.status, "createdAt": r.created_at.isoformat() if r.created_at else None,
        } for r in reviews_qs]
        out["reviewsCount"] = Review.objects.filter(service_id=service_id).count()
    except ImportError:
        out["recentReviews"] = []
        out["reviewsCount"] = 0
    return out


def update_service_fields(*, service_id: int, fields: dict[str, Any]) -> Service:
    # OLD updateService (admin/services.ts:400-448) regenerates slug +
    # titleNormalized on title change and runs sanitizeRichText +
    # descriptionNormalized on description change — reuse the owner-path
    # helpers so admin edits behave identically.
    from apps.services.services.service_writes import (
        _sanitize_description,
        _strip_html_tags,
    )
    from common.utils.normalize import normalize_term
    from common.utils.slug import generate_service_slug

    service = _or_404(service_id)
    mapping = {
        "status": "status", "category": "category",
        "subcategory": "subcategory", "subdivision": "subdivision",
        "tags": "tags", "price": "price", "fixed": "fixed",
        "duration": "duration", "type": "type",
        "subscriptionType": "subscription_type",
        "featured": "featured", "addons": "addons", "faq": "faq",
        "media": "media", "slug": "slug",
    }
    updates: list[str] = []
    title_changed = False
    for k, v in fields.items():
        if v is None:
            continue
        if k == "title":
            title = str(v).strip()
            service.title = title
            service.title_normalized = normalize_term(title)
            updates += ["title", "title_normalized"]
            title_changed = True
        elif k == "description":
            desc = _sanitize_description(str(v).strip())
            service.description = desc
            service.description_normalized = normalize_term(_strip_html_tags(desc))
            updates += ["description", "description_normalized"]
        elif k in mapping:
            setattr(service, mapping[k], v)
            updates.append(mapping[k])
    # Regenerate the slug when the title changed and no explicit slug was sent
    # (admin/services.ts:638).
    if title_changed and not fields.get("slug"):
        service.slug = generate_service_slug(service.title, service.id)
        if "slug" not in updates:
            updates.append("slug")
    if updates:
        updates.append("updated_at")
        service.save(update_fields=updates)
    return service


def update_status(*, service_id: int, status: str, rejection_reason: str | None = None) -> Service:
    if status not in dict(ServiceStatus.choices):
        from common.exceptions import FieldErrors
        raise FieldErrors(details={"status": ["Άκυρο status"]})
    service = _or_404(service_id)
    previous_status = service.status
    service.status = status
    service.save(update_fields=["status", "updated_at"])
    _notify_status_change(service=service, previous_status=previous_status, new_status=status)
    return service


def _notify_status_change(*, service: Service, previous_status: str, new_status: str) -> None:
    """Owner email + Brevo list re-sync on admin status change.

    Ports OLD `updateServiceStatus` (admin/services.ts:1266-1348):
      - published                       → email the OWNER (sendServicePublishedEmail);
                                          if it came from 'draft' and is the first
                                          non-draft service, move NOSERVICES → ACTIVEPROS.
      - pending  (from 'draft')         → first-service Brevo move (no email).
      - rejected/inactive/draft (from 'published') → re-sync the owner's list
                                          (published count dropped).
    OLD sends NO owner email on reject/inactive/draft — we don't either.
    Best-effort: never raises.
    """
    try:
        from apps.messaging.tasks import (
            brevo_first_service,
            brevo_state_change,
            send_service_published_email,
        )

        profile = getattr(service, "profile", None)
        user = getattr(profile, "user", None) if profile else None

        if new_status == ServiceStatus.PUBLISHED:
            if user is not None and user.email:
                send_service_published_email.delay(service.id)
            if previous_status == ServiceStatus.DRAFT and user is not None and user.email:
                non_draft = profile.services.exclude(status=ServiceStatus.DRAFT).count()
                if non_draft == 1:
                    brevo_first_service.delay(user.id)
        elif new_status == ServiceStatus.PENDING and previous_status == ServiceStatus.DRAFT:
            if user is not None and user.email:
                non_draft = profile.services.exclude(status=ServiceStatus.DRAFT).count()
                if non_draft == 1:
                    brevo_first_service.delay(user.id)
        elif (
            new_status in (ServiceStatus.REJECTED, ServiceStatus.INACTIVE, ServiceStatus.DRAFT)
            and previous_status == ServiceStatus.PUBLISHED
            and user is not None
        ):
            brevo_state_change.delay(user.id, "service_status_changed")
    except Exception:  # pragma: no cover - defensive
        logger.exception("service_status_hooks.failed", extra={"service_id": service.id})


def toggle_featured(service_id: int) -> Service:
    service = _or_404(service_id)
    service.featured = not service.featured
    service.save(update_fields=["featured", "updated_at"])
    return service


def toggle_published(service_id: int) -> Service:
    # OLD togglePublished (admin/services.ts:1002-1108) sends the owner email +
    # Brevo first-service move when the toggle lands on 'published' — same
    # hooks as updateServiceStatus, so route through _notify_status_change.
    service = _or_404(service_id)
    previous_status = service.status
    new_status = (
        ServiceStatus.DRAFT
        if service.status == ServiceStatus.PUBLISHED
        else ServiceStatus.PUBLISHED
    )
    service.status = new_status
    service.save(update_fields=["status", "updated_at"])
    _notify_status_change(service=service, previous_status=previous_status, new_status=new_status)
    return service


def delete_service(service_id: int) -> None:
    service = _or_404(service_id)
    profile = getattr(service, "profile", None)
    owner_user_id = getattr(profile, "user_id", None)
    service.delete()
    # OLD deleteService (admin/services.ts:1376) re-syncs the owner's Brevo
    # list (may move PROS → NOSERVICES if that was the last published service).
    # Best-effort: never blocks the delete.
    if owner_user_id:
        try:
            from apps.messaging.tasks import brevo_state_change
            brevo_state_change.delay(owner_user_id, "service_deleted")
        except Exception:  # pragma: no cover - defensive
            logger.exception(
                "service_delete_brevo_sync.failed", extra={"user_id": owner_user_id}
            )


def create_for_profile(*, profile_id: str, payload: dict[str, Any]) -> Service:
    try:
        from apps.profiles.models import Profile
    except ImportError as exc:
        raise ApiError("Profiles app required", code="dependency", status_code=500) from exc
    profile = Profile.objects.select_related("user").filter(id=profile_id).first()
    if profile is None:
        raise ApiError("Profile not found", code="profile_not_found", status_code=404)

    # OLD only lets services be assigned to freelancer/company profiles
    # (admin/services.ts:1709-1714).
    from apps.accounts.models.user import UserRole
    owner = getattr(profile, "user", None)
    if not owner or owner.role not in (UserRole.FREELANCER, UserRole.COMPANY):
        raise ApiError(
            "Services can only be assigned to freelancers or companies",
            code="invalid_profile_role",
            status_code=400,
        )

    from apps.services.services.service_writes import _common_service_fields, _validate_required
    from common.utils.slug import generate_service_slug

    _validate_required(payload)
    with transaction.atomic():
        now = datetime.now(timezone.utc)
        service = Service.objects.create(
            profile=profile,
            status=ServiceStatus.PENDING,
            sort_date=now,
            **_common_service_fields(payload),
        )
        service.slug = generate_service_slug(service.title, service.id)
        service.save(update_fields=["slug"])
    _notify_admin_created(service=service, profile=profile)
    return service


def _notify_admin_created(*, service: Service, profile: Any) -> None:
    """Owner email + Brevo first-service move after admin-created service.

    Ports OLD `createServiceForProfile` (admin/services.ts:1833-1878): after
    creating the (pending) service it emails the OWNER (sendServicePublishedEmail)
    and, when this is the first non-draft service, moves NOSERVICES → ACTIVEPROS.
    Best-effort: never raises.
    """
    try:
        from apps.messaging.tasks import brevo_first_service, send_service_published_email

        user = getattr(profile, "user", None)
        if user is None or not user.email:
            return
        send_service_published_email.delay(service.id)
        non_draft = profile.services.exclude(status=ServiceStatus.DRAFT).count()
        if non_draft == 1:
            brevo_first_service.delay(user.id)
    except Exception:  # pragma: no cover - defensive
        logger.exception("service_create_hooks.failed", extra={"service_id": service.id})


def get_service_stats() -> dict[str, Any]:
    """Mirrors OLD `getServiceStats` (admin/services.ts:1447-1663)."""
    from apps.core.taxonomy import service_category_label, tag_label

    qs = Service.objects.all()

    # Status buckets — OLD includes approved + inactive (admin/services.ts:1456-1469).
    total = qs.count()
    published = qs.filter(status=ServiceStatus.PUBLISHED).count()
    draft = qs.filter(status=ServiceStatus.DRAFT).count()
    pending = qs.filter(status=ServiceStatus.PENDING).count()
    rejected = qs.filter(status=ServiceStatus.REJECTED).count()
    approved = qs.filter(status=ServiceStatus.APPROVED).count()
    inactive = qs.filter(status=ServiceStatus.INACTIVE).count()
    featured = qs.filter(featured=True).count()

    # Top taxonomy buckets (groupBy + take 1).
    top_cat = qs.values("category").annotate(c=Count("id")).order_by("-c").first()
    top_sub = qs.values("subcategory").annotate(c=Count("id")).order_by("-c").first()
    top_div = qs.values("subdivision").annotate(c=Count("id")).order_by("-c").first()

    # Service-type counts + tag counts + pricing (iterate JSON `type` + `tags`),
    # matching OLD's in-memory aggregation (admin/services.ts:1518-1583).
    service_types = {
        "presence": 0, "online": 0, "oneoff": 0,
        "onbase": 0, "subscription": 0, "onsite": 0,
    }
    tag_counts: dict[str, int] = {}
    fixed_count = 0
    not_fixed_count = 0
    subscription_type_counts = {
        "month": 0, "year": 0, "per_case": 0, "per_hour": 0, "per_session": 0,
    }
    total_duration = 0
    duration_count = 0
    total_price = 0
    price_count = 0

    for row in qs.values("type", "tags", "fixed", "subscription_type", "duration", "price"):
        t = row["type"] or {}
        if isinstance(t, dict):
            for key in service_types:
                if t.get(key):
                    service_types[key] += 1
        for tag in (row["tags"] or []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
        if row["fixed"]:
            fixed_count += 1
        else:
            not_fixed_count += 1
        st = row["subscription_type"]
        if st and st in subscription_type_counts:
            subscription_type_counts[st] += 1
        d = row["duration"]
        if d and d > 0:
            total_duration += d
            duration_count += 1
        p = row["price"]
        if p and p > 0:
            total_price += p
            price_count += 1

    average_duration = round(total_duration / duration_count) if duration_count else 0
    average_price = round(total_price / price_count) if price_count else 0

    # Top tag (highest count), with label resolution (admin/services.ts:1586-1611).
    top_tag_raw = None
    if tag_counts:
        name, count = max(tag_counts.items(), key=lambda kv: kv[1])
        top_tag_raw = {"name": name, "count": count}
    if top_tag_raw:
        label = tag_label(top_tag_raw["name"])
        top_tag = {"name": label or top_tag_raw["name"], "count": top_tag_raw["count"]}
    else:
        top_tag = None

    def _top(entry, key):
        if not entry or not entry[key]:
            return None
        return {
            "name": service_category_label(entry[key]) or entry[key],
            "count": entry["c"],
        }

    return {
        "total": total,
        "published": published,
        "draft": draft,
        "pending": pending,
        "rejected": rejected,
        "approved": approved,
        "inactive": inactive,
        "featured": featured,
        "topCategory": _top(top_cat, "category"),
        "topSubcategory": _top(top_sub, "subcategory"),
        "topSubdivision": _top(top_div, "subdivision"),
        "topTag": top_tag,
        "serviceTypes": service_types,
        "pricing": {
            "fixed": fixed_count,
            "notFixed": not_fixed_count,
            "subscriptionTypes": subscription_type_counts,
            "averageDuration": average_duration,
            "averagePrice": average_price,
        },
    }


def _or_404(service_id: int) -> Service:
    service = Service.objects.filter(id=service_id).first()
    if service is None:
        raise ApiError("Service not found", code="service_not_found", status_code=404)
    return service
