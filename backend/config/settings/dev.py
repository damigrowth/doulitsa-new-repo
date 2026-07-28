"""Local development settings."""
from __future__ import annotations

from .base import *  # noqa: F401,F403
from .base import INSTALLED_APPS, MIDDLEWARE, env

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Permissive CORS for local Next.js dev
CORS_ALLOW_ALL_ORIGINS = True

# In dev, surface DRF browsable API
REST_FRAMEWORK_BROWSABLE = True

# Faster password hashing in tests
if env.bool("RUN_FAST_TESTS", default=False):
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
