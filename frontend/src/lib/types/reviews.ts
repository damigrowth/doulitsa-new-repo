/**
 * REVIEW TYPE DEFINITIONS
 * All review-related types following the established pattern
 * Types use Pick<Model> over the `@/lib/prisma-types` shim with extensions
 */

import type { Review, User, Profile, Service } from '@/lib/prisma-types';

/**
 * Review with author information for display in lists and cards
 * Used in profile pages, service pages, and dashboard
 */
export type ReviewWithAuthor = Pick<
  Review,
  | 'id'
  | 'rating'
  | 'comment'
  | 'status'
  | 'type'
  | 'published'
  | 'visibility'
  | 'createdAt'
  | 'updatedAt'
> & {
  author: Pick<User, 'id' | 'name'> &
    Pick<Profile, 'displayName' | 'username' | 'image'>;
  service?: Pick<Service, 'id' | 'title' | 'slug'> | null;
};

/**
 * Review statistics with simplified average rating
 * Used in profile and service pages to display rating summary
 */
export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
}

/**
 * Extended review data for dashboard display
 * Includes the reviewed profile information for "given reviews" section
 */
export type DashboardReviewCardData = ReviewWithAuthor & {
  reviewedProfile?: Pick<
    Profile,
    'id' | 'displayName' | 'username' | 'image'
  > | null;
};
