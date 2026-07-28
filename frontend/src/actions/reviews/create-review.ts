'use server';

import * as reviewsApi from '@/lib/api/reviews';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function createReview(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse & { data?: { id: string } }> {
  const rating = Number(getFormString(formData, 'rating'));
  if (!rating || rating < 1 || rating > 5) {
    return { success: false, message: 'Επίλεξε αξιολόγηση 1-5' };
  }
  const profileId = getFormString(formData, 'profileId');
  if (!profileId) return { success: false, message: 'Λείπει το profileId' };
  const sidStr = getFormString(formData, 'serviceId');
  try {
    const res = (await reviewsApi.createReview({
      rating,
      comment: getFormString(formData, 'comment') || undefined,
      profileId,
      serviceId: sidStr ? Number(sidStr) : undefined,
    })) as { id: string; message: string };
    return { success: true, message: res.message, data: { id: res.id } };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function canUserReview(profileId: string, serviceId?: number) {
  try {
    return {
      success: true,
      data: await reviewsApi.canUserReview({ profileId, serviceId }),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου',
    };
  }
}
