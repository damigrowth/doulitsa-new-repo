'use client';

import { useEffect, useState } from 'react';
import { IconAngleUp } from '@/components/icon/fa';

export default function BottomToTop() {
  const [isBottom, setBottom] = useState(false);

  // scroll from top
  useEffect(() => {
    let throttleTimer: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      // Use requestAnimationFrame to defer layout read
      requestAnimationFrame(() => {
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        setBottom(scrollTop > 200);
      });
    };

    // Throttle scroll events to max 10/second
    const throttledScroll = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        handleScroll();
        throttleTimer = null;
      }, 100);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', throttledScroll, { passive: true });

      return () => {
        window.removeEventListener('scroll', throttledScroll);
      };
    }
  }, []);

  // bottom to top handler
  const bottomToTopHandler = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <button
        onClick={bottomToTopHandler}
        aria-label='Μετάβαση στην κορυφή της σελίδας'
        className={`
          fixed right-11 w-12 h-12 rounded-full border border-black/5 text-gray-700 bg-gray-300/75
          flex items-center justify-center cursor-pointer transition-all duration-300 ease-in-out
          hover:bg-gray-900 hover:text-white z-50
          ${
            isBottom
              ? 'bottom-11 opacity-100 transform scale-100'
              : '-bottom-11 opacity-0 transform scale-0'
          }
        `}
      >
        <IconAngleUp />
      </button>
    </>
  );
}
