/**
 * Centralized Prisma SELECT constants for Service queries
 *
 * These SELECT statements optimize data transfer by fetching only required fields
 * instead of entire models, reducing database load and response size by 60-70%.
 *
 * @see OPTIMIZATION-SUMMARY.md for performance metrics
 */

/**
 * Minimal SELECT for service archive/listing pages (18 Service fields + 7 Profile fields)
 * Used in: /ipiresies, /categories, search results
 *
 * Data reduction: ~60% vs full Service model
 */
export const SERVICE_ARCHIVE_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  category: true,
  subcategory: true,
  subdivision: true,
  price: true,
  fixed: true,
  type: true,
  tags: true,
  media: true,
  featured: true,
  rating: true,
  reviewCount: true,
  status: true,
  pid: true,
  updatedAt: true,
  profile: {
    select: {
      id: true,
      uid: true,
      username: true,
      displayName: true,
      verified: true,
      image: true,
      portfolio: true,
      coverage: true,
      top: true,
      rating: true,
      reviewCount: true,
    },
  },
} as const;

/**
 * Comprehensive SELECT for service detail pages (22 Service fields + 24 Profile fields)
 * Used in: /ipiresies/[slug]
 *
 * Includes all fields needed for complete service presentation with provider info
 */
export const SERVICE_DETAIL_SELECT = {
  id: true,
  pid: true,
  slug: true,
  title: true,
  titleNormalized: true,
  description: true,
  descriptionNormalized: true,
  category: true,
  subcategory: true,
  subdivision: true,
  price: true,
  fixed: true,
  type: true,
  tags: true,
  media: true,
  featured: true,
  rating: true,
  reviewCount: true,
  status: true,
  subscriptionType: true,
  duration: true,
  addons: true,
  faq: true,
  createdAt: true,
  updatedAt: true,
  refreshedAt: true,
  sortDate: true,
  profile: {
    select: {
      id: true,
      uid: true,
      firstName: true,
      lastName: true,
      displayName: true,
      username: true,
      tagline: true,
      image: true,
      rating: true,
      reviewCount: true,
      verified: true,
      top: true,
      published: true,
      type: true,
      subcategory: true,
      coverage: true,
      budget: true,
      size: true,
      contactMethods: true,
      paymentMethods: true,
      settlementMethods: true,
      socials: true,
      website: true,
      rate: true,
      commencement: true,
      experience: true,
      terms: true,
      portfolio: true,
    },
  },
} as const;

/**
 * Minimal SELECT for home page service cards (12 Service fields + 4 Profile fields)
 * Used in: Home page featured/latest services
 *
 * Data reduction: ~70% vs full Service model
 */
export const HOME_SERVICE_SELECT = {
  id: true,
  slug: true,
  title: true,
  category: true,
  subcategory: true,
  subdivision: true,
  type: true,
  price: true,
  rating: true,
  reviewCount: true,
  media: true,
  status: true,
  featured: true,
  updatedAt: true,
  profile: {
    select: {
      id: true,
      uid: true,
      username: true,
      displayName: true,
      image: true,
      portfolio: true,
      coverage: true,
    },
  },
} as const;
