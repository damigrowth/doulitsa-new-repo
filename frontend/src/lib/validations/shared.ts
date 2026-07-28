/**
 * SHARED VALIDATION SCHEMAS
 * Common validation patterns used across the application
 */

import { z } from 'zod';

// =============================================
// COMMON VALIDATION PATTERNS
// =============================================

export const idSchema = z.string().cuid('Invalid ID format');
export const emailSchema = z.email('Invalid email format');
export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format')
  .optional();
export const urlSchema = z.string().url('Invalid URL format');
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters');

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Search schema
export const searchSchema = z
  .object({
    q: z.string().optional(),
    search: z.string().optional(),
  })
  .merge(paginationSchema);

// File upload schema
export const fileUploadSchema = z
  .object({
    name: z.string(),
    size: z.number(),
    type: z.string(),
    lastModified: z.number(),
  })
  .refine(
    (file) => file.size <= 3 * 1024 * 1024, // 3MB
    'File size must be less than 3MB',
  )
  .refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    'Only JPEG, PNG, WebP files are allowed',
  );

// Parameter schemas
export const idParamSchema = z.object({
  id: idSchema,
});

export const slugParamSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
});

// Contact form schema
export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: emailSchema,
  message: z.string().min(10, 'Message must be at least 10 characters'),
  subject: z.string().optional(),
});

// Email sending schema
export const emailSendSchema = z.object({
  to: z.union([emailSchema, z.array(emailSchema)]),
  from: emailSchema,
  replyTo: emailSchema.optional(),
  subject: z.string().min(1, 'Subject is required'),
  html: z.string().min(1, 'HTML content is required'),
  text: z.string().optional(),
});

// Validation patterns
export const validationPatterns = {
  phone: /^\+?[\d\s\-\(\)]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  username: /^[a-zA-Z0-9_-]{3,30}$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;

// Types
export type ContactInput = z.infer<typeof contactSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type SlugParam = z.infer<typeof slugParamSchema>;
