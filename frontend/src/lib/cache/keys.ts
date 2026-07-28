/**
 * Hierarchical Cache Key Generation
 *
 * Provides consistent, self-documenting cache keys for Next.js unstable_cache.
 *
 * PATTERN: {domain}:{entity-type}:{entity-id}:{variant}
 *
 * Benefits:
 * - Hierarchical organization enables selective invalidation
 * - Consistent key format makes debugging easier
 * - Automatic sorting ensures same params = same key
 * - Null/undefined filtering prevents cache misses
 *
 * Examples:
 * - ['services', 'category:web-dev', 'subcategory:frontend', 'featured']
 * - ['profile', 'id:123', 'with:services,reviews']
 * - ['home', 'data']
 * - ['search', 'query:web development', 'type:services']
 */

type CacheKeyParams = {
  [key: string]: string | number | boolean | null | undefined;
};

/**
 * Build hierarchical cache key from parameters
 *
 * Features:
 * - Automatically sorts keys for consistency
 * - Filters out null/undefined values
 * - Handles boolean values intelligently (true → key only, false → omit)
 *
 * @param domain - Base domain/namespace for the cache key
 * @param params - Key-value parameters (sorted alphabetically)
 * @returns Array of cache key parts
 *
 * @example
 * buildCacheKey('services', { category: 'web-dev', featured: true })
 * // Returns: ['services', 'category:web-dev', 'featured']
 *
 * buildCacheKey('services', { featured: true, category: 'web-dev' })
 * // Returns: ['services', 'category:web-dev', 'featured'] (same as above - sorted)
 *
 * buildCacheKey('services', { category: 'web-dev', subcategory: null })
 * // Returns: ['services', 'category:web-dev'] (null filtered out)
 */
export function buildCacheKey(
  domain: string,
  params: CacheKeyParams = {}
): string[] {
  const parts = [domain];

  // Sort keys alphabetically for consistent cache keys
  const sortedKeys = Object.keys(params).sort();

  for (const key of sortedKeys) {
    const value = params[key];

    // Skip null/undefined values
    if (value === null || value === undefined) continue;

    // Skip false booleans (only include truthy flags)
    if (value === false) continue;

    // Handle different value types
    if (value === true) {
      // Boolean true → just add the key (flag)
      parts.push(key);
    } else {
      // String/number → add key:value pair
      parts.push(`${key}:${value}`);
    }
  }

  return parts;
}

// ============================================================================
// SERVICE CACHE KEYS
// ============================================================================

export const ServiceCacheKeys = {
  /**
   * Service archive (filtered list)
   *
   * @param params - Filter parameters
   * @returns Hierarchical cache key array
   *
   * @example
   * ServiceCacheKeys.archive({ category: 'web-dev', subcategory: 'frontend', featured: true })
   * // Returns: ['services', 'category:web-dev', 'featured', 'subcategory:frontend']
   */
  archive: (params: {
    category?: string;
    subcategory?: string;
    subdivision?: string;
    featured?: boolean;
    pid?: string; // profile ID
    status?: string;
  }) => buildCacheKey('services', params),

  /**
   * Specific service detail page
   *
   * @param id - Service ID
   * @returns Cache key for service detail
   *
   * @example
   * ServiceCacheKeys.detail('123')
   * // Returns: ['service', 'id:123']
   */
  detail: (id: string) => buildCacheKey('service', { id }),

  /**
   * Service detail with related data
   *
   * @param id - Service ID
   * @returns Cache key for service with reviews
   *
   * @example
   * ServiceCacheKeys.detailWithReviews('123')
   * // Returns: ['service', 'id:123', 'with:reviews']
   */
  detailWithReviews: (id: string) =>
    buildCacheKey('service', { id, with: 'reviews' }),

  /**
   * Services by profile (profile's service listings)
   *
   * @param profileId - Profile ID
   * @returns Cache key for profile services
   *
   * @example
   * ServiceCacheKeys.byProfile('456')
   * // Returns: ['services', 'pid:456']
   */
  byProfile: (profileId: string) =>
    buildCacheKey('services', { pid: profileId }),

  /**
   * Featured services (home page)
   *
   * @returns Cache key for featured services
   *
   * @example
   * ServiceCacheKeys.featured()
   * // Returns: ['services', 'featured']
   */
  featured: () => buildCacheKey('services', { featured: true }),

  /**
   * Service counts by category
   *
   * @param params - Count filter parameters
   * @returns Cache key for service counts
   *
   * @example
   * ServiceCacheKeys.counts({ category: 'web-dev' })
   * // Returns: ['services', 'counts', 'category:web-dev']
   */
  counts: (params: { category?: string; subcategory?: string }) =>
    buildCacheKey('services:counts', params),
};

