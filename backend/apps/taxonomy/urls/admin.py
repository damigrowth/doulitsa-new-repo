"""Taxonomy admin URL routes (rows 223-242). Mounted at /api/admin/ from config/urls.py."""
from __future__ import annotations

from django.urls import path

from apps.taxonomy.views.admin import dataset as d
from apps.taxonomy.views.admin import submissions as subs

app_name = "taxonomy_admin"

urlpatterns = [
    # Skills (223-225)
    path("skills", d.AdminSkillCreateView.as_view(), name="skills-create"),
    path("skills/<str:item_id>", d.AdminSkillUpdateDeleteView.as_view(), name="skills-detail"),

    # Tags (226-228)
    path("tags", d.AdminTagCreateView.as_view(), name="tags-create"),
    path("tags/<str:item_id>", d.AdminTagUpdateDeleteView.as_view(), name="tags-detail"),

    # Service / Pro taxonomies (229-232)
    path("taxonomies/services", d.AdminServiceTaxonomyCreateView.as_view(), name="service-tax-create"),
    path("taxonomies/services/<str:item_id>", d.AdminServiceTaxonomyUpdateView.as_view(),
         name="service-tax-update"),
    path("taxonomies/pros", d.AdminProTaxonomyCreateView.as_view(), name="pro-tax-create"),
    path("taxonomies/pros/<str:item_id>", d.AdminProTaxonomyUpdateView.as_view(), name="pro-tax-update"),

    # Multi-change commit + cache revalidate (233, 234)
    path("taxonomies/commit", d.AdminCommitChangesView.as_view(), name="taxonomies-commit"),
    path("taxonomies/revalidate", d.AdminRevalidateTaxonomyCachesView.as_view(),
         name="taxonomies-revalidate"),

    # Taxonomy submission moderation (added post-tracker)
    path("taxonomy/submissions", subs.AdminSubmissionListView.as_view(), name="submissions-list"),
    path("taxonomy/submissions/stats", subs.AdminSubmissionStatsView.as_view(), name="submissions-stats"),
    path("taxonomy/submissions/bulk-approve",
         subs.AdminSubmissionBulkApproveView.as_view(), name="submissions-bulk-approve"),
    path("taxonomy/submissions/bulk-reject",
         subs.AdminSubmissionBulkRejectView.as_view(), name="submissions-bulk-reject"),
    path("taxonomy/submissions/<str:submission_id>/approve",
         subs.AdminSubmissionApproveView.as_view(), name="submissions-approve"),
    path("taxonomy/submissions/<str:submission_id>/reject",
         subs.AdminSubmissionRejectView.as_view(), name="submissions-reject"),
]
