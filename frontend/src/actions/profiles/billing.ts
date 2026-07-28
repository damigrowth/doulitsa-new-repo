'use server';

import * as profilesApi from '@/lib/api/profiles';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function updateProfileBilling(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    await profilesApi.updateBilling({
      receipt: getFormString(formData, 'receipt') === 'true',
      invoice: getFormString(formData, 'invoice') === 'true',
      afm: getFormString(formData, 'afm') || null,
      doy: getFormString(formData, 'doy') || null,
      name: getFormString(formData, 'name') || null,
      profession: getFormString(formData, 'profession') || null,
      address: getFormString(formData, 'address') || null,
    });
    return { success: true, message: 'Τα στοιχεία χρέωσης ενημερώθηκαν' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
