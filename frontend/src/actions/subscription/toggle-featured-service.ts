'use server';

import * as billingApi from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import { revalidatePublicService } from '@/lib/cache/revalidation';
import type { ActionResult } from '@/lib/types/api';

export async function toggleFeaturedService(
  serviceId: number,
): Promise<ActionResult<{ featured: boolean }>> {
  try {
    const res = (await billingApi.toggleFeaturedService(serviceId)) as { featured: boolean };
    await revalidatePublicService(serviceId);
    return { success: true, data: res };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
