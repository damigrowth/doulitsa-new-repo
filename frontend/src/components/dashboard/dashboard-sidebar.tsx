'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Home,
  User,
  Briefcase,
  MessageSquare,
  Heart,
  Star,
  CreditCard,
  Plus,
  Settings,
  LifeBuoy,
  Send,
  UserCircle,
  Shield,
  Receipt,
  Building,
  Package,
  Info,
  Presentation,
  Globe,
  Crown,
  Rocket,
  LayoutDashboard,
  ChevronRight,
} from 'lucide-react';

import { NavMain } from './dashboard-nav-main';
import { NavUser } from './dashboard-nav-user';
import { NavServices } from './dashboard-nav-services';
import { SupportFeedbackDialog } from './support-feedback-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { NextLink } from '@/components';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/lib/auth/client';
import { capitalizeFirstLetter } from '@/lib/utils/validation';
import { useUnreadCount } from '@/lib/hooks/use-unread-count';
import { usePaymentsAccess } from '@/lib/hooks/use-payments-access';
import { usePathname } from 'next/navigation';

export default function DashboardSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const { unreadCount } = useUnreadCount();
  const { allowed: canAccessPayments, isLoading: isLoadingAccess } = usePaymentsAccess();
  const pathname = usePathname();

  // Use Better Auth session data
  const user = session?.user;
  const isProfessional =
    user?.role === 'freelancer' ||
    user?.role === 'company' ||
    user?.role === 'admin';

  // Don't show badge when on messages routes
  const isOnMessagesRoute = pathname.startsWith('/dashboard/messages');
  const showBadge = !isOnMessagesRoute && unreadCount > 0;

  // Group 1: Main Navigation (always visible)
  const navMain = [
    {
      title: 'Πίνακας Ελέγχου',
      url: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Μηνύματα',
      url: '/dashboard/messages',
      icon: MessageSquare,
      badge: showBadge ? (
        <Badge
          variant='destructive'
          className='h-4 min-w-4 flex items-center justify-center px-1 text-[10px] font-semibold rounded-full'
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      ) : undefined,
    },
    {
      title: 'Αποθηκευμένα',
      url: '/dashboard/saved',
      icon: Heart,
    },
    {
      title: 'Αξιολογήσεις',
      url: '/dashboard/reviews',
      icon: Star,
    },
  ];

  // Group 2: Services (professionals only) - now handled by NavServices component

  const userData = {
    name: isProfessional
      ? user?.displayName
      : capitalizeFirstLetter(user?.displayName || user?.name || user?.email || 'User'),
    email: user?.email || '',
    avatar: user?.image || '',
  };

  return (
    <Sidebar variant='inset' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild>
              <a href='/'>
                <div className='flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg'>
                  <Image
                    src='/doulitsa-icon.png'
                    alt='Doulitsa'
                    width={120}
                    height={120}
                    className='size-full object-cover'
                  />
                </div>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>Doulitsa</span>
                  <span className='truncate text-xs flex items-center gap-1'>
                    <Home className='size-3' />
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Group 1: Main Navigation */}
        <NavMain items={navMain} />

        {/* Group 2: Services (if professional) */}
        {isProfessional && (
          <SidebarGroup>
            <SidebarGroupLabel className='uppercase'>Υπηρεσίες</SidebarGroupLabel>
            <NavServices />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip='Προσθήκη Υπηρεσίας'
                  isActive={pathname === '/dashboard/services/create'}
                >
                  <NextLink href='/dashboard/services/create'>
                    <Plus />
                    <span>Προσθήκη Υπηρεσίας</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Subscription (if professional and has payment access) */}
        {isProfessional && !isLoadingAccess && canAccessPayments && (
          <SidebarGroup>
            <SidebarGroupLabel className='uppercase'>Πακέτο Προβολής</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip='Προώθηση'
                  isActive={pathname.startsWith('/dashboard/promote') || pathname.startsWith('/dashboard/checkout')}
                >
                  <NextLink href='/dashboard/promote'>
                    <Rocket />
                    <span>Προώθηση</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Group 3: Account Management */}
        <SidebarGroup>
          <SidebarGroupLabel className='uppercase'>Λογαριασμός</SidebarGroupLabel>
          <SidebarMenu>
            <Collapsible asChild defaultOpen={pathname.startsWith('/dashboard/profile')}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip='Διαχείριση'
                  isActive={pathname.startsWith('/dashboard/profile')}
                >
                  <NextLink href='/dashboard/profile/account'>
                    <Settings />
                    <span>Διαχείριση</span>
                  </NextLink>
                </SidebarMenuButton>
                {user?.type === 'pro' && (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className='data-[state=open]:rotate-90'>
                        <ChevronRight />
                        <span className='sr-only'>Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/dashboard/profile/account'}>
                            <NextLink href='/dashboard/profile/account'>
                              <span>Λογαριασμός</span>
                            </NextLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/dashboard/profile/basic'}>
                            <NextLink href='/dashboard/profile/basic'>
                              <span>Βασικά στοιχεία</span>
                            </NextLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/dashboard/profile/coverage'}>
                            <NextLink href='/dashboard/profile/coverage'>
                              <span>Τρόποι Παροχής</span>
                            </NextLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/dashboard/profile/contact-details'}>
                            <NextLink href='/dashboard/profile/contact-details'>
                              <span>Επικοινωνία</span>
                            </NextLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/dashboard/profile/additional'}>
                            <NextLink href='/dashboard/profile/additional'>
                              <span>Πρόσθετα Στοιχεία</span>
                            </NextLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/dashboard/profile/verification'}>
                            <NextLink href='/dashboard/profile/verification'>
                              <span>Πιστοποίηση</span>
                            </NextLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                )}
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>

        {/* Secondary Navigation - Support/Feedback */}
        <div className='mt-auto px-2'>
          <SupportFeedbackDialog />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}
