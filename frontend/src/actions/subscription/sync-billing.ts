'use server';

import * as billingApi from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function syncSubscriptionBilling(): Promise<ActionResult<{ synced: boolean }>> {
  try {
    const res = (await billingApi.syncBilling()) as { synced: boolean };
    return { success: true, data: res };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
