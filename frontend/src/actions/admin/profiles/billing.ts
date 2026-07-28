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
      afm: getFormString(formData, 'afm') || null,
      doy: getFormString(formData, 'doy') || null,
      name: getFormString(formData, 'name') || null,
      profession: getFormString(formData, 'profession') || null,
      address: getFormString(formData, 'address') || null,
    });
    // OLD revalidated public caches after the write
    // (actions/admin/profiles/billing.ts:117-127).
    await revalidateAllCaches().catch(() => undefined);
    return { success: true, message: 'Τα στοιχεία χρέωσης ενημερώθηκαν' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
