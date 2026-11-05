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
    // OLD toggle-review-visibility.ts:90-102 copy; failures carry `message`
    // (the dashboard consumers toast `result.message`).
    return {
      success: true,
      data: { visibility: res.visibility },
      message: res.visibility
        ? 'Η αξιολόγηση είναι τώρα ορατή'
        : 'Η αξιολόγηση είναι τώρα κρυφή',
    };
  } catch (err) {
    const message =
      err instanceof ApiError && err.message
        ? err.message
        : 'Αποτυχία ενημέρωσης εμφάνισης αξιολόγησης';
    return { success: false, message, error: message };
  }
}
