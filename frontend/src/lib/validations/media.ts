/**
 * MEDIA VALIDATION SCHEMAS
 * Media upload and management validation schemas
 */

import { z } from 'zod';
import { idSchema, urlSchema, paginationSchema } from './shared';

// =============================================
// MEDIA TYPE ENUMS
// =============================================

export const mediaTypeSchema = z.enum(['AVATAR', 'PORTFOLIO', 'SERVICE_IMAGE', 'GENERAL']);
export const mediaFormatSchema = z.enum(['jpeg', 'jpg', 'png', 'webp', 'gif', 'svg', 'pdf', 'mp4', 'mov', 'avi']);

// =============================================
// MEDIA CRUD SCHEMAS
// =============================================

export const createMediaSchema = z.object({
  userId: idSchema,
  publicId: z.string().min(1, 'Public ID is required'),
  url: urlSchema,
  secureUrl: urlSchema.optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  format: z.string().optional(),
  bytes: z.number().int().optional(),
  folder: z.string().optional(),
  type: mediaTypeSchema.default('GENERAL'),
  originalName: z.string().optional(),
  alt: z.string().max(255).optional(),
  caption: z.string().max(500).optional(),
  // Relation fields
  profileAvatarId: z.string().optional(),
  profilePortfolioId: z.string().optional(),
  serviceMediaId: z.string().optional(),
});

export const updateMediaSchema = z.object({
  alt: z.string().max(255).optional(),
  caption: z.string().max(500).optional(),
  type: mediaTypeSchema.optional(),
});

export const mediaQuerySchema = z.object({
  type: mediaTypeSchema.optional(),
  folder: z.string().optional(),
  userId: z.string().optional(),
  format: z.string().optional()
}).merge(paginationSchema);

// =============================================
// FILE UPLOAD VALIDATION SCHEMAS
// =============================================

export const fileUploadValidationSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().int().min(1, 'File size must be greater than 0'),
  type: z.string().min(1, 'File type is required'),
  lastModified: z.number().optional(),
});

// Image-specific validation
export const imageUploadSchema = fileUploadValidationSchema.extend({
  type: z.string().refine(
    (type) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(type),
    'Only JPEG, PNG, WebP, and GIF images are allowed'
  ),
  size: z.number().int().max(10 * 1024 * 1024, 'Image size must be less than 10MB'),
});

// Avatar-specific validation
export const avatarUploadSchema = imageUploadSchema.extend({
  size: z.number().int().max(3 * 1024 * 1024, 'Avatar size must be less than 3MB'),
  type: z.string().refine(
    (type) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(type),
    'Only JPEG, PNG, and WebP images are allowed for avatars'
  ),
});

// Portfolio/Service media validation
export const portfolioUploadSchema = fileUploadValidationSchema.extend({
  size: z.number().int().max(25 * 1024 * 1024, 'File size must be less than 25MB'),
  type: z.string().refine(
    (type) => [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      // Videos
      'video/mp4', 'video/mov', 'video/avi', 'video/webm',
      // Documents
      'application/pdf',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ].includes(type),
    'File type not supported'
  ),
});

// Document upload validation
export const documentUploadSchema = fileUploadValidationSchema.extend({
  size: z.number().int().max(50 * 1024 * 1024, 'Document size must be less than 50MB'),
  type: z.string().refine(
    (type) => [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ].includes(type),
    'Only PDF, Word, Excel, and text documents are allowed'
  ),
});

// =============================================
// CLOUDINARY-SPECIFIC SCHEMAS
// =============================================

export const cloudinaryUploadSchema = z.object({
  file: z.string(), // Only allow string (URL or public_id) for cloudinary uploads
  folder: z.string().optional(),
  publicId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  context: z.record(z.string(), z.string()).optional(),
  transformation: z.object({
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    crop: z.enum(['scale', 'fit', 'limit', 'fill', 'pad']).optional(),
    quality: z.enum(['auto', 'best', 'good', 'eco']).or(z.number().int().min(1).max(100)).optional(),
    format: z.enum(['auto', 'jpg', 'png', 'webp']).optional(),
  }).optional(),
});

export const cloudinaryDeleteSchema = z.object({
  publicId: z.string().min(1, 'Public ID is required'),
  resourceType: z.enum(['image', 'video', 'raw']).default('image'),
});

export const cloudinaryTransformSchema = z.object({
  publicId: z.string().min(1, 'Public ID is required'),
  transformations: z.array(z.object({
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    crop: z.enum(['scale', 'fit', 'limit', 'fill', 'pad']).optional(),
    quality: z.enum(['auto', 'best', 'good', 'eco']).or(z.number().int().min(1).max(100)).optional(),
    format: z.enum(['auto', 'jpg', 'png', 'webp']).optional(),
    gravity: z.string().optional(),
    effect: z.string().optional(),
  })),
});

// =============================================
// MEDIA OPTIMIZATION SCHEMAS
// =============================================

export const mediaOptimizationSchema = z.object({
  publicId: z.string().min(1, 'Public ID is required'),
  optimizations: z.object({
    autoFormat: z.boolean().default(true),
    autoQuality: z.boolean().default(true),
    compress: z.boolean().default(true),
    progressive: z.boolean().default(true),
    lossless: z.boolean().default(false),
  }),
});

export const batchOptimizationSchema = z.object({
  publicIds: z.array(z.string()).min(1, 'At least one public ID is required'),
  optimizations: z.object({
    autoFormat: z.boolean().default(true),
    autoQuality: z.boolean().default(true),
    compress: z.boolean().default(true),
    progressive: z.boolean().default(true),
    lossless: z.boolean().default(false),
  }),
});

// =============================================
// MEDIA GALLERY SCHEMAS
// =============================================

export const mediaGallerySchema = z.object({
  items: z.array(z.object({
    id: idSchema,
    url: urlSchema,
    alt: z.string().optional(),
    caption: z.string().optional(),
    order: z.number().int().min(0).optional(),
  })),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export const updateMediaGallerySchema = z.object({
  items: z.array(z.object({
    id: idSchema,
    order: z.number().int().min(0),
    alt: z.string().optional(),
    caption: z.string().optional(),
  })).optional(),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

// =============================================
// MEDIA ANALYTICS SCHEMAS
// =============================================

export const mediaAnalyticsQuerySchema = z.object({
  publicId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  metric: z.enum(['views', 'downloads', 'bandwidth', 'storage']).optional(),
}).merge(paginationSchema);

// =============================================
// TYPE EXPORTS
// =============================================

export type CreateMediaInput = z.infer<typeof createMediaSchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
export type MediaQueryInput = z.infer<typeof mediaQuerySchema>;
export type FileUploadInput = z.infer<typeof fileUploadValidationSchema>;
export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;
export type PortfolioUploadInput = z.infer<typeof portfolioUploadSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type CloudinaryUploadInput = z.infer<typeof cloudinaryUploadSchema>;
export type CloudinaryDeleteInput = z.infer<typeof cloudinaryDeleteSchema>;
export type CloudinaryTransformInput = z.infer<typeof cloudinaryTransformSchema>;
export type MediaOptimizationInput = z.infer<typeof mediaOptimizationSchema>;
export type BatchOptimizationInput = z.infer<typeof batchOptimizationSchema>;
export type MediaGalleryInput = z.infer<typeof mediaGallerySchema>;
export type UpdateMediaGalleryInput = z.infer<typeof updateMediaGallerySchema>;
export type MediaAnalyticsQueryInput = z.infer<typeof mediaAnalyticsQuerySchema>;