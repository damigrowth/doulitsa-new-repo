'use client';

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
  User,
  LayoutDashboard,
  MessageSquare,
  Heart,
  FileText,
  Plus,
  Settings,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserAvatar from '@/components/shared/user-avatar';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useSession } from '@/lib/auth/client';
import {
  hasAccessUserMenuNav,
  noAccessUserMenuNav,
} from '@/constants/datasets/dashboard';

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { data: session } = useSession();

  // Icon mapping function - same as UserMenu
  const getMenuIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'flaticon-website': <User className='w-4 h-4' />,
      'flaticon-menu': <LayoutDashboard className='w-4 h-4' />,
      'flaticon-mail': <MessageSquare className='w-4 h-4' />,
      'flaticon-like': <Heart className='w-4 h-4' />,
      'flaticon-document': <FileText className='w-4 h-4' />,
      'flaticon-button': <Plus className='w-4 h-4' />,
      'flaticon-photo': <Settings className='w-4 h-4' />,
      'flaticon-logout': <LogOut className='w-4 h-4' />,
    };
    return iconMap[iconName] || <User className='w-4 h-4' />;
  };

  // Derive auth states from session data - same logic as UserMenu
  const sessionUser = session?.user;
  const isProfessional =
    sessionUser?.role === 'freelancer' || sessionUser?.role === 'company';
  const isProfessionalType = sessionUser?.type === 'pro';
  const hasProfile = isProfessional && sessionUser?.step === 'DASHBOARD';
  const needsOAuth = sessionUser?.step === 'OAUTH_SETUP';
  const needsOnboarding = sessionUser?.step === 'ONBOARDING';

  // Get menu items - same logic as UserMenu
  const getMenuItems = () => {
    if (needsOnboarding || needsOAuth) {
      // Show appropriate completion link based on user state
      let completionPath = '/onboarding';

      if (needsOAuth) {
        // For OAuth setup, direct to oauth-setup page with appropriate type parameter
        completionPath =
          isProfessionalType || sessionUser?.type === 'pro'
            ? '/oauth-setup?type=pro'
            : '/oauth-setup';
      }

      return [
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
        sessionUser?.role === 'admin' ||
        (isProfessional && sessionUser?.step === 'DASHBOARD');

      const allNav = shouldHaveFullAccess
        ? hasAccessUserMenuNav
        : noAccessUserMenuNav;
      const userProfilePath = `/profile/${sessionUser?.username}`;

      return allNav
        .map((item) => {
          if (item.path === '/profile') {
            return sessionUser?.step === 'DASHBOARD' ||
              sessionUser?.role === 'admin'
              ? { ...item, path: userProfilePath }
              : null;
          }
          return item;
        })
        .filter(Boolean);
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground ring-transparent'
            >
              <UserAvatar
                displayName={user.name}
                image={user.avatar}
                size='sm'
                className='h-8 w-8 rounded-lg'
                showBorder={false}
              />
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{user.name}</span>
                <span className='truncate text-xs'>{user.email}</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <UserAvatar
                  displayName={user.name}
                  image={user.avatar}
                  size='sm'
                  className='h-8 w-8 rounded-lg'
                  showBorder={false}
                />
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>{user.name}</span>
                  <span className='truncate text-xs'>{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {menuItems.map((item, index) => {
                if (item.path === '/logout') {
                  return (
                    <DropdownMenuItem
                      key={`nav-user-${item.id}-${index}`}
                      className='cursor-pointer'
                      onClick={handleLogout}
                    >
                      {getMenuIcon(item.icon)}
                      {item.name}
                    </DropdownMenuItem>
                  );
                }

                return (
                  <DropdownMenuItem
                    key={`nav-user-${item.id}-${index}`}
                    asChild
                  >
                    <a href={item.path} className='cursor-pointer'>
                      {getMenuIcon(item.icon)}
                      {item.name}
                    </a>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
