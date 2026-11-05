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

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.taxonomy.services import store

# Kept as aliases for existing callers; the store owns the mechanism now.
current_version = store.current_version
bump_version = store.bump_version


def invalidate_maps_cache() -> None:
    store.bump_version()


class TaxonomyMapsView(APIView):
    permission_classes = [AllowAny]
    throttle_classes: list = []  # public taxonomy data; never throttle

    def get(self, request):
        # version and body come from ONE store call, so the ETag always
        # matches the payload it is sent with (no stale-body-under-new-ETag
        # race — pass2-caching D3).
        version, data = store.get_maps()
        etag = f'W/"{version}"'
        # Conditional request: unchanged since the client's copy -> 304, no body.
        if request.headers.get("If-None-Match") == etag:
            resp = Response(status=304)
            resp["ETag"] = etag
            resp["Cache-Control"] = "no-cache"
            return resp

        resp = Response(data)
        resp["ETag"] = etag
        # `no-cache` = the client MAY cache but must revalidate (send If-None-Match)
        # every time — which is exactly the cheap 304 poll we want.
        resp["Cache-Control"] = "no-cache"
        return resp
