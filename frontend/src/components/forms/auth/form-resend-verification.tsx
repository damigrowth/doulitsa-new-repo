'use client';

import React, { useActionState, useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import FormButton from '@/components/shared/button-form';
import { resendVerificationEmail } from '@/actions/auth/resend-verification';
import NextLink from '@/components/shared/next-link';

const initialState = {
  success: false,
  message: '',
};

const COOLDOWN_SECONDS = 60;

// The deadline persists per email so a page refresh resumes the countdown
// instead of resetting it (the server throttles at 3/10min regardless).
const storageKey = (email: string) => `resend-verification-until:${email}`;

const readRemaining = (email: string): number => {
  try {
    const raw = window.localStorage.getItem(storageKey(email));
    const until = raw ? parseInt(raw, 10) : 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  } catch {
    return 0;
  }
};

const storeDeadline = (email: string, seconds: number) => {
  try {
    window.localStorage.setItem(
      storageKey(email),
      String(Date.now() + seconds * 1000),
    );
  } catch {
    // Private mode / blocked storage: the server throttle still applies.
  }
};

const FormResendVerification: React.FC = () => {
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || '';
  const [state, action, isPending] = useActionState(
    resendVerificationEmail,
    initialState,
  );
  const [, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);

  // Resume a cooldown that survived a refresh
  useEffect(() => {
    if (email) setCooldown(readRemaining(email));
  }, [email]);

  // Start cooldown after a send — also when the server rate-limited us
  useEffect(() => {
    if (state.message && (state.success || (state as { rateLimited?: boolean }).rateLimited)) {
      setCooldown(COOLDOWN_SECONDS);
      if (email) storeDeadline(email, COOLDOWN_SECONDS);
    }
  }, [state, email]);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = () => {
    if (!email || cooldown > 0) return;
    const formData = new FormData();
    formData.append('email', email);
    startTransition(() => {
      action(formData);
    });
  };

  return (
    <div className='space-y-4'>
      {/* Error Display */}
      {state.message && !state.success && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {/* Success Display */}
      {state.message && state.success && (
        <Alert className='border-green-200 bg-green-50 text-green-800'>
          <CheckCircle className='h-4 w-4' />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {/* Resend button - only show if we have an email */}
      {email && (
        <FormButton
          type='button'
          text={
            cooldown > 0
              ? `Αποστολή ξανά (${cooldown}s)`
              : 'Αποστολή email επιβεβαίωσης ξανά'
          }
          loadingText='Αποστολή...'
          loading={isPending}
          disabled={isPending || cooldown > 0}
          onClick={handleResend}
          icon='refresh'
          iconPosition='left'
          variant='outline'
          fullWidth
        />
      )}

      <div className='text-center'>
        <NextLink
          href='/login'
          className='text-sm text-gray-600 hover:text-gray-800'
        >
          ← Πίσω στη σύνδεση
        </NextLink>
      </div>
    </div>
  );
};

export default FormResendVerification;
