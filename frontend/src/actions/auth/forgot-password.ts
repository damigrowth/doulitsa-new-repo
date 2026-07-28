'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function forgotPassword(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const email = getFormString(formData, 'email');
  if (!email || !email.includes('@')) {
    return { success: false, message: 'Παρακαλώ εισάγετε έγκυρο email' };
  }
  try {
    const res = await authApi.forgotPassword(email);
    return { success: true, message: res.message };
  } catch (err) {
    if (err instanceof ApiError && err.code === 'rate_limited') {
      return { success: false, message: 'Έχεις ήδη ζητήσει επαναφορά πρόσφατα. Δοκίμασε ξανά αργότερα.' };
    }
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
