'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError, apiRequest } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function deleteAccount(
  prevState: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const username = getFormString(formData, 'username');
  const confirmUsername = getFormString(formData, 'confirmUsername');
  if (!username || username !== confirmUsername) {
    return { success: false, error: 'Η επιβεβαίωση δεν ταιριάζει' };
  }
  try {
    // Django exposes DELETE at /auth/account/delete (the bare /auth/account is
    // PATCH-only). It validates `confirmUsername` from the body.
    await apiRequest('/auth/account/delete', {
      method: 'DELETE',
      body: { username, confirmUsername },
    });
    await import('@/lib/api/client').then((m) => m.clearTokens());
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
