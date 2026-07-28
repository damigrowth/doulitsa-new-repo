/**
 * ZOD UTILITIES
 * Helper functions for Zod validation and error formatting
 */

import { z } from 'zod';

/**
 * Format Zod validation errors for ActionResponse
 * Converts ZodError to the format expected by ActionResponse.errors
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const treeifiedError = z.treeifyError(error);
  const formattedErrors: Record<string, string[]> = {};

  Object.keys(treeifiedError).forEach((key) => {
    if (key !== '_errors' && treeifiedError[key]?._errors) {
      formattedErrors[key] = treeifiedError[key]._errors;
    }
  });

  return formattedErrors;
}

/**
 * Create a validation error response for server actions
 * Standardized error response format
 */
export function createValidationErrorResponse(
  error: z.ZodError,
  message: string = 'Validation failed',
) {
  return {
    success: false as const,
    message,
    errors: formatZodErrors(error),
  };
}
