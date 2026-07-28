"""Root URL configuration.

All migrated app URL modules are mounted here. If you add an app, also flip
the corresponding rows in MIGRATION_TRACKER.md.
"""
from __future__ import annotations

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

# Direct view imports for legacy URL aliases (rare — most apps use include()).
from apps.billing.views.public.billing import (
    PaymentsCheckAccessView,
    WorldlineAdviceWebhookView,
    WorldlineRedirectView,
    WorldlineRenewalsCronView,
    WorldlineWebhookView,
)
from apps.media.views.public.sign import SignCloudinaryParamsView
from apps.messaging.views.public.cron import ProcessEmailBatchesCronView
from apps.services.views.public.cron import AutoRefreshCronView

# OpenAPI / Swagger docs.
# `url_name` must include the parent `api:` namespace because root urls.py
# mounts api_urls with `include((api_urls, "api"))`, so the schema route's
# fully qualified reverse target is `api:schema`, not bare `schema`.
schema_urls = [
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="api:schema"), name="swagger"),
    path("redoc/", SpectacularRedocView.as_view(url_name="api:schema"), name="redoc"),
]

api_urls = [
    # === Public surfaces ===
    path("auth/", include("apps.accounts.urls.public")),
    path("profiles/", include("apps.profiles.urls.public")),
    path("services/", include("apps.services.urls.public")),
    path("reviews/", include("apps.reviews.urls.public")),
    path("saved/", include("apps.saved.urls")),
    path("blog/", include("apps.blog.urls.public")),
    path("taxonomy/", include("apps.taxonomy.urls.public")),
    path("media/", include("apps.media.urls.public")),
    path("support/", include("apps.support.urls")),

    # Core public (home, health, maintenance)
    path("", include("apps.core.urls.public")),

    # === Admin surfaces ===
    path("admin/", include("apps.accounts.urls.admin")),
    path("admin/", include("apps.profiles.urls.admin")),
    path("admin/", include("apps.taxonomy.urls.admin")),
    path("admin/", include(("apps.admin_api.urls", "admin_api"))),
    path("admin/", include("apps.core.urls.admin")),
    path("admin/reviews/", include("apps.reviews.urls.admin")),
    path("admin/services/", include("apps.services.urls.admin")),
    path("admin/blog/", include("apps.blog.urls.admin")),
    path("admin/media/", include("apps.media.urls.admin")),

    # === Webhooks (no /admin/ prefix) ===
    path("webhooks/", include("apps.core.urls.webhooks")),
    path("webhooks/worldline", WorldlineWebhookView.as_view(), name="webhook-worldline"),  # row 7
    # SCRUM-63: Cardlink XML "Advice Messages" (recurring children) receiver.
    path("webhooks/worldline/advice", WorldlineAdviceWebhookView.as_view(), name="webhook-worldline-advice"),

    # === Payment-flow URL aliases that match the legacy Next.js paths ===
    path("payments/check-access", PaymentsCheckAccessView.as_view(), name="payments-check-access"),  # row 5
    path("payment/worldline/redirect", WorldlineRedirectView.as_view(), name="worldline-redirect"),  # row 6
    path("cron/worldline-renewals", WorldlineRenewalsCronView.as_view(), name="worldline-renewals-cron"),  # row 11
    path("cron/auto-refresh", AutoRefreshCronView.as_view(), name="auto-refresh-cron"),
    path("cron/process-email-batches", ProcessEmailBatchesCronView.as_view(), name="process-email-batches-cron"),

    # === Legacy top-level alias kept stable for the existing Next.js frontend ===
    path(
        "sign-cloudinary-params",
        SignCloudinaryParamsView.as_view(),
        name="sign-cloudinary-params-legacy",
    ),

    # === Messaging ===
    path("chats/", include("apps.messaging.urls.chats")),
    path("messages/", include("apps.messaging.urls.messages")),
    path("users/", include("apps.messaging.urls.users")),
    path("presence/", include("apps.messaging.urls.presence")),
    path("admin/chats/", include("apps.messaging.urls.admin")),

    # === Billing ===
    path("billing/", include("apps.billing.urls.public")),
    path("admin/billing/", include("apps.billing.urls.admin")),
    # Payment-flow routes wired directly (the URL prefixes differ).

    # Schema/docs. The fully-qualified reverse name picks up the `api:`
    # namespace from the root mount; SpectacularSwaggerView is given that
    # namespaced name above (`url_name="api:schema"`).
    path("", include(schema_urls)),
]

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include((api_urls, "api"))),

    # Sitemaps live at the project root (not under /api/)
    path("", include("apps.core.urls.sitemaps")),
]

# In DEBUG, Django serves uploaded files from MEDIA_ROOT itself. In prod,
# nginx (or a CDN) serves /media/ directly and this block is skipped.
from django.conf import settings  # noqa: E402
from django.conf.urls.static import static  # noqa: E402

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

