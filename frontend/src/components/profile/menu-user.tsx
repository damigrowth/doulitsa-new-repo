'use client';

import React, { useState, useEffect } from 'react';
import NextLink from '@/components/shared/next-link';
import { useRouter, usePathname } from 'next/navigation';

import {
  hasAccessUserMenuNav,
  noAccessUserMenuNav,
} from '@/constants/datasets/dashboard';

import { signOut } from '@/lib/auth/client';
import { UserMenuProps, MenuItem } from '@/types/components';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Lucide icons for menu items
import {
  User,
  LayoutDashboard,
  MessageSquare,
  Heart,
  Star,
  FileText,
  Plus,
  Settings,
  LogOut,
  ExternalLink,
  Rocket,
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { MessagesMenu, SavedMenu } from '../dashboard';
import UserAvatar from '@/components/shared/user-avatar';
import { useSession } from '@/lib/auth/client';
import { capitalizeFirstLetter } from '@/lib/utils/validation';

// Icon mapping function
const getMenuIcon = (iconName: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'flaticon-website': <User className='w-4 h-4' />,
    'flaticon-menu': <LayoutDashboard className='w-4 h-4' />,
    'flaticon-mail': <MessageSquare className='w-4 h-4' />,
    'flaticon-like': <Heart className='w-4 h-4' />,
    'flaticon-star': <Star className='w-4 h-4' />,
    'flaticon-document': <FileText className='w-4 h-4' />,
    'flaticon-button': <Plus className='w-4 h-4' />,
    'flaticon-photo': <Settings className='w-4 h-4' />,
    'flaticon-crown': <Rocket className='w-4 h-4' />,
    'flaticon-logout': <LogOut className='w-4 h-4' />,
  };
  return iconMap[iconName] || <User className='w-4 h-4' />;
};

