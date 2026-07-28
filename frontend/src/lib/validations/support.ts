/**
 * SUPPORT/FEEDBACK VALIDATION SCHEMAS
 * User support and feedback submission validation
 */

import { z } from 'zod';

// =============================================
// SUPPORT FEEDBACK SCHEMA
// =============================================

export const supportFormSchema = z.object({
  issueType: z.enum(['problem', 'option', 'feature']),
  description: z
    .string()
    .min(10, 'Η περιγραφή πρέπει να έχει τουλάχιστον 10 χαρακτήρες')
    .max(500, 'Η περιγραφή δεν μπορεί να υπερβαίνει τους 500 χαρακτήρες'),
  pageUrl: z.string().optional(), // Optional - captured client-side
});

// =============================================
// TYPE EXPORTS
// =============================================

export type SupportFormValues = z.infer<typeof supportFormSchema>;
