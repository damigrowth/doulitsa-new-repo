/**
 * ADMIN VALIDATION SCHEMAS
 *
 * Validation schemas for admin operations using Better Auth
 * Aligned with existing validation patterns and Better Auth API
 */

import { z } from 'zod';
import {
  userRoleSchema,
  userTypeSchema,
  authStepSchema,
  emailSchema,
  passwordSchema,
  registerSchema,
  accountUpdateSchema,
} from '../validations';
import {
  adminServiceValidationSchema,
  createServiceSchema,
  type EditServiceTaxonomyInput,
  type EditServiceBasicInput,
  type EditServicePricingInput,
  type EditServiceSettingsInput,
  type EditServiceAddonsInput,
  type EditServiceFaqInput,
  type UpdateServiceMediaInput,
} from './service';
import { cloudinaryResourceSchema } from '../prisma/json-types';
import {
  SubscriptionStatus,
  SubscriptionPlan,
  BillingInterval,
} from '@/lib/prisma-types';

// =============================================
// ADMIN USER MANAGEMENT SCHEMAS
// =============================================

export const adminListUsersSchema = z.object({
  searchValue: z.string().optional(),
  searchField: z.enum(['email', 'name']).optional().default('email'),
  searchOperator: z
    .enum(['contains', 'starts_with', 'ends_with'])
    .optional()
    .default('contains'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z.string().optional().default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
  filterField: z.string().optional(),
  filterOperator: z
    .enum(['eq', 'contains', 'starts_with', 'ends_with'])
    .optional(),
  filterValue: z.string().optional(),
});

// Extend registerSchema from auth.ts with admin-specific fields
export const adminCreateUserSchema = registerSchema.extend({
  name: z.string().min(1, 'Name is required').max(100),
  emailVerified: z.boolean().optional().default(true), // Admin-created users are pre-verified
  confirmed: z.boolean().optional().default(true), // Admin-created users are pre-confirmed
});

// General admin update schema - extends accountUpdateSchema from auth.ts
export const adminUpdateUserSchema = accountUpdateSchema
  .partial() // Make all fields optional for partial updates
  .extend({
    userId: z.string().min(1, 'User ID is required'),
    name: z.string().min(1).max(100).optional(),
    email: emailSchema.optional(),
    username: z.string().min(5).optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    role: userRoleSchema.optional(),
    type: userTypeSchema.optional(),
    confirmed: z.boolean().optional(),
    blocked: z.boolean().optional(),
    step: authStepSchema.optional(),
    emailVerified: z.boolean().optional(),
  });

export const adminSetRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: userRoleSchema, // Our full role schema, will be handled with fallback
});

export const adminSetPasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  newPassword: passwordSchema,
});

export const adminBanUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  banReason: z.string().max(500, 'Ban reason too long').optional(),
  banExpiresIn: z.coerce.number().int().min(1).optional(), // in seconds
});

export const adminUnbanUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const adminRemoveUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const adminImpersonateUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

// =============================================
// ADMIN SESSION MANAGEMENT SCHEMAS
// =============================================

export const adminListUserSessionsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const adminRevokeSessionSchema = z.object({
  sessionToken: z.string().min(1, 'Session token is required'),
});

export const adminRevokeUserSessionsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

// =============================================
// ADMIN BULK OPERATIONS SCHEMAS
// =============================================

export const adminBulkActionSchema = z.object({
  userIds: z
    .array(z.string().min(1))
    .min(1, 'At least one user ID is required'),
  action: z.enum(['ban', 'unban', 'delete', 'set_role', 'revoke_sessions']),
  params: z.record(z.string(), z.any()).optional(), // Additional parameters for the action
});

// =============================================
// FORM VALIDATION SCHEMAS (for React Hook Form)
// =============================================

export const banUserFormSchema = z
  .object({
    userId: z.string().min(1),
    banReason: z.string().min(1, 'Please provide a ban reason').max(500),
    banDuration: z.number().int().min(1).max(365).optional(), // in days
    isPermanent: z.boolean(),
  })
  .refine(
    (data) => {
      if (!data.isPermanent && !data.banDuration) {
        return false;
      }
      return true;
    },
    {
      message: 'Please specify ban duration or mark as permanent',
      path: ['banDuration'],
    },
  );

