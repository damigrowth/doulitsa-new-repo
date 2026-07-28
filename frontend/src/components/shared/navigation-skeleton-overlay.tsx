'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useNavigationSkeletonStore } from '@/lib/stores/use-navigation-skeleton-store';
import ServiceLoading from '@/app/(service)/s/[slug]/loading';
import ProfileLoading from '@/app/(profile)/profile/[username]/loading';

// Force rebuild - overlay header removed

/**
 * Global navigation skeleton overlay
 * Positioned below real header to keep navigation accessible
 * Scrolls to top before showing for clean UX
 *
 * Features:
 * - Shows instantly on service/profile link click
 * - Positioned below header (z-40, real header is z-50)
 * - Scrolls to top before showing skeleton
 * - Single scrollbar, no double scroll issues
 */
export default function NavigationSkeletonOverlay() {
  const { isVisible, targetType, hideSkeleton } = useNavigationSkeletonStore();
  const pathname = usePathname();

  // Hide skeleton when route changes (navigation complete)
  useEffect(() => {
    if (isVisible) {
      hideSkeleton();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Don't render anything on server or when not visible
  if (typeof document === 'undefined' || !isVisible || !targetType) {
    return null;
  }

  return createPortal(
    <div
      className='fixed top-0 left-0 right-0 bottom-0 z-40 bg-white overflow-hidden'
      role='status'
      aria-live='polite'
      aria-label='Loading content'
    >
      {targetType === 'service' && <ServiceLoading />}
      {targetType === 'profile' && <ProfileLoading />}
    </div>,
    document.body,
  );
}
