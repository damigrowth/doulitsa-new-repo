'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import NextLink from '@/components/shared/next-link';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { login } from '@/actions/auth/login';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { authClient, useSession } from '@/lib/auth/client';
import { AuthUser } from '@/lib/types/auth';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import FormButton from '@/components/shared/button-form';
import { Separator } from '../../ui/separator';
import GoogleLoginButton from './button-login-goolge';

type LoginState = {
  success: boolean;
  message: string;
  data?: {
    user: AuthUser;
    redirectPath: string;
  };
  errors?: Record<string, string[]>;
};

const initialState: LoginState = {
  success: false,
  message: '',
};

const LoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, action, isPending] = useActionState<LoginState, FormData>(
    login,
    initialState,
  );
  const { refetch } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Check for success messages from URL params
  const message = searchParams?.get('message');
  const showPasswordResetSuccess = message === 'password-reset-success';

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
    mode: 'onChange',
  });

  // Handle successful login and redirect - same pattern as profile forms
  useEffect(() => {
    if (state.success) {
      // Show redirecting state immediately
      setIsRedirecting(true);

      const handleSuccessfulLogin = async () => {
        // 1. Refresh session to update user data
        await refetch();

        // 2. Small delay for Better Auth session propagation
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 3. Get the redirect path from the server response
        const redirectPath = state.data?.redirectPath || '/dashboard';

        // 4. Navigate with router for smoother transition
        router.push(redirectPath);
        router.refresh(); // Force refresh to ensure new session data
      };

      handleSuccessfulLogin();
    }
  }, [state.success, state.data, router, refetch]);

  // Handle form submission
  const handleFormSubmit = (formData: FormData) => {
    // Call the server action directly (no await)
    action(formData);
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      // Type selection now happens AFTER OAuth on /oauth-type-selection page
      // This works for both new users (type selection) and existing users (direct login)
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/oauth-callback',
      });
    } catch (error) {
      console.error('Google Sign-in Error:', error);
    }
  };

  // Show success state during redirect (same pattern as onboarding)
  if (isRedirecting) {
    return (
      <div className='text-center space-y-4'>
        <div className='flex justify-center'>
          <CheckCircle className='w-16 h-16 text-green-600 mb-2' />
        </div>
        <div className='space-y-2'>
          <h2 className='text-2xl font-semibold text-gray-900'>
            Επιτυχής Σύνδεση!
          </h2>
          <div className='flex items-center gap-2 justify-center text-gray-600'>
            <Loader2 className='w-5 h-5 animate-spin' />
            <span>Μετάβαση στον Πίνακα Ελέγχου...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header Section */}
      <div className='mb-8'>
        <h4 className='text-xl font-semibold text-gray-900 mb-2'>
          Συνδέσου στον λογαριασμό σου
        </h4>
        <p className='text-gray-600'>
          Δεν έχεις λογαριασμό?{' '}
          <NextLink
            href='/register'
            className='text-green-600 hover:text-green-700 font-medium'
          >
            Εγγραφή!
          </NextLink>
        </p>
      </div>

      <Form {...form}>
        <form action={handleFormSubmit} className='space-y-4'>
          {/* Email */}
          <FormField
            control={form.control}
            name='identifier'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type='email'
                    placeholder='Το email σου'
                    autoComplete='email'
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Κωδικός</FormLabel>
                <FormControl>
                  <Input
                    type='password'
                    placeholder='Ο κωδικός σου'
                    autoComplete='current-password'
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='flex items-center justify-between pb-5'>
            <NextLink href='/forgot-password' className='text-sm font-sans'>
              Ξέχασες τον κωδικό σου?
            </NextLink>
          </div>

          {/* Password Reset Success Message */}
          {showPasswordResetSuccess && (
            <Alert className='border-green-200 bg-green-50 text-green-800 mb-4'>
              <CheckCircle className='h-4 w-4' />
              <AlertDescription>
                Ο κωδικός σου επαναφέρθηκε επιτυχώς! Μπορείς τώρα να συνδεθείς
                με τον νέο σου κωδικό.
              </AlertDescription>
            </Alert>
          )}

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

          <FormButton
            type='submit'
            text='Σύνδεση'
            loadingText='Σύνδεση...'
            loading={isPending}
            disabled={isPending}
            fullWidth
          />
        </form>
      </Form>

      <div className='relative my-6'>
        <div className='absolute inset-0 flex items-center'>
          <Separator className='w-full' />
        </div>
        <div className='relative flex justify-center text-xs uppercase'>
          <span className='bg-background px-2 text-muted-foreground'>ή</span>
        </div>
      </div>

      {/* Google Login Button */}
      <GoogleLoginButton onClick={handleGoogleSignIn} disabled={isPending}>
        Σύνδεση με Google
      </GoogleLoginButton>
    </>
  );
};

export default LoginForm;
