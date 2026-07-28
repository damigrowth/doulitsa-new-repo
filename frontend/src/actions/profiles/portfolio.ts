'use server';

import * as profilesApi from '@/lib/api/profiles';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';

export async function updateProfilePortfolio(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const raw = formData.get('portfolio');
  let portfolio: unknown[] = [];
  if (raw && typeof raw === 'string') {
    try { portfolio = JSON.parse(raw) as unknown[]; } catch { portfolio = []; }
  }
  try {
    await profilesApi.updatePortfolio(portfolio);
    return { success: true, message: 'Το portfolio ενημερώθηκε' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
