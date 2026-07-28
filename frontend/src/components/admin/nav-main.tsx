'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { PlusIcon, ChevronRight, type LucideIcon } from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { QuickCreateDialog } from './quick-create-dialog';
import { NextLink } from '@/components';

type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: NavItem[];
  disabled?: boolean;
};

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  return (
    <SidebarGroup>
      <SidebarGroupContent className='flex flex-col gap-2'>
        {/* <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setQuickCreateOpen(true)}
              tooltip='Quick Create'
              className='min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground'
            >
              <PlusIcon />
              <span>Quick Create</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu> */}
        <QuickCreateDialog
          open={quickCreateOpen}
          onOpenChange={setQuickCreateOpen}
        />
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              pathname === item.url || pathname.startsWith(item.url + '/');
            const hasSubItems = item.items && item.items.length > 0;

            if (hasSubItems) {
              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isActive}
                  className='group/collapsible'
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isActive}
                      >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const hasNestedItems =
                            subItem.items && subItem.items.length > 0;

                          // Check if current path matches any nested item (exact match only)
                          let isSubActive = pathname === subItem.url;

                          if (hasNestedItems && !isSubActive) {
                            // Only mark parent as active if we're exactly on one of its nested children
                            const isOnNestedChild = subItem.items?.some(
                              (nested) => pathname === nested.url,
                            );
                            isSubActive = isOnNestedChild || false;
                          }

                          if (hasNestedItems) {
                            return (
                              <Collapsible
                                key={subItem.title}
                                asChild
                                defaultOpen={isSubActive}
                                className='group/nested-collapsible'
                              >
                                <SidebarMenuSubItem>
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuSubButton
                                      isActive={isSubActive}
                                    >
                                      <span>{subItem.title}</span>
                                      <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/nested-collapsible:rotate-90' />
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <SidebarMenuSub className='ml-3 border-l pl-2'>
                                      {subItem.items?.map((nestedItem) => {
                                        // Use exact match for deepest nested items
                                        const isNestedActive =
                                          pathname === nestedItem.url;
                                        return (
                                          <SidebarMenuSubItem
                                            key={nestedItem.title}
                                          >
                                            <SidebarMenuSubButton
                                              asChild
                                              isActive={isNestedActive}
                                            >
                                              <NextLink href={nestedItem.url}>
                                                <span>{nestedItem.title}</span>
                                              </NextLink>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        );
                                      })}
                                    </SidebarMenuSub>
                                  </CollapsibleContent>
                                </SidebarMenuSubItem>
                              </Collapsible>
                            );
                          }

                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isSubActive}
                              >
                                <NextLink href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </NextLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild={!item.disabled}
                  isActive={isActive}
                  disabled={item.disabled}
                >
                  {item.disabled ? (
                    <>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </>
                  ) : (
                    <NextLink href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </NextLink>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
