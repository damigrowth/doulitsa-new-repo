'use server';

import * as profilesApi from '@/lib/api/profiles';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function reportProfile(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const profileId = getFormString(formData, 'profileId');
  if (!profileId) return { success: false, message: 'Λείπει το profileId' };
  try {
    await profilesApi.reportProfile(profileId, {
      profileName: getFormString(formData, 'profileName'),
      profileUsername: getFormString(formData, 'profileUsername'),
      description: getFormString(formData, 'description'),
    });
    return { success: true, message: 'Η αναφορά υποβλήθηκε' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
