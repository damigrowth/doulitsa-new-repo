'use server';

/**
 * Server-side auth helpers — Django-backed.
 *
 * The original Better Auth implementation has been replaced. Every exported
 * function in this file delegates to the Django REST endpoints
 * (`/api/auth/*`, `/api/profiles/me`) via `@/lib/api`. The function
 * signatures match the original so call sites don't need changes.
 *
 * Helpers fall into three groups:
 *   1. Session readers   — getSession / getCurrentUser / getCurrentSession
 *   2. Role guards       — hasRole / isAdmin / isProfessional / isProUser
 *   3. Redirect guards   — requireAuth / requireRole / requireAdmin /
 *                          requireOnboardingComplete / etc.
 */

import { redirect } from 'next/navigation';

import * as authApi from '@/lib/api/auth';
import * as profilesApi from '@/lib/api/profiles';
import { ApiError } from '@/lib/api/client';
import {
  ROLE_PERMISSIONS,
  isAdminRole,
  type AdminResource,
  type AdminRole,
} from '@/lib/auth/roles';
import type { ActionResult } from '@/lib/types/api';
import type { AuthSession, AuthUser } from '@/lib/types/auth';
import type { Profile, UserRole } from '@/lib/prisma-types';

// ---------------------------------------------------------------------------
// Session readers
// ---------------------------------------------------------------------------

