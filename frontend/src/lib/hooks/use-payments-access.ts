'use client';

import { useState, useEffect } from 'react';

interface PaymentsAccess {
  allowed: boolean;
  reason?: string;
  testModeBanner?: string;
  isLoading: boolean;
}

/**
 * Client-side hook to check if user has access to payment features.
 * Checks PAYMENTS_TEST_MODE environment variable and user's admin status.
 */
export function usePaymentsAccess(): PaymentsAccess {
  const [access, setAccess] = useState<PaymentsAccess>({
    allowed: true,
    isLoading: true,
  });

  useEffect(() => {
    async function checkAccess() {
      try {
        const response = await fetch('/api/payments/check-access');
        const data = await response.json();

        setAccess({
          allowed: data.allowed,
          reason: data.reason,
          testModeBanner: data.testModeBanner,
          isLoading: false,
        });
      } catch (error) {
        // On error, allow access (fail open)
        setAccess({
          allowed: true,
          isLoading: false,
        });
      }
    }

    checkAccess();
  }, []);

  return access;
}
