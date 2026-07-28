// utils/auth-error-handler.ts
import { AppError } from '@/lib/errors';

export interface AuthErrorResponse {
  message: string;
  code?: string;
  status?: number;
  statusText?: string;
}

export interface AuthResponse {
  data?: any;
  error?: AuthErrorResponse;
}

/**
 * Handles Better Auth errors and returns appropriate translated messages
 */
export function handleAuthError(error: any): {
  message: string;
  isEmailVerificationError: boolean;
  shouldRedirect: boolean;
  redirectTo?: string;
} {
  // console.log('Auth Error Details:', error);

  // Extract error details from various error formats
  let errorCode: string = '';
  let errorMessage: string = '';
  let statusCode: number = 500;

  // Handle Better Auth error response format
  if (error?.error) {
    errorCode = error.error.code || '';
    errorMessage = error.error.message || '';
    statusCode = error.error.status || 500;
  }
  // Handle direct error object
  else if (error?.code) {
    errorCode = error.code;
    errorMessage = error.message || '';
    statusCode = error.status || 500;
  }
  // Handle response with responseText (common in Better Auth)
  else if (error?.responseText) {
    try {
      const parsed = JSON.parse(error.responseText);
      errorCode = parsed.code || '';
      errorMessage = parsed.message || '';
      statusCode = error.status || 500;
    } catch (e) {
      errorMessage = error.responseText;
    }
  }
  // Handle fetch response errors
  else if (error?.response && !error?.response?.ok) {
    statusCode = error.response.status || 500;
    if (error.response.statusText) {
      errorMessage = error.response.statusText;
    }
  }
  // Handle string errors
  else if (typeof error === 'string') {
    errorMessage = error;
  }
  // Handle generic error objects
  else if (error?.message) {
    errorMessage = error.message;
  }

  // console.log('Parsed Error:', { errorCode, errorMessage, statusCode });

  // Determine error type and appropriate response
  switch (errorCode) {
    case 'EMAIL_NOT_VERIFIED':
      return {
        message: AppError.translate('EMAIL_NOT_VERIFIED'),
        isEmailVerificationError: true,
        shouldRedirect: true,
        redirectTo: '/verify-email',
      };

    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_PASSWORD':
      return {
        message: AppError.translate('INVALID_EMAIL_OR_PASSWORD'),
        isEmailVerificationError: false,
        shouldRedirect: false,
      };

    case 'ACCOUNT_NOT_FOUND':
    case 'USER_NOT_FOUND':
      return {
        message: AppError.translate('ACCOUNT_NOT_FOUND'),
        isEmailVerificationError: false,
        shouldRedirect: false,
      };

    case 'TOO_MANY_REQUESTS':
      return {
        message: AppError.translate('TOO_MANY_REQUESTS'),
        isEmailVerificationError: false,
        shouldRedirect: false,
      };

    default:
      // Check if error message contains known patterns
      const lowerMessage = errorMessage.toLowerCase();

      if (
        lowerMessage.includes('email not verified') ||
        lowerMessage.includes('email is not confirmed')
      ) {
        return {
          message: AppError.translate('EMAIL_NOT_VERIFIED'),
          isEmailVerificationError: true,
          shouldRedirect: true,
          redirectTo: '/verify-email',
        };
      }

      if (
        lowerMessage.includes('invalid') &&
        (lowerMessage.includes('password') || lowerMessage.includes('email'))
      ) {
        return {
          message: AppError.translate('INVALID_EMAIL_OR_PASSWORD'),
          isEmailVerificationError: false,
          shouldRedirect: false,
        };
      }

      if (
        lowerMessage.includes('not found') ||
        lowerMessage.includes('does not exist')
      ) {
        return {
          message: AppError.translate('ACCOUNT_NOT_FOUND'),
          isEmailVerificationError: false,
          shouldRedirect: false,
        };
      }

      // Translate known error messages
      const translatedMessage = AppError.translate(errorMessage);

      // Return translated message or fallback
      return {
        message:
          translatedMessage !== errorMessage
            ? translatedMessage
            : 'Λάθος στοιχεία σύνδεσης. Παρακαλώ δοκιμάστε ξανά.',
        isEmailVerificationError: false,
        shouldRedirect: false,
      };
  }
}

/**
 * Checks if an auth response indicates a successful operation
 */
export function isAuthSuccess(response: any): boolean {
  // If there's an explicit error, it's not successful
  if (response?.error) {
    return false;
  }

  // If there's a responseText with error information, it's not successful
  if (response?.responseText) {
    try {
      const parsed = JSON.parse(response.responseText);
      if (parsed.code || parsed.error) {
        return false;
      }
    } catch (e) {
      // If we can't parse responseText, assume it's an error
      return false;
    }
  }

  // If response status indicates an error, it's not successful
  if (response?.response && !response.response.ok) {
    return false;
  }

  // If we have a status code indicating error, it's not successful
  if (response?.status && response.status >= 400) {
    return false;
  }

  // For Better Auth, successful responses typically don't have error fields
  // and may have data or be undefined/null for some operations
  return true;
}

/**
 * Checks if an auth response indicates an email verification error
 */
export function isEmailVerificationError(response: any): boolean {
  // Check error object
  if (response?.error) {
    const errorCode = response.error.code;
    const errorMessage = response.error.message?.toLowerCase() || '';

    return (
      errorCode === 'EMAIL_NOT_VERIFIED' ||
      errorMessage.includes('email not verified') ||
      errorMessage.includes('email is not confirmed')
    );
  }

  // Check responseText
  if (response?.responseText) {
    try {
      const parsed = JSON.parse(response.responseText);
      const errorCode = parsed.code;
      const errorMessage = parsed.message?.toLowerCase() || '';

      return (
        errorCode === 'EMAIL_NOT_VERIFIED' ||
        errorMessage.includes('email not verified') ||
        errorMessage.includes('email is not confirmed')
      );
    } catch (e) {
      const responseText = response.responseText.toLowerCase();
      return (
        responseText.includes('email not verified') ||
        responseText.includes('email is not confirmed')
      );
    }
  }

  // Check direct error properties
  if (response?.code) {
    const errorCode = response.code;
    const errorMessage = response.message?.toLowerCase() || '';

    return (
      errorCode === 'EMAIL_NOT_VERIFIED' ||
      errorMessage.includes('email not verified') ||
      errorMessage.includes('email is not confirmed')
    );
  }

  return false;
}
