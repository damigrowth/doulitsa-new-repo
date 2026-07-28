'use client';

import {
  BellIcon,
  ChevronsUpDown,
  CreditCardIcon,
  LogOutIcon,
  UserCircleIcon,
} from 'lucide-react';

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
import { signOut, useSession } from '@/lib/auth/client';

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
  const { data: session } = useSession();

  // Get real user data from session with fallbacks
  const realUser = {
    name: session?.user?.name || session?.user?.username || user.name,
    email: session?.user?.email || user.email,
    avatar: session?.user?.image || user.avatar,
  };

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
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
                displayName={realUser.name}
                image={realUser.avatar}
                size='sm'
                className='h-8 w-8 rounded-lg'
                showBorder={false}
              />
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{realUser.name}</span>
                <span className='truncate text-xs'>{realUser.email}</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-2 py-1.5 text-left text-sm'>
                <UserAvatar
                  displayName={realUser.name}
                  image={realUser.avatar}
                  size='sm'
                  className='h-8 w-8 rounded-lg'
                  showBorder={false}
                />
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>{realUser.name}</span>
                  <span className='truncate text-xs'>{realUser.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <UserCircleIcon />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <BellIcon />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className='cursor-pointer' onClick={handleLogout}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
