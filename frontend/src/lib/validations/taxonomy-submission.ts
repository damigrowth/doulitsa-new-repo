import { z } from 'zod';

/**
 * Validation schema for user-submitted taxonomy items
 */
export const submitTaxonomySubmissionSchema = z
  .object({
    label: z
      .string()
      .min(2, 'Το tag πρέπει να είναι τουλάχιστον 2 χαρακτήρες')
      .max(60, 'Το tag δεν μπορεί να ξεπερνά τους 60 χαρακτήρες')
      .transform((val) => val.trim()),
    type: z.enum(['skill', 'tag']),
    category: z.string().optional(),
  })
  .refine(
    (data) =>
      data.type !== 'skill' ||
      (data.category && data.category.length > 0),
    {
      message: 'Η κατηγορία είναι υποχρεωτική για δεξιότητες',
      path: ['category'],
    },
  );

export type SubmitTaxonomySubmissionInput = z.infer<
  typeof submitTaxonomySubmissionSchema
>;
