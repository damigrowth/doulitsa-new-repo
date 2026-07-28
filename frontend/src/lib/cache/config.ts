/**
 * Unified Cache TTL (Time-To-Live) Configuration
 *
 * Semantic cache durations with clear rationale for each value.
 * Enables 90%+ cache hit rate through intelligent TTL selection.
 *
 * RATIONALE GUIDE:
 * - Taxonomies: Change rarely (admin updates only) → Long cache (24h)
 * - Home page: High traffic, tag-invalidated on updates → Long cache (24h)
 * - Archives: Medium traffic, filtered views → Medium cache (1h)
 * - Entity pages: Lower traffic, review updates → Short cache (30m)
 * - Search: Frequently changing relevance → Shortest cache (15m)
 * - Counts: Less critical precision → Medium cache (30m)
 *
 * Environment Behavior:
 * - Production: Full TTL values
 * - Development: 10x shorter (minimum 30s for usability)
 * - Test: Caching disabled
 */

export const CACHE_TTL = {
  // ============================================================================
  // STATIC DATA (Rarely Changes - Admin Updates Only)
  // ============================================================================

  /**
   * Taxonomies (categories, subcategories, skills, locations)
   *
   * Change Frequency: Weekly/monthly (admin updates)
   * Invalidation: Manual revalidation on taxonomy updates via admin panel
   * TTL: 24 hours (86400s)
   *
   * Why 24h?
   * - Taxonomies rarely change in production
   * - Admin can manually revalidate after updates
   * - High traffic pages (home, archives) depend on this data
   */
  TAXONOMIES: 86400,

  /**
   * Static configuration (service options, profile options)
   *
   * Change Frequency: Never (code deployments only)
   * Invalidation: Deployment triggers complete rebuild
   * TTL: 24 hours (86400s)
   *
   * Why 24h?
   * - Only changes with code deployments
   * - Deployment rebuilds entire app
   * - No manual invalidation needed
   */
  CONFIG: 86400,

  // ============================================================================
  // HIGH-TRAFFIC PAGES (Tag-Based Invalidation Strategy)
  // ============================================================================

  /**
   * Home page data (featured services, profiles, categories)
   *
   * Change Frequency: When featured items updated (varies)
   * Invalidation: Tag-based on service/profile feature status changes
   * TTL: 24 hours (86400s) - Long cache with smart invalidation
   *
   * Why 24h?
   * - Highest traffic page in app
   * - Tag-based invalidation ensures freshness
   * - Featured items don't change frequently
   * - Reduces database load significantly
   */
  HOME: 86400,

  /**
   * Directory overview (category counts, featured categories)
   *
   * Change Frequency: When new services/profiles added
   * Invalidation: Tag-based on directory content changes
   * TTL: 2 hours (7200s)
   *
   * Why 2h?
   * - High traffic page
   * - Counts update more frequently than home
   * - Tag invalidation handles real-time updates
   * - Balance between freshness and performance
   */
  DIRECTORY: 7200,

  // ============================================================================
  // MEDIUM-TRAFFIC PAGES (Filtered Collections)
  // ============================================================================

  /**
   * Service archives (category/subcategory filtered)
   *
   * Change Frequency: New services, status changes, featured updates
   * Invalidation: Tag-based on category/subcategory + status changes
   * TTL: 1 hour (3600s)
   *
   * Why 1h?
   * - Medium-high traffic
   * - New services added regularly
   * - Users expect relatively fresh listings
   * - Tag invalidation handles critical updates
   */
  SERVICE_ARCHIVE: 3600,

  /**
   * Profile archives (category/subcategory filtered)
   *
   * Change Frequency: New profiles, status changes, rating updates
   * Invalidation: Tag-based on category/subcategory filters
   * TTL: 1 hour (3600s)
   *
   * Why 1h?
   * - Medium-high traffic
   * - Profile updates less frequent than services
   * - Rating changes should appear relatively quickly
   */
  PROFILE_ARCHIVE: 3600,

  /**
   * Categories page (all categories with counts)
   *
   * Change Frequency: When services/profiles added/removed
   * Invalidation: Tag-based on category collection
   * TTL: 1 hour (3600s)
   *
   * Why 1h?
   * - Medium traffic page
   * - Category structure changes rarely
   * - Counts update with service/profile changes
   */
  CATEGORIES: 3600,

  // ============================================================================
  // ENTITY PAGES (Individual Items)
  // ============================================================================

  /**
   * Service detail page
   *
   * Change Frequency: Service updates, new reviews
   * Invalidation: Tag-based on service ID and reviews
   * TTL: 30 minutes (1800s)
   *
   * Why 30m?
   * - Lower traffic than archives
   * - Reviews added periodically
   * - Service details update occasionally
   * - Tag invalidation ensures critical updates appear
   */
  SERVICE_PAGE: 1800,

  /**
   * Profile detail page
   *
   * Change Frequency: Profile updates, new reviews, new services
   * Invalidation: Tag-based on profile ID, reviews, services
   * TTL: 30 minutes (1800s)
   *
   * Why 30m?
   * - Lower traffic than archives
   * - Multiple update sources (profile, reviews, services)
   * - Tag invalidation handles all update types
   */
  PROFILE_PAGE: 1800,

  // ============================================================================
  // BLOG PAGES
  // ============================================================================

  /**
   * Article detail page
   *
   * Change Frequency: Article updates (admin edits)
   * Invalidation: Tag-based on article slug and ID
   * TTL: 30 minutes (1800s)
   *
   * Why 30m?
   * - Same rationale as SERVICE_PAGE
   * - Articles update occasionally (admin edits)
   * - Tag invalidation handles immediate updates
   */
  ARTICLE_PAGE: 1800,

  /**
   * Article archives (main blog + category filtered)
   *
   * Change Frequency: New articles published
   * Invalidation: Tag-based on blog collection + category
   * TTL: 1 hour (3600s)
   *
   * Why 1h?
   * - Same rationale as SERVICE_ARCHIVE
   * - New articles added periodically
   * - Tag invalidation handles critical updates
   */
  ARTICLE_ARCHIVE: 3600,

  // ============================================================================
  // DYNAMIC DATA (Frequently Changing)
  // ============================================================================

  /**
   * Search results (keyword + filters)
   *
   * Change Frequency: Constantly (new items, ranking changes)
   * Invalidation: Short TTL only (no tag-based invalidation)
   * TTL: 15 minutes (900s)
   *
   * Why 15m?
   * - Search relevance changes frequently
   * - New items should appear quickly in results
   * - Users expect fresh search results
   * - Too short TTL would hurt performance
   */
  SEARCH: 900,

  /**
   * User dashboard (personalized data)
   *
   * Change Frequency: User actions, new messages, status changes
   * Invalidation: Tag-based on user ID
   * TTL: 5 minutes (300s)
   *
   * Why 5m?
   * - Highly personalized data
   * - Users expect quick updates
   * - Messages and notifications need to appear promptly
   * - Tag invalidation handles critical updates
   */
  DASHBOARD: 300,

  // ============================================================================
  // AGGREGATIONS & COUNTS
  // ============================================================================

  /**
   * Category/subcategory counts
   *
   * Change Frequency: When services/profiles added/removed
   * Invalidation: Tag-based on category changes
   * TTL: 30 minutes (1800s)
   *
   * Why 30m?
   * - Less critical than exact counts
   * - Approximate numbers acceptable for UI
   * - Tag invalidation ensures major changes reflected
   */
  COUNTS: 1800,

  /**
   * Statistics (total services, profiles, reviews)
   *
   * Change Frequency: When items added/removed
   * Invalidation: Tag-based on stats collection
   * TTL: 1 hour (3600s)
   *
   * Why 1h?
   * - Low priority data
   * - Exact numbers not critical
   * - Reduces database load significantly
   */
  STATS: 3600,
} as const;

