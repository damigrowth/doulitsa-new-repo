'use client';

import React, { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import NextLink from '@/components/shared/next-link';

import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { forgotPassword } from '@/actions/auth/forgot-password';
import type { ActionResponse } from '@/lib/types/api';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '@/lib/validations/auth';
import { AlertCircle, CheckCircle, Mail } from 'lucide-react';
import FormButton from '@/components/shared/button-form';

const initialState: ActionResponse = {
  success: false,
  message: '',
};

const ForgotPasswordForm: React.FC = () => {
  const router = useRouter();
  const [state, action, isPending] = useActionState(
    forgotPassword,
    initialState,
  );
  const [showSuccess, setShowSuccess] = React.useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onChange',
  });

  // Handle success state
  useEffect(() => {
    if (state.success) {
      setShowSuccess(true);
      form.reset();
    }
  }, [state.success, form]);

  // Handle form submission
  const handleFormSubmit = (formData: FormData) => {
    // Call the server action directly (no await)
    action(formData);
  };

  return (
    <>
      {showSuccess ? (
        <div className='text-center space-y-6'>
          <div className='flex justify-center'>
            <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center'>
              <Mail className='w-8 h-8 text-green-600' />
            </div>
          </div>

          <div className='space-y-2'>
            <h3 className='text-lg font-semibold text-gray-900'>
              Έλεγξε το email σου
            </h3>
            <p className='text-gray-600 text-sm'>
              Αν το email υπάρχει στο σύστημά μας, θα λάβεις ένα μήνυμα με
              οδηγίες για την επαναφορά του κωδικού σου.
            </p>
          </div>

          <div className='space-y-3'>
            <NextLink
              href='/login'
              className='inline-flex items-center text-green-600 hover:text-green-700 font-medium text-sm'
            >
              ← Πίσω στη σύνδεση
            </NextLink>

            <button
              onClick={() => setShowSuccess(false)}
              className='block mx-auto text-sm text-gray-600 hover:text-gray-800 underline'
            >
              Δοκίμασε άλλο email
            </button>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form action={handleFormSubmit} className='space-y-4'>
            {/* Email */}
            <FormField
              control={form.control}
              name='email'
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

            <div className='text-sm text-gray-600 bg-blue-50 p-3 rounded-lg'>
              <p>
                Θα σου στείλουμε έναν σύνδεσμο στο email σου για να επαναφέρεις
                τον κωδικό σου.
              </p>
            </div>

            {/* Error Display */}
            {!state.success && state.message && (
              <Alert variant='destructive'>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}

            <FormButton
              type='submit'
              text='Αποστολή οδηγιών'
              loadingText='Αποστολή...'
              loading={isPending}
              disabled={isPending}
              fullWidth
            />

            <div className='text-center'>
              <NextLink
                href='/login'
                className='text-sm text-gray-600 hover:text-gray-800'
              >
                ← Πίσω στη σύνδεση
              </NextLink>
            </div>
          </form>
        </Form>
      )}
    </>
  );
};

export default ForgotPasswordForm;
