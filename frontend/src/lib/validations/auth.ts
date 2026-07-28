/**
 * AUTHENTICATION VALIDATION SCHEMAS
 * All auth-related validation schemas
 */

import { z } from 'zod';
import { emailSchema, passwordSchema } from './shared';

// =============================================
// ENUM SCHEMAS
// =============================================

export const userRoleSchema = z.enum([
  'user',
  'freelancer',
  'company',
  'admin',
  'support',
  'editor',
]);

export const userTypeSchema = z.enum(['user', 'pro']);

export const authStepSchema = z.enum([
  'EMAIL_VERIFICATION',
  'TYPE_SELECTION',
  'OAUTH_SETUP',
  'ONBOARDING',
  'DASHBOARD',
]);

// =============================================
// LOGIN SCHEMAS
// =============================================

// Login with email or username
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(2, 'Το email ή το όνομα χρήστη είναι πολύ μικρό')
    .max(50, 'Το email ή το όνομα χρήστη είναι πολύ μεγάλο'),
  password: z
    .string()
    .min(6, 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες')
    .max(100, 'Ο κωδικός είναι πολύ μεγάλος'),
});

// Simple email-only login for admin/API use
export const simpleLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ο κωδικός είναι υποχρεωτικός'),
});

// =============================================
// REGISTRATION SCHEMAS
// =============================================

// Combined registration schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: userRoleSchema.default('user'),
  username: z
    .string()
    .min(3, 'Το όνομα χρήστη πρέπει να έχει τουλάχιστον 3 χαρακτήρες')
    .optional(),
  displayName: z
    .string()
    .min(1, 'Το όνομα εμφάνισης είναι υποχρεωτικό')
    .optional(),
  consent: z.boolean().optional(),
});

// Registration form schema with UI validation
export const registrationFormSchema = z
  .object({
    email: z.string().min(1, 'Το email είναι υποχρεωτικό'),
    password: z
      .string()
      .min(6, 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες')
      .max(100, 'Ο κωδικός είναι πολύ μεγάλος'),
    confirmPassword: z
      .string()
      .min(1, 'Η επιβεβαίωση κωδικού είναι υποχρεωτική'),
    username: z
      .string()
      .max(30, 'Το username δεν μπορεί να υπερβαίνει τους 30 χαρακτήρες')
      .regex(
        /^[a-zA-Z0-9_-]*$/,
        'Το username μπορεί να περιέχει μόνο γράμματα, αριθμούς, παύλες και κάτω παύλες',
      )
      .optional()
      .or(z.literal('')),
    displayName: z.string().optional(),
    authType: z.union([z.literal(''), z.literal('user'), z.literal('pro')]),
    role: z.union([z.literal('freelancer'), z.literal('company')]).optional(),
    consent: z
      .array(z.string())
      .min(1, 'Πρέπει να αποδεχτείς τους όρους χρήσης'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Οι κωδικοί δεν ταιριάζουν',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      // If authType is 'pro' (professional), role is required
      if (data.authType === 'pro' && !data.role) {
        return false;
      }
      return true;
    },
    {
      message: 'Πρέπει να επιλέξεις τύπο λογαριασμού',
      path: ['role'],
    },
  )
  .refine(
    (data) => {
      // If authType is 'pro' (professional), displayName is required
      if (
        data.authType === 'pro' &&
        (!data.displayName || data.displayName.trim() === '')
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Το όνομα είναι υποχρεωτικό',
      path: ['displayName'],
    },
  )
  .refine(
    (data) => {
      // If authType is 'pro' (professional), username is required
      if (data.authType === 'pro' && (!data.username || data.username.length < 3)) {
        return false;
      }
      return true;
    },
    {
      message: 'Το username είναι υποχρεωτικό',
      path: ['username'],
    },
  );

// =============================================
// PASSWORD SCHEMAS
// =============================================

// Password change schema
export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Ο τρέχων κωδικός είναι υποχρεωτικός')
      .min(6, 'Ο τρέχων κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες'),
    newPassword: z
      .string()
      .min(1, 'Ο νέος κωδικός είναι υποχρεωτικός')
      .min(6, 'Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες'),
    confirmPassword: z
      .string()
      .min(1, 'Η επιβεβαίωση κωδικού είναι υποχρεωτική')
      .min(6, 'Η επιβεβαίωση κωδικού πρέπει να έχει τουλάχιστον 6 χαρακτήρες'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Οι νέοι κωδικοί δεν ταιριάζουν',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον τρέχοντα',
    path: ['newPassword'],
  });

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Το token είναι υποχρεωτικό'),
  newPassword: passwordSchema,
});

// =============================================
// TOKEN & VERIFICATION SCHEMAS
// =============================================

// Account update schema
export const accountUpdateSchema = z.object({
  displayName: z
    .string()
    .min(5, 'Το όνομα εμφάνισης πρέπει να έχει τουλάχιστον 5 χαρακτήρες')
    .max(50, 'Το όνομα εμφάνισης δεν μπορεί να υπερβαίνει τους 50 χαρακτήρες'),
  image: z.any().nullable().optional(), // Accepts CloudinaryResource object or string URL
});

// Delete account schema
export const deleteAccountSchema = z
  .object({
    username: z.string().min(1, 'Το όνομα χρήστη είναι υποχρεωτικό'),
    confirmUsername: z
      .string()
      .min(1, 'Η επιβεβαίωση ονόματος χρήστη είναι υποχρεωτική'),
  })
  .refine((data) => data.username === data.confirmUsername, {
    message: 'Η επιβεβαίωση ονόματος χρήστη δεν ταιριάζει',
    path: ['confirmUsername'],
  });

// =============================================
// TYPE EXPORTS
// =============================================

export type LoginInput = z.infer<typeof loginSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegistrationFormInput = z.infer<typeof registrationFormSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
