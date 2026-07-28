'use server';

import * as billingApi from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function validateCoupon(input: {
  code: string;
  billingInterval: 'month' | 'year';
}): Promise<ActionResult<{ code: string; percentOff: number; pricing: unknown }>> {
  try {
    const res = (await billingApi.validateCoupon(input)) as {
      code: string; percentOff: number; pricing: unknown;
    };
    return { success: true, data: res };
  } catch (err) {
    if (err instanceof ApiError && err.code === 'invalid_coupon') {
      return { success: false, error: 'Άκυρο κουπόνι' };
    }
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
