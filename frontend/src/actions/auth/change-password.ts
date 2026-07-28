'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function changePassword(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    await authApi.changePassword({
      currentPassword: getFormString(formData, 'currentPassword'),
      newPassword: getFormString(formData, 'newPassword'),
      confirmPassword: getFormString(formData, 'confirmPassword'),
    });
    return { success: true, message: 'Ο κωδικός άλλαξε επιτυχώς' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
