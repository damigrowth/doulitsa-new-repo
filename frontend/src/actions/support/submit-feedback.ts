'use server';

import * as supportApi from '@/lib/api/support';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function submitFeedback(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const issueType = (getFormString(formData, 'issueType') || 'other') as
    'bug' | 'feature' | 'question' | 'other';
  const description = getFormString(formData, 'description');
  if (!description || description.length < 10) {
    return { success: false, message: 'Η περιγραφή πρέπει να έχει τουλάχιστον 10 χαρακτήρες' };
  }
  try {
    await supportApi.submitFeedback({
      issueType,
      description,
      pageUrl: getFormString(formData, 'pageUrl') || undefined,
    });
    return { success: true, message: 'Ευχαριστούμε για την αναφορά' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
