'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function updateAccount(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const displayName = getFormString(formData, 'displayName');
  if (!displayName || displayName.length < 5) {
    return { success: false, message: 'Το όνομα εμφάνισης πρέπει να έχει τουλάχιστον 5 χαρακτήρες' };
  }
  let image: unknown = null;
  const imageRaw = formData.get('image');
  if (imageRaw && typeof imageRaw === 'string') {
    try {
      image = JSON.parse(imageRaw);
    } catch {
      image = imageRaw;
    }
  }
  try {
    await authApi.updateAccount({ displayName, image });
    return { success: true, message: 'Ο λογαριασμός ενημερώθηκε' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
