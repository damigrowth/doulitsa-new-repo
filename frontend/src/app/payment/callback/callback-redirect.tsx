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
    if (status === 'success') {
      router.replace('/dashboard/promote/success');
    } else if (canceled === 'true') {
      router.replace('/dashboard/checkout?canceled=true');
    } else if (error) {
      router.replace(`/dashboard/checkout?error=${encodeURIComponent(error)}`);
    } else {
      router.replace('/dashboard');
    }
  }, [router, status, error, canceled]);

  return null;
}
