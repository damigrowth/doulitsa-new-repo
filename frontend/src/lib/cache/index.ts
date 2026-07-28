/**
 * Centralized cache utilities for consistent caching across the application
 * Optimized for Vercel Edge Network with ISR + On-demand revalidation
 */

import { unstable_cache } from 'next/cache';
import { cache } from 'react';

// Re-export revalidation helpers for convenience
export * from './revalidation';

/**
 * Consistent cache tag naming convention
 * Using hierarchical structure for efficient invalidation
 */
export const CACHE_TAGS = {
  // Profile-related tags
  profile: {
    byId: (id: string) => `profile:id:${id}` as const,
    byUsername: (username: string) => `profile:username:${username}` as const,
    byUserId: (userId: string) => `profile:uid:${userId}` as const,
    services: (profileId: string) => `profile:${profileId}:services` as const,
    page: (username: string) => `page:profile:${username}` as const,
  },

  // Service-related tags
  service: {
    byId: (id: number) => `service:id:${id}` as const,
    bySlug: (slug: string) => `service:slug:${slug}` as const,
    byProfile: (profileId: string) => `service:profile:${profileId}` as const,
    page: (slug: string) => `page:service:${slug}` as const,
  },

  // User-related tags
  user: {
    byId: (userId: string) => `user:${userId}` as const,
    profile: (userId: string) => `user:${userId}:profile` as const,
    services: (userId: string) => `user:${userId}:services` as const,
  },

  // Verification-related tags
  verification: {
    byUserId: (userId: string) => `verification:${userId}` as const,
    byProfileId: (profileId: string) => `verification:profile:${profileId}` as const,
  },

  // Collection tags for bulk invalidation
  collections: {
    profiles: 'profiles:all' as const,
    services: 'services:all' as const,
    verifications: 'verifications:all' as const,
    profilesCategory: (category: string) => `profiles:category:${category}` as const,
    profilesSubcategory: (subcategory: string) => `profiles:subcategory:${subcategory}` as const,
    servicesCategory: (category: string) => `services:category:${category}` as const,
  },

  // Archive/listing pages
  archive: {
    profiles: (filters: string) => `archive:profiles:${filters}` as const,
    services: (filters: string) => `archive:services:${filters}` as const,
    servicesFiltered: 'archive:services:filtered' as const,
    all: 'archive:all' as const,
  },

  // Search-related tags
  search: {
    results: (term: string) => `search:results:${term}` as const,
    taxonomies: 'search:taxonomies' as const,
    all: 'search:all' as const,
  },

  // Admin-related tags
  admin: {
    profiles: 'admin:profiles' as const,
    services: 'admin:services' as const,
    verifications: 'admin:verifications' as const,
    all: 'admin:all' as const,
  },

  // Blog/article-related tags
  article: {
    byId: (id: string) => `article:id:${id}` as const,
    bySlug: (slug: string) => `article:slug:${slug}` as const,
    byCategory: (categoryId: string) => `article:category:${categoryId}` as const,
    byAuthor: (profileId: string) => `article:author:${profileId}` as const,
  },

  blog: {
    articles: 'blog:articles' as const,
  },

  // Home page tag
  home: 'page:home' as const,

  // Review-related tags
  review: {
    byId: (id: number) => `review:id:${id}` as const,
    byService: (serviceId: number) => `review:service:${serviceId}` as const,
    byProfile: (profileId: string) => `review:profile:${profileId}` as const,
    byUser: (userId: string) => `review:user:${userId}` as const,
  },

  // Dashboard pages
  dashboard: {
    user: (userId: string) => `dashboard:user:${userId}` as const,
    messages: (userId: string) => `dashboard:messages:${userId}` as const,
    services: (userId: string) => `dashboard:services:${userId}` as const,
  },

  // Directory/Archive pages (more specific)
  directory: {
    all: 'directory:all' as const,
    category: (category: string) => `directory:category:${category}` as const,
    subcategory: (subcategory: string) => `directory:subcategory:${subcategory}` as const,
  },

  categories: {
    all: 'categories:all' as const,
    category: (category: string) => `categories:category:${category}` as const,
  },
} as const;

/**
 * Default cache revalidation time in seconds
 * Short duration with ISR backup for optimal performance
 */
