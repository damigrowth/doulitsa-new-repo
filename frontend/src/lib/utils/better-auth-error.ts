/**
 * BETTER AUTH ERROR HANDLER
 * Simple error handler for Better Auth errors
 * Localization is handled by better-auth-localization plugin in auth config
 */

import { ActionResponse } from '@/lib/types/api';

/**
 * Create ActionResponse from Better Auth error
 * Better Auth already localizes the error messages via the localization plugin
 * This just formats it properly for our ActionResponse type
 */
export function handleBetterAuthError(error: any): ActionResponse {
  // Check for specific error codes that need custom Greek translations
  // better-auth-localization el-GR locale is missing some error codes
  const errorCode = error?.body?.code || error?.code;

  // Email duplicate error - missing from better-auth-localization el-GR
  if (errorCode === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
    return {
      success: false,
      message: 'Ο χρήστης υπάρχει ήδη. Χρησιμοποιήστε άλλο email.',
    };
  }

  // Better Auth errors come pre-localized from the localization() plugin
  const message =
    error?.body?.message ||
    error?.message ||
    'Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά';

  return {
    success: false,
    message,
  };
}
