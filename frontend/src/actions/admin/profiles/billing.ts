'use server';

import { adminProfiles } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';
import { revalidateAllCaches } from '@/actions/admin/revalidate-caches';

export async function updateProfileBillingAdmin(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const profileId = getFormString(formData, 'profileId');
  if (!profileId) return { success: false, message: 'Λείπει το profileId' };
  try {
    await adminProfiles.updateBilling(profileId, {
      receipt: getFormString(formData, 'receipt') === 'true',
      invoice: getFormString(formData, 'invoice') === 'true',
      // OLD admin billing.ts:97-105 stores '' — null poisons the form schema.
      afm: getFormString(formData, 'afm') || '',
      doy: getFormString(formData, 'doy') || '',
      name: getFormString(formData, 'name') || '',
      profession: getFormString(formData, 'profession') || '',
      address: getFormString(formData, 'address') || '',
    });
    // OLD revalidated public caches after the write
    // (actions/admin/profiles/billing.ts:117-127).
    await revalidateAllCaches().catch(() => undefined);
    return { success: true, message: 'Τα στοιχεία χρέωσης ενημερώθηκαν' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
