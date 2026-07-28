/**
 * Blog Article Types
 *
 * Plain TypeScript shapes matching the Django blog API payloads (the frontend
 * no longer uses Prisma — data comes from the Django REST backend).
 */

import type { BlogArticle, Profile } from '@/lib/prisma-types';

// =============================================================================
// PUBLIC PAGE TYPES
// =============================================================================

/** One author entry on a blog article (public card shape). */
export interface BlogArticleCardAuthor {
  order: number;
  profile: Pick<Profile, 'id' | 'username' | 'displayName' | 'image'>;
}

/** Article card data for archive/listing pages (matches ARTICLE_CARD_SELECT). */
export type BlogArticleCard = Pick<
  BlogArticle,
  | 'id'
  | 'slug'
  | 'title'
  | 'excerpt'
  | 'coverImage'
  | 'categorySlug'
  | 'featured'
  | 'publishedAt'
  | 'createdAt'
> & {
  authors: BlogArticleCardAuthor[];
};

/** Full article data for detail page (matches getArticle include). */
export type BlogArticleDetail = BlogArticle & {
  authors: Array<{
    order: number;
    profile: Pick<
      Profile,
      | 'id'
      | 'username'
      | 'displayName'
      | 'image'
      | 'authorBio'
      | 'subcategory'
      | 'rating'
      | 'reviewCount'
    >;
  }>;
};

/** Author shape from detail page (with bio) - for AuthorBox component */
export type BlogArticleDetailAuthor = BlogArticleDetail['authors'][number];

// =============================================================================
// ADMIN TYPES
// =============================================================================

/** Article data for admin editing (matches getArticleAdmin include). */
export type BlogArticleAdmin = BlogArticle & {
  authors: Array<{
    profileId: string;
    order: number;
    profile: Pick<Profile, 'id' | 'displayName' | 'image' | 'username'>;
  }>;
};

// =============================================================================
// PAGINATED RESPONSE
// =============================================================================

export interface BlogArticlesResponse {
  articles: BlogArticleCard[];
  total: number;
  totalPages: number;
  hasMore: boolean;
}
