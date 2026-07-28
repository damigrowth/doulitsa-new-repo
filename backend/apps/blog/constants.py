"""Static blog category slugs.

Ports `src/constants/datasets/blog-categories.ts` (the 13 fixed slugs). These are
fixed and not admin-managed. Used to validate `categorySlug` on create/update,
exactly as OLD `getBlogCategoryBySlug` did (manage-articles.ts:27-29,105-107).
"""
from __future__ import annotations

# Slugs only — labels/descriptions live on the frontend
# (constants/datasets/blog-categories.ts:14-27). Order preserved for parity.
BLOG_CATEGORY_SLUGS: tuple[str, ...] = (
    "nea",
    "anakoinoseis",
    "tips",
    "diy",
    "symvoules",
    "dimiourgia-periechomenou",
    "ekdiloseis",
    "eyexia-frontida",
    "mathimata",
    "marketingk",
    "pliroforiki",
    "technika",
    "ypostirixi",
)

BLOG_CATEGORY_SLUG_SET = frozenset(BLOG_CATEGORY_SLUGS)


def is_valid_blog_category(slug: str | None) -> bool:
    """Mirror `getBlogCategoryBySlug(slug)` truthiness (blog-categories.ts:33-35)."""
    return bool(slug) and slug in BLOG_CATEGORY_SLUG_SET
