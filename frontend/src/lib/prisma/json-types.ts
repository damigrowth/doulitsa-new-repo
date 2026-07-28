/**
 * APP JSON TYPE DECLARATIONS
 *
 * Global `AppJson` namespace describing the shape of the JSON columns Django
 * stores and serializes (coverage, media, socials, service add-ons, …). This
 * used to be the `PrismaJson` namespace populated by
 * `prisma-json-types-generator`; Prisma is gone, so these are now plain
 * app-owned type declarations backed by the Zod schemas below.
 *
 * Using Zod schemas as the source of truth with z.infer for type inference.
 */

import { z } from 'zod';

// 1. Define Zod schemas as the source of truth
export const cloudinaryResourceSchema = z.object({
  public_id: z.string(),
  secure_url: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  resource_type: z.enum(['image', 'video', 'raw', 'audio', 'auto']),
  format: z.string().optional(),
  bytes: z.number().optional(),
  url: z.string().optional(),
  created_at: z.string().optional(),
  folder: z.string().optional(),
  asset_id: z.string().optional(),
  version: z.number().optional(),
  etag: z.string().optional(),
  signature: z.string().optional(),
  tags: z.array(z.string()).optional(),
  context: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  original_filename: z.string().optional(),
  batch_id: z.string().optional(),
  upload_status: z.string().optional(),
  _pending: z.boolean().optional(),
});

export const coverageSchema = z.object({
  online: z.boolean(),
  onbase: z.boolean(),
  onsite: z.boolean(),
  address: z.string().optional(),
  area: z.string().nullable().optional(), // Single area ID
  county: z.string().nullable().optional(), // Single county ID
  zipcode: z.string().nullable().optional(), // Single zipcode ID
  counties: z.array(z.string()).optional(), // Array of county IDs
  areas: z.array(z.string()).optional(), // Array of area IDs
});

export const visibilitySettingsSchema = z.object({
  email: z.boolean(),
  phone: z.boolean().optional(),
  address: z.boolean().optional(),
});

export const socialMediaSchema = z.object({
  facebook: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  x: z.string().optional().nullable(),
  youtube: z.string().optional().nullable(),
  github: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  behance: z.string().optional().nullable(),
  dribbble: z.string().optional().nullable(),
  pinterest: z.string().optional().nullable(),
  vimeo: z.string().optional().nullable(),
  tiktok: z.string().optional().nullable(),
});

export const billingInfoSchema = z.object({
  receipt: z.boolean(),
  invoice: z.boolean(),
  afm: z.string().optional(),
  doy: z.string().optional(),
  name: z.string().optional(),
  profession: z.string().optional(),
  address: z.string().optional(),
});

export const starBreakdownSchema = z.object({
  1: z.number(),
  2: z.number(),
  3: z.number(),
  4: z.number(),
  5: z.number(),
});

export const serviceTypeSchema = z.object({
  presence: z.boolean(),
  online: z.boolean(),
  oneoff: z.boolean(),
  onbase: z.boolean(),
  subscription: z.boolean(),
  onsite: z.boolean(),
});

export const serviceAddonSchema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.number(),
});

export const serviceFaqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

// Message reactions schema
export const messageReactionsSchema = z.record(z.string(), z.array(z.string()));

// Message reaction item (for UI display)
export const messageReactionSchema = z.object({
  emoji: z.string(),
  userIds: z.array(z.string()),
  count: z.number(),
  hasReacted: z.boolean(),
});

// Infer the MessageReaction type
export type MessageReaction = z.infer<typeof messageReactionSchema>;

// Array schemas for JSON[] fields
export const portfolioSchema = z.array(cloudinaryResourceSchema);
export const mediaSchema = z.array(cloudinaryResourceSchema);

// 2. Expose the inferred types as a global app JSON namespace
declare global {
  namespace AppJson {
    type CloudinaryResource = z.infer<typeof cloudinaryResourceSchema>;
    type Coverage = z.infer<typeof coverageSchema>;
    type VisibilitySettings = z.infer<typeof visibilitySettingsSchema>;
    type SocialMedia = z.infer<typeof socialMediaSchema>;
    type BillingInfo = z.infer<typeof billingInfoSchema>;
    type StarBreakdown = z.infer<typeof starBreakdownSchema>;
    type ServiceType = z.infer<typeof serviceTypeSchema>;
    type ServiceAddon = z.infer<typeof serviceAddonSchema>;
    type ServiceFAQ = z.infer<typeof serviceFaqSchema>;
    type MessageReactions = z.infer<typeof messageReactionsSchema>;

    // Array types (for Json[] fields)
    type Portfolio = z.infer<typeof portfolioSchema>;
    type Media = z.infer<typeof mediaSchema>;
  }
}