export const revokeSessionSchema = z.object({
  sessionToken: z.string().min(1, 'Session token is required'),
});

export const revokeUserSessionsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

// =============================================
// USER EDITING FORM SCHEMAS (extend from adminUpdateUserSchema)
// =============================================

// Update user basic info - pick specific fields from general schema
export const updateUserBasicInfoSchema = adminUpdateUserSchema.pick({
  userId: true,
  email: true,
  username: true,
  displayName: true,
});

// Update user status - pick status-related fields from general schema
export const updateUserStatusSchema = adminUpdateUserSchema.pick({
  userId: true,
  role: true,
  type: true,
  step: true,
  emailVerified: true,
  confirmed: true,
  blocked: true,
});

// =============================================
// ADMIN API KEY SCHEMAS (extracted from admin actions)
// =============================================

export const validateApiKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
});

export const createAdminApiKeySchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  expiresIn: z.number().min(1).max(365).optional().default(365), // days
  metadata: z
    .object({
      purpose: z.string().optional(),
      owner: z.string().optional(),
    })
    .optional(),
});

export const updateAdminApiKeySchema = z.object({
  name: z.string().optional(),
  enabled: z.boolean().optional(),
});

// =============================================
// ADMIN PROFILE MANAGEMENT SCHEMAS
// =============================================

export const adminListProfilesSchema = z.object({
  searchQuery: z.string().optional(),
  type: z.enum(['all', 'freelancer', 'company']).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  published: z.enum(['all', 'published', 'draft']).optional(),
  verified: z.enum(['all', 'verified', 'unverified']).optional(),
  featured: z.enum(['all', 'featured', 'not-featured']).optional(),
  status: z.enum(['all', 'featured', 'top']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z
    .enum(['createdAt', 'rating', 'reviewCount', 'updatedAt', 'displayName', 'services'])
    .optional()
    .default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const adminUpdateProfileSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  // Basic info
  displayName: z.string().min(1).max(100).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  bio: z.string().max(1000).optional(),
  tagline: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),

  // Professional
  type: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  skills: z.array(z.string()).optional(),
  speciality: z.string().optional(),
  rate: z.number().int().min(0).optional(),
  experience: z.number().int().min(0).max(100).optional(),
  size: z.string().optional(),
  commencement: z.string().optional(),
  budget: z.string().optional(),
  industries: z.array(z.string()).optional(),
  terms: z.string().optional(),

  // Contact
  contactMethods: z.array(z.string()).optional(),
  paymentMethods: z.array(z.string()).optional(),
  settlementMethods: z.array(z.string()).optional(),
  viber: z.string().optional(),
  whatsapp: z.string().optional(),

  // Settings
  visibility: z.record(z.string(), z.boolean()).optional(),
  socials: z.record(z.string(), z.string()).optional(),

  // Status flags (admin only)
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  verified: z.boolean().optional(),
  top: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const adminToggleProfileSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
});

export const adminDeleteProfileSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
});

export const adminUpdateVerificationSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  notes: z.string().max(1000).optional(),
});

// Note: Admin profile forms use the same validation schemas as dashboard
// Import from '@/lib/validations/profile' instead of defining duplicates here
// Available schemas: profileBasicInfoUpdateSchema, additionalProfileInfoSchema,
// presentationSchema, updateProfilePortfolioSchema, billingSchema

// =============================================
// PROFILE TYPE EXPORTS
// =============================================

export type AdminListProfilesInput = z.infer<typeof adminListProfilesSchema>;
export type AdminUpdateProfileInput = z.infer<typeof adminUpdateProfileSchema>;
export type AdminToggleProfileInput = z.infer<typeof adminToggleProfileSchema>;
export type AdminDeleteProfileInput = z.infer<typeof adminDeleteProfileSchema>;
export type AdminUpdateVerificationInput = z.infer<
  typeof adminUpdateVerificationSchema
