"""Admin profile + verification management (rows 184-188, 205-222).

Mirrors `actions/admin/profiles.ts` and `actions/admin/verifications.ts`.
"""
from __future__ import annotations

import logging
from typing import Any

from django.db import transaction
from django.db.models import Count, Q

from apps.profiles.models import Profile, ProfileVerification
from common.exceptions import ApiError, FieldErrors

logger = logging.getLogger(__name__)


# ----- Profiles -----------------------------------------------------------


def list_profiles(*, filters: dict[str, Any]) -> dict[str, Any]:
    qs = Profile.objects.select_related("user").annotate(
        _services_count=Count("services", distinct=True),
        _reviews_count=Count("reviews_received", distinct=True),
    ).all()

    search = filters.get("searchQuery")
    if search:
        qs = qs.filter(
            Q(username__icontains=search)
            | Q(display_name__icontains=search)
            | Q(user__email__icontains=search)
        )

    for field, col in (
        ("type", "type"),
        ("category", "category"),
        ("subcategory", "subcategory"),
        ("published", "published"),
        ("verified", "verified"),
        ("featured", "featured"),
        ("top", "top"),
    ):
        v = filters.get(field)
        if v is not None and v != "" and v != "all":
            qs = qs.filter(**{col: v})

    sort = filters.get("sortBy", "createdAt")
    direction = filters.get("sortDirection", "desc")
    sort_col = {
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        "displayName": "display_name",
        "rating": "rating",
        # Annotated counts (see the queryset above) — the admin table marks
        # `services` sortable (admin-profiles-data-table.tsx:147); OLD also
        # supported reviewCount.
        "services": "_services_count",
        "reviewCount": "_reviews_count",
    }.get(sort, "created_at")
    if direction == "desc":
        sort_col = f"-{sort_col}"
    qs = qs.order_by(sort_col)

    limit = max(1, min(100, int(filters.get("limit", 10))))
    offset = max(0, int(filters.get("offset", 0)))

    total = qs.count()
    rows = list(qs[offset:offset + limit])

    return {
        "profiles": [_admin_profile_row(p) for p in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def _admin_profile_row(p: Profile) -> dict[str, Any]:
    # `Profile.email` is usually NULL — the canonical email lives on the
    # related User row. Surface both so the admin table can show the user's
    # email without the frontend needing to make a second call.
    user = getattr(p, "user", None)
    return {
        "id": p.id,
        "uid": p.user_id,
        "username": p.username,
        "displayName": p.display_name,
        "email": p.email or (user.email if user else None),
        "user": {
            "id": user.id, "email": user.email, "name": user.name,
            "role": user.role, "blocked": user.blocked, "confirmed": user.confirmed,
        } if user else None,
        "type": p.type,
        "category": p.category,
        "subcategory": p.subcategory,
        "image": p.image,
        "published": p.published,
        "isActive": p.is_active,
        "verified": p.verified,
        "featured": p.featured,
        "top": p.top,
        "rating": p.rating,
        "reviewCount": p.review_count,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
        "updatedAt": p.updated_at.isoformat() if p.updated_at else None,
        "_count": {
            "services": getattr(p, "_services_count", 0) or 0,
            "reviews": getattr(p, "_reviews_count", 0) or 0,
        },
    }


def get_profile_detail(profile_id: str) -> dict[str, Any] | None:
    profile = (
        Profile.objects
        .select_related("user")
        .filter(id=profile_id)
        .first()
    )
    if profile is None:
        return None

    services_count = 0
    reviews_count = 0
    try:
        from apps.services.models import Service  # type: ignore
        services_count = Service.objects.filter(profile=profile).count()
    except ImportError:
        pass
    try:
        from apps.reviews.models import Review  # type: ignore
        reviews_count = Review.objects.filter(profile=profile).count()
    except ImportError:
        pass

    verification = ProfileVerification.objects.filter(profile=profile).first()

    payload = _admin_profile_row(profile)
    payload.update({
        "tagline": profile.tagline,
        "bio": profile.bio,
        "skills": profile.skills or [],
        "speciality": profile.speciality,
        "coverage": profile.coverage,
        "portfolio": profile.portfolio,
        "visibility": profile.visibility,
        "socials": profile.socials,
        "phone": profile.phone,
        "website": profile.website,
        "viber": profile.viber,
        "whatsapp": profile.whatsapp,
        "rate": profile.rate,
        "experience": profile.experience,
        "billing": profile.billing,
        "stars": profile.stars,
        "servicesCount": services_count,
        "reviewsCount": reviews_count,
        "verification": _verification_row(verification) if verification else None,
    })
    return payload


# ----- Admin section updates (rows 218-221) -------------------------------
# These mirror the OLD admin section actions under actions/admin/profiles/*.ts,
# which carried normalization / derivation / sanitization the generic PATCH
# dropped. We reuse the owner-path helpers from `profile_updates` (not the
# owner-path *functions*, which resolve the caller's own profile) so the admin
# path produces the same normalized columns as the public path.


def admin_update_basic_info(
    profile_id: str, *,
    tagline: str | None = None,
    bio: str | None = None,
    category: str | None = None,
    subcategory: str | None = None,
    speciality: str | None = None,
    skills: list[str] | None = None,
    **_ignored: Any,
) -> Profile:
    """Mirrors OLD actions/admin/profiles/basic-info.ts:120-133.

    OLD persists ONLY tagline (+ taglineNormalized), bio (+ bioNormalized via
    normalizeTerm on the RAW bio — no HTML strip/sanitize on the admin path),
    category, subcategory, speciality, skills. Note: OLD extracts `image` and
    `coverage` from the form but never writes them in the DB update — so we keep
    that quirk and ignore them here too.
    """
    from common.utils.normalize import normalize_term

    p = _get_or_404(profile_id)
    p.tagline = tagline
    p.tagline_normalized = normalize_term(tagline) if tagline else None
    p.bio = bio
    p.bio_normalized = normalize_term(bio) if bio else None
    p.category = category
    p.subcategory = subcategory
    p.speciality = speciality
    p.skills = skills or []
    p.save()
    return p


def admin_update_additional_info(
    profile_id: str, *,
    rate: int | None = None,
    commencement: str | None = None,
    contact_methods: list[str] | None = None,
    payment_methods: list[str] | None = None,
    settlement_methods: list[str] | None = None,
    budget: str | None = None,
    terms: str | None = None,
) -> Profile:
    """Mirrors OLD actions/admin/profiles/additional-info.ts:106-118.

    `experience` is derived from `commencement` (currentYear - year). OLD always
    writes every field (defaulting blanks to null/[]).
    """
    from apps.profiles.services.profile_updates import _years_since

    p = _get_or_404(profile_id)
    p.rate = rate
    p.commencement = commencement or None
    p.experience = _years_since(commencement) if commencement else None
    p.contact_methods = contact_methods or []
    p.payment_methods = payment_methods or []
    p.settlement_methods = settlement_methods or []
    p.budget = budget or None
    p.terms = terms or None
    p.save()
    return p


def admin_update_coverage(profile_id: str, *, coverage: dict) -> Profile:
    """Mirrors OLD actions/admin/profiles/coverage.ts:95-101 — regenerates the
    normalized coverage string (the generic PATCH skipped this, leaving stale
    geo-search data)."""
    from apps.profiles.services.profile_updates import _coverage_normalized

    p = _get_or_404(profile_id)
    p.coverage = coverage
    p.coverage_normalized = _coverage_normalized(coverage)
    p.save(update_fields=["coverage", "coverage_normalized", "updated_at"])
    return p


def admin_update_portfolio(profile_id: str, *, portfolio: list[dict]) -> Profile:
    """Mirrors OLD actions/admin/profiles/portfolio.ts:73-108 — sanitizes via
    sanitizeCloudinaryResources (drops pending/blob, strips _pending), then
    stores null (Prisma.DbNull) when the result is empty — NOT []."""
    from common.utils.cloudinary import sanitize_resources

    p = _get_or_404(profile_id)
    sanitized = sanitize_resources(portfolio)
    p.portfolio = sanitized if sanitized else None
    p.save(update_fields=["portfolio", "updated_at"])
    return p


def update_profile(profile_id: str, **fields: Any) -> Profile:
    profile = Profile.objects.filter(id=profile_id).first()
    if profile is None:
        raise ApiError("Το προφίλ δεν βρέθηκε", code="profile_not_found", status_code=404)

    update_fields = []
    for db_field, value in fields.items():
        if value is None:
            continue
        if not hasattr(profile, db_field):
            continue
        setattr(profile, db_field, value)
        update_fields.append(db_field)
    if update_fields:
        update_fields.append("updated_at")
        profile.save(update_fields=update_fields)
    return profile


def toggle_published(profile_id: str) -> Profile:
    p = _get_or_404(profile_id)
    p.published = not p.published
    p.save(update_fields=["published", "updated_at"])
    return p


def toggle_featured(profile_id: str) -> Profile:
    p = _get_or_404(profile_id)
    p.featured = not p.featured
    p.save(update_fields=["featured", "updated_at"])
    return p


def toggle_verified(profile_id: str) -> Profile:
    p = _get_or_404(profile_id)
    p.verified = not p.verified
    p.save(update_fields=["verified", "updated_at"])
    # Sync ProfileVerification row if it exists
    v = ProfileVerification.objects.filter(profile=p).first()
    if v:
        v.status = "APPROVED" if p.verified else "PENDING"
        v.save(update_fields=["status", "updated_at"])
    return p


def delete_profile(profile_id: str) -> dict[str, Any]:
    p = _get_or_404(profile_id)
    cascade = {"profileId": p.id, "uid": p.user_id}
    p.delete()
    return cascade


def search_profiles_for_selection(query: str, *, max_results: int = 50) -> list[dict[str, Any]]:
    # OLD searchProfilesForSelection (admin/profiles.ts:656-...): min-2-chars
    # guard; searches username | displayName | profile.email | user.email.
    query = (query or "").strip()
    if len(query) < 2:
        return []
    qs = (
        Profile.objects
        .filter(
            Q(username__icontains=query)
            | Q(display_name__icontains=query)
            | Q(email__icontains=query)
            | Q(user__email__icontains=query)
        )
        .filter(user__role__in=("freelancer", "company"))
        .order_by("display_name")[:max_results]
    )
    return [_admin_profile_row(p) for p in qs]


def get_profile_stats() -> dict[str, Any]:
    # OLD getProfileStats (actions/admin/profiles.ts:818-826) keys
    # professional/company off the PROFILE.type column ('freelancer'/'company'),
    # not user.role.
    return {
        "total": Profile.objects.count(),
        "published": Profile.objects.filter(published=True).count(),
        "featured": Profile.objects.filter(featured=True).count(),
        "verified": Profile.objects.filter(verified=True).count(),
        "unverified": Profile.objects.filter(verified=False).count(),
        "top": Profile.objects.filter(top=True).count(),
        "professional": Profile.objects.filter(type="freelancer").count(),
        "company": Profile.objects.filter(type="company").count(),
    }


def get_brevo_stats() -> dict[str, Any]:
    """Brevo list sizes — replicates OLD getBrevoListStats bucket logic
    (actions/admin/profiles.ts:860-925) instead of a coarse approximation.

    Buckets (keyed off User.type + User.step + published-service count):
      - users (simpleusers):  type == 'user'
      - emptyProfile:         type == 'pro' AND (no profile OR step != DASHBOARD)
      - noServices:           type == 'pro' AND profile AND step == DASHBOARD AND 0 published services
      - activePros (PROS):    type == 'pro' AND profile AND step == DASHBOARD AND >=1 published service
      - total = users + emptyProfile + noServices + activePros
    """
    from apps.accounts.models import JourneyStep, User, UserType

    simple_users = User.objects.filter(type=UserType.USER).count()

    pros_without_profile = User.objects.filter(
        type=UserType.PRO, profile__isnull=True
    ).count()
    pros_not_at_dashboard = (
        User.objects.filter(type=UserType.PRO, profile__isnull=False)
        .exclude(step=JourneyStep.DASHBOARD)
        .count()
    )
    empty_profile = pros_without_profile + pros_not_at_dashboard

    # Pros with a profile, at the DASHBOARD step: split by published-service count.
    no_services = 0
    active_pros = 0
    dashboard_pros = list(
        User.objects.filter(
            type=UserType.PRO, step=JourneyStep.DASHBOARD, profile__isnull=False
        ).values_list("profile__id", flat=True)
    )
    published_counts = {}
    try:
        from apps.services.models import Service, ServiceStatus
        rows = (
            Service.objects.filter(
                profile_id__in=dashboard_pros, status=ServiceStatus.PUBLISHED
            )
            .values("profile_id")
            .annotate(n=Count("id"))
        )
        published_counts = {r["profile_id"]: r["n"] for r in rows}
    except ImportError:
        pass
    for pid in dashboard_pros:
        if published_counts.get(pid, 0) == 0:
            no_services += 1
        else:
            active_pros += 1

    return {
        "users": simple_users,
        "emptyProfile": empty_profile,
        "noServices": no_services,
        "activePros": active_pros,
        "total": simple_users + empty_profile + no_services + active_pros,
    }


def _get_or_404(profile_id: str) -> Profile:
    p = Profile.objects.filter(id=profile_id).first()
    if p is None:
        raise ApiError("Το προφίλ δεν βρέθηκε", code="profile_not_found", status_code=404)
    return p


# ----- Verifications -----------------------------------------------------


def list_verifications(*, filters: dict[str, Any]) -> dict[str, Any]:
    qs = ProfileVerification.objects.select_related("profile", "profile__user").all()
    if filters.get("status") and filters["status"] != "all":
        qs = qs.filter(status=filters["status"])
    if filters.get("searchQuery"):
        q = filters["searchQuery"]
        qs = qs.filter(Q(afm__icontains=q) | Q(name__icontains=q) | Q(profile__username__icontains=q))

    sort = filters.get("sortBy", "createdAt")
    direction = filters.get("sortDirection", "desc")
    sort_col = {"createdAt": "created_at", "updatedAt": "updated_at"}.get(sort, "created_at")
    if direction == "desc":
        sort_col = f"-{sort_col}"
    qs = qs.order_by(sort_col)

    limit = max(1, min(100, int(filters.get("limit", 10))))
    offset = max(0, int(filters.get("offset", 0)))
    total = qs.count()
    rows = list(qs[offset:offset + limit])

    return {
        "verifications": [_verification_row(v) for v in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def _verification_row(v: ProfileVerification) -> dict[str, Any]:
    profile = v.profile
    user = getattr(profile, "user", None) if profile else None
    return {
        "id": v.id,
        "status": v.status,
        "afm": v.afm,
        "name": v.name,
        "address": v.address,
        "phone": v.phone,
        "createdAt": v.created_at.isoformat() if v.created_at else None,
        "updatedAt": v.updated_at.isoformat() if v.updated_at else None,
        "profile": {
            "id": profile.id if profile else None,
            "username": profile.username if profile else None,
            "displayName": profile.display_name if profile else None,
            "email": profile.email if profile else None,
        },
        "user": {
            "id": user.id if user else None,
            "email": user.email if user else None,
        } if user else None,
    }


def get_verification_detail(verification_id: str) -> dict[str, Any] | None:
    v = (
        ProfileVerification.objects
        .select_related("profile", "profile__user")
        .filter(id=verification_id)
        .first()
    )
    return _verification_row(v) if v else None


def update_verification_status(verification_id: str, *, status: str, notes: str | None = None) -> ProfileVerification:
    if status not in {"PENDING", "APPROVED", "REJECTED"}:
        raise FieldErrors(details={"status": ["Άκυρο status"]})
    v = ProfileVerification.objects.filter(id=verification_id).first()
    if v is None:
        raise ApiError("Verification not found", code="verification_not_found", status_code=404)
    with transaction.atomic():
        v.status = status
        v.save(update_fields=["status", "updated_at"])
        # Sync profile.verified flag
        if v.profile:
            v.profile.verified = (status == "APPROVED")
            v.profile.save(update_fields=["verified", "updated_at"])
    return v


def update_verification_status_for_profile(
    profile_id: str, *, status: str, notes: str | None = None
) -> ProfileVerification:
    """Profile-scoped verification upsert.

    Mirrors OLD `updateVerificationStatus` (actions/admin/profiles.ts:517-589):
    look up the verification by profile; if it exists, update its status; if it
    does not, create one (uid copied from the profile); then sync the profile's
    `verified` flag to `status === 'APPROVED'`. The previous NEW alias route bound
    `profile_id` to a handler expecting `verification_id` → 500.
    """
    if status not in {"PENDING", "APPROVED", "REJECTED"}:
        raise FieldErrors(details={"status": ["Άκυρο status"]})
    profile = Profile.objects.filter(id=profile_id).first()
    if profile is None:
        raise ApiError("Το προφίλ δεν βρέθηκε", code="profile_not_found", status_code=404)
    with transaction.atomic():
        v = ProfileVerification.objects.filter(profile=profile).first()
        if v is None:
            v = ProfileVerification.objects.create(
                profile=profile,
                uid=profile.user_id,
                status=status,
            )
        else:
            v.status = status
            v.save(update_fields=["status", "updated_at"])
        profile.verified = (status == "APPROVED")
        profile.save(update_fields=["verified", "updated_at"])
    return v


def delete_verification(verification_id: str) -> None:
    v = ProfileVerification.objects.filter(id=verification_id).first()
    if v is None:
        raise ApiError("Verification not found", code="verification_not_found", status_code=404)
    with transaction.atomic():
        if v.profile:
            v.profile.verified = False
            v.profile.save(update_fields=["verified", "updated_at"])
        v.delete()


def get_verification_stats() -> dict[str, int]:
    return {
        "total": ProfileVerification.objects.count(),
        "pending": ProfileVerification.objects.filter(status="PENDING").count(),
        "approved": ProfileVerification.objects.filter(status="APPROVED").count(),
        "rejected": ProfileVerification.objects.filter(status="REJECTED").count(),
    }
