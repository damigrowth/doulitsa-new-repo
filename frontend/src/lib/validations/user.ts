/**
 * USER VALIDATION SCHEMAS
 * User entity validation schemas
 */

import { z } from 'zod';
import { emailSchema, phoneSchema, paginationSchema } from './shared';
import { userRoleSchema, authStepSchema } from './auth';

// =============================================
// USER CRUD SCHEMAS
// =============================================

export const createUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
  role: userRoleSchema.default('user'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .optional(),
  displayName: z.string().min(1, 'Display name is required').optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .optional(),
  displayName: z.string().min(1).optional(),
  role: userRoleSchema.optional(),
  step: authStepSchema.optional(),
  confirmed: z.boolean().optional(),
  blocked: z.boolean().optional(),
  banned: z.boolean().optional(),
  banReason: z.string().optional(),
  banExpires: z.date().optional(),
  emailVerified: z.boolean().optional(),
});

export const userQuerySchema = z
  .object({
    search: z.string().optional(),
    role: userRoleSchema.optional(),
    step: authStepSchema.optional(),
    confirmed: z.boolean().optional(),
    blocked: z.boolean().optional(),
    banned: z.boolean().optional(),
  })
  .merge(paginationSchema);

// =============================================
// USER MANAGEMENT SCHEMAS
// =============================================

export const banUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  banReason: z.string().optional(),
  banExpiresIn: z.number().optional(), // seconds
});

export const unbanUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const setUserRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: userRoleSchema,
});

export const blockUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  blocked: z.boolean(),
});

export const setUserPasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// =============================================
// USERNAME CHANGE SCHEMA
// =============================================

export const changeUsernameSchema = z
  .object({
    newUsername: z
      .string()
      .min(3, 'Το username πρέπει να έχει τουλάχιστον 3 χαρακτήρες')
      .max(30, 'Το username δεν μπορεί να υπερβαίνει τους 30 χαρακτήρες')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Επιτρέπονται μόνο λατινικοί χαρακτήρες, αριθμοί, παύλες και κάτω παύλες',
      )
      .transform((val) => val.toLowerCase()),
    confirmUsername: z.string().min(1, 'Η επιβεβαίωση είναι υποχρεωτική'),
  })
  .refine((data) => data.newUsername === data.confirmUsername.toLowerCase(), {
    message: 'Τα usernames δεν ταιριάζουν',
    path: ['confirmUsername'],
  });

// =============================================
// UPGRADE TO PRO SCHEMA
// =============================================

export const upgradeToProSchema = z.object({
  username: z
    .string()
    .min(3, 'Το username πρέπει να έχει τουλάχιστον 3 χαρακτήρες')
    .max(30, 'Το username δεν μπορεί να υπερβαίνει τους 30 χαρακτήρες')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Επιτρέπονται μόνο λατινικοί χαρακτήρες, αριθμοί, παύλες και κάτω παύλες',
    )
    .transform((val) => val.toLowerCase()),
  role: z.enum(['freelancer', 'company'], {
    message: 'Επιλέξτε τύπο λογαριασμού',
  }),
});

// =============================================
// USER PREFERENCES SCHEMAS
// =============================================

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
  notifications: z
    .object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      sms: z.boolean().default(false),
    })
    .default({
      email: true,
      push: true,
      sms: false,
    }),
  privacy: z
    .object({
      profileVisible: z.boolean().default(true),
      showEmail: z.boolean().default(false),
      showPhone: z.boolean().default(false),
    })
    .default({
      profileVisible: true,
      showEmail: false,
      showPhone: false,
    }),
});

// =============================================
// TYPE EXPORTS
// =============================================

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type BanUserInput = z.infer<typeof banUserSchema>;
export type UnbanUserInput = z.infer<typeof unbanUserSchema>;
export type SetUserRoleInput = z.infer<typeof setUserRoleSchema>;
export type BlockUserInput = z.infer<typeof blockUserSchema>;
export type SetUserPasswordInput = z.infer<typeof setUserPasswordSchema>;
export type ChangeUsernameInput = z.infer<typeof changeUsernameSchema>;
export type UpgradeToProInput = z.infer<typeof upgradeToProSchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
