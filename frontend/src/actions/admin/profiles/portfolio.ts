'use server';

import { adminProfiles } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';
import { revalidateAllCaches } from '@/actions/admin/revalidate-caches';

export async function updateProfilePortfolioAdmin(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const profileId = getFormString(formData, 'profileId');
  if (!profileId) return { success: false, message: 'Λείπει το profileId' };
  let portfolio: unknown[] = [];
  const raw = formData.get('portfolio');
  if (raw && typeof raw === 'string') {
    try { portfolio = JSON.parse(raw) as unknown[]; } catch { portfolio = []; }
  }
  try {
    await adminProfiles.updatePortfolio(profileId, portfolio);
    // OLD revalidated public caches after the write
    // (actions/admin/profiles/portfolio.ts:111-132).
    await revalidateAllCaches().catch(() => undefined);
    return { success: true, message: 'Το portfolio ενημερώθηκε' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
