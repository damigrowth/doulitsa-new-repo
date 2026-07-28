'use client';

import React, {
  useState,
  useEffect,
  useActionState,
  useTransition,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

// UI Components
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
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Loader2,
  User,
  Briefcase,
} from 'lucide-react';
import FormButton from '@/components/shared/button-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Actions and Utils
import { authClient, useSession } from '@/lib/auth/client';
import { completeOAuth } from '@/actions/auth/oauth-setup';
import { updateUserType } from '@/actions/auth/update-user-type';
import {
  formatUsername,
  formatDisplayName,
  generateUsernameFromEmail,
} from '@/lib/utils/validation/formats';
import { Label } from '@radix-ui/react-label';
import { useAuthStore } from '@/lib/stores/authStore';
import { ActionResponse } from '@/lib/types/api';
import type { AuthType, ProRole } from '@/lib/types/auth';

// Professional role options (only for type 'pro')
const roleOptions = [
  { value: 'freelancer', label: 'Επαγγελματίας', Icon: User },
  { value: 'company', label: 'Επιχείρηση', Icon: Building2 },
];

// Validation schemas
const simpleUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Το username πρέπει να έχει τουλάχιστον 3 χαρακτήρες')
    .max(30, 'Το username δεν μπορεί να έχει περισσότερους από 30 χαρακτήρες')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Το username μπορεί να περιέχει μόνο γράμματα, αριθμούς, _ και -',
    ),
});

const professionalUserSchema = z.object({
  role: z.string().min(1, 'Παρακαλώ επιλέξτε τον τύπο επαγγελματία'),
  username: z
    .string()
    .min(3, 'Το username πρέπει να έχει τουλάχιστον 3 χαρακτήρες')
    .max(30, 'Το username δεν μπορεί να έχει περισσότερους από 30 χαρακτήρες')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Το username μπορεί να περιέχει μόνο γράμματα, αριθμούς, _ και -',
    ),
  displayName: z
    .string()
    .min(2, 'Η επωνυμία πρέπει να έχει τουλάχιστον 2 χαρακτήρες')
    .max(50, 'Η επωνυμία δεν μπορεί να έχει περισσότερους από 50 χαρακτήρες'),
});

interface OAuthSetupFormProps {
  userId: string; // user ID for type selection
  userEmail: string;
  userType: string; // 'user' or 'pro'
  userRole: string; // 'user', 'freelancer', or 'company' - from database
  showTypeSelection: boolean; // whether to show type selection UI (based on TYPE_SELECTION step)
  googleUsername?: string; // username from Google profile
  googleDisplayName?: string; // displayName from Google profile
}

const initialState: ActionResponse = {
  success: false,
  message: '',
};

