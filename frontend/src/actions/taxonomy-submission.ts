'use server';

import * as taxonomyApi from '@/lib/api/taxonomy';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function submitTaxonomySubmission(input: {
  label: string;
  type: 'skill' | 'tag';
  category?: string;
}): Promise<ActionResult<{ pendingId: string }>> {
  try {
    const res = await taxonomyApi.submitTaxonomy(input);
    return { success: true, data: { pendingId: res.pendingId } };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function getUserTaxonomySubmissions(
  type: 'skill' | 'tag',
): Promise<ActionResult<{ pendingId: string; label: string; category?: string }[]>> {
  try {
    const data = (await taxonomyApi.getMyTaxonomySubmissions(type)) as {
      pendingId: string; label: string; category?: string;
    }[];
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
