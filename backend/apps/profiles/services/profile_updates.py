"""All profile-update operations.

Mirrors `actions/profiles/{basic-info,additional-info,billing,coverage,
portfolio,presentation}.ts`. The Next.js code passes through Zod first, then
applies field-by-field updates via Prisma. We keep the same per-field
selectivity to avoid clobbering unrelated fields the frontend didn't send.
"""
from __future__ import annotations

from typing import Any

from django.db import transaction

from apps.accounts.models import User
from apps.profiles.models import Profile
from common.exceptions import ApiError, FieldErrors
from common.utils.cloudinary import sanitize_resources
from common.utils.normalize import normalize_term


def _require_pro_owner(user: User) -> Profile:
    """Owner-only writes: load the user's profile or raise 404/403."""
    if not user.is_professional():
        raise ApiError(
            "Δεν έχετε δικαίωμα ενημέρωσης προφίλ",
            code="not_professional",
            status_code=403,
        )
    profile = Profile.objects.filter(user_id=user.id).first()
    if profile is None:
        raise ApiError(
            "Το προφίλ δεν βρέθηκε. Παρακαλώ ολοκληρώστε πρώτα την εγγραφή σας.",
            code="profile_missing",
            status_code=404,
        )
    return profile


def _strip_html(html: str | None) -> str:
    if not html:
        return ""
    import re
    return re.sub(r"<[^>]+>", " ", html)


# ----- account → profile denormalisation sync ------------------------------


def sync_account_to_profile(user: User, *, display_name: str | None = None,
                            image: str | None = None) -> None:
    """Mirror account display_name/image onto the user's Profile (if any).

    Ports OLD `updateAccount` (actions/auth/update-account.ts:90-101): pro users
    have a Profile whose denormalised `displayName`/`displayNameNormalized`/
    `image` must track the account. Simple users have no Profile → no-op.
    Best-effort: never raises.
    """
    try:
        profile = Profile.objects.filter(user_id=user.id).first()
        if profile is None:
            return
        fields: list[str] = []
        if display_name is not None:
            profile.display_name = display_name
            profile.display_name_normalized = normalize_term(display_name)
            fields += ["display_name", "display_name_normalized"]
        if image is not None:
            profile.image = image
            fields.append("image")
        if fields:
            fields.append("updated_at")
            profile.save(update_fields=fields)
    except Exception:  # pragma: no cover - defensive
        import logging
        logging.getLogger(__name__).exception(
            "profile.account_sync_failed", extra={"user_id": user.id}
        )


def sync_username_to_profile(user: User, username: str) -> None:
    """Mirror the new username onto the user's Profile (if any).

    Ports OLD `change-username` (actions/auth/change-username.ts:117-128):
    updates `Profile.username` in the same transaction as the User update.
    Best-effort: never raises.
    """
    try:
        profile = Profile.objects.filter(user_id=user.id).first()
        if profile is None:
            return
        profile.username = username
        profile.save(update_fields=["username", "updated_at"])
    except Exception:  # pragma: no cover - defensive
        import logging
        logging.getLogger(__name__).exception(
            "profile.username_sync_failed", extra={"user_id": user.id}
        )


# ----- basic-info ----------------------------------------------------------


def update_basic_info(
    *,
    user: User,
    tagline: str | None,
    bio: str | None,
    category: str,
    subcategory: str,
    speciality: str | None = None,
    image: dict | None = None,
    skills: list[str] | None = None,
    coverage: dict | None = None,
) -> Profile:
    # Mirrors OLD `updateProfileBasicInfo` (basic-info.ts:118-131). OLD writes:
    #   tagline, taglineNormalized (null when empty), bio (sanitized) +
    #   bioNormalized (null when empty), category, subcategory, speciality,
    #   skills (|| []). NOTE: OLD basic-info does NOT write coverage/image —
    #   those have their own endpoints (coverage.ts / account image). We keep
    #   image handling as a tolerated extra since the field column is shared,
    #   but never touch coverage here.
    profile = _require_pro_owner(user)
    profile.tagline = tagline
    profile.tagline_normalized = normalize_term(tagline) if tagline else None
    profile.bio = _sanitize_html(bio) if bio else bio
    profile.bio_normalized = normalize_term(_strip_html(bio)) if bio else None
    profile.category = category
    profile.subcategory = subcategory
    profile.speciality = speciality
    if image is not None:
        img_url = (
            image.get("secure_url") if isinstance(image, dict) else image
        ) if image else None
        profile.image = img_url
        # Keep the duplicate user.image in sync. The header avatar and the
        # dashboard account form read user.image, so onboarding/basic-info image
        # edits must mirror it there too (the column is duplicated on both User
        # and Profile). The account endpoint already does the same.
        if user.image != img_url:
            user.image = img_url
            user.save(update_fields=["image", "updated_at"])
    profile.skills = skills or []
    profile.save()
    return profile