export default function OAuthSetupForm({
  userId,
  userEmail,
  userType,
  userRole,
  showTypeSelection,
  googleUsername,
  googleDisplayName,
}: OAuthSetupFormProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { resetAuth } = useAuthStore();
  const { refetch } = useSession();
  const router = useRouter();

  // Type selection state (for users in TYPE_SELECTION step)
  const [isPendingTransition, startTransition] = useTransition();
  const [selectedType, setSelectedType] =
    useState<Exclude<AuthType, ''>>('user');
  const [typeSelectionError, setTypeSelectionError] = useState<string>('');
  const [usernameInvalidChars, setUsernameInvalidChars] = useState(false);

  // Use useActionState for form submission
  const [state, action, isPending] = useActionState(
    completeOAuth,
    initialState,
  );

  // Debug logging in development
  // React.useEffect(() => {
  //   if (process.env.NODE_ENV === 'development') {
  //     console.log('OAuthSetupForm props:', {
  //       userEmail,
  //       userType,
  //       userRole,
  //       googleUsername,
  //       googleDisplayName,
  //     });
  //   }
  // }, [userEmail, userType, userRole, googleUsername, googleDisplayName]);

  // Simple user form (for type 'user')
  const simpleForm = useForm({
    resolver: zodResolver(simpleUserSchema),
    defaultValues: {
      username: googleUsername || '',
    },
    mode: 'onChange',
  });

  // Professional user form (for type 'pro')
  // Pre-fill role from database (set during OAuth registration)
  const professionalForm = useForm({
    resolver: zodResolver(professionalUserSchema),
    defaultValues: {
      role: userRole || 'freelancer', // Use role from database, fallback to freelancer
      username: googleUsername || '',
      displayName: googleDisplayName || '',
    },
    mode: 'onChange',
  });

  // Debug logging for form values in development
  // React.useEffect(() => {
  //   if (process.env.NODE_ENV === 'development' && userType === 'pro') {
  //     console.log('Professional form defaults:', {
  //       userRole,
  //       defaultRole: userRole || 'freelancer',
  //       currentFormValues: professionalForm.getValues(),
  //     });
  //   }
  // }, [userType, userRole, professionalForm]);

  // Auto-submit for simple users - generate username from email and submit automatically
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  useEffect(() => {
    if (!showTypeSelection && userType === 'user' && !autoSubmitted && !isPending) {
      setAutoSubmitted(true);
      const autoUsername = generateUsernameFromEmail(userEmail);
      const formData = new FormData();
      formData.append('username', autoUsername);
      formData.append('role', 'user');
      formData.append('type', 'user');
      startTransition(() => {
        action(formData);
      });
    }
  }, [showTypeSelection, userType, autoSubmitted, isPending, userEmail, action, startTransition]);

  // Handle success state and redirect
  useEffect(() => {
    if (state.success && state.message) {
      setIsRedirecting(true);

      const handleRedirect = async () => {
        await refetch();
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Navigate based on user type
        if (userType === 'pro') {
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      };

      handleRedirect();
    }
  }, [state, refetch, router, userType]);

  const handleSimpleUserSubmit = (data: { username: string }) => {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('role', 'user');
    formData.append('type', 'user');
    startTransition(() => {
      action(formData);
    });
  };

  const handleProfessionalUserSubmit = (data: {
    role: string;
    username: string;
    displayName: string;
  }) => {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('displayName', data.displayName);
    formData.append('role', data.role);
    formData.append('type', 'pro');
    startTransition(() => {
      action(formData);
    });
  };

  // Handle type selection (for pending users)
  const handleTypeSelection = async () => {
    setTypeSelectionError('');

    startTransition(async () => {
      // Set default 'freelancer' role for pro users
      // They can select specific role in the next step (professional form)
      const result = await updateUserType({
        userId,
        type: selectedType,
        role: selectedType === 'pro' ? 'freelancer' : undefined,
      });

      if (!result.success) {
        setTypeSelectionError(
          result.error || 'Αποτυχία ενημέρωσης λογαριασμού',
        );
        return;
      }

      // Success - refetch session to get updated type
      await refetch();
      // Form will re-render with updated userType from session
      router.refresh();
    });
  };

  const handleTypeSelect = (type: Exclude<AuthType, ''>) => {
    setSelectedType(type);
  };

  // Show full-page loading state during redirect
  if (isRedirecting) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='flex items-center gap-2 justify-center text-gray-600'>
          <Loader2 className='w-5 h-5 animate-spin' />
          <span>
            {userType === 'pro'
              ? 'Μετάβαση στην Ολοκλήρωση Προφίλ...'
              : 'Μετάβαση στον Πίνακα Ελέγχου...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6' suppressHydrationWarning>
      {/* Type Selection UI - shown when user is in TYPE_SELECTION step */}
      {showTypeSelection && (
        <div className='space-y-6'>
          {/* Welcome Message */}
          <div className='text-center mb-6'>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Επιλογή Τύπου Λογαριασμού
            </h3>
            <p className='text-gray-700'>
              Συνδεθήκατε επιτυχώς ως <strong>{userEmail}</strong>
            </p>
          </div>

          {/* Type Selection Cards */}
          <div className='grid md:grid-cols-2 gap-6'>
            {/* Simple Profile Card */}
            <Card
              className={`p-6 border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
                selectedType === 'user'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-secondary'
              }`}
              onClick={() => handleTypeSelect('user')}
            >
              <div className='flex flex-col items-center text-center space-y-4'>
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    selectedType === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <User className='w-8 h-8' />
                </div>

                <div>
                  <h5 className='font-semibold text-gray-900'>Απλό Προφίλ</h5>
                  <p className='text-sm mt-2 text-gray-600'>
                    Ανακάλυψε υπηρεσίες
                    <br />
                    και επικοινώνησε άμεσα
                    <br />
                    με τους επαγγελματίες
                  </p>
                </div>
              </div>
            </Card>

            {/* Professional Profile Card */}
            <Card
              className={`p-6 border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
                selectedType === 'pro'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-secondary'
              }`}
              onClick={() => handleTypeSelect('pro')}
            >
              <div className='flex flex-col items-center text-center space-y-4'>
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    selectedType === 'pro'
                      ? 'bg-primary text-white'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Briefcase className='w-8 h-8' />
                </div>

                <div>
                  <h5 className='font-semibold text-gray-900'>
                    Επαγγελματικό Προφίλ
                  </h5>
                  <p className='text-sm mt-2 text-gray-600'>
                    Παρουσίασε τις
                    <br />
                    υπηρεσίες που προσφέρεις
                    <br />
                    και βρες νέους πελάτες
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Error Display */}
          {typeSelectionError && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{typeSelectionError}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleTypeSelection}
            disabled={isPendingTransition}
            className='w-full'
            size='lg'
          >
            {isPendingTransition && (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            )}
            {isPendingTransition
              ? 'Ενημέρωση...'
              : `Συνέχεια με ${selectedType === 'user' ? 'Απλό' : 'Επαγγελματικό'} λογαριασμό`}
          </Button>
        </div>
      )}

      {/* Simple User - auto-submitting with generated username, show loading state */}
      {!showTypeSelection && userType === 'user' && (
        <div className='space-y-4'>
          <div className='text-center mb-6'>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Ολοκλήρωση Εγγραφής
            </h3>
          </div>
          <div className='flex items-center gap-2 justify-center text-gray-600'>
            <Loader2 className='w-5 h-5 animate-spin' />
            <span>Ολοκλήρωση εγγραφής...</span>
          </div>
          {/* Error Display */}
          {!state.success && state.message && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Professional User Form - for type 'pro' (not in type selection step) */}
      {!showTypeSelection && userType === 'pro' && (
        <Form {...professionalForm}>
          <form
            onSubmit={professionalForm.handleSubmit(
              handleProfessionalUserSubmit,
            )}
            className='space-y-4'
            suppressHydrationWarning
          >
            <div className='text-center mb-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                Ολοκλήρωση Επαγγελματικής Εγγραφής
              </h3>
              <p className='text-gray-600'>
                Συμπληρώστε τα στοιχεία του επαγγελματικού σας προφίλ
              </p>
            </div>

            {/* Role Selection */}
            <FormField
              control={professionalForm.control}
              name='role'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Τύπος Επαγγελματία</FormLabel>
                  <div className='grid grid-cols-2 gap-3 pt-1'>
                    {roleOptions.map((option) => (
                      <button
                        key={option.value}
                        type='button'
                        onClick={() => field.onChange(option.value)}
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

            {/* Display Name */}
            <FormField
              control={professionalForm.control}
              name='displayName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Επωνυμία / Όνομα</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Πώς θα εμφανίζεστε στους πελάτες'
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

            {/* Username */}
            <FormField
              control={professionalForm.control}
              name='username'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='username'
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

            {/* Error Display */}
            {!state.success && state.message && (
              <Alert variant='destructive'>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}

            <FormButton
              type='submit'
              text='Ολοκλήρωση Εγγραφής'
              loadingText='Ολοκλήρωση...'
              loading={isPending}
              disabled={isPending}
              fullWidth
            />
          </form>
        </Form>
      )}
    </div>
  );
}
