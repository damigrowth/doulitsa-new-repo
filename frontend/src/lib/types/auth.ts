/**
 * AUTHENTICATION TYPE DEFINITIONS
 * All authentication and authorization related types
 */

// The authenticated user shape now comes from the Django REST `User`
// serializer (Better Auth has been removed). `@/lib/prisma-types` is the
// compatibility shim that mirrors the Django auth payload keys.
import type { User, Profile, Service, Review } from '@/lib/prisma-types';

/**
 * Profile JSON field types for better type safety
 */
export interface ProfileVisibility {
  email: boolean;
  phone: boolean;
  address: boolean;
}

/**
 * Authenticated user as returned by the Django `/auth/session` + `/auth/me`
 * endpoints. Matches the `User` shape in `@/lib/prisma-types`.
 */
export type AuthUser = User;

/**
 * Session metadata returned alongside the user by the Django auth endpoints.
 * The wire shape (see `SessionResponse` in `@/lib/api/auth`) only carries an
 * optional session id; cookies/JWTs live in httpOnly storage.
 */
export interface AuthSession {
  id?: string;
}

/**
 * Type definitions
 */
export type UserRole = 'user' | 'freelancer' | 'company' | 'admin' | 'support' | 'editor';
export type AuthStep =
  | 'EMAIL_VERIFICATION'
  | 'OAUTH_SETUP'
  | 'ONBOARDING'
  | 'DASHBOARD';
export type AuthProvider = 'email' | 'google' | 'github'; // Add more providers as needed

// Auth form UI types
export type AuthType = '' | 'user' | 'pro'; // '' = no selection, 'user' = simple user, 'pro' = professional
export type FormAuthType = Exclude<AuthType, ''>; // For form validation - excludes empty selection state
export type ProRole = 'freelancer' | 'company' | null; // freelancer, company, null = not selected
export type ConsentType = boolean | string[];

/**
 * Profile with optional relations for auth context
 */
export type ProfileWithRelations = Profile & {
  services?: Service[];
  reviews?: Review[];
  portfolio?: AppJson.CloudinaryResource[];
};

/**
 * Admin user table type
 * Mirrors the Django `User` serializer payload (see `@/lib/prisma-types`).
 */
export type AdminUserForTable = User;

/**
 * Admin profile table type with relations.
 *
 * Matches the Django admin profile-detail payload: a `Profile` plus the
 * embedded `user` selection, the verification snapshot, and the aggregate
 * `_count` of related services/reviews.
 */
export type AdminProfileWithRelations = Profile & {
  user: Pick<User, 'id' | 'email' | 'role' | 'banned' | 'blocked' | 'name'>;
  verification: unknown;
  _count: {
    services: number;
    reviews: number;
  };
} & {
  taxonomyLabels?: {
    category: string;
    subcategory: string;
  };
};
