'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import type { AuthType } from '@/lib/types/auth';

function getHashAuthType(): Exclude<AuthType, ''> | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (hash === '#user') return 'user';
  if (hash === '#pro' || hash === '#for-pros') return 'pro';

  return null;
}

/**
 * Resets registration type selection on each visit to /register,
 * unless a hash anchor (#pro, #user) requests a specific profile type.
 */
export default function RegisterAuthStateSync() {
  const pathname = usePathname();
  const resetAuth = useAuthStore((state) => state.resetAuth);
  const setAuthType = useAuthStore((state) => state.setAuthType);

  useEffect(() => {
    if (pathname !== '/register') return;

    const syncAuthTypeFromUrl = () => {
      const hashType = getHashAuthType();

      if (hashType) {
        setAuthType(hashType);
      } else {
        resetAuth();
      }
    };

    syncAuthTypeFromUrl();
    window.addEventListener('hashchange', syncAuthTypeFromUrl);

    return () => window.removeEventListener('hashchange', syncAuthTypeFromUrl);
  }, [pathname, resetAuth, setAuthType]);

  return null;
}