def _sanitize_html(html: str) -> str:
    """Allow a minimal safe subset for rich-text bio."""
    import bleach
    return bleach.clean(
        html,
        tags=[
            "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li",
            "a", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
        ],
        attributes={"a": ["href", "title", "target", "rel"]},
        strip=True,
    )


def _coverage_normalized(coverage: dict) -> str | None:
    """Normalized coverage location string for search.

    Mirrors OLD `generateCoverageNormalized` (datasets.ts:940-992): coverage
    stores location **IDs** (areas[], counties[], legacy area/county), so we
    resolve each id → its location NAME via the location map, normalize each
    name individually (accent-strip + lowercase), dedup preserving order, and
    join with a single space. Order: areas, then counties, then legacy single
    area/county. Returns None when nothing resolves.
    """
    if not coverage:
        return None

    from apps.core.locations import location_name_for_id

    location_names: list[str] = []

    areas = coverage.get("areas")
    if isinstance(areas, list):
        for area_id in areas:
            name = location_name_for_id(area_id)
            if name:
                location_names.append(normalize_term(name))

    counties = coverage.get("counties")
    if isinstance(counties, list):
        for county_id in counties:
            name = location_name_for_id(county_id)
            if name:
                location_names.append(normalize_term(name))

    # Legacy single area/county support (datasets.ts:972-984).
    if coverage.get("area"):
        name = location_name_for_id(coverage.get("area"))
        if name:
            location_names.append(normalize_term(name))
    if coverage.get("county"):
        name = location_name_for_id(coverage.get("county"))
        if name:
            location_names.append(normalize_term(name))

    # Dedup preserving order.
    unique: list[str] = list(dict.fromkeys(location_names))
    return " ".join(unique) if unique else None


# ----- additional-info -----------------------------------------------------


def update_additional_info(
    *,
    user: User,
    rate: int | None = None,
    commencement: str | None = None,
    contact_methods: list[str] | None = None,
    payment_methods: list[str] | None = None,
    settlement_methods: list[str] | None = None,
    budget: str | None = None,
    terms: str | None = None,
) -> Profile:
    """Mirrors OLD `updateProfileAdditionalInfo` (additional-info.ts:100-113).

    OLD writes EVERY field unconditionally, so a null/empty value CLEARS the
    column. We replicate that (no `if x is not None` guards) — the form always
    sends all fields, and clearing must be possible.
    """
    profile = _require_pro_owner(user)
    profile.rate = rate
    profile.commencement = commencement or None
    # experience = currentYear - parseInt(commencement), else null (OLD:71-74)
    profile.experience = _years_since(commencement) if commencement else None
    profile.contact_methods = contact_methods or []
    profile.payment_methods = payment_methods or []
    profile.settlement_methods = settlement_methods or []
    profile.budget = budget or None
    profile.terms = terms or None
    profile.save()
    return profile


def _years_since(date_str: str) -> int | None:
    """Experience = currentYear - parseInt(commencement).

    Mirrors OLD exactly (additional-info.ts:71-74): pure YEAR subtraction,
    no month/day arithmetic. JS `parseInt` reads the leading integer of the
    string (so '2020', '2020-05' both → 2020), and an unparseable value yields
    `null` (NaN path).
    """
    from datetime import date

    try:
        # JS parseInt: take the leading integer prefix.
        import re
        m = re.match(r"\s*([+-]?\d+)", date_str or "")
        if not m:
            return None
        return date.today().year - int(m.group(1))
    except (ValueError, TypeError):
        return None


# ----- billing -------------------------------------------------------------


