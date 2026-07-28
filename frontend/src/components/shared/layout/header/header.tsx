'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MenuUser } from '@/components/profile';
import NavMenu from './navigation-menu';
import { HeaderSearch } from './header-search';
import { IconMobileMenu } from '@/components/icon';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useSession } from '@/lib/auth/client';
import type { NavigationMenuCategory } from '@/lib/types/components';
import NextLink from '../../next-link';

interface HeaderProps {
  navigationData: NavigationMenuCategory[];
}

export default function Header({ navigationData }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <div className='mx-auto w-full px-3 sm:px-4 xl:max-w-screen-xl 2xl:max-w-screen-2xl'>
      <div className='flex items-center gap-1.5 sm:gap-2 lg:gap-3'>
        {/* Logo - slightly smaller on very small screens to give the search
            bar more room to grow. */}
        <NextLink href='/' className='flex-shrink-0'>
          <Image
            height={40}
            width={129}
            src='/doulitsa-logo.svg'
            alt='Doulitsa Logo'
            priority
            className='h-8 w-auto sm:h-10'
          />
        </NextLink>

        {/* Desktop Navigation - Hidden on mobile */}
        <div className='hidden lg:block'>
          <NavMenu navigationData={navigationData} />
        </div>

        {/* Desktop Search - the wrapper grows to absorb the free space between
            the navigation and the right-side actions (pushing them to the far
            edge), while the field itself caps via max-width. This keeps the
            search comfortably wide on the 1024–1280 range instead of leaving an
            empty gap, yet never gets huge on very wide screens. The wrapper (not
            an `ml-auto` margin) does the pushing, so the field reliably expands
            into the available space. */}
        <div className='hidden lg:block lg:min-w-0 lg:flex-1'>
          <HeaderSearch className='w-full max-w-[390px]' />
        </div>

        {/* Mobile Search - the wrapper fills the available space (keeping the
            right-side actions pinned to the edge) while the field itself is
            capped at 390px so it never gets wider than that on any screen. */}
        <div className='min-w-0 flex-1 lg:hidden'>
          <HeaderSearch className='w-full max-w-[390px]' />
        </div>

        {/* Right side - Actions - pushed to the far right by the growing search
            wrapper. A fixed min-width reserves a constant footprint across every
            auth state (loading skeleton, logged-out buttons, logged-in icons) so
            the fluid search depends only on the viewport and never reflows /
            shrinks once the user's session resolves. `justify-end` keeps the
            actions flush to the right edge within that reserved box. */}
        <div className='flex flex-shrink-0 items-center justify-end space-x-1.5 sm:space-x-2 pl-1 lg:pl-2 lg:min-w-[196px] xl:min-w-[372px]'>
          {/* Desktop Register Button - Hidden on mobile */}
          <div className='hidden sm:block'>{/* <RegisterProButton /> */}</div>

          {/* User Menu */}
          <MenuUser />

          {/* Mobile Menu Sheet - Visible only on mobile */}
          <div className='lg:hidden'>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant='accent'
                  size='icon'
                  className='border border-gray-300'
                >
                  <IconMobileMenu className='h-6 w-6' />
                  <span className='sr-only'>Άνοιγμα μενού</span>
                </Button>
              </SheetTrigger>
              <SheetContent side='left' className='w-[300px] flex flex-col'>
                <SheetHeader className='border-b pb-4'>
                  <SheetTitle asChild>
                    <NextLink href='/' onClick={() => setMobileMenuOpen(false)}>
                      <Image
                        alt='Doulitsa'
                        width={40}
                        height={40}
                        src='/doulitsa-icon.png'
                        className='h-10 w-10'
                      />
                    </NextLink>
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile Navigation */}
                <div className='mt-6'>
                  <NavMenu
                    navigationData={navigationData}
                    isMobile={true}
                    onClose={() => setMobileMenuOpen(false)}
                  />
                </div>

                {/* Mobile Auth Buttons - Only show for non-authenticated users */}
                {!session?.user && (
                  <div className='mt-6 pt-6 border-t space-y-5'>
                    <Button
                      asChild
                      variant='outline'
                      size='default'
                      className='w-full rounded-full'
                    >
                      <NextLink
                        href='/login'
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Σύνδεση
                      </NextLink>
                    </Button>
                    <Button
                      asChild
                      size='default'
                      className='w-full rounded-full'
                    >
                      <NextLink
                        href='/register'
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Εγγραφή
                      </NextLink>
                    </Button>
                    <NextLink
                      href='/register#pro'
                      onClick={() => setMobileMenuOpen(false)}
                      className='block text-center text-sm font-medium text-primary transition-colors hover:text-secondary'
                    >
                      Εγγραφή Επαγγελματικού Λογαριασμού
                    </NextLink>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}
