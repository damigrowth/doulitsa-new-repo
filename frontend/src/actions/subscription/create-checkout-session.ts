'use server';

import * as billingApi from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function createCheckoutSession(input: {
  billingInterval: 'month' | 'year';
  couponCode?: string;
}): Promise<ActionResult<{ url: string }>> {
  try {
    const res = await billingApi.createCheckoutSession(input);
    return { success: true, data: { url: res.url } };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
