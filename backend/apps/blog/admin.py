from django.contrib import admin

from .models.blog_article import BlogArticle, BlogArticleAuthor


class BlogArticleAuthorInline(admin.TabularInline):
    model = BlogArticleAuthor
    extra = 0
    raw_id_fields = ("profile",)


@admin.register(BlogArticle)
class BlogArticleAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "slug", "category_slug", "status", "featured", "published_at", "created_at")
    list_filter = ("status", "featured", "category_slug")
    search_fields = ("title", "slug", "excerpt", "content")
    inlines = (BlogArticleAuthorInline,)
    ordering = ("-created_at",)


@admin.register(BlogArticleAuthor)
class BlogArticleAuthorAdmin(admin.ModelAdmin):
    list_display = ("id", "article", "profile", "order")
    raw_id_fields = ("article", "profile")
    ordering = ("article", "order")
