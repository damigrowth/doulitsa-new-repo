'use client';

import { useHashScroll } from '@/lib/hooks/use-hash-scroll';

/**
 * Client component that handles hash-based URL scrolling.
 * Add this component to any page that needs hash scroll support
 * (e.g., /profile/username#review).
 */
export function HashScroll() {
  useHashScroll();
  return null;
}
