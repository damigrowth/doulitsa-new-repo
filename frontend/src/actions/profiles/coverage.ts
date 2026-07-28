'use server';

import * as profilesApi from '@/lib/api/profiles';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';

export async function updateCoverage(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const raw = formData.get('coverage');
  let coverage: unknown = {};
  if (raw && typeof raw === 'string') {
    try { coverage = JSON.parse(raw); } catch { /* keep {} */ }
  }
  try {
    await profilesApi.updateCoverage(coverage);
    return { success: true, message: 'Η κάλυψη ενημερώθηκε' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
