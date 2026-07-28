"""admin_api URL routes (rows 132-138). Mounted at /api/admin/."""
from __future__ import annotations

from django.urls import path

from apps.admin_api.views.admin.api_keys import (
    AdminNavigationView,
    ApiKeyDetailView,
    CreateOrListKeysView,
    MyAdminAccessView,
    ValidateApiKeyView,
)
from apps.admin_api.views.admin.notifications import AdminNotificationsView

app_name = "admin_api"

urlpatterns = [
    path("api-keys/validate", ValidateApiKeyView.as_view(), name="validate"),    # 132
    path("api-keys", CreateOrListKeysView.as_view(), name="create-or-list"),     # 133 + 134
    path("api-keys/me/access", MyAdminAccessView.as_view(), name="me-access"),   # 137
    path("api-keys/<str:key_id>", ApiKeyDetailView.as_view(), name="detail"),    # 135 + 136
    path("navigation", AdminNavigationView.as_view(), name="navigation"),         # 138
    path("notifications", AdminNotificationsView.as_view(), name="notifications"),
]