export default function UserMenu({ isMobile }: UserMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending, refetch } = useSession();
  const [isHydrated, setIsHydrated] = useState(false);

  // Prevent hydration mismatch by only rendering after client-side hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Force refresh session when on OAuth setup or onboarding pages
  // This ensures the menu always has the latest session step value.
  // NOTE: `refetch` is intentionally OUT of the deps — useSession recreates it
  // on every render, so including it makes this effect re-fire every render
  // (refetch → setState → re-render → new refetch → …), flooding getSession
  // with POSTs and freezing /onboarding. Depend only on pathname so it runs
  // once per navigation.
  useEffect(() => {
    if (pathname === '/oauth-setup' || pathname === '/onboarding') {
      // Refresh session to ensure we have the latest step value
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Use Better Auth session data
  const user = session?.user;
  // TODO: Check if user authentication correctly sets and update the image when onboarding and signing up and that the image is synced correctly (cache synced) -

  // console.log('MENU USER - BETTER AUTH SESSION', session);
  // console.log('MENU USER - BETTER AUTH USER', user);

  const isAuthenticated = !!user;
  // const isConfirmed = user?.emailVerified || false;
  // const needsEmailVerification = user && !user.emailVerified;
  const needsOAuth = user?.step === 'OAUTH_SETUP';
  const needsOnboarding = user?.step === 'ONBOARDING';
  const hasAccess = user?.step === 'DASHBOARD' || user?.role === 'admin';
  const isProfessional =
    user?.role === 'freelancer' || user?.role === 'company';
  const isProfessionalType = user?.type === 'pro';
  const hasProfile =
    (isProfessional || isProfessionalType) && user?.step === 'DASHBOARD';

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      window.location.href = '/';
    }
  };

  // Show loading state during hydration or while session is pending.
  // The desktop skeleton mirrors the authenticated layout's footprint
  // (saved icon + messages icon + avatar) so the header search bar does
  // not shift horizontally once the user menu finishes loading.
  if (!isHydrated || isPending) {
    return !isMobile ? (
      <div className='flex items-center space-x-4'>
        <Skeleton className='hidden sm:block w-5 h-5 rounded-full' />
        <Skeleton className='hidden sm:block w-5 h-5 rounded-full' />
        <Skeleton className='w-[30px] h-[30px] rounded-full' />
      </div>
    ) : (
      <div className='w-5 h-5 bg-black/10 rounded-xl' />
    );
  }

  // Authenticated user - simplified condition to prevent hydration issues
  if (isAuthenticated) {
    let modifiedNav: MenuItem[] = [];

    if (needsOnboarding || needsOAuth) {
      // Show appropriate completion link based on user state
      let completionPath = '/onboarding';

      if (needsOAuth) {
        // OAuth users go to oauth-setup page (they'll choose their type there)
        completionPath = '/oauth-setup';
      }

      modifiedNav = [
        {
          id: 89,
          name: 'Ολοκλήρωση Εγγραφής',
          path: completionPath,
          icon: 'flaticon-document',
        },
        {
          id: 90,
          name: 'Αποσύνδεση',
          path: '/logout',
          icon: 'flaticon-logout',
        },
      ];
    } else {
      // Normal menu for completed users
      // Simple users (role: 'user') should get limited menu even if step is DASHBOARD
      // Only admin and professional users with DASHBOARD step get full access
      const shouldHaveFullAccess =
        user?.role === 'admin' ||
        (isProfessional && user?.step === 'DASHBOARD');
      const allNav = shouldHaveFullAccess
        ? hasAccessUserMenuNav
        : noAccessUserMenuNav;
      const userProfilePath = `/profile/${user?.username}`;

      modifiedNav = allNav
        .map((item) => {
          if (item.path === '/profile') {
            return hasAccess ? { ...item, path: userProfilePath } : null;
          }
          return item;
        })
        .filter(Boolean) as MenuItem[];
    }

    return (
      <div className='flex items-center space-x-4'>
        {!isMobile && (
          <>
            <div className='hidden sm:flex justify-center items-center'>
              <SavedMenu />
            </div>
            <div className='hidden sm:flex justify-center items-center pr-1'>
              <MessagesMenu />
            </div>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              className='p-0 flex justify-center items-center w-[30px] h-[30px] hover:bg-transparent focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0'
            >
              <UserAvatar
                displayName={user?.displayName || user?.username || ''}
                hideDisplayName
                image={user?.image}
                width={30}
                height={30}
                showBorder={false}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='w-56' align='end' forceMount>
            <DropdownMenuLabel className='font-normal'>
              <div className='flex flex-col space-y-1'>
                <p className='text-sm font-medium leading-none'>
                  {isProfessional
                    ? user?.displayName
                    : user?.displayName || user?.name || user?.email}
                </p>
                <p className='text-xs leading-none text-muted-foreground'>
                  {isProfessional ? `@${user.username}` : user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {modifiedNav.map((item) => {
                if (item.path === '/logout') {
                  return (
                    <React.Fragment key={item.id + '-' + item.name}>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className='cursor-pointer'
                        onClick={handleLogout}
                      >
                        <span className='text-muted-foreground mr-2'>
                          {getMenuIcon(item.icon)}
                        </span>
                        <span>{item.name}</span>
                      </DropdownMenuItem>
                    </React.Fragment>
                  );
                }

                const isExternalProfile = item.path.startsWith('/profile/');

                return (
                  <DropdownMenuItem key={item.id} asChild>
                    <NextLink
                      href={item.path}
                      className='cursor-pointer'
                      {...(isExternalProfile && {
                        target: '_blank',
                        rel: 'noopener noreferrer',
                      })}
                    >
                      <div className='flex items-center w-full space-x-2'>
                        <span className='text-muted-foreground'>
                          {getMenuIcon(item.icon)}
                        </span>
                        <span className='flex-1'>{item.name}</span>
                        {isExternalProfile && (
                          <ExternalLink className='w-3 h-3 ml-auto' />
                        )}
                      </div>
                    </NextLink>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Not authenticated - Hide on mobile, show on desktop.
  // Buttons are more compact on the 1024-1280 range (px-3 / tighter gap) to
  // leave more room for the header search, then return to full padding at xl+.
  return (
    <div className='hidden sm:flex items-center space-x-2 xl:space-x-3'>
      <NextLink
        href='/for-pros'
        className='hidden xl:inline-block xl:mr-3 whitespace-nowrap text-sm font-medium text-primary transition-colors hover:text-secondary'
      >
        Για Επαγγελματίες
      </NextLink>
      <Button
        asChild
        variant='outline'
        size='default'
        className='hover:bg-secondary hover:text-secondary-foreground hover:border-secondary rounded-full px-3 xl:px-4'
      >
        <NextLink href='/login'>Σύνδεση</NextLink>
      </Button>
      <Button asChild size='default' className='rounded-full px-3 xl:px-4'>
        <NextLink href='/register'>Εγγραφή</NextLink>
      </Button>
    </div>
  );
}
