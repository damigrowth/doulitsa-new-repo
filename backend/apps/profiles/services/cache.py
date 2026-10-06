"""Redis-cache invalidation for public profile payloads.

The public read selectors cache their composite payloads in Redis:
`profile:page:{username}` (profile_aggregations.profile_page_bundle, 30 min),
`profiles:directory:*` (2 h), `profiles:count:*` (30 min) and `core:home`
(5 min). Without an explicit purge, a profile edit stays invisible on the
public site until those TTLs lapse — the Next.js `revalidateTag` purge only
clears the FRONTEND data cache, and the refetch then gets the stale payload
back from Django (QA: "Δεν εμφανίζονται στη profile page οι αλλαγές").
Mirrors the blog's `_purge_cache` / taxonomy's signal-driven invalidation.
"""
from __future__ import annotations

from django.core.cache import cache


def invalidate_profile_caches(username: str | None = None) -> None:
    """Purge the cached public payloads a profile write can affect.

    Best-effort: never raises (a failed purge only means the TTL decides).
    """
    try:
        keys = ["core:home"]
        if username:
            keys.append(f"profile:page:{username}")
        cache.delete_many(keys)
        try:
            cache.delete_pattern("profiles:directory:*")
            cache.delete_pattern("profiles:count:*")
            if not username:
                cache.delete_pattern("profile:page:*")
        except AttributeError:  # non-redis backend (tests) — fall back to TTL
            pass
    except Exception:  # pragma: no cover - defensive
        import logging

        logging.getLogger(__name__).exception("profile_cache_invalidation_failed")
