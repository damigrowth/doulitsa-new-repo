'use client';

import React, { useState, useEffect, useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Components
import NextLink from '@/components/shared/next-link';

// Shadcn UI components
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Auth and validation
import { authClient } from '@/lib/auth/client';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  registrationFormSchema,
  type RegistrationFormInput,
} from '@/lib/validations/auth';
import type { AuthType, FormAuthType, ProRole } from '@/lib/types/auth';
import { register } from '@/actions/auth/register';
import { storeOAuthIntent } from '@/actions/auth/store-oauth-intent';

// Icons
import { AlertCircle, Building2, CheckCircle, Eye, EyeOff, Loader2, User } from 'lucide-react';

// Utilities
import {
  formatUsername,
  cutSpaces,
  formatDisplayName,
  generateUsernameFromEmail,
} from '@/lib/utils/validation/formats';
import FormButton from '@/components/shared/button-form';
import GoogleLoginButton from './button-login-goolge';

const consentOptions = [
  {
    id: 'terms',
    label: (
      <span>
        Αποδέχομαι τους{' '}
        <NextLink href='/terms' target='_blank' className='text-thm'>
          Όρους Χρήσης
        </NextLink>{' '}
        και την{' '}
        <NextLink href='/privacy' target='_blank' className='text-thm'>
          Πολιτική Απορρήτου
        </NextLink>
      </span>
    ),
  },
];

const initialState: {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
} = {
  success: false,
  message: '',
};

