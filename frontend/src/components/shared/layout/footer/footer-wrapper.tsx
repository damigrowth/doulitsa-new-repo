'use client';

import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/lib/hooks';
import Footer from './footer-global';

export default function FooterWrapper() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Always hide footer on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  // Hide footer on dashboard pages only on desktop (show on mobile for navigation)
  if (pathname?.startsWith('/dashboard') && !isMobile) {
    return null;
  }

  return <Footer />;
}
