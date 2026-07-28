'use client';

import * as React from 'react';
import {
  ArrowUpCircleIcon,
  BarChartIcon,
  CheckCircleIcon,
  LayoutDashboardIcon,
  BriefcaseIcon,
  UsersIcon,
  UserCheckIcon,
  TagsIcon,
  MessageSquareIcon,
  StarIcon,
  CreditCardIcon,
  FileTextIcon,
  ShieldIcon,
  type LucideIcon,
} from 'lucide-react';

import { NextLink } from '@/components';
import { NavMain } from '@/components/admin/nav-main';
import { NavUser } from '@/components/admin/nav-user';
import type { NavItem } from '@/actions/admin/helpers';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

// Icon mapping for navigation items
const iconMap: Record<string, LucideIcon> = {
  '/admin': LayoutDashboardIcon,
  '/admin/services': BriefcaseIcon,
  '/admin/verifications': CheckCircleIcon,
  '/admin/profiles': UserCheckIcon,
  '/admin/users': UsersIcon,
  '/admin/team': ShieldIcon,
  '/admin/taxonomies': TagsIcon,
  '/admin/chats': MessageSquareIcon,
  '/admin/reviews': StarIcon,
  '/admin/subscriptions': CreditCardIcon,
  '/admin/articles': FileTextIcon,
  '/admin/analytics': BarChartIcon,
};

// Taxonomy subitems structure
const taxonomySubitems = [
  {
    title: 'Service',
    url: '/admin/taxonomies/service',
    items: [
      {
        title: 'Overview',
        url: '/admin/taxonomies/service',
      },
      {
        title: 'Categories',
        url: '/admin/taxonomies/service/categories',
      },
      {
        title: 'Subcategories',
        url: '/admin/taxonomies/service/subcategories',
      },
      {
        title: 'Subdivisions',
        url: '/admin/taxonomies/service/subdivisions',
      },
    ],
  },
  {
    title: 'Pro',
    url: '/admin/taxonomies/pro',
    items: [
      {
        title: 'Overview',
        url: '/admin/taxonomies/pro',
      },
      {
        title: 'Categories',
        url: '/admin/taxonomies/pro/categories',
      },
      {
        title: 'Subcategories',
        url: '/admin/taxonomies/pro/subcategories',
      },
    ],
  },
  {
    title: 'Skills',
    url: '/admin/taxonomies/skills',
  },
  {
    title: 'Tags',
    url: '/admin/taxonomies/tags',
  },
  {
    title: 'Submissions',
    url: '/admin/taxonomies/submissions',
  },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navItems: NavItem[];
}

export function AppSidebar({ navItems, ...props }: AppSidebarProps) {
  // Fallback user data (nav-user.tsx fetches real session data)
  const user = {
    name: 'Admin',
    email: 'admin@doulitsa.com',
    avatar: '/avatars/admin.jpg',
  };

  // Map nav items with icons and subitems
  const navMainWithIcons = navItems.map((item) => ({
    ...item,
    icon: iconMap[item.url],
    // Add taxonomy subitems if this is the taxonomies page
    items: item.url === '/admin/taxonomies' ? taxonomySubitems : undefined,
  }));

  return (
    <Sidebar collapsible='offcanvas' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className='data-[slot=sidebar-menu-button]:!p-1.5'
            >
              <NextLink href='/admin'>
                <ArrowUpCircleIcon className='h-5 w-5' />
                <span className='text-base font-semibold'>Doulitsa Admin</span>
              </NextLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainWithIcons} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
