"""Blog public URL routes (rows 122-124). Mounted at /api/blog/."""
from __future__ import annotations

from django.urls import path

from apps.blog.views.public.article import (
    ArticleDetailView,
    ArticleRelatedView,
    ArticlesListView,
)

app_name = "blog_public"

urlpatterns = [
    path("articles", ArticlesListView.as_view(), name="list"),                    # 122
    path("articles/<str:slug>/related", ArticleRelatedView.as_view(), name="related"),  # 123
    path("articles/<str:slug>", ArticleDetailView.as_view(), name="detail"),       # 124
]
