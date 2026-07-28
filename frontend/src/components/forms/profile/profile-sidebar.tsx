'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  Settings,
  User,
  Info,
  Phone,
  Shield,
  UserCircle,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { NextLink } from '@/components';

const profileMenuItems = [
  {
    title: 'Λογαριασμός',
    url: '/dashboard/profile/account',
    icon: UserCircle,
  },
  {
    title: 'Βασικά στοιχεία',
    url: '/dashboard/profile/basic',
    icon: User,
  },
  {
    title: 'Τρόποι Παροχής',
    url: '/dashboard/profile/coverage',
    icon: Globe,
  },
  {
    title: 'Επικοινωνία',
    url: '/dashboard/profile/contact-details',
    icon: Phone,
  },
  {
    title: 'Πρόσθετα Στοιχεία',
    url: '/dashboard/profile/additional',
    icon: Info,
  },
  {
    title: 'Πιστοποίηση',
    url: '/dashboard/profile/verification',
    icon: Shield,
  },
];

export default function ProfileSidebar({
  userType = 'user',
}: {
  userType?: string;
}) {
  const pathname = usePathname();

  // Filter menu items based on user type
  const visibleItems =
    userType === 'pro'
      ? profileMenuItems
      : profileMenuItems.filter(
          (item) => item.url === '/dashboard/profile/account',
        );

  return (
    <div className='bg-silver border-b'>
      <div className='relative overflow-x-clip lg:overflow-x-visible'>
        <ScrollArea className='w-full'>
          <nav className='flex items-center gap-2 px-6 py-4'>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.url;

              return (
                <NextLink
                  key={item.url}
                  href={item.url}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors whitespace-nowrap border',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'text-muted-foreground bg-white hover:bg-accent hover:text-accent-foreground border-border',
                  )}
                >
                  <Icon className='h-4 w-4' />
                  {item.title}
                </NextLink>
              );
            })}
          </nav>
          <ScrollBar orientation='horizontal' />
        </ScrollArea>

        {/* Fade out gradient on the right - only visible on mobile/tablet */}
        <div className='absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-card via-card/60 to-transparent pointer-events-none lg:hidden' />
      </div>
    </div>
  );
}
