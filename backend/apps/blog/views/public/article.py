"""Public blog endpoints (rows 122, 123, 124)."""
from __future__ import annotations

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.blog.services import articles
from common.exceptions import NotFound


class ArticlesListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(articles.list_published_articles(
            page=int(request.query_params.get("page", 1)),
            limit=int(request.query_params.get("limit", 12)),
            category_slug=request.query_params.get("categorySlug"),
            author_profile_id=request.query_params.get("authorProfileId"),
            featured=_bool(request.query_params.get("featured")),
            search=request.query_params.get("search"),
        ))


class ArticleRelatedView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        article = articles.get_published_article(slug)
        if article is None:
            return Response([])
        return Response(articles.get_related(
            article["categorySlug"] or "",
            slug,
            limit=int(request.query_params.get("limit", 4)),
        ))


class ArticleDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        article = articles.get_published_article(slug)
        if article is None:
            raise NotFound("Article not found")
        return Response(article)


def _bool(v):
    if v is None:
        return None
    return v in ("true", "1", "yes", True)
