'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function register(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const consentRaw = formData.getAll('consent').map(String).filter(Boolean);

  try {
    const res = await authApi.register({
      email: getFormString(formData, 'email'),
      password: getFormString(formData, 'password'),
      authType: (getFormString(formData, 'authType') || 'user') as 'user' | 'pro',
      role: (getFormString(formData, 'role') || undefined) as 'freelancer' | 'company' | undefined,
      username: getFormString(formData, 'username') || undefined,
      displayName: getFormString(formData, 'displayName') || undefined,
      consent: consentRaw,
    });
    return {
      success: true,
      message: res.message ?? 'Επιτυχής εγγραφή',
      data: { userId: res.userId, email: res.email },
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        success: false,
        message: err.message,
        errors: (err.details && typeof err.details === 'object'
          ? (err.details as Record<string, string[]>)
          : undefined) as ActionResponse['errors'],
      };
    }
    return { success: false, message: 'Σφάλμα δικτύου. Δοκίμασε ξανά.' };
  }
}
