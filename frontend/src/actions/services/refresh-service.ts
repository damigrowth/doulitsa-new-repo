'use server';

import * as servicesApi from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function refreshService(
  serviceId: number,
): Promise<ActionResult<{ refreshedAt: Date; remainingRefreshes: number }>> {
  try {
    const res = (await servicesApi.refreshService(serviceId)) as {
      refreshedAt: string;
      remainingRefreshes: number;
    };
    return {
      success: true,
      data: { refreshedAt: new Date(res.refreshedAt), remainingRefreshes: res.remainingRefreshes },
    };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
