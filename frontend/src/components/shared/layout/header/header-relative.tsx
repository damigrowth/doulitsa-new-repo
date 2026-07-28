'use client';

import React from 'react';
import Header from './header';
import type { NavigationMenuCategory } from '@/lib/types/components';

interface HeaderProps {
  navigationData: NavigationMenuCategory[];
}

export default function HeaderRelative({ navigationData }: HeaderProps) {
  return (
    <header className='h-16 md:h-20 w-full z-50 bg-white flex items-center border-b border-gray-200 shadow-sm py-2 relative -mb-20'>
      <Header navigationData={navigationData} />
    </header>
  );
}
