'use server';

import * as supportApi from '@/lib/api/support';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function submitContactForm(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    await supportApi.submitContact({
      name: getFormString(formData, 'name'),
      email: getFormString(formData, 'email'),
      message: getFormString(formData, 'message'),
      subject: getFormString(formData, 'subject') || undefined,
      captchaToken: getFormString(formData, 'captchaToken') || undefined,
    });
    return { success: true, message: 'Το μήνυμά σας εστάλη' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
