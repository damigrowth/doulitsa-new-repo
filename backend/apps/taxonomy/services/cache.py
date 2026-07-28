"""Invalidate every taxonomy cache after a DB write, so admin edits go live with
no redeploy (and no restart).

Clears:
  - the maps API response cache (`taxonomy:maps:v1`),
  - the in-process lru_caches in apps/core/taxonomy.py (which now read the DB).

The frontend re-fetches `/api/taxonomy/maps` on its own 60s background refresh,
so once these are cleared the edit propagates end-to-end within a minute.
"""
from __future__ import annotations


def invalidate_taxonomy_caches() -> None:
    from apps.taxonomy.views.public.maps import invalidate_maps_cache

    # Clears the built-maps cache AND bumps the ETag version, so the next
    # frontend poll re-downloads (otherwise it'd keep getting 304s).
    invalidate_maps_cache()

    try:
        from apps.core import taxonomy as t

        for fn in (t._maps, t._slug_to_ids, t._id_to_slug, t._service_indexes):
            clear = getattr(fn, "cache_clear", None)
            if clear:
                clear()
    except Exception:
        pass

    try:
        from apps.core import locations as loc

        for fn in (loc._id_to_name, loc._maps):
            clear = getattr(fn, "cache_clear", None)
            if clear:
                clear()
    except Exception:
        pass
