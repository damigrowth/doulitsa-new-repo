'use server';

/**
 * Rating recalculation is now handled server-side by Django whenever a
 * review is approved/rejected/deleted (see apps/reviews/services/
 * recalculate_ratings.py). These exports stay as no-ops so legacy callers
 * don't break — Django keeps the cached profile.rating / service.rating
 * fields fresh on its own.
 */

export async function updateProfileRating(_profileId: string): Promise<void> {
  // no-op — Django recalculates on review state change
}

export async function updateServiceRating(_serviceId: number): Promise<void> {
  // no-op — Django recalculates on review state change
}
