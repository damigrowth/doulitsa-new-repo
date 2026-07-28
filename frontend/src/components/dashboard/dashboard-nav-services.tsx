'use client';

import { ChevronRight, FileText } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  getRecentServices,
  type RecentService,
} from '@/actions/services/get-recent-services';
import { NextLink } from '@/components';

export function NavServices() {
  const pathname = usePathname();
  const [recentServices, setRecentServices] = useState<RecentService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const isActiveItem = pathname.startsWith('/dashboard/services');

  const handleToggle = async () => {
    if (!hasLoaded && !isLoading) {
      setIsLoading(true);
      try {
        const result = await getRecentServices();
        if (result.success && result.data) {
          setRecentServices(result.data.services);
        }
        setHasLoaded(true);
      } catch (error) {
        console.error('Failed to fetch recent services:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Only show recent services as subitems
  const menuItems = recentServices.map((service) => ({
    title: service.title,
    url: `/dashboard/services/edit/${service.id}`,
  }));

  return (
    <SidebarMenu>
      <Collapsible asChild defaultOpen={isActiveItem}>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip='Διαχείριση Υπηρεσιών'
            isActive={isActiveItem}
          >
            <NextLink href='/dashboard/services'>
              <FileText />
              <span>Διαχείριση Υπηρεσιών</span>
            </NextLink>
          </SidebarMenuButton>
          <CollapsibleTrigger asChild onClick={handleToggle}>
            <SidebarMenuAction className='data-[state=open]:rotate-90'>
              <ChevronRight />
              <span className='sr-only'>Toggle</span>
            </SidebarMenuAction>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {menuItems.map((item, index) => {
                if ('separator' in item && item.separator) {
                  return (
                    <div
                      key={index}
                      className='border-t border-sidebar-border my-1'
                    />
                  );
                }
                return (
                  <SidebarMenuSubItem key={item.url}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === item.url}
                    >
                      <NextLink href={item.url}>
                        <span className='truncate'>{item.title}</span>
                      </NextLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
              {isLoading && (
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton>
                    <span className='text-xs text-muted-foreground'>
                      Φόρτωση...
                    </span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  );
}
