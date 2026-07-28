import React from 'react';
import { DashboardBreadcrumb } from './dashboard-breadcrumb';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import UserMenu from '../profile/menu-user';
import DashboardSidebar from './dashboard-sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset>
          <header className='flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12'>
            <div className='flex items-center gap-2 px-4'>
              <SidebarTrigger className='-ml-1' />
              <Separator orientation='vertical' className='mr-2 h-4' />
              <DashboardBreadcrumb />
            </div>
            <div className='px-4'>
              <UserMenu />
            </div>
          </header>
          <div className='flex flex-1 flex-col gap-4 p-4 pt-0 overflow-hidden'>{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
