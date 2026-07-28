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

const FormResendVerification: React.FC = () => {
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || '';
  const [state, action, isPending] = useActionState(
    resendVerificationEmail,
    initialState,
  );
  const [, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);

  // Start cooldown after successful send
  useEffect(() => {
    if (state.success && state.message) {
      setCooldown(60);
    }
  }, [state.success, state.message]);

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
