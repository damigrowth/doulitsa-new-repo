"""Services public URL routes (rows 52-74). Mounted at /api/services/."""
from __future__ import annotations

from django.urls import path

from apps.services.views.public import service as v

app_name = "services_public"

urlpatterns = [
    # Static paths before <int:service_id>
    path("draft", v.CreateServiceDraftView.as_view(), name="draft"),                       # 53
    path("categories", v.ServiceCategoriesView.as_view(), name="categories"),              # 56
    path("navigation", v.NavigationMenuView.as_view(), name="navigation"),                 # 57
    path("recent", v.RecentServicesView.as_view(), name="recent"),                         # 58
    path("by-slug/<str:slug>", v.ServiceBySlugView.as_view(), name="by-slug"),             # 59
    path("featured", v.FeaturedServicesView.as_view(), name="featured"),                   # 62
    path("search", v.ServicesSearchView.as_view(), name="search"),                         # 64
    path("count", v.ServicesCountView.as_view(), name="count"),                            # 65
    path("taxonomy-paths", v.ServicesTaxonomyPathsView.as_view(), name="taxonomy-paths"),  # 66
    path("archive", v.ServicesArchiveView.as_view(), name="archive"),                      # 67
    path("me", v.MyServicesView.as_view(), name="me"),                                     # 68
    path("me/stats", v.MyServiceStatsView.as_view(), name="me-stats"),                     # 69
    path("search/suggestions", v.ServiceSearchSuggestionsView.as_view(), name="suggestions"),  # 74

    path("", v.CreateServiceView.as_view(), name="create"),                                # 52 (POST) + 63 (GET list)
    path("list", v.ServicesListView.as_view(), name="list"),                               # 63 alias

    # Detail / sub-actions
    path("<int:service_id>", v.ServiceDetailView.as_view(), name="detail"),                # 54 + 73
    path("<int:service_id>/archive", v.ArchiveServiceView.as_view(), name="archive-item"), # 55
    path("<int:service_id>/page", v.ServicePageView.as_view(), name="page"),               # 60
    path("<int:service_id>/edit", v.ServiceForEditView.as_view(), name="edit"),            # 61
    path("<int:service_id>/refresh", v.RefreshServiceView.as_view(), name="refresh"),      # 70
    path("<int:service_id>/report", v.ReportServiceView.as_view(), name="report"),         # 71
    path("<int:service_id>/media", v.UpdateServiceMediaView.as_view(), name="media"),      # 72
]