export default function RegisterForm() {
  const { type, role, roles, setAuthRole } = useAuthStore();
  const router = useRouter();
  const [state, action, isPending] = useActionState(register, initialState);
  const [isTransitionPending, startTransition] = useTransition();

  const form = useForm<RegistrationFormInput>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      displayName: '',
      authType: type as FormAuthType,
      role: role || undefined,
      consent: [],
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const [usernameInvalidChars, setUsernameInvalidChars] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    formState: { errors },
    setValue,
    watch,
    setError,
  } = form;

  const watchedAuthType = watch('authType');
  const watchedRole = watch('role');

  // Sync with Zustand store - only update authType and role fields
  useEffect(() => {
    setValue('authType', type as FormAuthType);
    setValue('role', role || undefined);
  }, [type, role, setValue]);

  // OLD register.ts:177 did a server-side redirect to /register/success; the
  // Django-backed action returns JSON, so navigate client-side on success so
  // the user reaches the "check your inbox / resend" page.
  useEffect(() => {
    if (state.success) {
      const email = form.getValues('email');
      router.push(`/register/success?email=${encodeURIComponent(email)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  // Map server-side validation errors back to form fields
  useEffect(() => {
    if (!state.success && state.errors) {
      const fieldErrors = state.errors as Record<string, string[]>;
      Object.entries(fieldErrors).forEach(([field, messages]) => {
        if (messages?.length) {
          setError(field as any, { message: messages[0] });
        }
      });
    }
  }, [state, setError]);

  // Handle form submission
  const handleFormSubmit = async (formData: FormData) => {
    // For simple users, auto-generate username from email before validation
    if (type === 'user') {
      const email = watch('email');
      const autoUsername = generateUsernameFromEmail(email);
      setValue('username', autoUsername);
      formData.set('username', autoUsername);
    }

    // Trigger validation for all fields
    const isValid = await form.trigger();

    if (!isValid) {
      return;
    }

    // Serialize complex fields
    const consent = watch('consent');
    if (consent) {
      formData.set('consent', JSON.stringify(consent));
    }

    const authType = watch('authType');
    if (authType) {
      formData.set('authType', authType);
    }

    const role = watch('role');
    if (role) {
      formData.set('role', role);
    }

    // Call the server action inside a transition
    startTransition(() => {
      action(formData);
    });
  };

  const handleGoogleSignUp = async () => {
    try {
      // Validate that user has selected a type
      if (type !== 'user' && type !== 'pro') {
        setError('root', {
          message:
            'Παρακαλώ επιλέξτε τύπο λογαριασμού (Χρήστης ή Επαγγελματίας)',
        });
        return;
      }

      // Store registration intent (type and role) in secure httpOnly cookie
      // This survives the OAuth redirect and cannot be manipulated via URL
      const intentResult = await storeOAuthIntent({
        type: type,
        role: type === 'pro' ? role : undefined,
      });

      if (!intentResult.success) {
        setError('root', {
          message: 'Failed to initialize OAuth. Please try again.',
        });
        return;
      }

      // Better Auth OAuth flow - intent is now stored server-side
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/oauth-setup',
      });
    } catch (error: any) {
      console.error('Google sign up error:', error);
      setError('root', {
        message: error.message || 'Google sign up failed. Please try again.',
      });
    }
  };

  // Use store type instead of watched form value for more reliable rendering
  if (type === '') {
    return null;
  }

  return (
    <Form {...form}>
      <form action={handleFormSubmit} className='space-y-4'>
        {/* Professional Role Selection */}
        {type === 'pro' && (
          <FormField
            control={form.control}
            name='role'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-foreground'>Τύπος Λογαριασμού</FormLabel>
                <div className='grid grid-cols-2 gap-3 pt-1'>
                  {[
                    { value: 'freelancer', label: 'Επαγγελματίας', Icon: User },
                    { value: 'company', label: 'Επιχείρηση', Icon: Building2 },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => {
                        field.onChange(option.value as ProRole);
                        setAuthRole(option.value as ProRole);
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer text-center ${
                        field.value === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
                      }`}
                    >
                      <option.Icon
                        className={`h-6 w-6 ${field.value === option.value ? 'text-primary' : 'text-gray-400'}`}
                      />
                      <span className='text-sm font-medium'>{option.label}</span>
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Display Name - only for professionals */}
        {type === 'pro' && (
          <FormField
            control={form.control}
            name='displayName'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-foreground'>Επωνυμία / Όνομα</FormLabel>
                <FormControl>
                  <Input
                    type='text'
                    placeholder='Πώς θα εμφανίζεστε'
                    className='w-full'
                    {...field}
                    onChange={(e) => {
                      const formatted = formatDisplayName(e.target.value);
                      field.onChange(formatted);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Email */}
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-foreground'>Email</FormLabel>
              <FormControl>
                <Input
                  type='email'
                  placeholder='your@email.com'
                  className='w-full'
                  {...field}
                  onChange={(e) => {
                    const formatted = cutSpaces(e.target.value);
                    field.onChange(formatted);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Username - only shown for pro users; simple users get auto-generated username from email */}
        {type === 'pro' && (
          <FormField
            control={form.control}
            name='username'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-foreground'>Username</FormLabel>
                <FormControl>
                  <Input
                    type='text'
                    placeholder='username'
                    className='w-full'
                    {...field}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setUsernameInvalidChars(/[^a-zA-Z0-9_-]/.test(raw));
                      field.onChange(formatUsername(raw));
                    }}
                  />
                </FormControl>
                {usernameInvalidChars && (
                  <p className='text-sm text-destructive'>
                    Επιτρέπονται μόνο μικροί λατινικοί χαρακτήρες, αριθμοί,
                    παύλες (-) και κάτω παύλες (_)
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Password */}
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-foreground'>Κωδικός Πρόσβασης</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Τουλάχιστον 6 χαρακτήρες'
                    autoComplete='new-password'
                    autoCorrect='off'
                    autoCapitalize='off'
                    spellCheck={false}
                    className='w-full pr-10'
                    {...field}
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={
                      showPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'
                    }
                    className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'
                  >
                    {showPassword ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
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
              <FormLabel className='text-foreground'>Επιβεβαίωση Κωδικού Πρόσβασης</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder='Πληκτρολόγησε ξανά τον κωδικό'
                    autoComplete='new-password'
                    autoCorrect='off'
                    autoCapitalize='off'
                    spellCheck={false}
                    className='w-full pr-10'
                    {...field}
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={
                      showConfirmPassword
                        ? 'Απόκρυψη κωδικού'
                        : 'Εμφάνιση κωδικού'
                    }
                    className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'
                  >
                    {showConfirmPassword ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Consent */}
        <FormField
          control={form.control}
          name='consent'
          render={({ field }) => (
            <FormItem>
              <div className='pt-3'>
                {consentOptions.map((option) => (
                  <div key={option.id} className='flex items-center space-x-2'>
                    <Checkbox
                      id={option.id}
                      checked={field.value?.includes(option.id)}
                      onCheckedChange={(checked) => {
                        const currentValue = field.value || [];
                        if (checked) {
                          field.onChange([...currentValue, option.id]);
                        } else {
                          field.onChange(
                            currentValue.filter((id) => id !== option.id),
                          );
                        }
                      }}
                    />
                    <Label
                      htmlFor={option.id}
                      className='text-sm leading-relaxed cursor-pointer'
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

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

        {/* Root Error Display */}
        {errors.root && (
          <Alert variant='destructive'>
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}

        <div className='space-y-4 pt-4'>
          {/* Submit Button */}
          <FormButton
            type='submit'
            text='Δημιουργία Λογαριασμού'
            loadingText='Δημιουργία Λογαριασμού...'
            loading={isPending || isTransitionPending}
            disabled={isPending || isTransitionPending}
            fullWidth
          />
          {/* Google Sign Up */}
          <div className='text-center'>
            <p className='text-gray-600 mb-3'>ή</p>
            <GoogleLoginButton
              onClick={handleGoogleSignUp}
              disabled={isPending || isTransitionPending}
              className='w-full'
            >
              Εγγραφή με Google
            </GoogleLoginButton>
          </div>
        </div>
      </form>
    </Form>
  );
}
