'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import type { AuthUser } from '@/lib/types/auth';
import { getFormString } from '@/lib/utils/form';

/**
 * Login server action — delegates to Django.
 *
 * Behaviour preserved from the original Better Auth implementation:
 *   - identifier must contain '@' (Greek error otherwise)
 *   - blocked accounts get the Greek block message
 *   - EMAIL_NOT_VERIFIED returns success=true with redirectPath to
 *     /register/success?email=... (frontend redirects there)
 *   - successful login returns redirectPath derived server-side from
 *     step + role
 */
export async function login(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse & { data?: { user: AuthUser; redirectPath: string } }> {
  const identifier = getFormString(formData, 'identifier');
  const password = getFormString(formData, 'password');

  if (!identifier || identifier.length < 2) {
    return { success: false, message: 'Μη έγκυρα στοιχεία σύνδεσης' };
  }
  if (!identifier.includes('@')) {
    return {
      success: false,
      message: 'Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email',
    };
  }
  if (!password || password.length < 6) {
    return { success: false, message: 'Μη έγκυρα στοιχεία σύνδεσης' };
  }

  try {
    const res = await authApi.login(identifier, password);
    return {
      success: true,
      message: 'Επιτυχής σύνδεση',
      data: {
        user: res.user as AuthUser,
        redirectPath: res.redirectPath,
      },
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: 'Σφάλμα δικτύου. Δοκίμασε ξανά.' };
  }
}