>;

// =============================================
// ADMIN SERVICE MANAGEMENT SCHEMAS
// =============================================

export const adminListServicesSchema = z.object({
  searchQuery: z.string().optional(),
  status: z
    .enum([
      'all',
      'draft',
      'pending',
      'published',
      'rejected',
      'approved',
      'inactive',
    ])
    .optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  subdivision: z.string().optional(),
  featured: z.enum(['all', 'featured', 'not-featured']).optional(),
  type: z
    .enum([
      'all',
      'presence',
      'onbase',
      'onsite',
      'online',
      'oneoff',
      'subscription',
    ])
    .optional(),
  pricing: z.enum(['all', 'fixed', 'not-fixed']).optional(),
  subscriptionType: z
    .enum(['all', 'month', 'year', 'per_case', 'per_hour', 'per_session'])
    .optional(),
  profileId: z.string().optional(), // Filter by profile
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z
    .enum(['sortDate', 'rating', 'reviewCount', 'price', 'createdAt', 'updatedAt'])
    .optional()
    .default('sortDate'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const adminToggleServiceSchema = z.object({
  serviceId: z.coerce.number().int().min(1, 'Service ID is required'),
});

export const adminUpdateServiceStatusSchema = z.object({
  serviceId: z.coerce.number().int().min(1, 'Service ID is required'),
  status: z.enum([
    'draft',
    'pending',
    'published',
    'rejected',
    'approved',
    'inactive',
  ]),
  rejectionReason: z.string().max(500).optional(),
});

export const adminDeleteServiceSchema = z.object({
  serviceId: z.coerce.number().int().min(1, 'Service ID is required'),
});

// Admin create service schema - combines admin validation schema with profile assignment
// Uses adminServiceValidationSchema for field-level validation, adds profileId for submission
// Using .and() instead of .extend() because schema contains refinements
export const adminCreateServiceSchema = adminServiceValidationSchema.and(
  z.object({
    profileId: z.string().min(1, 'Profile ID is required'),
  })
);

// Note: Admin service forms should use the same validation schemas as dashboard
// Import from '@/lib/validations/service' instead of defining duplicates
// Available schemas: serviceEditSchema, formServiceAddonSchema, formServiceFaqSchema, etc.

// =============================================
// SERVICE TYPE EXPORTS
// =============================================

export type AdminListServicesInput = z.infer<typeof adminListServicesSchema>;
export type AdminToggleServiceInput = z.infer<typeof adminToggleServiceSchema>;
export type AdminUpdateServiceStatusInput = z.infer<
  typeof adminUpdateServiceStatusSchema
>;
export type AdminDeleteServiceInput = z.infer<typeof adminDeleteServiceSchema>;
export type AdminCreateServiceInput = z.infer<typeof adminCreateServiceSchema>;

// Admin update service input - intersection of all edit schemas + serviceId
// The updateService function accepts data from any combination of edit schemas
// Using intersection (&) instead of union (|) allows TypeScript to access all fields
export type AdminUpdateServiceInput = {
  serviceId: number;
} & Partial<EditServiceTaxonomyInput> &
  Partial<EditServiceBasicInput> &
  Partial<EditServicePricingInput> &
  Partial<EditServiceSettingsInput> &
  Partial<EditServiceAddonsInput> &
  Partial<EditServiceFaqInput> &
  Partial<UpdateServiceMediaInput> & {
    status?: string;
    featured?: boolean;
    media?: any[];
  };

// =============================================
// ADMIN VERIFICATION MANAGEMENT SCHEMAS
// =============================================

export const adminListVerificationsSchema = z.object({
  searchQuery: z.string().optional(), // Search AFM or business name
  status: z.enum(['all', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'status'])
    .optional()
    .default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const adminUpdateVerificationStatusSchema = z.object({
  verificationId: z.string().min(1, 'Verification ID is required'),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  notes: z.string().max(1000).optional(),
});

export const adminDeleteVerificationSchema = z.object({
  verificationId: z.string().min(1, 'Verification ID is required'),
});

// Form schemas for dialogs
export const approveVerificationFormSchema = z.object({
  verificationId: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

export const rejectVerificationFormSchema = z.object({
  verificationId: z.string().min(1),
  reason: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(1000, 'Reason is too long'),
});

// =============================================
// VERIFICATION TYPE EXPORTS
// =============================================

export type AdminListVerificationsInput = z.infer<
  typeof adminListVerificationsSchema
>;
export type AdminUpdateVerificationStatusInput = z.infer<
  typeof adminUpdateVerificationStatusSchema
>;
export type AdminDeleteVerificationInput = z.infer<
  typeof adminDeleteVerificationSchema
>;
export type ApproveVerificationFormInput = z.infer<
  typeof approveVerificationFormSchema
>;
export type RejectVerificationFormInput = z.infer<
  typeof rejectVerificationFormSchema
>;

// =============================================
// ADMIN REVIEW MANAGEMENT SCHEMAS
// =============================================

export const adminListReviewsSchema = z.object({
  searchQuery: z.string().optional(), // Search comment or author name
  status: z.enum(['all', 'pending', 'approved', 'rejected']).optional(),
  rating: z.enum(['all', '1', '2', '3', '4', '5']).optional(),
  type: z.enum(['all', 'SERVICE', 'PROFILE']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'rating'])
    .optional()
    .default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const adminUpdateReviewStatusSchema = z.object({
  reviewId: z.string().min(1, 'Review ID is required'),
  status: z.enum(['pending', 'approved', 'rejected']),
  notes: z.string().max(1000).optional(),
});

export const adminDeleteReviewSchema = z.object({
  reviewId: z.string().min(1, 'Review ID is required'),
});

// Form schemas for dialogs
export const approveReviewFormSchema = z.object({
  reviewId: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

export const rejectReviewFormSchema = z.object({
  reviewId: z.string().min(1),
  reason: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(1000, 'Reason is too long'),
});

// =============================================
// REVIEW TYPE EXPORTS
// =============================================

export type AdminListReviewsInput = z.infer<typeof adminListReviewsSchema>;
export type AdminUpdateReviewStatusInput = z.infer<
  typeof adminUpdateReviewStatusSchema
>;
export type AdminDeleteReviewInput = z.infer<typeof adminDeleteReviewSchema>;
export type ApproveReviewFormInput = z.infer<typeof approveReviewFormSchema>;
export type RejectReviewFormInput = z.infer<typeof rejectReviewFormSchema>;

// =============================================
// ADMIN TAXONOMY SUBMISSION SCHEMAS
// =============================================

export const adminListTaxonomySubmissionsSchema = z.object({
  searchQuery: z.string().optional(),
  status: z.enum(['all', 'pending', 'approved', 'rejected']).optional(),
  type: z.enum(['all', 'skill', 'tag']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z
    .enum(['createdAt', 'status', 'label', 'type'])
    .optional()
    .default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type AdminListTaxonomySubmissionsInput = z.infer<
  typeof adminListTaxonomySubmissionsSchema
>;

// =============================================
// ADMIN TAXONOMY MANAGEMENT SCHEMAS
// =============================================

export const createServiceTaxonomySchema = z.object({
  label: z.string().min(1, 'Label is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only',
    ),
  description: z.string().max(1000).optional(),
  level: z.enum(['category', 'subcategory', 'subdivision']),
  parentId: z.string().optional(),
  featured: z.boolean().optional(),
  icon: z.string().optional(),
  image: cloudinaryResourceSchema.nullable().optional(),
});

export type CreateServiceTaxonomyInput = z.infer<
  typeof createServiceTaxonomySchema
>;

export const updateServiceTaxonomySchema = z.object({
  id: z.string().min(1, 'ID is required'),
  label: z.string().min(1, 'Label is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only',
    ),
  description: z.string().max(1000).optional(),
  level: z.enum(['category', 'subcategory', 'subdivision']),
  parentId: z.string().optional(),
  featured: z.boolean().optional(),
  icon: z.string().optional(),
  image: cloudinaryResourceSchema.nullable().optional(),
});

export type UpdateServiceTaxonomyInput = z.infer<
  typeof updateServiceTaxonomySchema
>;

// =============================================
// PRO TAXONOMY SCHEMAS
// =============================================

export const createProTaxonomySchema = z.object({
  label: z.string().min(1, 'Label is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only',
    ),
  plural: z.string().min(1, 'Plural is required').max(255),
  description: z.string().max(1000).optional(),
  level: z.enum(['category', 'subcategory']),
  parentId: z.string().optional(),
  type: z.enum(['freelancer', 'company']).optional(),
  icon: z.string().optional(),
});

export const updateProTaxonomySchema = z.object({
  id: z.string().min(1, 'ID is required'),
  label: z.string().min(1, 'Label is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only',
    ),
  plural: z.string().min(1, 'Plural is required').max(255),
  description: z.string().max(1000).optional(),
  level: z.enum(['category', 'subcategory']),
  parentId: z.string().optional(),
  type: z.enum(['freelancer', 'company']).optional(),
  icon: z.string().optional(),
});

export type CreateProTaxonomyInput = z.infer<typeof createProTaxonomySchema>;
export type UpdateProTaxonomyInput = z.infer<typeof updateProTaxonomySchema>;

// =============================================
// TAG SCHEMAS
// =============================================

export const createTagSchema = z.object({
  label: z.string().min(1, 'Label is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only',
    ),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

export const updateTagSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  label: z.string().min(1, 'Label is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only',
    ),
});

export type UpdateTagInput = z.infer<typeof updateTagSchema>;

export const deleteTagSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export type DeleteTagInput = z.infer<typeof deleteTagSchema>;

// =============================================
// SKILL SCHEMAS
// =============================================

export const createSkillSchema = z.object({
  label: z.string().min(1, 'Label is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only',
    ),
  category: z.string().min(1, 'Category is required'),
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;

export const updateSkillSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  label: z.string().min(1, 'Label is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only',
    ),
  category: z.string().min(1, 'Category is required'),
});

export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;

export const deleteSkillSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export type DeleteSkillInput = z.infer<typeof deleteSkillSchema>;

// =============================================
// ADMIN SUBSCRIPTION MANAGEMENT SCHEMAS
// =============================================

export const adminListSubscriptionsSchema = z.object({
  searchQuery: z.string().optional(), // Search profile displayName or user email
  status: z
    .union([z.literal('all'), z.nativeEnum(SubscriptionStatus)])
    .optional(),
  plan: z.union([z.literal('all'), z.nativeEnum(SubscriptionPlan)]).optional(),
  billingInterval: z
    .union([z.literal('all'), z.nativeEnum(BillingInterval)])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'currentPeriodEnd',
      'status',
      'plan',
      'lastPaymentAt',
      'amount',
      'totalPaidLifetime',
    ])
    .optional()
    .default('lastPaymentAt'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const adminUpdateSubscriptionStatusSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  status: z.nativeEnum(SubscriptionStatus),
  notes: z.string().max(1000).optional(),
});

export const adminDeleteSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
});

export const adminCreateManualSubscriptionSchema = z.object({
  profileId: z.string().cuid('Invalid profile ID'),
  endDate: z
    .string()
    .min(1, 'End date is required')
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
});

// =============================================
// SUBSCRIPTION TYPE EXPORTS
// =============================================

export type AdminListSubscriptionsInput = z.infer<
  typeof adminListSubscriptionsSchema
>;
export type AdminUpdateSubscriptionStatusInput = z.infer<
  typeof adminUpdateSubscriptionStatusSchema
>;
export type AdminDeleteSubscriptionInput = z.infer<
  typeof adminDeleteSubscriptionSchema
>;
export type AdminCreateManualSubscriptionInput = z.infer<
  typeof adminCreateManualSubscriptionSchema
>;
