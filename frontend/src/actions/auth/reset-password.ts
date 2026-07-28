'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse, ActionResult } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function resetPassword(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const token = getFormString(formData, 'token');
  const newPassword = getFormString(formData, 'newPassword');
  if (!token) return { success: false, message: 'Λείπει το token' };
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες' };
  }
  try {
    const res = await authApi.resetPassword(token, newPassword);
    return { success: true, message: res.message };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

/** Programmatic variant — accepts plain args instead of FormData. */
export async function resetUserPassword(input: {
  token: string;
  newPassword: string;
}): Promise<ActionResult<undefined>> {
  try {
    await authApi.resetPassword(input.token, input.newPassword);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
