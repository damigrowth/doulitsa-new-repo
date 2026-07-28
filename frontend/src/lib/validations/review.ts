import { z } from 'zod';

/**
 * Schema for creating a new review
 * Includes moderation workflow and review type classification
 */
export const createReviewSchema = z.object({
  rating: z
    .number({
      message: 'Επιλέξτε εάν συστήνετε την υπηρεσία',
    })
    .int()
    .min(1, 'Επιλέξτε εάν συστήνετε την υπηρεσία')
    .max(5, 'Η βαθμολογία πρέπει να είναι από 1 έως 5'),
  comment: z
    .string()
    .max(350, 'Το σχόλιο πρέπει να έχει το πολύ 350 χαρακτήρες')
    .trim()
    .optional() // Changed: Comment is now optional (Like/Unlike system)
    .nullable(), // Changed: Allow null values
  profileId: z.string().cuid('Μη έγκυρο ID προφίλ'),
  serviceId: z.number().int().positive().optional(),
  // Type will be auto-determined: serviceId present = SERVICE, else = PROFILE
  // Rating: 5 = Like (Μου αρέσει), 1 = Unlike (Δεν μου αρέσει)
});

/**
 * Schema for review query parameters (pagination, filtering)
 */
export const reviewQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(10),
  sortBy: z.enum(['createdAt', 'rating']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schema for checking review permissions
 */
export const canReviewSchema = z.object({
  profileId: z.string().cuid(),
  serviceId: z.number().int().positive().optional(),
});

/**
 * Schema for admin review moderation
 */
export const moderateReviewSchema = z.object({
  reviewId: z.string().cuid('Μη έγκυρο ID αξιολόγησης'),
  status: z.enum(['approved', 'rejected'], {
    message: 'Η κατάσταση πρέπει να είναι "approved" ή "rejected"',
  }),
  reason: z.string().max(500, 'Η αιτιολογία δεν μπορεί να υπερβαίνει τους 500 χαρακτήρες').optional(),
});

/**
 * Type exports for use in components and actions
 */
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>;
export type CanReviewInput = z.infer<typeof canReviewSchema>;
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
