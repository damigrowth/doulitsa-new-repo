'use server';

import { adminReviews } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';
import { revalidatePublicProfile, revalidatePublicService } from '@/lib/cache/revalidation';

export interface AdminDeleteReviewInput { reviewId: string; }

const wrap = async <T>(fn: () => Promise<T>): Promise<ActionResult<T>> => {
  try { return { success: true, data: await fn() }; }
  catch (err) { return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' }; }
};

export async function listReviews(query: Record<string, unknown> = {}) {
  return wrap(() => adminReviews.list(query));
}

export async function getReview(reviewId: string) {
  return wrap(() => adminReviews.get(reviewId));
}

export async function updateReviewStatus(input: {
  // OLD admin/reviews.ts supports reverting to 'pending' too (validations/admin.ts:504).
  reviewId: string; status: 'pending' | 'approved' | 'rejected'; notes?: string;
}) {
  const { reviewId, ...rest } = input;
  const res = await wrap(() => adminReviews.updateStatus(reviewId, rest));
  if (res.success) { await revalidatePublicProfile(); await revalidatePublicService(); }
  return res;
}

export async function deleteReview(params: AdminDeleteReviewInput) {
  const res = await wrap(() => adminReviews.delete(params.reviewId));
  if (res.success) { await revalidatePublicProfile(); await revalidatePublicService(); }
  return res;
}

export async function getReviewStats() {
  return wrap(() => adminReviews.stats());
}

export async function toggleAdminReviewVisibility(reviewId: string) {
  const res = await wrap(() => adminReviews.toggleVisibility(reviewId));
  if (res.success) { await revalidatePublicProfile(); await revalidatePublicService(); }
  return res;
}

export async function updateReviewStatusAction(
  prevState: ActionResult<unknown> | null,
  formData: FormData,
) {
  return updateReviewStatus({
    reviewId: getFormString(formData, 'reviewId'),
    status: getFormString(formData, 'status') as 'pending' | 'approved' | 'rejected',
    notes: getFormString(formData, 'notes') || undefined,
  });
}
