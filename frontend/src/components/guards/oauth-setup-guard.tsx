'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AuthUser } from '@/lib/types';

interface OAuthSetupGuardProps {
  user: AuthUser;
  children: React.ReactNode;
}

/**
 * Guard component that controls access to OAuth setup page.
 * Redirects users who:
 * 1. Have already completed OAuth setup
 * 2. Are not OAuth users (provider !== 'google')
 * Only runs check on initial mount to avoid interfering with form submission flow.
 */
export function OAuthSetupGuard({ user, children }: OAuthSetupGuardProps) {
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Check only once on mount
    // Check if this is a Google OAuth user who needs setup (type selection or username)
    const needsSetup =
      user.provider === 'google' &&
      (user.step === 'TYPE_SELECTION' || user.step === 'OAUTH_SETUP');

    if (!needsSetup) {
      setIsRedirecting(true);
      // User doesn't need setup, redirect to appropriate page based on type and step
      if (user.type === 'pro' && user.step === 'ONBOARDING') {
        router.push('/onboarding');
      } else if (user.step === 'DASHBOARD') {
        router.push('/dashboard');
      } else {
        // Fallback redirect
        router.push('/dashboard');
      }
    } else {
      // User needs OAuth setup, allow render
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
            <p className='text-gray-600 font-medium'>Μετάβαση...</p>
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