export async function getSession(
  _options: { revalidate?: boolean } = {},
): Promise<ActionResult<{ user: AuthUser | null; session: AuthSession | null }>> {
  try {
    const res = await authApi.getSession();
    return {
      success: true,
      data: {
        user: (res.user as AuthUser | null) ?? null,
        session: (res.session as unknown as AuthSession | null) ?? null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof ApiError ? err.message : 'Failed to get session',
    };
  }
}

/**
 * For recently registered users (< 10 min) we always re-fetch — those flows
 * (verification, onboarding) need fresh state. Older users get a cached read
 * (the Django side caches its session response itself).
 */
export async function getFreshServerSession(): Promise<
  ActionResult<{ user: AuthUser | null; session: AuthSession | null }>
> {
  return getSession({ revalidate: true });
}

export async function getCurrentSession(): Promise<ActionResult<AuthSession | null>> {
  const result = await getSession();
  if (!result.success) return result as ActionResult<AuthSession | null>;
  return { success: true, data: result.data.session };
}

export async function getCurrentUser(): Promise<
  ActionResult<{ user: AuthUser | null; profile: Profile | null; session: AuthSession | null }>
> {
  const result = await getSession();
  if (!result.success) {
    return { success: false, error: result.error };
  }
  if (!result.data.user) {
    return { success: true, data: { user: null, profile: null, session: null } };
  }
  let profile: Profile | null = null;
  try {
    profile = (await profilesApi.getMyProfile()) as Profile;
  } catch {
    profile = null;
  }
  return {
    success: true,
    data: { user: result.data.user, profile, session: result.data.session },
  };
}

// ---------------------------------------------------------------------------
// Role checks (return ActionResult<boolean>)
// ---------------------------------------------------------------------------

async function _user(): Promise<AuthUser | null> {
  const result = await getSession();
  return result.success ? result.data.user : null;
}

export async function hasRole(role: UserRole): Promise<ActionResult<boolean>> {
  const user = await _user();
  return { success: true, data: user?.role === role };
}

export async function hasAnyRole(roles: UserRole[]): Promise<ActionResult<boolean>> {
  const user = await _user();
  return { success: true, data: !!user && roles.includes(user.role as UserRole) };
}

export async function isAdmin(): Promise<ActionResult<boolean>> {
  return hasRole('admin' as UserRole);
}

export async function isProfessional(): Promise<ActionResult<boolean>> {
  return hasAnyRole(['freelancer', 'company'] as UserRole[]);
}

export async function isProUser(): Promise<boolean> {
  const user = await _user();
  return user?.type === 'pro';
}

export async function hasAdminRole(): Promise<boolean> {
  const user = await _user();
  return !!user && isAdminRole(user.role);
}

// ---------------------------------------------------------------------------
// Redirect guards (used by Server Components / pages)
// ---------------------------------------------------------------------------

export async function requireAuth(redirectTo = '/login'): Promise<AuthSession> {
  const result = await getSession();
  if (!result.success || !result.data.user) {
    redirect(redirectTo);
  }
  return result.data.session as AuthSession;
}

export async function requireRole(role: UserRole, redirectTo = '/'): Promise<AuthUser> {
  const result = await getSession();
  if (!result.success || !result.data.user || result.data.user.role !== role) {
    redirect(redirectTo);
  }
  return result.data.user;
}

export async function requireAdmin(redirectTo = '/'): Promise<AuthUser> {
  return requireRole('admin' as UserRole, redirectTo);
}

export async function requireAnyRole(roles: UserRole[], redirectTo = '/'): Promise<AuthUser> {
  const result = await getSession();
  if (!result.success || !result.data.user || !roles.includes(result.data.user.role as UserRole)) {
    redirect(redirectTo);
  }
  return result.data.user;
}

export async function requireOnboardingComplete(onboardingUrl = '/onboarding'): Promise<AuthSession> {
  const result = await getSession();
  if (!result.success || !result.data.user) {
    redirect('/login');
  }
  if (result.data.user.step === 'ONBOARDING') {
    redirect(onboardingUrl);
  }
  return result.data.session as AuthSession;
}

export async function requireRoleRedirect(
  allowedRoles: string | string[],
  redirectTo = '/',
): Promise<AuthSession> {
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const result = await getSession();
  if (!result.success || !result.data.user || !allowed.includes(result.data.user.role)) {
    redirect(redirectTo);
  }
  return result.data.session as AuthSession;
}

export async function requireEmailVerified(verificationUrl = '/register/success'): Promise<AuthSession> {
  const result = await getSession();
  if (!result.success || !result.data.user) {
    redirect('/login');
  }
  if (!result.data.user.emailVerified) {
    redirect(verificationUrl);
  }
  return result.data.session as AuthSession;
}

export async function requireProfileComplete(profileUrl = '/dashboard/profile/basic'): Promise<AuthSession> {
  const result = await getSession();
  if (!result.success || !result.data.user) {
    redirect('/login');
  }
  if (!result.data.user.confirmed) {
    redirect(profileUrl);
  }
  return result.data.session as AuthSession;
}

export async function redirectOnboardingUsers(
  onboardingUrl = '/onboarding',
): Promise<AuthSession | null> {
  const result = await getSession();
  if (result.success && result.data.user) {
    const user = result.data.user;
    if (user.step === 'ONBOARDING' && (user.role === 'freelancer' || user.role === 'company')) {
      redirect(onboardingUrl);
    }
  }
  return result.success ? (result.data.session as AuthSession) : null;
}

export async function redirectCompletedUsers(dashboardUrl = '/dashboard'): Promise<AuthSession | null> {
  const result = await getSession();
  if (result.success && result.data.user) {
    const user = result.data.user;
    if (isAdminRole(user.role)) {
      redirect('/admin');
    }
    if (user.step === 'DASHBOARD') {
      redirect(dashboardUrl);
    }
  }
  return result.success ? (result.data.session as AuthSession) : null;
}

export async function redirectOAuthUsersToSetup(): Promise<AuthSession | null> {
  const result = await getSession();
  if (result.success && result.data.user) {
    const step = result.data.user.step;
    if (step === 'TYPE_SELECTION' || step === 'OAUTH_SETUP') {
      redirect('/oauth-setup');
    }
  }
  return result.success ? (result.data.session as AuthSession) : null;
}

export async function requireProUser(
  redirectTo = '/dashboard/profile/account',
): Promise<{ user: AuthUser; profile: Profile | null; session: AuthSession }> {
  const current = await getCurrentUser();
  if (!current.success || !current.data?.user) {
    redirect('/login');
  }
  if (current.data!.user!.type !== 'pro') {
    redirect(redirectTo);
  }
  return current.data as { user: AuthUser; profile: Profile | null; session: AuthSession };
}

// ---------------------------------------------------------------------------
// Resource permissions (admin / support / editor matrix)
// ---------------------------------------------------------------------------

function _level(user: AuthUser | null, resource: AdminResource): 'full' | 'edit' | 'view' | null {
  if (!user || !isAdminRole(user.role)) return null;
  return ROLE_PERMISSIONS[user.role as AdminRole][resource];
}

export async function hasPermission(resource: string): Promise<boolean> {
  const user = await _user();
  return _level(user, resource as AdminResource) !== null;
}

export async function canEditResource(resource: string): Promise<boolean> {
  const user = await _user();
  const level = _level(user, resource as AdminResource);
  return level === 'edit' || level === 'full';
}

export async function hasFullPermission(resource: string): Promise<boolean> {
  const user = await _user();
  return _level(user, resource as AdminResource) === 'full';
}

export async function requirePermission(resource: string, redirectTo = '/admin'): Promise<void> {
  if (!(await hasPermission(resource))) redirect(redirectTo);
}

export async function requireEditPermission(resource: string, redirectTo = '/admin'): Promise<void> {
  if (!(await canEditResource(resource))) redirect(redirectTo);
}

export async function requireFullPermission(resource: string, redirectTo = '/admin'): Promise<void> {
  if (!(await hasFullPermission(resource))) redirect(redirectTo);
}

// ---------------------------------------------------------------------------
// Admin navigation
// ---------------------------------------------------------------------------

export async function getAdminNavigationItems(): Promise<string[]> {
  try {
    const { adminApi } = await import('@/lib/api/admin');
    const res = await adminApi.navigation();
    return res.items.map((item) => item.href);
  } catch {
    return [];
  }
}

export async function canViewNavItem(navUrl: string): Promise<boolean> {
  const items = await getAdminNavigationItems();
  return items.includes(navUrl);
}
