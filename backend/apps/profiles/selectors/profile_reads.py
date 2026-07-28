"""Profile read queries used by the public CRUD endpoints (rows 41, 42, 43, 47)."""
from __future__ import annotations

from typing import Any

from django.db.models import Count

from apps.profiles.models import Profile


def get_profile_by_user_id(user_id: str) -> Profile | None:
    return Profile.objects.filter(user_id=user_id).first()


def get_public_profile_by_username(username: str) -> Profile | None:
    # OLD uses an EXACT (case-sensitive) username match
    # (get-profile.ts:95). Do NOT use __iexact.
    return (
        Profile.objects
        .filter(username=username, published=True, is_active=True)
        .first()
    )


def get_taxonomy_paths(role: str | None = None) -> list[dict[str, Any]]:
    """Distinct (category, subcategory) SLUG tuples used by SSG, sorted by count.

    Mirrors OLD `getProTaxonomyPaths` (get-profiles.ts:933-1028):
    - filters by `user.role` (NOT Profile.type), plus user.blocked=false /
      user.confirmed=true guards (get-profiles.ts:947-959)
    - groups by category+subcategory with a count (get-profiles.ts:962-968)
    - converts the stored category/subcategory IDs → URL slugs via the pro
      taxonomy map, dropping groups whose category id doesn't resolve
      (get-profiles.ts:982-1001)
    - sorts by count desc, then strips the count (get-profiles.ts:1004-1006)
    """
    from apps.taxonomy.services.taxonomy_data import find_pro_by_id

    qs = Profile.objects.filter(
        published=True,
        is_active=True,
        user__blocked=False,
        user__confirmed=True,
    )
    if role:
        qs = qs.filter(user__role=role)

    groups = (
        qs.values("category", "subcategory")
          .annotate(count=Count("id"))
          .order_by("-count")
    )

    paths: list[dict[str, Any]] = []
    for group in groups:
        category_data = find_pro_by_id(group["category"]) if group["category"] else None
        if not category_data:
            continue  # Skip if category id doesn't resolve (get-profiles.ts:988)
        subcategory_data = (
            find_pro_by_id(group["subcategory"]) if group["subcategory"] else None
        )
        paths.append({
            "category": category_data.get("slug"),
            "subcategory": subcategory_data.get("slug") if subcategory_data else None,
            "count": group["count"],
        })

    paths.sort(key=lambda p: p["count"], reverse=True)
    return [{"category": p["category"], "subcategory": p["subcategory"]} for p in paths]


def _user_role(profile: Profile) -> str | None:
    """`profile.user.role`, tolerant of a missing/unloaded relation."""
    try:
        return profile.user.role if profile.user_id else None
    except Exception:
        return None


def serialize_profile_summary(profile: Profile) -> dict[str, Any]:
    """Public summary payload (used by /api/profiles/by-username/{username}).

    Returns a JSON-friendly dict so views don't need a heavyweight serializer.
    """
    return {
        "id": profile.id,
        "username": profile.username,
        "displayName": profile.display_name,
        "tagline": profile.tagline,
        "bio": profile.bio,
        "image": profile.image,
        "category": profile.category,
        "subcategory": profile.subcategory,
        "speciality": profile.speciality,
        "skills": profile.skills or [],
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
        "rating": profile.rating,
        "reviewCount": profile.review_count,
        "stars": profile.stars,
        "verified": profile.verified,
        "featured": profile.featured,
        "top": profile.top,
        "type": profile.type,
        # OLD card rows carry `role` resolved from the linked user.role
        # (get-profiles.ts:339). Used for the freelancer-vs-company badge.
        "role": _user_role(profile),
        # Profile features the public page renders (contact channels, payment
        # options, settlement terms, budget tier, team size). These are not
        # private — the corresponding flags live in `visibility`.
        "uid": profile.user_id,
        "contactMethods": profile.contact_methods or [],
        "paymentMethods": profile.payment_methods or [],
        "settlementMethods": profile.settlement_methods or [],
        "budget": profile.budget,
        "size": profile.size,
        "firstName": profile.first_name,
        "lastName": profile.last_name,
        "commencement": profile.commencement,
        "terms": profile.terms,
        "createdAt": profile.created_at.isoformat() if profile.created_at else None,
        "updatedAt": profile.updated_at.isoformat() if profile.updated_at else None,
    }


# Contact/PII fields the public card rows must NOT carry — OLD's archive select
# (PROFILE_ARCHIVE_SELECT, src/lib/database/selects/profile.ts:16-39) had none of
# these; they belong only to the profile-page bundle (ContactReveal) and owner paths.
_CARD_EXCLUDED_FIELDS = ("phone", "viber", "whatsapp", "firstName", "lastName", "terms")


def serialize_profile_card(profile: Profile) -> dict[str, Any]:
    """Card-scoped public payload for archive/search/by-username rows."""
    data = serialize_profile_summary(profile)
    for key in _CARD_EXCLUDED_FIELDS:
        data.pop(key, None)
    return data


def serialize_profile_owner(profile: Profile) -> dict[str, Any]:
    """Owner payload — includes private fields the public version omits."""
    base = serialize_profile_summary(profile)
    base.update({
        "billing": profile.billing,
        "contactMethods": profile.contact_methods or [],
        "paymentMethods": profile.payment_methods or [],
        "settlementMethods": profile.settlement_methods or [],
        "budget": profile.budget,
        "terms": profile.terms,
        "commencement": profile.commencement,
        "lastServiceDraft": profile.last_service_draft.isoformat() if profile.last_service_draft else None,
        "lastServiceRefreshDate": profile.last_service_refresh_date.isoformat() if profile.last_service_refresh_date else None,
        "dailyServiceRefreshCount": profile.daily_service_refresh_count,
        "published": profile.published,
        "isActive": profile.is_active,
    })
    return base
