'use server';

import * as billingApi from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function cancelSubscription(
  cancelAtPeriodEnd = true,
): Promise<ActionResult<{ canceledAt: Date | null }>> {
  try {
    const res = (await billingApi.cancelSubscription(cancelAtPeriodEnd)) as { canceledAt: string | null };
    return {
      success: true,
      data: { canceledAt: res.canceledAt ? new Date(res.canceledAt) : null },
    };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
