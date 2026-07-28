'use server';

import * as profilesApi from '@/lib/api/profiles';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse, ActionResult } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function submitVerificationRequest(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    await profilesApi.submitVerification({
      afm: getFormString(formData, 'afm'),
      name: getFormString(formData, 'name'),
      address: getFormString(formData, 'address'),
      phone: getFormString(formData, 'phone'),
    });
    return { success: true, message: 'Η αίτηση επαλήθευσης υποβλήθηκε' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

/**
 * Verification snapshot the dashboard verification page renders. Matches the
 * Django `get_verification_status` payload (apps/profiles/services/verification
 * .get_verification_status); `createdAt`/`updatedAt` arrive as ISO strings but
 * are typed to match the form/status components that consume them.
 */
export interface VerificationStatusData {
  status: string;
  afm?: string;
  name?: string;
  address?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getVerificationStatus(): Promise<ActionResult<VerificationStatusData | null>> {
  try {
    const data = (await profilesApi.getMyVerification()) as VerificationStatusData | null;
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: true, data: null };
    }
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