export const CACHE_REVALIDATE_SECONDS = 300; // 5 minutes

/**
 * Type-safe cache tag type
 */
export type CacheTag = ReturnType<
  typeof CACHE_TAGS[keyof typeof CACHE_TAGS][keyof typeof CACHE_TAGS[keyof typeof CACHE_TAGS]]
> | typeof CACHE_TAGS.collections[keyof typeof CACHE_TAGS.collections];

/**
 * Create a cached version of a function with consistent configuration
 * Combines unstable_cache with React cache for request deduplication
 */
export function createCachedFunction<TFunc extends (...args: any[]) => any>(
  fn: TFunc,
  keyParts: string[],
  tags: string[] | ((...args: Parameters<TFunc>) => string[]),
  options?: {
    revalidate?: number;
    /** Enable request-level caching with React cache */
    requestCache?: boolean;
  }
): TFunc {
  const revalidate = options?.revalidate ?? CACHE_REVALIDATE_SECONDS;
  const useRequestCache = options?.requestCache ?? true;

  // Wrap with unstable_cache for persistent caching
  const persistentCached = unstable_cache(
    fn,
    keyParts,
    {
      tags: typeof tags === 'function' ? undefined : tags,
      revalidate,
    }
  );

  // If tags is a function, we need to wrap differently
  if (typeof tags === 'function') {
    const dynamicCached = (...args: Parameters<TFunc>) => {
      const dynamicTags = tags(...args);
      return unstable_cache(
        fn,
        [...keyParts, ...args.map(String)],
        {
          tags: dynamicTags,
          revalidate,
        }
      )(...args);
    };

    // Optionally add request-level caching
    return useRequestCache ? cache(dynamicCached) as TFunc : dynamicCached as TFunc;
  }

  // Optionally add request-level caching for deduplication
  return useRequestCache ? cache(persistentCached) as TFunc : persistentCached as TFunc;
}

/**
 * Helper to generate cache key from parts
 */
export function generateCacheKey(...parts: (string | number | undefined)[]): string {
  return parts.filter(Boolean).join(':');
}

/**
 * Helper to get all related tags for a profile
 */
export function getProfileTags(profile: {
  id: string;
  uid: string;
  username?: string | null;
}): (string | `profile:username:${string}` | `profile:page:${string}`)[] {
  const tags: (string | `profile:username:${string}` | `profile:page:${string}`)[] = [
    CACHE_TAGS.profile.byId(profile.id),
    CACHE_TAGS.profile.byUserId(profile.uid),
    CACHE_TAGS.user.profile(profile.uid),
    CACHE_TAGS.collections.profiles,
  ];

  if (profile.username) {
    tags.push(CACHE_TAGS.profile.byUsername(profile.username));
    tags.push(CACHE_TAGS.profile.page(profile.username));
  }

  return tags;
}

/**
 * Helper to get all related tags for a service
 */
export function getServiceTags(service: {
  id: number;
  slug?: string | null;
  pid: string;
  category?: string | null;
}): (string | `service:slug:${string}` | `page:service:${string}` | `services:category:${string}`)[] {
  const tags: (string | `service:slug:${string}` | `page:service:${string}` | `services:category:${string}`)[] = [
    CACHE_TAGS.service.byId(service.id),
    CACHE_TAGS.service.byProfile(service.pid),
    CACHE_TAGS.profile.services(service.pid),
    CACHE_TAGS.collections.services,
  ];

  if (service.slug) {
    tags.push(CACHE_TAGS.service.bySlug(service.slug));
    tags.push(CACHE_TAGS.service.page(service.slug));
  }

  if (service.category) {
    tags.push(CACHE_TAGS.collections.servicesCategory(service.category));
  }

  return tags;
}

/**
 * Performance monitoring helper (optional)
 * Can be enabled in development to track cache performance
 */
export function withCacheMetrics<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    return fn().then(
      (result) => {
        const duration = performance.now() - start;
        console.log(`[Cache] ${operation}: ${duration.toFixed(2)}ms`);
        return result;
      },
      (error) => {
        const duration = performance.now() - start;
        console.error(`[Cache] ${operation} failed: ${duration.toFixed(2)}ms`, error);
        throw error;
      }
    );
  }
  return fn();
}