"""GET /api/taxonomy/maps — the full taxonomy (service/pro/location/skills/tags)
rebuilt from the DB, in the same shape as the legacy `maps.generated.json`.

This is what lets the frontend drop the 4.7 MB static file and source taxonomy
from the DB instead (so admin edits go live with no redeploy).

PERFORMANCE: the payload is ~3 MB, and the frontend polls it on a 60s background
refresh. To avoid re-transferring 3 MB every minute, the response carries an
**ETag** (a version bumped only on a taxonomy write). The frontend sends
`If-None-Match`; if nothing changed we return **304 Not Modified** (empty body),
so the 3 MB is transferred ONLY when the taxonomy actually changes.
"""
from __future__ import annotations

from django.core.cache import cache
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.taxonomy.services.maps_builder import build_maps

CACHE_KEY = "taxonomy:maps:v1"          # the built maps (dict)
VERSION_KEY = "taxonomy:maps:version"   # bumped on every taxonomy write -> ETag
CACHE_TTL = 60 * 60  # 1h; also invalidated on taxonomy writes


def current_version() -> str:
    v = cache.get(VERSION_KEY)
    if v is None:
        v = "1"
        cache.set(VERSION_KEY, v, None)  # no expiry
    return str(v)


def bump_version() -> None:
    """Invalidate the ETag so the next poll re-downloads. Called on taxonomy writes."""
    import uuid

    cache.set(VERSION_KEY, uuid.uuid4().hex, None)


def invalidate_maps_cache() -> None:
    cache.delete(CACHE_KEY)
    bump_version()


class TaxonomyMapsView(APIView):
    permission_classes = [AllowAny]
    throttle_classes: list = []  # public taxonomy data; never throttle

    def get(self, request):
        etag = f'W/"{current_version()}"'
        # Conditional request: unchanged since the client's copy -> 304, no body.
        if request.headers.get("If-None-Match") == etag:
            resp = Response(status=304)
            resp["ETag"] = etag
            resp["Cache-Control"] = "no-cache"
            return resp

        data = cache.get(CACHE_KEY)
        if data is None:
            data = build_maps()
            cache.set(CACHE_KEY, data, CACHE_TTL)
        resp = Response(data)
        resp["ETag"] = etag
        # `no-cache` = the client MAY cache but must revalidate (send If-None-Match)
        # every time — which is exactly the cheap 304 poll we want.
        resp["Cache-Control"] = "no-cache"
        return resp