// ============================================================================
// PROFILE CACHE KEYS
// ============================================================================

export const ProfileCacheKeys = {
  /**
   * Profile archive (filtered list)
   *
   * @param params - Filter parameters
   * @returns Hierarchical cache key array
   *
   * @example
   * ProfileCacheKeys.archive({ category: 'web-dev', verified: true, featured: true })
   * // Returns: ['profiles', 'category:web-dev', 'featured', 'verified']
   */
  archive: (params: {
    category?: string;
    subcategory?: string;
    featured?: boolean;
    verified?: boolean;
    location?: string;
  }) => buildCacheKey('profiles', params),

  /**
   * Specific profile detail page
   *
   * @param id - Profile ID
   * @returns Cache key for profile detail
   *
   * @example
   * ProfileCacheKeys.detail('123')
   * // Returns: ['profile', 'id:123']
   */
  detail: (id: string) => buildCacheKey('profile', { id }),

  /**
   * Profile detail with all related data
   *
   * @param id - Profile ID
   * @returns Cache key for full profile data
   *
   * @example
   * ProfileCacheKeys.detailFull('123')
   * // Returns: ['profile', 'id:123', 'with:services,reviews']
   */
  detailFull: (id: string) =>
    buildCacheKey('profile', { id, with: 'services,reviews' }),

  /**
   * Featured profiles (home page)
   *
   * @returns Cache key for featured profiles
   *
   * @example
   * ProfileCacheKeys.featured()
   * // Returns: ['profiles', 'featured']
   */
  featured: () => buildCacheKey('profiles', { featured: true }),

  /**
   * Profile counts by category
   *
   * @param params - Count filter parameters
   * @returns Cache key for profile counts
   *
   * @example
   * ProfileCacheKeys.counts({ category: 'web-dev', subcategory: 'frontend' })
   * // Returns: ['profiles', 'counts', 'category:web-dev', 'subcategory:frontend']
   */
  counts: (params: { category?: string; subcategory?: string }) =>
    buildCacheKey('profiles:counts', params),
};

// ============================================================================
// DIRECTORY CACHE KEYS (Professional Directory)
// ============================================================================

export const DirectoryCacheKeys = {
  /**
   * Directory page data (professional categories and subcategories)
   *
   * @param params - Optional category/subcategory filters
   * @returns Cache key for directory page
   *
   * @example
   * DirectoryCacheKeys.page()
   * // Returns: ['directory', 'page-data']
   *
   * @example
   * DirectoryCacheKeys.page({ category: 'education', subcategory: 'teachers' })
   * // Returns: ['directory', 'category:education', 'subcategory:teachers', 'page-data']
   */
  page: (params?: { category?: string; subcategory?: string }) =>
    buildCacheKey('directory', { ...params, type: 'page-data' }),

  /**
   * Popular subcategories for directory
   *
   * @returns Cache key for popular subcategories
   *
   * @example
   * DirectoryCacheKeys.popularSubcategories()
   * // Returns: ['directory', 'popular-subcategories']
   */
  popularSubcategories: () =>
    buildCacheKey('directory', { type: 'popular-subcategories' }),
};

// ============================================================================
// ARTICLE CACHE KEYS
// ============================================================================

export const ArticleCacheKeys = {
  /**
   * Article detail page (by slug)
   *
   * @param slug - Article slug
   * @returns Cache key for article detail
   *
   * @example
   * ArticleCacheKeys.detail('my-article-slug')
   * // Returns: ['article', 'slug:my-article-slug']
   */
  detail: (slug: string) => buildCacheKey('article', { slug }),

  /**
   * Article archive (filtered list)
   *
   * @param params - Filter parameters
   * @returns Hierarchical cache key array
   *
   * @example
   * ArticleCacheKeys.archive({ categorySlug: 'tips', page: 2, limit: 12 })
   * // Returns: ['articles', 'categorySlug:tips', 'limit:12', 'page:2']
   */
  archive: (params: {
    categorySlug?: string;
    page?: number;
    limit?: number;
  }) => buildCacheKey('articles', params),

  /**
   * Related articles for article detail page
   */
  related: (params: { categorySlug: string; excludeSlug: string }) =>
    buildCacheKey('articles', {
      related: params.categorySlug,
      exclude: params.excludeSlug,
    }),
};

