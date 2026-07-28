'use server';

import { adminProfiles } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';
import { revalidateAllCaches } from '@/actions/admin/revalidate-caches';

export async function updateCoverageAdmin(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const profileId = getFormString(formData, 'profileId');
  if (!profileId) return { success: false, message: 'Λείπει το profileId' };
  let coverage: unknown = {};
  const raw = formData.get('coverage');
  if (raw && typeof raw === 'string') {
    try { coverage = JSON.parse(raw); } catch { /* keep {} */ }
  }
  try {
    await adminProfiles.updateCoverage(profileId, coverage);
    // OLD revalidated public caches after the write
    // (actions/admin/profiles/coverage.ts:104-125).
    await revalidateAllCaches().catch(() => undefined);
    return { success: true, message: 'Η κάλυψη ενημερώθηκε' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
