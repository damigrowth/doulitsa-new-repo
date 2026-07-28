"""Base Django settings shared by every environment."""
from __future__ import annotations

from datetime import timedelta
from pathlib import Path

import environ
from celery.schedules import crontab

# ---------------------------------------------------------------------------
# Paths & env
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, []),
    PAYMENTS_ENABLED=(bool, True),
    PAYMENTS_TEST_MODE=(bool, True),
    MAINTENANCE_MODE=(bool, False),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)


def normalize_host(value: str) -> str:
    """ALLOWED_HOSTS entries are bare hostnames — no scheme, no path.

    Deploy envs routinely get pasted as full URLs ("https://api.example.gr/"),
    which silently never match the Host header and make every public request
    fail with a bare `Bad Request (400)` while the loopback healthcheck still
    passes. Strip the scheme/path instead of failing mysteriously.
    """
    host = value.strip()
    if "://" in host:
        host = host.split("://", 1)[1]
    return host.split("/", 1)[0].strip()


ALLOWED_HOSTS = [
    h for h in (normalize_host(v) for v in env.list("DJANGO_ALLOWED_HOSTS")) if h
]
# Shared secret the frontend sends alongside the real visitor IP on server-side
# calls (X-Real-Client-IP), so rate limiting is per-client through SSR. Must
# match INTERNAL_PROXY_SECRET on the frontend. Empty => fall back to per-IP of
# the caller (i.e. global on SSR) — see common/throttling.py.
INTERNAL_PROXY_SECRET = env.str("INTERNAL_PROXY_SECRET", default="")
TIME_ZONE = env.str("DJANGO_TIME_ZONE", default="Europe/Athens")
USE_TZ = True
LANGUAGE_CODE = "en-us"
USE_I18N = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Apps
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "django.contrib.sitemaps",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "channels",
    "django_celery_beat",
    "django_celery_results",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "anymail",
    "csp",
]

LOCAL_APPS = [
    "common",
    "apps.accounts",
    "apps.profiles",
    "apps.services",
    "apps.reviews",
    "apps.billing",
    "apps.messaging",
    "apps.saved",
    "apps.blog",
    "apps.taxonomy",
    "apps.media",
    "apps.support",
    "apps.core",
    "apps.admin_api",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

SITE_ID = 1

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
MIDDLEWARE = [
    "log_request_id.middleware.RequestIDMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "apps.core.middleware.LowercaseRedirectMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "csp.middleware.CSPMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# Database — same Postgres the Next.js app uses
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        **env.db_url("DATABASE_URL"),
        "CONN_MAX_AGE": 60,
        "ATOMIC_REQUESTS": False,
    }
}

# ---------------------------------------------------------------------------
# Cache (Redis)
# ---------------------------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env.str("REDIS_URL"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Better Auth used bcrypt(12). Argon2 first for new passwords; bcrypt for legacy verify.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "common.hashers.BetterAuthBcryptPasswordHasher",  # bcrypt(12) — verifies legacy hashes
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

# allauth (Google OAuth wiring; account flows are exposed as DRF endpoints, not allauth views)
ACCOUNT_USER_MODEL_USERNAME_FIELD = "username"
ACCOUNT_LOGIN_METHODS = {"email", "username"}
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_SIGNUP_FIELDS = ["email*", "username*", "password1*", "password2*"]
ACCOUNT_UNIQUE_EMAIL = True
SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": env.str("GOOGLE_OAUTH_CLIENT_ID", default=""),
            "secret": env.str("GOOGLE_OAUTH_CLIENT_SECRET", default=""),
            "key": "",
        },
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online"},
    }
}

# ---------------------------------------------------------------------------
# DRF
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # Browser-side client components can't read the `dj_access` httpOnly
        # cookie via JS — they need the server to read it for them. Try the
        # cookie-bound JWT first; falls through cleanly if no cookie present.
        "common.authentication.CookieJWTAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "common.authentication.ApiKeyAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "common.pagination.DefaultPageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        # Custom classes key on the REAL visitor IP (forwarded by the frontend
        # on SSR calls + a shared secret) so limits are per-client, not a global
        # cap shared via the frontend container's IP. See common/throttling.py.
        "common.throttling.AnonRateThrottle",
        "common.throttling.UserRateThrottle",
        "common.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        # Per client (real visitor IP): 100 requests every 5 seconds.
        "anon": "100/5s",
        "user": "200/5s",
        "login": "10/min",
        "register": "5/min",
        "password_reset": "3/10min",
        "verification_resend": "3/10min",
        "service_draft": "1/30sec",
        "taxonomy_submission": "5/day",
        "afm_lookup": "10/min",
        "contact_form": "5/min",
        "report": "5/hour",
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "common.exceptions.json_exception_handler",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Django Backend API",
    "DESCRIPTION": "REST API migrated from the Next.js codebase.",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "UserRoleEnum": "apps.accounts.models.user.UserRole",
        "UserTypeEnum": "apps.accounts.models.user.UserType",
        "JourneyStepEnum": "apps.accounts.models.user.JourneyStep",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("SIMPLE_JWT_ACCESS_LIFETIME_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("SIMPLE_JWT_REFRESH_LIFETIME_DAYS", default=14)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "SIGNING_KEY": env.str("SIMPLE_JWT_SIGNING_KEY", default="") or SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_OBTAIN_SERIALIZER": "apps.accounts.serializers.auth.JwtTokenObtainPairSerializer",
}

