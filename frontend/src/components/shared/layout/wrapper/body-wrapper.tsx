'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';

// import useArchiveStore from '@/stores/archive/archiveStore';

interface BodyProps {
  children: React.ReactNode;
}

export default function Body({ children }: BodyProps) {
  // const { filtersModalToggled } = useArchiveStore();

  const path = usePathname();

  const [mounted, setMounted] = useState(false);

  const getBodyClasses = () => {
    // Handle null path during SSR
    if (!path) return '';

    // Allow basic classes even before mounting for LCP
    const basicClasses =
      path.startsWith('/connect') ||
      path.startsWith('/auth') ||
      path === '/register' ||
      path === '/register/success' ||
      path == '/email-confirmation' ||
      path === '/login'
        ? ''
        : '';

    if (!mounted) {
      return basicClasses; // Return basic classes before full mounting
    }

    return `${basicClasses} ${path.startsWith('/dashboard') ? '' : ''}`;
    // return `${basicClasses} ${filtersModalToggled ? 'menu-hidden-sidebar-content' : ''} ${
    //   path.startsWith('/dashboard') ? '' : ''
    // }`;
  };

  return (
    <body suppressHydrationWarning className={getBodyClasses()}>
      {/* CRITICAL CHANGE: Always render children, but add data-mounted attribute */}
      <div data-mounted={mounted}>{children}</div>
    </body>
  );
}
