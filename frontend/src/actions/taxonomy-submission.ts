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
    // OLD contract: failures carry `message` (consumers toast `result.message`
    // in service-details-step / form-basic-info / form-service-edit). Keep
    // `error` too for any caller reading it.
    const message = err instanceof ApiError ? err.message : 'Σφάλμα δικτύου';
    return { success: false, message, error: message };
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
