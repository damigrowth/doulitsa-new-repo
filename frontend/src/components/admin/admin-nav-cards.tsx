import {
  BriefcaseIcon,
  CheckCircleIcon,
  UserCheckIcon,
  UsersIcon,
  TagsIcon,
  BarChartIcon,
  ShieldIcon,
  MessageSquareIcon,
  ArrowRightIcon,
  type LucideIcon,
} from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { NextLink } from '@/components';
import { getFilteredNavItems } from '@/actions/admin/helpers';

// Icon mapping for navigation items
const iconMap: Record<string, LucideIcon> = {
  '/admin/services': BriefcaseIcon,
  '/admin/verifications': CheckCircleIcon,
  '/admin/profiles': UserCheckIcon,
  '/admin/users': UsersIcon,
  '/admin/team': ShieldIcon,
  '/admin/taxonomies': TagsIcon,
  '/admin/chats': MessageSquareIcon,
  '/admin/analytics': BarChartIcon,
};

export async function AdminNavCards() {
  const { navItems } = await getFilteredNavItems();

  // Filter out dashboard itself, only show other resources for quick access
  const quickAccessItems = navItems.filter(item => item.url !== '/admin');

  return (
    <div className='px-4 lg:px-6'>
      <div className='mb-4'>
        <h2 className='text-lg font-semibold'>Γρήγορη Πρόσβαση</h2>
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
        {quickAccessItems.map((item) => {
          const Icon = iconMap[item.url] || BriefcaseIcon;
          return (
            <NextLink key={item.url} href={item.url}>
              <Card className='group transition-all hover:border-primary hover:shadow-md'>
                <CardHeader>
                  <div className='flex items-start justify-between'>
                    <Icon className='h-8 w-8 text-primary' />
                    <ArrowRightIcon className='h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100' />
                  </div>
                  <CardTitle className='mt-4'>{item.title}</CardTitle>
                </CardHeader>
              </Card>
            </NextLink>
          );
        })}
      </div>
    </div>
  );
}
