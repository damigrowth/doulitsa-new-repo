"""ASGI entry point — Daphne serves HTTP + WebSocket from a single process."""
from __future__ import annotations

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator, OriginValidator
from django.conf import settings
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

# Initialize Django ASGI app first so app registries are populated before
# importing modules that load models (consumers).
django_asgi_app = get_asgi_application()

from config.channels_routing import websocket_urlpatterns  # noqa: E402


def _origin_guard(inner):
    """In dev (DEBUG or ALLOWED_HOSTS contains '*'), accept any origin so the
    Next.js frontend on a different port can connect. Otherwise enforce the
    standard hostname check."""
    allowed = list(getattr(settings, "ALLOWED_HOSTS", []) or [])
    if settings.DEBUG or "*" in allowed:
        return OriginValidator(inner, ["*"])
    # The browser opens the WS from the FRONTEND origin, which in production is a
    # different subdomain than the API host — so AllowedHostsOriginValidator
    # (which only trusts ALLOWED_HOSTS = the api host) rejects it and the socket
    # fails. Trust the configured frontend origins (CORS_ALLOWED_ORIGINS +
    # FRONTEND_BASE_URL) plus the API's own http(s) origins.
    origins: list[str] = list(getattr(settings, "CORS_ALLOWED_ORIGINS", []) or [])
    frontend = getattr(settings, "FRONTEND_BASE_URL", "") or ""
    if frontend and frontend not in origins:
        origins.append(frontend)
    for host in allowed:
        if host not in ("*",):
            origins.append(f"https://{host}")
            origins.append(f"http://{host}")
    return OriginValidator(inner, origins)


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": _origin_guard(
            AuthMiddlewareStack(URLRouter(websocket_urlpatterns))
        ),
    }
)
