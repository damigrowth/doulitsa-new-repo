import * as React from 'react';
import { AppSidebar } from './app-sidebar';
import { getFilteredNavItems } from '@/actions/admin/helpers';

interface AppSidebarWrapperProps {
  variant?: 'sidebar' | 'floating' | 'inset';
  side?: 'left' | 'right';
  collapsible?: 'offcanvas' | 'icon' | 'none';
}

/**
 * Server component wrapper for AppSidebar
 * Fetches filtered navigation items based on user role
 */
export async function AppSidebarWrapper(props: AppSidebarWrapperProps) {
  const { navItems } = await getFilteredNavItems();

  return <AppSidebar navItems={navItems} {...props} />;
}
