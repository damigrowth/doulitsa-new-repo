'use client';

import React, { useActionState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { resetPassword } from '@/actions/auth/reset-password';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import FormButton from '@/components/shared/button-form';

// Schema for reset password form with password confirmation
const resetPasswordFormSchema = z
  .object({
    token: z.string().min(1, 'Το token είναι υποχρεωτικό'),
    newPassword: z
      .string()
      .min(8, 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες')
      .max(100, 'Ο κωδικός είναι πολύ μεγάλος'),
    confirmPassword: z
      .string()
      .min(1, 'Η επιβεβαίωση κωδικού είναι υποχρεωτική'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Οι κωδικοί δεν ταιριάζουν',
    path: ['confirmPassword'],
  });

type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;

const initialState = {
  success: false,
  message: '',
};

interface ResetPasswordFormProps {
  token: string | null;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ token }) => {
  const router = useRouter();
  const [state, action, isPending] = useActionState(
    resetPassword,
    initialState,
  );
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Handle successful password reset and redirect
  useEffect(() => {
    if (state.success) {
      setTimeout(() => {
        router.push('/login?message=password-reset-success');
      }, 2000); // Show success message for 2 seconds before redirecting
    }
  }, [state.success, router]);

  const form = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      token: token || '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  // Handle form submission
  const handleFormSubmit = (formData: FormData) => {
    // Ensure token is included in FormData
    if (token) {
      formData.set('token', token);
    }
    // Call the server action directly (no await)
    action(formData);
  };

  // Show error if no token
  if (!token) {
    return (
      <div className='text-center space-y-4'>
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            Μη έγκυρος ή λήξας σύνδεσμος επαναφοράς κωδικού.
          </AlertDescription>
        </Alert>

        <NextLink
          href='/forgot-password'
          className='inline-flex items-center text-green-600 hover:text-green-700 font-medium text-sm'
        >
          ← Αίτησε νέο σύνδεσμο
        </NextLink>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form action={handleFormSubmit} className='space-y-4'>
        {/* Hidden token field */}
        <input type='hidden' name='token' value={token} />

        {/* New Password */}
        <FormField
          control={form.control}
          name='newPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Νέος Κωδικός</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Εισήγαγε τον νέο κωδικό σου'
                    autoComplete='new-password'
                    disabled={isPending}
                    {...field}
                  />
                  <button
                    type='button'
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className='h-4 w-4 text-gray-400' />
                    ) : (
                      <Eye className='h-4 w-4 text-gray-400' />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirm Password */}
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Επιβεβαίωση Κωδικού</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder='Επιβεβαίωσε τον νέο κωδικό σου'
                    autoComplete='new-password'
                    disabled={isPending}
                    {...field}
                  />
                  <button
                    type='button'
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className='h-4 w-4 text-gray-400' />
                    ) : (
                      <Eye className='h-4 w-4 text-gray-400' />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='text-sm text-gray-600 bg-blue-50 p-3 rounded-lg'>
          <p className='font-medium mb-1'>Απαιτήσεις κωδικού:</p>
          <ul className='text-xs space-y-1'>
            <li>• Τουλάχιστον 8 χαρακτήρες</li>
            <li>• Συνιστάται χρήση πεζών και κεφαλαίων</li>
            <li>• Συνιστάται χρήση αριθμών και συμβόλων</li>
          </ul>
        </div>

        {/* Error Display */}
        {state.message && !state.success && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              {state.message}
              {state.message?.includes('λήξει') && (
                <div className='mt-2'>
                  <NextLink
                    href='/forgot-password'
                    className='text-sm underline text-red-700 hover:text-red-800 font-medium'
                  >
                    Αίτησε νέο σύνδεσμο επαναφοράς →
                  </NextLink>
                </div>
              )}
            </AlertDescription>
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
          text='Επαναφορά κωδικού'
          loadingText='Επαναφορά...'
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
  );
};

export default ResetPasswordForm;
