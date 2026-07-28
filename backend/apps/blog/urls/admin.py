"""Blog admin URL routes (rows 244-248). Mounted at /api/admin/blog/."""
from __future__ import annotations

from django.urls import path

from apps.blog.views.admin.article import (
    AdminArticleDetailView,
    AdminArticleListCreateView,
)

app_name = "blog_admin"

urlpatterns = [
    path("articles", AdminArticleListCreateView.as_view(), name="list-create"),       # 244 + 247
    path("articles/<str:article_id>", AdminArticleDetailView.as_view(), name="detail"),  # 245 + 246 + 248
]
