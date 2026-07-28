/**
 * Centralized cache revalidation utilities
 * Simplifies and standardizes cache invalidation across server actions
 */

import { revalidateTag, revalidatePath } from 'next/cache';
import { CACHE_TAGS, getServiceTags, getProfileTags } from './index';
import { findProById } from '@/lib/taxonomies';

/**
 * Invalidate all caches related to a service mutation
 * Use this for: create, update, delete, toggle featured
 *
 * @example
 * await revalidateService({
 *   serviceId: newService.id,
 *   slug: newService.slug,
 *   pid: newService.pid,
 *   category: newService.category,
 *   userId: user.id,
 *   profileId: profile.id,
 *   profileUsername: profile.username,
 *   includeHome: newService.featured, // Only if featured
 * });
 */
export async function revalidateService(params: {
  serviceId: number;
  slug?: string | null;
  pid: string;
  category?: string | null;
  userId: string;
  profileId: string;
  profileUsername?: string | null;
  includeHome?: boolean; // For featured services
}) {
  const {
    serviceId,
    slug,
    pid,
    category,
    userId,
    profileId,
    profileUsername,
    includeHome = false
  } = params;

  // Service-specific tags
  const serviceTags = getServiceTags({ id: serviceId, slug, pid, category });
  serviceTags.forEach(tag => revalidateTag(tag));

  // Profile-related tags (service affects profile listings)
  revalidateTag(CACHE_TAGS.profile.byId(profileId));
  revalidateTag(CACHE_TAGS.profile.services(profileId));
  revalidateTag(CACHE_TAGS.user.services(userId));

  if (profileUsername) {
    revalidateTag(CACHE_TAGS.profile.byUsername(profileUsername));
    revalidateTag(CACHE_TAGS.profile.page(profileUsername));
  }

  // Archive/listing pages
  revalidateTag(CACHE_TAGS.archive.all);
  revalidateTag(CACHE_TAGS.archive.servicesFiltered);
  revalidateTag(CACHE_TAGS.collections.services);

  if (category) {
    revalidateTag(CACHE_TAGS.categories.category(category));
  }

  // Search
  revalidateTag(CACHE_TAGS.search.all);
  revalidateTag(CACHE_TAGS.search.taxonomies);

  // Home page (if featured service changed)
  if (includeHome) {
    revalidateTag(CACHE_TAGS.home);
    revalidatePath('/');
  }

  // Taxonomy-specific tags (getCategoriesPageData uses these)
  revalidateTag('services');
  revalidateTag('categories');
  revalidateTag('categories-page');

  // Paths
  if (slug) {
    revalidatePath(`/s/${slug}`);
  }
  if (profileUsername) {
    revalidatePath(`/profile/${profileUsername}`);
  }
  revalidatePath('/ipiresies', 'page');
  revalidatePath('/ipiresies/[subcategory]', 'page');
  revalidatePath('/ipiresies/[subcategory]/[subdivision]', 'page');
  revalidatePath('/categories', 'page');
  revalidatePath('/categories/[category]', 'page');
  revalidateTag(CACHE_TAGS.categories.all);
}

/**
 * Invalidate all caches related to a profile mutation
 * Use this for: update basic info, presentation, portfolio, coverage, billing, additional info
 *
 * @example
 * await revalidateProfile({
 *   profileId: profile.id,
 *   userId: user.id,
 *   username: profile.username,
 *   category: newCategory,
 *   subcategory: newSubcategory,
 *   oldSubcategory: existingProfile.subcategory, // Pass when subcategory changes
 *   includeHome: profile.featured,
 *   includeServices: true,
 * });
 */
