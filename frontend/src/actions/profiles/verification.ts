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
    if (err instanceof ApiError) {
      // Validation envelope: the per-field Greek messages live in `details` —
      // surface the first one instead of the generic "One or more fields are
      // invalid." (E2E D3).
      const d = err.details as Record<string, unknown> | null | undefined;
      if (d && typeof d === 'object') {
        for (const v of Object.values(d)) {
          const first = Array.isArray(v) ? v[0] : typeof v === 'string' ? v : null;
          if (typeof first === 'string' && first) {
            return { success: false, message: first };
          }
        }
      }
      return { success: false, message: err.message };
    }
    return { success: false, message: 'Σφάλμα δικτύου' };
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
