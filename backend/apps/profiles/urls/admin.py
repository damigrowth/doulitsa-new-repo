"""Profiles admin URL routes. Mounted at /api/admin/ from config/urls.py.

Note: "rows 184-188" (verifications) live at /api/admin/verifications/...
and "rows 205-222" (profiles) live at /api/admin/profiles/...
"""
from __future__ import annotations

from django.urls import path

from apps.profiles.views.admin import profiles as pv
from apps.profiles.views.admin import verifications as vv

app_name = "profiles_admin"

urlpatterns = [
    # Profiles (rows 205-222) — mounted under "profiles/" prefix in config/urls.py
    path("profiles", pv.AdminProfileListView.as_view(), name="profiles-list"),                      # 205
    path("profiles/stats", pv.AdminProfileStatsView.as_view(), name="profiles-stats"),              # 215
    path("profiles/brevo-stats", pv.AdminProfileBrevoStatsView.as_view(), name="profiles-brevo"),   # 216
    path("profiles/search", pv.AdminProfileSearchView.as_view(), name="profiles-search"),           # 213
    path("profiles/search/for-services", pv.AdminProfileSearchForServicesView.as_view(),
         name="profiles-search-for-services"),                                                       # 214

    path("profiles/<str:profile_id>", pv.AdminProfileDetailView.as_view(), name="profiles-detail"),  # 206, 207, 212
    path("profiles/<str:profile_id>/settings", pv.AdminProfileSettingsView.as_view(),
         name="profiles-settings"),                                                                  # 217
    path("profiles/<str:profile_id>/published/toggle", pv.AdminProfileTogglePublishedView.as_view(),
         name="profiles-toggle-published"),                                                          # 208
    path("profiles/<str:profile_id>/featured/toggle", pv.AdminProfileToggleFeaturedView.as_view(),
         name="profiles-toggle-featured"),                                                           # 209
    path("profiles/<str:profile_id>/verified/toggle", pv.AdminProfileToggleVerifiedView.as_view(),
         name="profiles-toggle-verified"),                                                           # 210
    path("profiles/<str:profile_id>/verification-status",
         vv.AdminProfileVerificationStatusView.as_view(), name="profiles-verification-status"),       # 211

    path("profiles/<str:profile_id>/basic-info", pv.AdminProfileBasicInfoView.as_view(),
         name="profiles-basic-info"),                                                                # 218
    path("profiles/<str:profile_id>/additional-info", pv.AdminProfileAdditionalInfoView.as_view(),
         name="profiles-additional-info"),                                                           # 218b
    path("profiles/<str:profile_id>/presentation", pv.AdminProfilePresentationView.as_view(),
         name="profiles-presentation"),                                                              # 219
    path("profiles/<str:profile_id>/portfolio", pv.AdminProfilePortfolioView.as_view(),
         name="profiles-portfolio"),                                                                 # 220
    path("profiles/<str:profile_id>/coverage", pv.AdminProfileCoverageView.as_view(),
         name="profiles-coverage"),                                                                  # 221
    path("profiles/<str:profile_id>/billing", pv.AdminProfileBillingView.as_view(),
         name="profiles-billing"),                                                                   # 222

    # Verifications (rows 184-188)
    path("verifications", vv.AdminVerificationListView.as_view(), name="verifications-list"),           # 184
    path("verifications/stats", vv.AdminVerificationStatsView.as_view(), name="verifications-stats"),   # 188
    path("verifications/<str:verification_id>", vv.AdminVerificationDetailView.as_view(),
         name="verifications-detail"),                                                                   # 185, 187
    path("verifications/<str:verification_id>/status", vv.AdminVerificationStatusView.as_view(),
         name="verifications-status"),                                                                   # 186
]
