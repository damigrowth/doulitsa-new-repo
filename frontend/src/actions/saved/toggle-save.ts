'use server';

import * as savedApi from '@/lib/api/saved';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function toggleSave(
  itemType: 'service' | 'profile',
  itemId: string | number,
): Promise<ActionResult<{ isSaved: boolean }>> {
  try {
    const res = await savedApi.toggleSave(itemType, itemId);
    return { success: true, data: { isSaved: res.isSaved } };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
