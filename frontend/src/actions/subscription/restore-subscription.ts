'use server';

import * as billingApi from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function restoreSubscription(): Promise<ActionResult<{ restored: boolean }>> {
  try {
    const res = (await billingApi.restoreSubscription()) as { restored: boolean };
    return { success: true, data: res };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
