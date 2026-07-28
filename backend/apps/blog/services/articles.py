"""Blog article CRUD + read queries.

Mirrors `actions/blog/{get-articles,get-article,manage-articles}.ts`.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from django.core.cache import cache
from django.db import transaction
from django.db.models import Q

from apps.blog.constants import is_valid_blog_category
from apps.blog.models import BlogArticle, BlogArticleAuthor, BlogStatus
from apps.profiles.models import Profile
from common.exceptions import ApiError
from common.utils.normalize import normalize_term
from common.utils.slug import create_slug


# ----- Read ---------------------------------------------------------------


def list_published_articles(
    *,
    page: int = 1,
    limit: int = 12,
    category_slug: str | None = None,
    author_profile_id: str | None = None,
    featured: bool | None = None,
    search: str | None = None,
) -> dict[str, Any]:
    cache_key = f"blog:list:{page}:{limit}:{category_slug}:{author_profile_id}:{featured}:{search}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    qs = BlogArticle.objects.filter(status=BlogStatus.PUBLISHED).order_by("-published_at")
    if category_slug:
        qs = qs.filter(category_slug=category_slug)
    if featured is not None:
        qs = qs.filter(featured=featured)
    if search:
        # OLD: single term, OR over titleNormalized + title, insensitive
        # (get-articles.ts:70-75).
        qs = qs.filter(
            Q(title_normalized__icontains=search) | Q(title__icontains=search)
        )
    if author_profile_id:
        qs = qs.filter(authors_through__profile_id=author_profile_id).distinct()

    total = qs.count()
    offset = (page - 1) * limit
    rows = list(qs[offset:offset + limit])

    total_pages = -(-total // limit) if limit else 0
    payload = {
        # OLD BlogArticlesResponse = { articles, total, totalPages, hasMore }
        # (get-articles.ts:92-97). No `page` key.
        "articles": [_public_card(a) for a in rows],
        "total": total,
        "totalPages": total_pages,
        "hasMore": total > offset + limit,
    }
    cache.set(cache_key, payload, timeout=60 * 30)
    return payload


def get_published_article(slug: str) -> dict[str, Any] | None:
    cache_key = f"blog:article:{slug}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    article = BlogArticle.objects.filter(slug=slug, status=BlogStatus.PUBLISHED).first()
    if article is None:
        return None
    # Detail authors carry the full profile select (get-article.ts:21-39):
    # nested under `profile`, with `order`, incl subcategory/rating/reviewCount.
    payload = {
        **_public_card(article),
        "content": article.content,
        "authors": _detail_authors_of(article),
    }
    cache.set(cache_key, payload, timeout=60 * 60)
    return payload


def get_related(category_slug: str, exclude_slug: str, *, limit: int = 4) -> list[dict[str, Any]]:
    qs = (
        BlogArticle.objects
        .filter(status=BlogStatus.PUBLISHED, category_slug=category_slug)
        .exclude(slug=exclude_slug)
        .order_by("-published_at")[:limit]
    )
    return [_public_card(a) for a in qs]


def _public_card(a: BlogArticle) -> dict[str, Any]:
    # OLD ARTICLE_CARD_SELECT (get-articles.ts:15-39): no `status`/`updatedAt`;
    # includes nested `authors:[{order, profile:{id,username,displayName,image}}]`.
    return {
        "id": a.id,
        "slug": a.slug,
        "title": a.title,
        "excerpt": a.excerpt,
        "coverImage": a.cover_image,
        "categorySlug": a.category_slug,
        "featured": a.featured,
        "publishedAt": a.published_at.isoformat() if a.published_at else None,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
        "authors": _card_authors_of(a),
    }


def _card_authors_of(article: BlogArticle) -> list[dict[str, Any]]:
    # Card author select (get-articles.ts:25-38): order + minimal profile.
    rows = (
        BlogArticleAuthor.objects.select_related("profile")
        .filter(article=article).order_by("order")
    )
    out: list[dict[str, Any]] = []
    for r in rows:
        p = r.profile
        out.append({
            "order": r.order,
            "profile": {
                "id": p.id,
                "username": p.username,
                "displayName": p.display_name,
                "image": p.image,
            } if p else None,
        })
    return out


def _detail_authors_of(article: BlogArticle) -> list[dict[str, Any]]:
    # Detail author select (get-article.ts:21-39): order + full profile incl
    # authorBio/subcategory/rating/reviewCount, nested under `profile`.
    rows = (
        BlogArticleAuthor.objects.select_related("profile")
        .filter(article=article).order_by("order")
    )
    out: list[dict[str, Any]] = []
    for r in rows:
        p = r.profile
        out.append({
            "order": r.order,
            "profile": {
                "id": p.id,
                "username": p.username,
                "displayName": p.display_name,
                "image": p.image,
                "authorBio": p.author_bio,
                "subcategory": p.subcategory,
                "rating": p.rating,
                "reviewCount": p.review_count,
            } if p else None,
        })
    return out


def _admin_authors_of(article: BlogArticle) -> list[dict[str, Any]]:
    # Admin author select (manage-articles.ts:272-288,321-337): profileId + order
    # + profile{id,displayName,image,username}.
    rows = (
        BlogArticleAuthor.objects.select_related("profile")
        .filter(article=article).order_by("order")
    )
    out: list[dict[str, Any]] = []
    for r in rows:
        p = r.profile
        out.append({
            "profileId": r.profile_id,
            "order": r.order,
            "profile": {
                "id": p.id,
                "displayName": p.display_name,
                "image": p.image,
                "username": p.username,
            } if p else None,
        })
    return out


# ----- Admin CRUD ---------------------------------------------------------


def _admin_card(a: BlogArticle) -> dict[str, Any]:
    # OLD admin returns the full article model + admin authors
    # (manage-articles.ts:269-294,319-338).
    return {
        "id": a.id,
        "slug": a.slug,
        "title": a.title,
        "excerpt": a.excerpt,
        "coverImage": a.cover_image,
        "categorySlug": a.category_slug,
        "status": a.status,
        "featured": a.featured,
        "publishedAt": a.published_at.isoformat() if a.published_at else None,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
        "updatedAt": a.updated_at.isoformat() if a.updated_at else None,
        "authors": _admin_authors_of(a),
    }


def list_admin(*, page: int = 1, limit: int = 20, status: str | None = None,
               category_slug: str | None = None, search: str | None = None) -> dict[str, Any]:
    qs = BlogArticle.objects.all().order_by("-created_at")
    if status and status != "all":
        qs = qs.filter(status=status)
    if category_slug:
        qs = qs.filter(category_slug=category_slug)
    if search:
        # OLD: title OR titleNormalized, insensitive (manage-articles.ts:262-267).
        qs = qs.filter(
            Q(title__icontains=search) | Q(title_normalized__icontains=search)
        )

    total = qs.count()
    offset = (page - 1) * limit
    rows = list(qs[offset:offset + limit])
    return {
        "articles": [_admin_card(a) for a in rows],
        "total": total,
        "totalPages": -(-total // limit) if limit else 0,
    }


def get_admin(article_id: str) -> dict[str, Any] | None:
    article = BlogArticle.objects.filter(id=article_id).first()
    if article is None:
        return None
    return {**_admin_card(article), "content": article.content}


def _timestamp_suffix() -> str:
    """Replicate JS `Date.now().toString(36)` — ms since epoch in base 36
    (manage-articles.ts:45)."""
    return _to_base36(int(datetime.now(timezone.utc).timestamp() * 1000))


def _to_base36(n: int) -> str:
    if n == 0:
        return "0"
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    out = ""
    while n > 0:
        n, rem = divmod(n, 36)
        out = digits[rem] + out
    return out


def create_article(*, payload: dict[str, Any]) -> BlogArticle:
    title = (payload.get("title") or "").strip()

    # Validate categorySlug against the static list (manage-articles.ts:27-29).
    category_slug = payload.get("categorySlug")
    if category_slug and not is_valid_blog_category(category_slug):
        raise ApiError(f"Invalid category: {category_slug}", code="invalid_category")

    # Validate author profiles exist (manage-articles.ts:32-42).
    author_ids = payload.get("authorProfileIds") or []
    _validate_author_profiles(author_ids)

    # OLD: provided slug used verbatim, else createSlug(title)-{base36 timestamp}
    # (manage-articles.ts:45).
    slug = payload.get("slug") or f"{create_slug(title)}-{_timestamp_suffix()}"

    with transaction.atomic():
        article = BlogArticle.objects.create(
            slug=slug,
            title=title,
            title_normalized=normalize_term(title),
            excerpt=payload.get("excerpt") or None,
            content=payload["content"],
            cover_image=payload.get("coverImage") or None,
            category_slug=category_slug or None,
            status=payload.get("status") or BlogStatus.DRAFT,
            featured=bool(payload.get("featured", False)),
            published_at=datetime.now(timezone.utc) if payload.get("status") == BlogStatus.PUBLISHED else None,
        )
        for i, author_id in enumerate(author_ids):
            BlogArticleAuthor.objects.create(article=article, profile_id=author_id, order=i)
    _purge_cache(article.slug, article.category_slug)
    return article


def _validate_author_profiles(author_ids: list[str]) -> None:
    """Mirror OLD profile-existence check (manage-articles.ts:32-42,110-120)."""
    if not author_ids:
        return
    existing = set(
        Profile.objects.filter(id__in=author_ids).values_list("id", flat=True)
    )
    missing = [aid for aid in author_ids if aid not in existing]
    if missing:
        raise ApiError(
            f"Author profiles not found: {', '.join(missing)}",
            code="author_profiles_not_found",
        )


def update_article(*, article_id: str, payload: dict[str, Any]) -> BlogArticle:
    article = BlogArticle.objects.filter(id=article_id).first()
    if article is None:
        raise ApiError("Article not found", code="article_not_found", status_code=404)

    # Validate categorySlug if provided (manage-articles.ts:105-107).
    if payload.get("categorySlug") and not is_valid_blog_category(payload["categorySlug"]):
        raise ApiError(f"Invalid category: {payload['categorySlug']}", code="invalid_category")

    # Validate author profiles if provided (manage-articles.ts:110-120).
    author_ids = payload.get("authorProfileIds")
    if author_ids:
        _validate_author_profiles(author_ids)

    update_fields: list[str] = []
    if "title" in payload:
        article.title = payload["title"]
        article.title_normalized = normalize_term(article.title)
        update_fields += ["title", "title_normalized"]
    # OLD: provided non-empty slug used verbatim; dup relies on the unique
    # constraint to raise (manage-articles.ts:129).
    if payload.get("slug"):
        article.slug = payload["slug"]
        update_fields.append("slug")
    # excerpt/content/coverImage/categorySlug coerce "" → null (manage-articles.ts:130-133).
    for f, col, nullify in (
        ("excerpt", "excerpt", True),
        ("content", "content", False),
        ("coverImage", "cover_image", True),
        ("categorySlug", "category_slug", True),
        ("featured", "featured", False),
    ):
        if f in payload:
            val = payload[f]
            if nullify and not val:
                val = None
            setattr(article, col, val)
            update_fields.append(col)
    if "status" in payload:
        article.status = payload["status"]
        update_fields.append("status")
        # Set publishedAt only on first publish (manage-articles.ts:139-147).
        if payload["status"] == BlogStatus.PUBLISHED and article.published_at is None:
            article.published_at = datetime.now(timezone.utc)
            update_fields.append("published_at")

    with transaction.atomic():
        if update_fields:
            update_fields.append("updated_at")
            article.save(update_fields=update_fields)
        # OLD links authors whenever authorProfileIds is provided (not undefined),
        # independently of other field updates (manage-articles.ts:157-170).
        if author_ids is not None:
            BlogArticleAuthor.objects.filter(article=article).delete()
            for i, author_id in enumerate(author_ids):
                BlogArticleAuthor.objects.create(article=article, profile_id=author_id, order=i)
    _purge_cache(article.slug, article.category_slug)
    return article


def delete_article(article_id: str) -> None:
    article = BlogArticle.objects.filter(id=article_id).first()
    if article is None:
        raise ApiError("Article not found", code="article_not_found", status_code=404)
    slug = article.slug
    cat = article.category_slug
    article.delete()
    _purge_cache(slug, cat)


def _purge_cache(slug: str, category_slug: str | None) -> None:
    cache.delete(f"blog:article:{slug}")
    # Purge the composite list caches too so publishes/edits/deletes show up
    # immediately (OLD revalidateArticle invalidated the blog collection tag;
    # the 30-min TTL alone left /articles stale).
    try:
        cache.delete_pattern("blog:list:*")
    except AttributeError:  # non-redis backend (tests) — fall back to TTL
        pass