// ============================================================================
// HOME PAGE CACHE KEYS
// ============================================================================

export const HomeCacheKeys = {
  /**
   * Complete home page data
   *
   * @returns Cache key for home page
   *
   * @example
   * HomeCacheKeys.data()
   * // Returns: ['home', 'data']
   */
  data: () => ['home', 'data'],

  /**
   * Home page featured section only
   *
   * @returns Cache key for featured section
   *
   * @example
   * HomeCacheKeys.featured()
   * // Returns: ['home', 'featured']
   */
  featured: () => ['home', 'featured'],
};

// ============================================================================
// TAXONOMY CACHE KEYS
// ============================================================================

export const TaxonomyCacheKeys = {
  /**
   * Service taxonomy paths (all categories/subcategories/subdivisions)
   *
   * @returns Cache key for service taxonomies
   *
   * @example
   * TaxonomyCacheKeys.servicePaths()
   * // Returns: ['taxonomies', 'service-paths']
   */
  servicePaths: () => ['taxonomies', 'service-paths'],

  /**
   * Pro taxonomy paths (all categories/subcategories)
   *
   * @returns Cache key for pro taxonomies
   *
   * @example
   * TaxonomyCacheKeys.proPaths()
   * // Returns: ['taxonomies', 'pro-paths']
   */
  proPaths: () => ['taxonomies', 'pro-paths'],

  /**
   * Categories page data (all categories with counts)
   *
   * @param params - Optional filter parameters
   * @returns Cache key for categories page
   *
   * @example
   * TaxonomyCacheKeys.categoriesPage()
   * // Returns: ['categories:page-data']
   *
   * TaxonomyCacheKeys.categoriesPage({ category: 'texnika' })
   * // Returns: ['categories:page-data', 'category:texnika']
   *
   * TaxonomyCacheKeys.categoriesPage({ category: 'texnika', subcategory: 'web' })
   * // Returns: ['categories:page-data', 'category:texnika', 'subcategory:web']
   */
  categoriesPage: (params?: {
    category?: string;
    subcategory?: string;
  }) => buildCacheKey('categories:page-data', params || {}),
};

// ============================================================================
// SEARCH CACHE KEYS
// ============================================================================

export const SearchCacheKeys = {
  /**
   * Search results
   *
   * @param query - Search query string
   * @param type - Optional type filter (services, profiles, all)
   * @returns Cache key for search results
   *
   * @example
   * SearchCacheKeys.results('web development', 'services')
   * // Returns: ['search', 'query:web development', 'type:services']
   */
  results: (query: string, type?: 'services' | 'profiles' | 'all') =>
    buildCacheKey('search', { query, type }),
};

// ============================================================================
// USER DASHBOARD CACHE KEYS
// ============================================================================

export const DashboardCacheKeys = {
  /**
   * User dashboard data (overview)
   *
   * @param userId - User ID
   * @returns Cache key for dashboard
   *
   * @example
   * DashboardCacheKeys.user('123')
   * // Returns: ['dashboard', 'user:123']
   */
  user: (userId: string) => buildCacheKey('dashboard', { user: userId }),

  /**
   * User messages section
   *
   * @param userId - User ID
   * @returns Cache key for messages
   *
   * @example
   * DashboardCacheKeys.messages('123')
   * // Returns: ['dashboard', 'section:messages', 'user:123']
   */
  messages: (userId: string) =>
    buildCacheKey('dashboard', { user: userId, section: 'messages' }),

  /**
   * User saved items section
   *
   * @param userId - User ID
   * @returns Cache key for saved items
   *
   * @example
   * DashboardCacheKeys.saved('123')
   * // Returns: ['dashboard', 'section:saved', 'user:123']
   */
  saved: (userId: string) =>
    buildCacheKey('dashboard', { user: userId, section: 'saved' }),
};

// ============================================================================
// ADMIN CACHE KEYS
// ============================================================================

export const AdminCacheKeys = {
  /**
   * Admin statistics overview
   *
   * @returns Cache key for admin stats
   *
   * @example
   * AdminCacheKeys.stats()
   * // Returns: ['admin', 'stats']
   */
  stats: () => ['admin', 'stats'],

  /**
   * Admin pending reviews/approvals
   *
   * @returns Cache key for pending items
   *
   * @example
   * AdminCacheKeys.pending()
   * // Returns: ['admin', 'pending']
   */
  pending: () => ['admin', 'pending'],
};
