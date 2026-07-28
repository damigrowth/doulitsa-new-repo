"""Admin blog endpoints (rows 244-248)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.admin import AdminResource, HasResourcePermission
from apps.blog.serializers.article import CreateArticleSerializer, UpdateArticleSerializer
from apps.blog.services import articles
from common.exceptions import NotFound

_PERM_VIEW = HasResourcePermission(AdminResource.BLOG, "view")
_PERM_EDIT = HasResourcePermission(AdminResource.BLOG, "edit")
_PERM_FULL = HasResourcePermission(AdminResource.BLOG, "full")


class AdminArticleListCreateView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request):
        return Response(articles.list_admin(
            page=int(request.query_params.get("page", 1)),
            limit=int(request.query_params.get("limit", 20)),
            status=request.query_params.get("status"),
            category_slug=request.query_params.get("categorySlug"),
            search=request.query_params.get("search"),
        ))

    @extend_schema(request=CreateArticleSerializer)
    def post(self, request):
        self.permission_classes = [IsAuthenticated, _PERM_EDIT]
        self.check_permissions(request)
        s = CreateArticleSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        article = articles.create_article(payload=s.validated_data)
        return Response({"id": article.id, "slug": article.slug}, status=status.HTTP_201_CREATED)


class AdminArticleDetailView(APIView):
    permission_classes = [IsAuthenticated, _PERM_VIEW]

    def get(self, request, article_id):
        payload = articles.get_admin(article_id)
        if payload is None:
            raise NotFound("Article not found")
        return Response(payload)

    @extend_schema(request=UpdateArticleSerializer)
    def patch(self, request, article_id):
        self.permission_classes = [IsAuthenticated, _PERM_EDIT]
        self.check_permissions(request)
        s = UpdateArticleSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        article = articles.update_article(article_id=article_id, payload=s.validated_data)
        return Response({"id": article.id, "slug": article.slug})

    def delete(self, request, article_id):
        self.permission_classes = [IsAuthenticated, _PERM_FULL]
        self.check_permissions(request)
        articles.delete_article(article_id)
        return Response(status=status.HTTP_204_NO_CONTENT)