def update_billing(
    *,
    user: User,
    receipt: bool,
    invoice: bool,
    afm: str | None = None,
    doy: str | None = None,
    name: str | None = None,
    profession: str | None = None,
    address: str | None = None,
) -> Profile:
    """Pro/admin can edit billing. Stored as a JSON snapshot on Profile.billing.

    Mirrors OLD `updateProfileBilling` (billing.ts): roles allowed are
    [freelancer, company, admin] (billing.ts:28) and the update always targets
    the caller's OWN profile (`where: { uid: user.id }`, billing.ts:101-102).
    So admins edit their own profile row, exactly like pros.
    """
    if not (user.is_professional() or user.is_admin()):
        raise ApiError(
            "Δεν έχετε δικαίωμα ενημέρωσης προφίλ",
            code="not_authorized",
            status_code=403,
        )
    profile = Profile.objects.filter(user_id=user.id).first()
    if profile is None:
        raise ApiError(
            "Το προφίλ δεν βρέθηκε. Παρακαλώ ολοκληρώστε πρώτα την εγγραφή σας.",
            code="profile_missing",
            status_code=404,
        )
    # OLD stores empty strings (not null) for unset invoice fields
    # (billing.ts:90-98: `data.afm || ''`).
    profile.billing = {
        "receipt": receipt,
        "invoice": invoice,
        "afm": afm or "",
        "doy": doy or "",
        "name": name or "",
        "profession": profession or "",
        "address": address or "",
    }
    profile.save(update_fields=["billing", "updated_at"])
    return profile


# ----- coverage ------------------------------------------------------------


def update_coverage(*, user: User, coverage: dict) -> Profile:
    profile = _require_pro_owner(user)
    profile.coverage = coverage
    profile.coverage_normalized = _coverage_normalized(coverage)
    profile.save(update_fields=["coverage", "coverage_normalized", "updated_at"])
    return profile


# ----- portfolio -----------------------------------------------------------


def update_portfolio(*, user: User, portfolio: list[dict] | None) -> Profile:
    # Mirrors OLD `updateProfilePortfolio` (portfolio.ts:62-100): sanitize via
    # sanitizeCloudinaryResources (drops pending/blob, strips _pending), then
    # store null (Prisma.DbNull) when the result is empty — NOT [].
    profile = _require_pro_owner(user)
    sanitised = sanitize_resources(portfolio)
    profile.portfolio = sanitised if sanitised else None
    profile.save(update_fields=["portfolio", "updated_at"])
    return profile


# ----- presentation --------------------------------------------------------


def update_presentation(
    *,
    user: User,
    phone: str | None = None,
    website: str | None = None,
    viber: str | None = None,
    whatsapp: str | None = None,
    visibility: dict | None = None,
    socials: dict | None = None,
) -> Profile:
    """Mirrors OLD `updateProfilePresentation` (presentation.ts:100-115).

    OLD writes every field unconditionally (so empty values clear the column):
    - phone/website/viber/whatsapp: `data.X || null`
    - visibility: `data.visibility || {email:false, phone:true, address:true}`
    - socials: `data.socials ? data.socials : DbNull` (null when empty)
    """
    profile = _require_pro_owner(user)
    profile.phone = phone or None
    profile.website = website or None
    profile.viber = viber or None
    profile.whatsapp = whatsapp or None
    profile.visibility = visibility or {"email": False, "phone": True, "address": True}
    profile.socials = socials if socials else None
    profile.save()
    return profile


# ----- profile sync after username/displayName changes (called by accounts) -


def sync_username(user: User) -> None:
    """Called by accounts.services.account.change_username to mirror the
    updated username/displayUsername onto the Profile row.
    """
    profile = Profile.objects.filter(user_id=user.id).first()
    if profile is None:
        return
    profile.username = user.username
    profile.display_name = user.display_name or profile.display_name
    profile.display_name_normalized = (
        normalize_term(user.display_name) if user.display_name else profile.display_name_normalized
    )
    profile.save(update_fields=["username", "display_name", "display_name_normalized", "updated_at"])


def sync_account_basics(user: User) -> None:
    """Called by accounts.services.account.update_account to mirror the new
    displayName/image onto the Profile row.
    """
    profile = Profile.objects.filter(user_id=user.id).first()
    if profile is None:
        return
    profile.display_name = user.display_name or profile.display_name
    profile.display_name_normalized = (
        normalize_term(user.display_name) if user.display_name else profile.display_name_normalized
    )
    if user.image:
        profile.image = user.image
    profile.save(update_fields=["display_name", "display_name_normalized", "image", "updated_at"])


# ----- create profile (used by OAuth / register flow) ---------------------


def ensure_profile_exists(user: User) -> Profile:
    """Idempotent — returns existing profile or creates a stub for new users."""
    with transaction.atomic():
        profile, _ = Profile.objects.get_or_create(
            user_id=user.id,
            defaults={
                "username": user.username,
                "display_name": user.display_name,
                "display_name_normalized": normalize_term(user.display_name or ""),
                "email": user.email,
                "type": "freelancer" if user.role == "freelancer" else "company" if user.role == "company" else None,
            },
        )
        return profile
