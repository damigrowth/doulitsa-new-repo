/**
 * BLOG VALIDATION SCHEMAS
 * Blog article and category validation schemas
 */

import { z } from 'zod';
import { paginationSchema } from './shared';
import { cloudinaryResourceSchema } from '@/lib/prisma/json-types';

// =============================================
// ARTICLE SCHEMAS
// =============================================

// Base fields shared between draft and publish modes
const articleBaseFields = {
  title: z.string().max(200, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 200 χαρακτήρες'),
  slug: z
    .string()
    .max(300)
    .optional()
    .or(z.literal('')),
  excerpt: z
    .string()
    .max(500, 'Η περίληψη δεν μπορεί να ξεπερνά τους 500 χαρακτήρες')
    .optional()
    .or(z.literal('')),
  content: z.string(),
  coverImage: cloudinaryResourceSchema.nullable().optional(),
  categorySlug: z.string().optional().or(z.literal('')),
  authorProfileIds: z.array(z.string()).optional(),
  status: z.enum(['draft', 'pending', 'published']).default('draft'),
  featured: z.boolean().default(false),
};

// Base object schema (no refinements — allows .partial() for update schema)
const articleBaseSchema = z.object(articleBaseFields);

// Refinement for non-draft validation
function articlePublishRefinement(data: z.infer<typeof articleBaseSchema>, ctx: z.RefinementCtx) {
  // Skip strict validation for drafts
  if (data.status === 'draft') return;

  if (!data.title || data.title.length < 5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ο τίτλος πρέπει να είναι τουλάχιστον 5 χαρακτήρες',
      path: ['title'],
    });
  }
  if (!data.content || data.content.length < 50) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Το περιεχόμενο πρέπει να είναι τουλάχιστον 50 χαρακτήρες',
      path: ['content'],
    });
  }
  if (!data.categorySlug) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Η κατηγορία είναι υποχρεωτική',
      path: ['categorySlug'],
    });
  }
}

// Create schema with publish-time refinement
export const createArticleSchema = articleBaseSchema.superRefine(articlePublishRefinement);

// Update schema: partial base + id, then apply same refinement
export const updateArticleSchema = articleBaseSchema
  .partial()
  .extend({ id: z.string().min(1) })
  .superRefine((data, ctx) => {
    // Only run publish refinement if status is being set to non-draft
    if (data.status && data.status !== 'draft') {
      articlePublishRefinement(data as z.infer<typeof articleBaseSchema>, ctx);
    }
  });

// =============================================
// QUERY SCHEMAS
// =============================================

export const blogArticleQuerySchema = paginationSchema.extend({
  categorySlug: z.string().optional(),
  status: z.enum(['draft', 'pending', 'published']).optional(),
  featured: z.coerce.boolean().optional(),
  authorProfileId: z.string().optional(),
  search: z.string().optional(),
});

// =============================================
// TYPES
// =============================================

export type CreateArticleInput = z.input<typeof articleBaseSchema>;
export type UpdateArticleInput = z.input<typeof articleBaseSchema> & { id: string };
export type BlogArticleQuery = z.infer<typeof blogArticleQuerySchema>;