export async function revalidateProfile(params: {
  profileId: string;
  userId: string;
  username?: string | null;
  category?: string | null; // Current/new category ID
  subcategory?: string | null; // Current/new subcategory ID
  oldSubcategory?: string | null; // Previous subcategory ID (for subcategory changes)
  includeHome?: boolean; // For featured profiles
  includeServices?: boolean; // When profile data affects services
}) {
  const {
    profileId,
    userId,
    username,
    category,
    subcategory,
    oldSubcategory,
    includeHome = false,
    includeServices = true
  } = params;

  // Profile-specific tags
  const profileTags = getProfileTags({ id: profileId, uid: userId, username });
  profileTags.forEach(tag => revalidateTag(tag));

  // User tags
  revalidateTag(CACHE_TAGS.user.byId(userId));
  revalidateTag(CACHE_TAGS.user.profile(userId));

  // Services (profile changes affect service listings and detail pages)
  if (includeServices) {
    revalidateTag(CACHE_TAGS.user.services(userId));
    revalidateTag(CACHE_TAGS.profile.services(profileId));
    revalidateTag(CACHE_TAGS.service.byProfile(profileId));
    revalidateTag(CACHE_TAGS.collections.services);
  }

  // Archive/listing pages
  revalidateTag(CACHE_TAGS.archive.all);
  revalidateTag(CACHE_TAGS.collections.profiles);
  revalidateTag(CACHE_TAGS.directory.all);

  if (category) {
    revalidateTag(CACHE_TAGS.directory.category(category));
    revalidateTag(CACHE_TAGS.collections.profilesCategory(category));
  }

  // Subcategory-specific cache invalidation
  if (subcategory) {
    revalidateTag(CACHE_TAGS.directory.subcategory(subcategory));
    revalidateTag(CACHE_TAGS.collections.profilesSubcategory(subcategory));
  }

  // When subcategory changes, also invalidate the OLD subcategory's cache
  if (oldSubcategory && oldSubcategory !== subcategory) {
    revalidateTag(CACHE_TAGS.directory.subcategory(oldSubcategory));
    revalidateTag(CACHE_TAGS.collections.profilesSubcategory(oldSubcategory));
  }

  // Home page (if featured profile changed)
  if (includeHome) {
    revalidateTag(CACHE_TAGS.home);
    revalidatePath('/');
  }

  // Paths - profile page
  if (username) {
    revalidatePath(`/profile/${username}`);
  }

  // Paths - directory archive pages (resolve IDs to slugs internally)
  const categoryData = category ? findProById(category) : null;
  const subcategoryData = subcategory ? findProById(subcategory) : null;
  const oldSubcategoryData = oldSubcategory ? findProById(oldSubcategory) : null;

  if (categoryData?.slug) {
    revalidatePath(`/dir/${categoryData.slug}`);

    if (subcategoryData?.slug) {
      revalidatePath(`/dir/${categoryData.slug}/${subcategoryData.slug}`);
    }

    // Revalidate old subcategory archive (to remove the profile from it)
    if (oldSubcategoryData?.slug && oldSubcategoryData.slug !== subcategoryData?.slug) {
      revalidatePath(`/dir/${categoryData.slug}/${oldSubcategoryData.slug}`);
    }
  }

  revalidatePath('/dir');
  revalidatePath('/dashboard');
}

/**
 * Invalidate review-related caches
 * Use this for: create, update, delete reviews
 *
 * @example
 * await revalidateReview({
 *   reviewId: review.id,
 *   serviceId: review.serviceId,
 *   profileId: review.profileId,
 *   userId: user.id,
 * });
 */
export async function revalidateReview(params: {
  reviewId: number;
  serviceId?: number | null;
  profileId: string;
  userId: string;
}) {
  const { reviewId, serviceId, profileId, userId } = params;

  // Review tags
  revalidateTag(CACHE_TAGS.review.byId(reviewId));
  revalidateTag(CACHE_TAGS.review.byProfile(profileId));
  revalidateTag(CACHE_TAGS.review.byUser(userId));

  if (serviceId) {
    revalidateTag(CACHE_TAGS.review.byService(serviceId));
    revalidateTag(CACHE_TAGS.service.byId(serviceId));
  }

  // Profile rating changed - affects all profile displays
  revalidateTag(CACHE_TAGS.profile.byId(profileId));

  // Could affect home page if rating changed for featured items
  revalidateTag(CACHE_TAGS.home);

  // Archive pages (reviews affect sorting)
  revalidateTag(CACHE_TAGS.archive.all);
}

/**
 * Invalidate all caches related to a blog article mutation
 * Use this for: create, update, delete, publish/unpublish
 *
 * @example
 * await revalidateArticle({
 *   articleId: article.id,
 *   slug: article.slug,
 *   categorySlug: article.categorySlug,
 *   authorProfileIds: ['profileId1', 'profileId2'],
 * });
 */
export async function revalidateArticle(params: {
  articleId: string;
  slug?: string | null;
  categorySlug?: string | null;
  authorProfileIds?: string[];
}) {
  const { articleId, slug, categorySlug, authorProfileIds = [] } = params;

  // Article-specific tags
  revalidateTag(CACHE_TAGS.article.byId(articleId));
  if (slug) {
    revalidateTag(CACHE_TAGS.article.bySlug(slug));
  }
  if (categorySlug) {
    revalidateTag(CACHE_TAGS.article.byCategory(categorySlug));
  }

  // Author tags
  for (const profileId of authorProfileIds) {
    revalidateTag(CACHE_TAGS.article.byAuthor(profileId));
  }

  // Collection tags
  revalidateTag(CACHE_TAGS.blog.articles);

  // Paths
  if (slug && categorySlug) {
    revalidatePath(`/articles/${categorySlug}/${slug}`);
  }
  if (categorySlug) {
    revalidatePath(`/articles/${categorySlug}`);
  }
  revalidatePath('/articles');
}

/**
 * Log cache revalidation for monitoring (development/production)
 */
export function logCacheRevalidation(
  type: 'service' | 'profile' | 'review',
  id: string | number,
  context?: string
) {
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_LOG_CACHE === 'true') {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` (${context})` : '';
    console.log(`[Cache Revalidation] ${type}:${id}${contextStr} at ${timestamp}`);
  }
}
