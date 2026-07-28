'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AuthUser } from '@/lib/types';

interface OnboardingGuardProps {
  user: AuthUser;
  children: React.ReactNode;
}

/**
 * Guard component that controls access to onboarding page.
 * Redirects users who:
 * 1. Have already completed onboarding (step === 'DASHBOARD')
 * 2. Are not professional users (type === 'user')
 * Only runs check on initial mount to avoid interfering with form submission flow.
 */
export function OnboardingGuard({ user, children }: OnboardingGuardProps) {
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Check only once on mount
    // Redirect if user has already completed onboarding
    if (user.step === 'DASHBOARD') {
      setIsRedirecting(true);
      router.push('/dashboard');
    }
    // Redirect if user is not a professional type (simple users don't need onboarding)
    else if (user.type === 'user') {
      setIsRedirecting(true);
      router.push('/dashboard');
    }
    // User needs onboarding, allow render
    else {
      setShouldRender(true);
    }
  }, []); // Empty deps - only run once on mount

  // Show loading state while redirecting
  if (isRedirecting) {
    return (
      <div className='container mx-auto px-4'>
        <div className='flex items-center justify-center min-h-[60vh]'>
          <div className='text-center space-y-4'>
            <Loader2 className='w-12 h-12 animate-spin text-primary mx-auto' />
            <p className='text-gray-600 font-medium'>Μετάβαση στον Πίνακα Ελέγχου...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking
  if (!shouldRender) {
    return (
      <div className='container mx-auto px-4'>
        <div className='flex items-center justify-center min-h-[60vh]'>
          <div className='text-center space-y-4'>
            <Loader2 className='w-12 h-12 animate-spin text-primary mx-auto' />
            <p className='text-gray-600 font-medium'>Φόρτωση...</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
