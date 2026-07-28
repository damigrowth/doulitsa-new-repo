'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function completeOAuth(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const username = getFormString(formData, 'username');
  const displayName = getFormString(formData, 'displayName');
  const role = getFormString(formData, 'role') as 'freelancer' | 'company' | undefined;
  const type = (getFormString(formData, 'type') as 'user' | 'pro') || 'user';

  try {
    const res = await authApi.completeOAuthSetup({
      type,
      role: role || undefined,
      username: username || undefined,
      displayName: displayName || undefined,
    });
    return { success: true, message: 'OAuth setup complete', data: { user: res.user } };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
