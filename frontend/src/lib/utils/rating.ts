/**
 * Format rating to one decimal place
 * @param rating - The rating number
 * @returns Formatted rating string (e.g., "4.5")
 */
export function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return '0.0';
  return rating.toFixed(1);
}

/**
 * Get Greek label for rating
 * @param rating - The rating number (0-5)
 * @returns Greek label for the rating (feminine forms to agree with "αξιολόγηση")
 */
export function getRatingLabel(rating: number | null | undefined): string {
  if (rating === null || rating === undefined || rating === 0) {
    return 'Χωρίς Αξιολόγηση';
  }

  if (rating < 1.5) return 'Πολύ Κακή';
  if (rating < 2.5) return 'Κακή';
  if (rating < 3.5) return 'Μέτρια';
  if (rating < 4) return 'Καλή';
  if (rating < 4.5) return 'Πολύ Καλή';
  return 'Εξαιρετική';
}

/**
 * Get star count label in Greek
 * @param stars - Number of stars (1-5)
 * @returns Greek label (e.g., "5 Αστέρια", "1 Αστέρι")
 */
export function getStarLabel(stars: number): string {
  return stars === 1 ? '1 Αστέρι' : `${stars} Αστέρια`;
}

/**
 * Get review count label in Greek
 * @param count - Number of reviews
 * @returns Greek label (e.g., "5 Αξιολογήσεις", "1 Αξιολόγηση")
 * Note: Should only be called when count > 0
 */
export function getReviewCountLabel(count: number): string {
  return count === 1 ? '1 Αξιολόγηση' : `${count} Αξιολογήσεις`;
}