/**
 * Get cache TTL with environment-based overrides
 *
 * Automatically adjusts TTL based on environment:
 * - Production: Full TTL values
 * - Development: 10x shorter (minimum 30s)
 * - Test: Returns 0 (caching disabled)
 *
 * @param key - Cache TTL key from CACHE_TTL object
 * @returns TTL in seconds
 *
 * @example
 * const ttl = getCacheTTL('HOME'); // Production: 86400s, Dev: 8640s (2.4h)
 */
export function getCacheTTL(key: keyof typeof CACHE_TTL): number {
  const baseTTL = CACHE_TTL[key];

  // Disable caching in test environment
  if (process.env.NODE_ENV === 'test') {
    return 0;
  }

  // Shorten TTL in development (10x shorter, minimum 30s)
  if (process.env.NODE_ENV === 'development') {
    return Math.max(baseTTL / 10, 30);
  }

  // Use full TTL in production
  return baseTTL;
}

/**
 * Check if caching should be enabled for current environment
 *
 * @returns true if caching should be enabled, false otherwise
 *
 * @example
 * if (shouldCache()) {
 *   return unstable_cache(fetchData, keys, { revalidate: getCacheTTL('HOME') })();
 * }
 * return fetchData();
 */
export function shouldCache(): boolean {
  return process.env.NODE_ENV !== 'test';
}

/**
 * Get all cache TTL values (for debugging/admin dashboard)
 *
 * Returns current TTL values adjusted for environment
 *
 * @returns Object with all TTL keys and their current values
 *
 * @example
 * const ttls = getAllCacheTTLs();
 * console.log(`HOME cache: ${ttls.HOME}s`);
 */
export function getAllCacheTTLs() {
  const entries = Object.entries(CACHE_TTL);
  return Object.fromEntries(
    entries.map(([key, _value]) => [
      key,
      getCacheTTL(key as keyof typeof CACHE_TTL)
    ])
  );
}
