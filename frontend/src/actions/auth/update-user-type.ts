'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function updateUserType(input: {
  userId: string;
  type: 'user' | 'pro';
  role?: 'freelancer' | 'company';
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    await authApi.updateUserType(input);
    return { success: true, data: { success: true } };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
