"""Production settings."""
from __future__ import annotations

from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False
# The Docker HEALTHCHECK curls http://127.0.0.1:8000/api/health, so the loopback
# hosts must always be allowed — otherwise Django returns 400 DisallowedHost and
# the container is marked unhealthy. Public traffic arrives via Traefik with the
# real Host header, which the DJANGO_ALLOWED_HOSTS env value covers.
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS") + ["127.0.0.1", "localhost"]

# Behind Dokploy/Traefik the public origin is HTTPS while Django speaks plain
# HTTP to the proxy. Trust these origins for CSRF (Django admin, DRF session
# auth). Defaults to the https:// form of every non-local ALLOWED_HOST; override
# with DJANGO_CSRF_TRUSTED_ORIGINS (comma-separated, scheme included) if needed.
CSRF_TRUSTED_ORIGINS = env.list(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    default=[
        f"https://{host}"
        for host in ALLOWED_HOSTS
        if host not in ("localhost", "127.0.0.1", "*")
    ],
)

# Security
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
