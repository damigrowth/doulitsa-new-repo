'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CallbackRedirectProps {
  status?: string;
  error?: string;
  canceled?: string;
}

export function CallbackRedirect({ status, error, canceled }: CallbackRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    // Returning from Cardlink is a cross-site round-trip that fully unloaded the
    // app. A client-side router.replace keeps the stale in-memory session cache
    // (which can be null from the return), so the header paints logged-out even
    // though the cookie is present. A FULL navigation re-initialises the session
    // from the cookie, so the user shows correctly logged in on the success page.
    const go = (path: string) => {
      window.location.href = path;
    };
    if (status === 'success') {
      go('/dashboard/promote/success');
    } else if (canceled === 'true') {
      go('/dashboard/checkout?canceled=true');
    } else if (error) {
      go(`/dashboard/checkout?error=${encodeURIComponent(error)}`);
    } else {
      go('/dashboard');
    }
    // router kept in deps list for lint; navigation uses window.location.
  }, [router, status, error, canceled]);

  return null;
}
