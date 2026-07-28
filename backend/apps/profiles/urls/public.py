"""Profiles public URL routes. Mounted at /api/profiles/ from config/urls.py."""
from __future__ import annotations

from django.urls import path

from apps.profiles.views.public import aggregations as a
from apps.profiles.views.public import profile as v

app_name = "profiles_public"

urlpatterns = [
    # Aggregations (rows 40, 43, 44, 45, 46)
    path("directory", a.ProfilesDirectoryView.as_view(), name="directory"),     # row 40
    path("search", a.ProfilesSearchView.as_view(), name="search"),              # row 44
    path("count", a.ProfilesCountView.as_view(), name="count"),                 # row 45
    path("archive", a.ProfilesArchiveView.as_view(), name="archive"),           # row 46
    path("page/<str:username>", a.ProfilePageView.as_view(), name="page"),      # row 43

    # Own-profile updates (rows 33-39)
    path("me", v.MyProfileView.as_view(), name="me"),                                     # row 41
    path("me/additional-info", v.MyAdditionalInfoView.as_view(), name="me-additional"),   # row 33
    path("me/basic-info", v.MyBasicInfoView.as_view(), name="me-basic"),                  # row 34
    path("me/billing", v.MyBillingView.as_view(), name="me-billing"),                     # row 35
    path("me/coverage", v.MyCoverageView.as_view(), name="me-coverage"),                  # row 36
    path("me/portfolio", v.MyPortfolioView.as_view(), name="me-portfolio"),               # row 37
    path("me/presentation", v.MyPresentationView.as_view(), name="me-presentation"),      # rows 38 + 39

    # Verification (rows 50, 51)
    path("me/verification", v.MyVerificationView.as_view(), name="me-verification"),

    # Public reads
    path("by-username/<str:username>", v.PublicProfileByUsernameView.as_view(), name="by-username"),  # 42
    path("taxonomy-paths", v.TaxonomyPathsView.as_view(), name="taxonomy-paths"),                     # 47

    # AFM lookup (row 48)
    path("lookup-afm", v.LookupAfmView.as_view(), name="lookup-afm"),

    # Reporting (row 49)
    path("<str:profile_id>/report", v.ReportProfileView.as_view(), name="report"),
]
