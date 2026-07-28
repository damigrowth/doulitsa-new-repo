'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function resendVerificationEmail(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const email = getFormString(formData, 'email');
  if (!email) return { success: false, message: 'Λείπει το email' };
  try {
    const res = await authApi.resendVerification(email);
    return { success: true, message: res.message };
  } catch (err) {
    if (err instanceof ApiError && err.code === 'already_verified') {
      return { success: false, message: 'Το email έχει ήδη επαληθευτεί' };
    }
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
