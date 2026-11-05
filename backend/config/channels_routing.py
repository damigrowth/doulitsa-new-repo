"""WebSocket URL routing. Consumers live in their owning app (`apps/messaging/consumers.py`)."""
from __future__ import annotations

import logging

from django.urls import re_path

logger = logging.getLogger(__name__)

# Importing consumers lazily inside the list keeps Django's app registry happy
# at import time. Each app's consumers re-export from `apps/<app>/consumers.py`.

websocket_urlpatterns: list = []


def _load_messaging_routes() -> list:
    from apps.messaging.consumers import ChatConsumer, PresenceConsumer

    return [
        re_path(r"ws/chat/(?P<chat_id>[^/]+)/$", ChatConsumer.as_asgi()),
        re_path(r"ws/presence/$", PresenceConsumer.as_asgi()),
    ]


# Populate after module import so the messaging app is loaded. A consumer
# import error must NOT be swallowed: that used to boot Daphne with ZERO
# WebSocket routes while /api/health stayed green (pass5-backend-runtime D10).
try:
    websocket_urlpatterns += _load_messaging_routes()
except Exception:
    logger.exception("channels_routing: failed to load messaging WebSocket routes")
    raise
