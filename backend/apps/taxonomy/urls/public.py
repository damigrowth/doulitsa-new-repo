"""Taxonomy public URL routes (rows 125, 126). Mounted at /api/taxonomy/."""
from __future__ import annotations

from django.urls import path

from apps.taxonomy.views.public import maps as maps_v
from apps.taxonomy.views.public import submissions as v

app_name = "taxonomy_public"

urlpatterns = [
    path("maps", maps_v.TaxonomyMapsView.as_view(), name="maps"),                      # DB taxonomy
    path("submissions", v.SubmitTaxonomyView.as_view(), name="submit"),                # 125
    path("submissions/me", v.MyTaxonomySubmissionsView.as_view(), name="me"),          # 126
]
