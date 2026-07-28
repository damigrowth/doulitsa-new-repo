'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { type ComponentType, type ReactNode } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { NextLink } from '@/components';

export function NavMain({
  items,
  label,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon | ComponentType<any>;
    isActive?: boolean;
    badge?: ReactNode;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
  label?: string;
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          // Exact match for root dashboard, startsWith for sub-routes
          const isActiveItem =
            item.url === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.url);

          const isDisabled = item.isActive === false;

          return (
            <Collapsible key={item.title} asChild defaultOpen={isActiveItem}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActiveItem}
                  disabled={isDisabled}
                  className={
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed pointer-events-none'
                      : ''
                  }
                >
                  <NextLink href={isDisabled ? '#' : item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                    {item.badge && <span className='ml-auto'>{item.badge}</span>}
                  </NextLink>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className='data-[state=open]:rotate-90'>
                        <ChevronRight />
                        <span className='sr-only'>Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.url}
                            >
                              <NextLink href={subItem.url}>
                                <span>{subItem.title}</span>
                              </NextLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
