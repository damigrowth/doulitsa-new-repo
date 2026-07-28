'use server';

import { adminReviews } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function moderateReview(input: {
  reviewId: string;
  status: 'approved' | 'rejected';
  reason?: string;
}): Promise<ActionResult<{ message: string }>> {
  try {
    await adminReviews.updateStatus(input.reviewId, {
      status: input.status,
      notes: input.reason,
    });
    return {
      success: true,
      data: { message: input.status === 'approved' ? 'Η αξιολόγηση εγκρίθηκε' : 'Η αξιολόγηση απορρίφθηκε' },
    };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function getPendingReviews(page = 1, limit = 20): Promise<{
  reviews: unknown[]; total: number;
}> {
  try {
    return (await adminReviews.pending({ page, limit })) as { reviews: unknown[]; total: number };
  } catch {
    return { reviews: [], total: 0 };
  }
}
