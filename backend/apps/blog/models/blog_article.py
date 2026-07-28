"""BlogArticle + BlogArticleAuthor — mirror Prisma `blog_articles` and
`blog_article_authors`. Reuses the shared Status enum from services."""
from __future__ import annotations

from django.db import models

from common.utils.cuid import cuid


class BlogStatus(models.TextChoices):
    DRAFT = "draft", "draft"
    PENDING = "pending", "pending"
    PUBLISHED = "published", "published"
    REJECTED = "rejected", "rejected"
    APPROVED = "approved", "approved"
    INACTIVE = "inactive", "inactive"


class BlogArticle(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    slug = models.CharField(max_length=255, unique=True)
    title = models.CharField(max_length=512)
    title_normalized = models.CharField(max_length=512, null=True, blank=True, db_column="titleNormalized")
    excerpt = models.TextField(null=True, blank=True)
    content = models.TextField()
    cover_image = models.JSONField(null=True, blank=True, db_column="coverImage")

    category_slug = models.CharField(max_length=64, null=True, blank=True, db_column="categorySlug")
    status = models.CharField(max_length=16, choices=BlogStatus.choices, default=BlogStatus.DRAFT)
    featured = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True, db_column="publishedAt")

    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "blog_articles"
        managed = True

    def __str__(self) -> str:
        return self.title


class BlogArticleAuthor(models.Model):
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)
    article = models.ForeignKey(
        BlogArticle, on_delete=models.CASCADE, db_column="articleId",
        db_constraint=False, related_name="authors_through",
    )
    profile = models.ForeignKey(
        "profiles.Profile", on_delete=models.CASCADE, db_column="profileId",
        db_constraint=False, related_name="blog_articles_through",
    )
    order = models.IntegerField(default=0)

    class Meta:
        db_table = "blog_article_authors"
        managed = True
        unique_together = (("article", "profile"),)
