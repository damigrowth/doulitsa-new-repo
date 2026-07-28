'use client';

import { useEffect } from 'react';

/**
 * Hook that scrolls to an element specified by the URL hash after page load.
 * This is needed because the browser's native hash scroll may fire before
 * the layout is fully painted, especially with server-rendered content.
 */
export function useHashScroll() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // Small delay to ensure layout is complete
      const timeoutId = setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, []);
}
