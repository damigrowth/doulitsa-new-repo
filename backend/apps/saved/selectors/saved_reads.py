"""Read queries for the saved-items dashboard."""
from __future__ import annotations

from typing import Any

from apps.accounts.models import User
from apps.core import taxonomy
from apps.saved.models import SavedProfile, SavedService


def get_saved_items_page(
    user: User,
    *,
    services_page: int = 1,
    services_limit: int = 20,
    profiles_page: int = 1,
    profiles_limit: int = 20,
) -> dict[str, Any]:
    """Paginate saved services and profiles. Returns full card payloads.

    We lazy-import the Service/Profile models so this app works even before
    those apps are migrated. If they're missing we return empty arrays so
    the dashboard at least renders.
    """
    services_payload: list[dict[str, Any]] = []
    services_total = 0
    profiles_payload: list[dict[str, Any]] = []
    profiles_total = 0

    saved_services_qs = SavedService.objects.filter(user=user).order_by("-created_at")
    services_total = saved_services_qs.count()
    s_offset = (services_page - 1) * services_limit
    saved_services = list(saved_services_qs[s_offset:s_offset + services_limit])

    saved_profiles_qs = SavedProfile.objects.filter(user=user).order_by("-created_at")
    profiles_total = saved_profiles_qs.count()
    p_offset = (profiles_page - 1) * profiles_limit
    saved_profiles = list(saved_profiles_qs[p_offset:p_offset + profiles_limit])

    try:
        from apps.services.models import Service  # type: ignore
        ids = [s.service_id for s in saved_services]
        services_by_id = {
            s.id: s
            for s in Service.objects.filter(id__in=ids).select_related("profile", "profile__user")
        }
        services_payload = [
            _service_card(services_by_id[sid]) for sid in ids if sid in services_by_id
        ]
    except ImportError:
        pass

    try:
        from apps.profiles.models import Profile  # type: ignore
        from apps.profiles.selectors.profile_reads import serialize_profile_summary
        pids = [p.profile_id for p in saved_profiles]
        profiles_by_id = {p.id: p for p in Profile.objects.filter(id__in=pids)}
        profiles_payload = [
            serialize_profile_summary(profiles_by_id[pid]) for pid in pids if pid in profiles_by_id
        ]
    except ImportError:
        pass

    return {
        "services": services_payload,
        "profiles": profiles_payload,
        "servicesTotal": services_total,
        "profilesTotal": profiles_total,
        "servicesTotalPages": -(-services_total // services_limit) if services_limit else 0,
        "profilesTotalPages": -(-profiles_total // profiles_limit) if profiles_limit else 0,
    }


def _service_card(service: Any) -> dict[str, Any]:
    profile = getattr(service, "profile", None)
    return {
        "id": service.id,
        "slug": service.slug,
        "title": service.title,
        # Resolved category label (mirrors service_reads._card:202) — the saved
        # card reads `category` for its badge, so a raw cuid id must not leak.
        # taxonomyLabels carried for parity with the directory card.
        "category": taxonomy.service_category_label(service.category) or service.category,
        "subcategory": service.subcategory,
        "subdivision": getattr(service, "subdivision", None),
        "taxonomyLabels": {
            "category": taxonomy.service_category_label(service.category),
            "subcategory": taxonomy.service_category_label(service.subcategory),
            "subdivision": taxonomy.service_category_label(getattr(service, "subdivision", None)),
        },
        "tags": getattr(service, "tags", None) or [],
        "rating": service.rating,
        "reviewCount": service.review_count,
        "price": service.price,
        "fixed": getattr(service, "fixed", None),
        "media": service.media,
        "profile": {
            "id": profile.id,
            "uid": profile.user_id,
            "username": profile.username,
            "displayName": profile.display_name,
            "image": profile.image,
            "rating": profile.rating,
            "reviewCount": profile.review_count,
            "verified": profile.verified,
            "coverage": profile.coverage,
            "category": profile.category,
            "subcategory": profile.subcategory,
        } if profile else None,
    }
