/**
 * Format rating number for display
 * @param rating - Rating value (0-5)
 * @returns Formatted rating string (e.g., "4.5")
 */
export function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) {
    return '0.0';
  }
  return rating.toFixed(1);
}

/**
 * Format user rating with maximum
 * @param rating - Rating value (0-5)
 * @returns Formatted rating string (e.g., "4.5/5")
 */
export function formatUserRating(rating: number | null | undefined): string {
  return `${formatRating(rating)}/5`;
}

/**
 * Get Greek label for rating value
 * Based on rating ranges
 */
export function getRatingLabel(rating: number | null | undefined): string {
  if (rating === null || rating === undefined || rating === 0) {
    return 'Χωρίς Αξιολόγηση';
  }

  if (rating >= 4.5) {
    return 'Εξαιρετικό';
  } else if (rating >= 4.0) {
    return 'Πολύ καλό';
  } else if (rating >= 3.0) {
    return 'Καλό';
  } else if (rating >= 2.0) {
    return 'Μέτριο';
  } else {
    return 'Χαμηλό';
  }
}
