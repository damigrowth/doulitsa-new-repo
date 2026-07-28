'use server';

/**
 * Admin action helpers — Django-backed.
 *
 * `getAdminSession` and `getAdminSessionWithPermission` redirect to /login or
 * /admin if the caller isn't an admin / lacks the required permission. They
 * exist for backward compat — every per-resource Django view already enforces
 * its own permission, so the redirect-only role here is informational.
 */

import { redirect } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

import { getSession, requireEditPermission, requireFullPermission, requirePermission } from '@/actions/auth/server';
import { ADMIN_RESOURCES, hasAccess, isAdminRole } from '@/lib/auth/roles';

export async function getAdminSession() {
  const result = await getSession();
  if (!result.success || !result.data?.user) {
    redirect('/login');
  }
  if (!isAdminRole(result.data.user.role)) {
    redirect('/admin');
  }
  return { user: result.data.user, session: result.data.session };
}

export async function getAdminSessionWithPermission(
  resource: string,
  level: 'view' | 'edit' | 'full' = 'view',
) {
  const result = await getSession();
  if (!result.success || !result.data?.user) {
    redirect('/login');
  }
  if (level === 'full') {
    await requireFullPermission(resource, '/admin');
  } else if (level === 'edit') {
    await requireEditPermission(resource, '/admin');
  } else {
    await requirePermission(resource, '/admin');
  }
  return { user: result.data.user, session: result.data.session };
}

// =============================================
// ADMIN NAVIGATION FILTERING
// =============================================

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  resource?: string;
  items?: NavItem[];
}

const navSessionCache = new Map<
  string,
  { data: { navItems: NavItem[]; userRole: string | null }; timestamp: number }
>();
const NAV_SESSION_CACHE_TTL = 60_000;

export async function getFilteredNavItems(): Promise<{
  navItems: NavItem[];
  userRole: string | null;
}> {
  try {
    const sessionResult = await getSession({ revalidate: true });
    if (!sessionResult.success || !sessionResult.data?.user) {
      return { navItems: [], userRole: null };
    }

    const userId = sessionResult.data.user.id;
    const userRole = sessionResult.data.user.role || null;

    const cacheKey = `nav-items-${userId}`;
    const cached = navSessionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < NAV_SESSION_CACHE_TTL) {
      return cached.data;
    }

    if (!userRole || !isAdminRole(userRole)) {
      return { navItems: [], userRole };
    }

    const allNavItems: (NavItem & { resource: string })[] = [
      { title: 'Dashboard', url: '/admin', resource: ADMIN_RESOURCES.DASHBOARD },
      { title: 'Services', url: '/admin/services', resource: ADMIN_RESOURCES.SERVICES },
      { title: 'Verifications', url: '/admin/verifications', resource: ADMIN_RESOURCES.VERIFICATIONS },
      { title: 'Profiles', url: '/admin/profiles', resource: ADMIN_RESOURCES.PROFILES },
      { title: 'Users', url: '/admin/users', resource: ADMIN_RESOURCES.USERS },
      { title: 'Team', url: '/admin/team', resource: ADMIN_RESOURCES.TEAM },
      { title: 'Taxonomies', url: '/admin/taxonomies', resource: ADMIN_RESOURCES.TAXONOMIES },
      { title: 'Chats', url: '/admin/chats', resource: ADMIN_RESOURCES.CHATS },
      { title: 'Reviews', url: '/admin/reviews', resource: ADMIN_RESOURCES.REVIEWS },
      { title: 'Subscriptions', url: '/admin/subscriptions', resource: ADMIN_RESOURCES.SUBSCRIPTIONS },
      { title: 'Articles', url: '/admin/articles', resource: ADMIN_RESOURCES.BLOG },
      { title: 'Analytics', url: '/admin/analytics', resource: ADMIN_RESOURCES.ANALYTICS },
    ];

    const filteredItems = allNavItems.filter((item) =>
      hasAccess(userRole, item.resource as Parameters<typeof hasAccess>[1]),
    );
    const navItems = filteredItems.map(({ resource: _r, ...item }) => item);

    const result = { navItems, userRole };
    navSessionCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch {
    return { navItems: [], userRole: null };
  }
}
