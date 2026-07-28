'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function upgradeToProAccount(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const username = getFormString(formData, 'username');
  const role = getFormString(formData, 'role') as 'freelancer' | 'company';
  if (!username || username.length < 3) {
    return { success: false, message: 'Το username πρέπει να έχει τουλάχιστον 3 χαρακτήρες' };
  }
  if (role !== 'freelancer' && role !== 'company') {
    return { success: false, message: 'Επίλεξε ρόλο: freelancer ή company' };
  }
  try {
    const res = await authApi.upgradeToPro({ username, role });
    return { success: true, message: res.message ?? 'Έγινες επαγγελματίας', data: { user: res.user } };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
