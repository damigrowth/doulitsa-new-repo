"""Cross-cutting middleware. Currently: lowercase URL redirects.

Mirrors `src/middlewares/withLowercaseRedirect.ts` (also redirects /pros → /dir).
"""
from __future__ import annotations

from django.http import HttpResponsePermanentRedirect

# Paths that should NOT be lowercased (api endpoints, sitemaps, schema, etc.)
_EXEMPT_PREFIXES = ("/api/", "/django-admin/", "/static/", "/media/", "/sitemap")


class LowercaseRedirectMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        if request.method == "GET" and not any(path.startswith(p) for p in _EXEMPT_PREFIXES):
            if path != path.lower():
                qs = request.META.get("QUERY_STRING", "")
                target = path.lower() + (f"?{qs}" if qs else "")
                return HttpResponsePermanentRedirect(target)
            if path.startswith("/pros"):
                target = "/dir" + path[len("/pros"):]
                qs = request.META.get("QUERY_STRING", "")
                if qs:
                    target += f"?{qs}"
                return HttpResponsePermanentRedirect(target)
        return self.get_response(request)
