'use server';

import * as reviewsApi from '@/lib/api/reviews';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function toggleReviewVisibility(
  reviewId: string,
): Promise<ActionResult<{ visibility: boolean }>> {
  try {
    const res = (await reviewsApi.toggleReviewVisibility(reviewId)) as { visibility: boolean };
    return { success: true, data: { visibility: res.visibility }, message: 'Η ορατότητα άλλαξε' };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
