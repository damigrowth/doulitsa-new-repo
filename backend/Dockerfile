# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Django backend (Doulitsa API) — production image.
#
# Serves https://api-doulitsa.ncmulti.com behind Dokploy's Traefik proxy.
# TLS is terminated at the proxy; Django trusts X-Forwarded-Proto via
# SECURE_PROXY_SSL_HEADER (see config/settings/prod.py).
#
# Runtime: daphne ASGI (HTTP + WebSocket via Channels) on :3000-internal :8000.
# The same image also backs the Celery worker/beat — those override the CMD and
# should set RUN_MIGRATIONS=0 so only the web service runs migrate/collectstatic.
# ---------------------------------------------------------------------------

############################
# Stage 1 — build deps into an isolated venv
############################
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# Build toolchain + headers for psycopg / Pillow native bits
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
# Copy the whole project, then install it (runtime deps only — no [dev]).
COPY . .
RUN pip install --upgrade pip && pip install .

############################
# Stage 2 — slim runtime
############################
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=config.settings.prod

# Runtime shared libraries only:
#   libpq5          — psycopg
#   libmagic1       — python-magic (upload sniffing)
#   libjpeg/zlib    — Pillow
#   curl            — container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libmagic1 \
    libjpeg62-turbo \
    zlib1g \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 1000 app
WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --chown=app:app . .

RUN chmod +x /app/docker-entrypoint.sh \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R app:app /app

USER app
EXPOSE 8000

# /api/health is a public, DB-touching liveness probe (apps.core).
# Send X-Forwarded-Proto: https (like Traefik does) so SECURE_SSL_REDIRECT
# doesn't 301 the plain-HTTP loopback probe — we want a real 200 from the view.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS -H "X-Forwarded-Proto: https" http://127.0.0.1:8000/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
# Daphne speaks HTTP + WebSocket. --proxy-headers honours X-Forwarded-* from Traefik.
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "--proxy-headers", "config.asgi:application"]
