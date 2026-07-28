"""WebSocket URL routing. Consumers live in their owning app (`apps/messaging/consumers.py`)."""
from __future__ import annotations

from django.urls import re_path

# Importing consumers lazily inside the list keeps Django's app registry happy
# at import time. Each app's consumers re-export from `apps/<app>/consumers.py`.

websocket_urlpatterns: list = []


def _load_messaging_routes() -> list:
    from apps.messaging.consumers import ChatConsumer, PresenceConsumer

    return [
        re_path(r"ws/chat/(?P<chat_id>[^/]+)/$", ChatConsumer.as_asgi()),
        re_path(r"ws/presence/$", PresenceConsumer.as_asgi()),
    ]


# Populate after module import so the messaging app is loaded.
try:
    websocket_urlpatterns += _load_messaging_routes()
except Exception:  # pragma: no cover - messaging consumers added in Phase 6 step 8
    pass
