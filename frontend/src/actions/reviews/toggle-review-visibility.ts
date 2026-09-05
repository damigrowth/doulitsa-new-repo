'use server';

import * as reviewsApi from '@/lib/api/reviews';
import { ApiError } from '@/lib/api/client';
import { revalidatePublicProfile, revalidatePublicService } from '@/lib/cache/revalidation';
import type { ActionResult } from '@/lib/types/api';

export async function toggleReviewVisibility(
  reviewId: string,
): Promise<ActionResult<{ visibility: boolean }>> {
  try {
    const res = (await reviewsApi.toggleReviewVisibility(reviewId)) as { visibility: boolean };
    await revalidatePublicService();
    await revalidatePublicProfile();
    return { success: true, data: { visibility: res.visibility }, message: 'Η ορατότητα άλλαξε' };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