# ---------------------------------------------------------------------------
# Channels (Daphne ASGI + Redis layer)
# ---------------------------------------------------------------------------
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [env.str("CHANNELS_REDIS_URL")],
        },
    }
}

# ---------------------------------------------------------------------------
# Celery
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = env.str("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND = env.str("CELERY_RESULT_BACKEND", default="django-db")
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TASK_TIME_LIMIT = 300
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 4
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True

# Crontab schedules mirror the OLD vercel.json cron entries (CELERY_TIMEZONE
# = Europe/Athens, same as Vercel's configured region behavior for this app):
#   process-email-batches  */15 * * * *
#   auto-refresh           0 0 * * *
#   worldline-renewals     0 6 * * *
# NOTE: django-celery-beat persists these as DB rows; they regenerate from this
# dict when beat restarts.
CELERY_BEAT_SCHEDULE = {
    "messaging-process-email-batches": {
        "task": "apps.messaging.tasks.process_email_batches",
        "schedule": crontab(minute="*/15"),
    },
    "services-auto-refresh-promoted": {
        "task": "apps.services.tasks.auto_refresh_promoted",
        "schedule": crontab(minute=0, hour=0),
    },
    "billing-process-worldline-renewals": {
        "task": "apps.billing.tasks.process_worldline_renewals",
        "schedule": crontab(minute=0, hour=6),
    },
    "accounts-cleanup-pending-registrations": {
        "task": "apps.accounts.tasks.cleanup_expired_pending_registrations",
        "schedule": crontab(minute=0),  # hourly, on the hour
    },
}

# ---------------------------------------------------------------------------
# CORS / CSP / security
# ---------------------------------------------------------------------------
# A CORS *origin* is scheme://host[:port] — no path. A trailing slash counts as
# a path and hard-fails django-cors-headers' check (corsheaders.E014), which
# blocks boot. Normalize instead of trusting hand-written env values.
CORS_ALLOWED_ORIGINS = [
    o.strip().rstrip("/") for o in env.list("CORS_ALLOWED_ORIGINS", default=[]) if o.strip()
]
CORS_ALLOW_CREDENTIALS = True

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

CONTENT_SECURITY_POLICY = {
    "DIRECTIVES": {
        "default-src": ("'self'",),
        "img-src": ("'self'", "data:", "https://res.cloudinary.com"),
        "connect-src": ("'self'", *CORS_ALLOWED_ORIGINS),
    },
}

# ---------------------------------------------------------------------------
# Email (Brevo via Anymail)
# ---------------------------------------------------------------------------
EMAIL_BACKEND = "anymail.backends.sendinblue.EmailBackend"
ANYMAIL = {
    "SENDINBLUE_API_KEY": env.str("BREVO_API_KEY", default=""),
}
DEFAULT_FROM_EMAIL = env.str("BREVO_SENDER_EMAIL", default="noreply@example.com")
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Where admin notifications (new review / verification / contact / reports) are
# delivered. Mirrors OLD `process.env.ADMIN_EMAIL` (constants/email/email-config.ts);
# `_admin_email()` falls back to "contact@doulitsa.gr" when unset.
ADMIN_EMAIL = env.str("ADMIN_EMAIL", default="")

BREVO_LISTS = {
    "USERS": env.str("BREVO_LIST_USERS", default=""),
    "EMPTYPROFILE": env.str("BREVO_LIST_EMPTY_PROFILE", default=""),
    "NOSERVICES": env.str("BREVO_LIST_NO_SERVICES", default=""),
    "ACTIVEPROS": env.str("BREVO_LIST_ACTIVE_PROS", default=""),
}

# ---------------------------------------------------------------------------
# Static / media
# ---------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# WhiteNoise serves Django admin + DRF browsable API + Swagger UI assets
# through Daphne. We use CompressedStaticFilesStorage (gzip, no manifest)
# so missing-asset references don't 500 the admin during dev. Switch to
# CompressedManifestStaticFilesStorage in prod for cache-busted hashes.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

# ---------------------------------------------------------------------------
# Frontend / external
# ---------------------------------------------------------------------------
# Normalized without a trailing slash: several call sites concatenate paths
# directly (billing redirect/return URLs, verify-email redirects), so a trailing
# slash from the env would emit "https://host//path".
FRONTEND_BASE_URL = env.str("FRONTEND_BASE_URL", default="http://localhost:3000").rstrip("/")

CLOUDINARY = {
    "CLOUD_NAME": env.str("CLOUDINARY_CLOUD_NAME", default=""),
    "API_KEY": env.str("CLOUDINARY_API_KEY", default=""),
    "API_SECRET": env.str("CLOUDINARY_API_SECRET", default=""),
    "UPLOAD_PRESET": env.str("CLOUDINARY_UPLOAD_PRESET", default=""),
}

WORLDLINE = {
    "MERCHANT_ID": env.str("WORLDLINE_MERCHANT_ID", default=""),
    "SHARED_SECRET": env.str("WORLDLINE_SHARED_SECRET", default=""),
    # OLD worldline-config.ts reads 4 distinct env vars and picks the pair
    # based on PAYMENTS_TEST_MODE. services/worldline.py falls back to the
    # generic MERCHANT_ID/SHARED_SECRET when these are empty.
    "TEST_MID": env.str("WORLDLINE_TEST_MID", default=""),
    "TEST_SHARED_SECRET": env.str("WORLDLINE_TEST_SHARED_SECRET", default=""),
    "LIVE_MID": env.str("WORLDLINE_LIVE_MID", default=""),
    "LIVE_SHARED_SECRET": env.str("WORLDLINE_LIVE_SHARED_SECRET", default=""),
    "BASE_URL": env.str("WORLDLINE_BASE_URL", default=""),
    "API_URL": env.str("WORLDLINE_API_URL", default=""),
    "RETURN_URL": env.str("WORLDLINE_RETURN_URL", default=""),
    "CANCEL_URL": env.str("WORLDLINE_CANCEL_URL", default=""),
    "WEBHOOK_SECRET": env.str("WORLDLINE_WEBHOOK_SECRET", default=""),
}

STRIPE = {
    "SECRET_KEY": env.str("STRIPE_SECRET_KEY", default=""),
    "WEBHOOK_SECRET": env.str("STRIPE_WEBHOOK_SECRET", default=""),
    "PRICE_MONTH": env.str("STRIPE_PRICE_ID_MONTH", default=""),
    "PRICE_YEAR": env.str("STRIPE_PRICE_ID_YEAR", default=""),
}

PAYPAL = {
    "CLIENT_ID": env.str("PAYPAL_CLIENT_ID", default=""),
    "CLIENT_SECRET": env.str("PAYPAL_CLIENT_SECRET", default=""),
    "API_BASE": env.str("PAYPAL_API_BASE", default=""),
}

AADE = {
    "USERNAME": env.str("AADE_USERNAME", default=""),
    "PASSWORD": env.str("AADE_PASSWORD", default=""),
}

RECAPTCHA_SECRET_KEY = env.str("RECAPTCHA_SECRET_KEY", default="")

CRON_SECRET = env.str("CRON_SECRET", default="")
ADMIN_API_KEY = env.str("ADMIN_API_KEY", default="")
MAINTENANCE_MODE = env.bool("MAINTENANCE_MODE", default=False)
# Shown by /api/auth/maintenance when MAINTENANCE_MODE is on (OLD maintenance.ts:14).
MAINTENANCE_MESSAGE = env.str("MAINTENANCE_MESSAGE", default="We'll be right back.")

PAYMENTS_ENABLED = env.bool("PAYMENTS_ENABLED", default=True)
PAYMENTS_TEST_MODE = env.bool("PAYMENTS_TEST_MODE", default=True)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_REQUEST_ID_HEADER = "HTTP_X_REQUEST_ID"
GENERATE_REQUEST_ID_IF_NOT_IN_HEADER = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(request_id)s %(message)s",
        },
    },
    "filters": {
        "request_id": {"()": "log_request_id.filters.RequestIDFilter"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
            "filters": ["request_id"],
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django.request": {"level": "WARNING", "propagate": True},
        "celery": {"level": "INFO", "propagate": True},
    },
}
