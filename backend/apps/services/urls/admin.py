"""Services admin URL routes (rows 189-204). Mounted at /api/admin/services/."""
from __future__ import annotations

from django.urls import path

from apps.services.views.admin import service as v

app_name = "services_admin"

urlpatterns = [
    path("", v.AdminServiceListView.as_view(), name="list"),                                # 189
    path("stats", v.AdminServiceStatsView.as_view(), name="stats"),                          # 203
    path("for-profile", v.AdminServiceCreateForProfileView.as_view(), name="for-profile"),   # 204

    path("<int:service_id>", v.AdminServiceDetailView.as_view(), name="detail"),             # 190, 202
    path("<int:service_id>/", v.AdminServiceUpdateView.as_view(), name="update"),            # 191

    path("<int:service_id>/taxonomy", v.AdminServiceTaxonomyView.as_view(), name="taxonomy"), # 192
    path("<int:service_id>/basic", v.AdminServiceBasicView.as_view(), name="basic"),          # 193
    path("<int:service_id>/pricing", v.AdminServicePricingView.as_view(), name="pricing"),    # 194
    path("<int:service_id>/settings", v.AdminServiceSettingsView.as_view(), name="settings"), # 195
    path("<int:service_id>/addons", v.AdminServiceAddonsView.as_view(), name="addons"),       # 196
    path("<int:service_id>/faq", v.AdminServiceFaqView.as_view(), name="faq"),                # 197
    path("<int:service_id>/media", v.AdminServiceMediaView.as_view(), name="media"),          # 198
    path("<int:service_id>/published/toggle", v.AdminServiceTogglePublishedView.as_view(),
         name="toggle-published"),                                                             # 199
    path("<int:service_id>/featured/toggle", v.AdminServiceToggleFeaturedView.as_view(),
         name="toggle-featured"),                                                              # 200
    path("<int:service_id>/status", v.AdminServiceStatusView.as_view(), name="status"),       # 201
]
