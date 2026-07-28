'use client';

import { authClient } from '@/lib/auth/client';
import { AuthUser, AuthSession } from '@/lib/types/auth';
import { Profile } from '@/lib/prisma-types';

// ============================================================================
// SESSION MANAGEMENT (CLIENT SIDE)
// ============================================================================

/**
 * Get the current user session from Better Auth (client side)
 * @returns {Promise<{user: AuthUser | null; session: AuthSession | null}>}
 */
export async function getSession() {
  try {
    const session = await authClient.getSession();
    return {
      user: session.data?.user || null,
      session: session.data || null,
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return {
      user: null,
      session: null,
    };
  }
}

/**
 * Get the current user from Better Auth (client side)
 * @returns {Promise<AuthUser | null>}
 */
export async function getCurrentUser() {
  try {
    const { user } = await getSession();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Validate current session and return it (client side)
 * @returns {Promise<{user: AuthUser | null; session: AuthSession | null}>}
 */
export async function validateSession() {
  try {
    const sessionData = await getSession();
    if (!sessionData.session || !sessionData.user) {
      return {
        user: null,
        session: null,
      };
    }
    return sessionData;
  } catch (error) {
    console.error('Error validating session:', error);
    return {
      user: null,
      session: null,
    };
  }
}

// ============================================================================
// PERMISSION CHECKS (CLIENT SIDE - boolean returns)
// ============================================================================

/**
 * Check if user is authenticated (client side)
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  try {
    const user = await getCurrentUser();
    return !!user;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Check if user has specific role(s) (client side)
 * @param {string|string[]} roles - Roles to check
 * @returns {Promise<boolean>}
 */
export async function hasRole(roles: string | string[]) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.role) return false;

    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
}

/**
 * Check if user has access based on role (client side)
 * @param {string|string[]} roles - Roles to check
 * @returns {Promise<boolean>}
 */
export async function hasAccess(roles: string | string[]) {
  return await hasRole(roles);
}

/**
 * Check if user needs email verification (client side)
 * @returns {Promise<boolean>}
 */
export async function needsEmailVerification() {
  try {
    const user = await getCurrentUser();
    return user ? !user.emailVerified : false;
  } catch (error) {
    console.error('Error checking email verification status:', error);
    return false;
  }
}

/**
 * Check if user needs onboarding (client side)
 * Only professional users (freelancer/company) need onboarding
 * @returns {Promise<boolean>}
 */
export async function needsOnboarding() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.role || !user.step) return false;
    
    // Admin and simple users never need onboarding
    if (user.role === 'admin' || user.role === 'user') {
      return false;
    }
    
    // Only professional users with ONBOARDING step need onboarding
    return user.step === 'ONBOARDING' && 
           (user.role === 'freelancer' || user.role === 'company');
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Check if user can access dashboard (client side)
 * @returns {Promise<boolean>}
 */
export async function canAccessDashboard() {
  try {
    const user = await getCurrentUser();
    return user
      ? user.emailVerified &&
          (user.confirmed ?? false) &&
          user.step === 'DASHBOARD' &&
          !(user.blocked ?? false)
      : false;
  } catch (error) {
    console.error('Error checking dashboard access:', error);
    return false;
  }
}

// ============================================================================
// ROLE-BASED PERMISSIONS (CLIENT SIDE)
// ============================================================================

/**
 * Check if user is admin (client side)
 * @returns {Promise<boolean>}
 */
export async function isAdmin() {
  return await hasRole('admin');
}

/**
 * Check if user is professional (freelancer or company) (client side)
 * @returns {Promise<boolean>}
 */
export async function isProfessional() {
  return await hasRole(['freelancer', 'company']);
}

/**
 * Check if user can create profile (client side)
 * @returns {Promise<boolean>}
 */
export async function canCreateProfile() {
  return await hasRole(['freelancer', 'company', 'admin']);
}

/**
 * Check if user can create services (client side)
 * @returns {Promise<boolean>}
 */
export async function canCreateServices() {
  return await hasRole(['freelancer', 'admin']);
}

// ============================================================================
// USER ROLE HELPERS (CLIENT SIDE)
// ============================================================================

/**
 * Get user role information (client side)
 * @returns {Promise<Object|null>} Role information object
 */
export async function getUserRole() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.role) return null;

    return {
      isSimpleUser: user.role === 'user',
      isFreelancer: user.role === 'freelancer',
      isCompany: user.role === 'company',
      isAdmin: user.role === 'admin',
      isProfessional: user.role === 'freelancer' || user.role === 'company',
    };
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Get user type helpers (backward compatibility) (client side)
 * @returns {Promise<Object|null>}
 */
export async function getUserType() {
  return await getUserRole();
}

// ============================================================================
// CHECK AUTH (CLIENT SIDE)
// ============================================================================

/**
 * Check if user is authenticated and return user/session data (client side)
 */
export async function checkAuth() {
  try {
    const sessionData = await getSession();
    return {
      success: true,
      data: sessionData,
    };
  } catch (error) {
    console.error('Check auth error:', error);
    return {
      success: false,
      error: 'Authentication check failed',
    };
  }
}

/**
 * Get current session (client side)
 */
export async function getCurrentSession() {
  try {
    const { session } = await getSession();
    return {
      success: true,
      data: session,
    };
  } catch (error) {
    console.error('Get current session error:', error);
    return {
      success: false,
      error: 'Failed to get current session',
    };
  }
}

/**
 * Check if user has any of the specified roles (client side)
 */
export async function hasAnyRole(roles: string[]) {
  try {
    const user = await getCurrentUser();
    const userRole = user?.role || 'user';

    return {
      success: true,
      data: roles.includes(userRole),
    };
  } catch (error) {
    console.error('Check roles error:', error);
    return {
      success: false,
      error: 'Failed to check user roles',
    };
  }
}