'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function changeUsername(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const res = await authApi.changeUsername({
      newUsername: getFormString(formData, 'newUsername'),
      confirmUsername: getFormString(formData, 'confirmUsername'),
    });
    return {
      success: true,
      message: res.message ?? 'Το username άλλαξε επιτυχώς!',
      data: res.data,
    };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
