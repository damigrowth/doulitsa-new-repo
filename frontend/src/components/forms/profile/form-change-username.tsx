'use client';

import React, { useState, useActionState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/client';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

// Types
import { AuthUser } from '@/lib/types/auth';

// Validation
import {
  changeUsernameSchema,
  ChangeUsernameInput,
} from '@/lib/validations/user';

// Actions
import { changeUsername } from '@/actions/auth/change-username';

// Utilities
import {
  getDaysRemaining,
  USERNAME_COOLDOWN_DAYS,
} from '@/lib/utils/cooldown';
import { formatUsername } from '@/lib/utils/validation/formats';

// Icons
import { Info, Loader2, Clock } from 'lucide-react';

interface ChangeUsernameFormProps {
  user: AuthUser | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const initialState: {
  success: boolean;
  message: string;
  data?: { newUsername?: string; nextChangeDate?: string };
} = {
  success: false,
  message: '',
};

export default function ChangeUsernameForm({
  user,
  onSuccess,
  onCancel,
}: ChangeUsernameFormProps) {
  const [state, action, isPending] = useActionState(
    changeUsername,
    initialState,
  );
  const [isTransitionPending, startTransition] = useTransition();
  const router = useRouter();
  const { refetch: refreshSession } = useSession();

  const userWithFields = user as any;
  const daysRemaining = getDaysRemaining(
    userWithFields?.lastUsernameChangeAt,
    USERNAME_COOLDOWN_DAYS,
  );
  const canChange = daysRemaining === null;

  const [invalidCharsWarning, setInvalidCharsWarning] = useState<{
    newUsername: boolean;
    confirmUsername: boolean;
  }>({ newUsername: false, confirmUsername: false });

  const form = useForm<ChangeUsernameInput>({
    resolver: zodResolver(changeUsernameSchema),
    defaultValues: {
      newUsername: '',
      confirmUsername: '',
    },
    mode: 'onChange',
  });

  const {
    formState: { isValid },
  } = form;

  const hasInvalidChars = (raw: string): boolean => /[^a-zA-Z0-9_-]/.test(raw);

  // Track if success toast was already shown to prevent duplicates
  const toastShownRef = React.useRef(false);

  // Handle form submission
  const handleFormSubmit = async (formData: FormData) => {
    // Trigger validation for all fields
    const isValid = await form.trigger();

    if (!isValid) {
      return;
    }

    // Call the server action inside a transition
    startTransition(() => {
      action(formData);
    });
  };

  // Handle form submission responses with toast notifications
  React.useEffect(() => {
    if (state.success && state.message && !toastShownRef.current) {
      toastShownRef.current = true;

      // Show success toast with combined message
      toast.success(
        `${state.message} Νέο username: ${state.data?.newUsername || ''}`,
        { id: 'change-username-success' },
      );

      // Reset form
      form.reset();

      // Close dialog immediately
      onSuccess?.();

      // Then refresh session and router
      refreshSession();
      router.refresh();
    } else if (!state.success && state.message) {
      toast.error(state.message, { id: 'change-username-error' });
    }

    // Reset ref when state changes to non-success
    if (!state.success) {
      toastShownRef.current = false;
    }
  }, [state, form, onSuccess, refreshSession, router]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Αλλαγή Username</DialogTitle>
        <DialogDescription>
          Μπορείτε να αλλάξετε το username σας μία φορά κάθε{' '}
          {USERNAME_COOLDOWN_DAYS} ημέρες.
        </DialogDescription>
      </DialogHeader>

      {/* Cooldown warning if not allowed */}
      {!canChange && daysRemaining && (
        <Alert>
          <Clock className='h-4 w-4' />
          <AlertDescription>
            Μπορείτε να αλλάξετε ξανά το username σας σε{' '}
            <strong>
              {daysRemaining} {daysRemaining === 1 ? 'ημέρα' : 'ημέρες'}
            </strong>
            .
          </AlertDescription>
        </Alert>
      )}

      {canChange && (
        <Form {...form}>
          <form action={handleFormSubmit} className='space-y-4'>
            {/* Info Alert */}
            <Alert>
              <Info className='h-4 w-4' />
              <AlertDescription>
                <strong>ΠΡΟΣΟΧΗ:</strong> Το url του προφίλ σας θα ενημερωθεί
                με το νέο username και δεν θα ισχύει το παλιό.
              </AlertDescription>
            </Alert>

            {/* Current Username (read-only) */}
            <div className='space-y-2'>
              <FormLabel className='text-muted-foreground'>
                Τρέχον Username
              </FormLabel>
              <Input
                type='text'
                value={user?.username || ''}
                disabled
                className='bg-muted'
              />
            </div>

            {/* New Username */}
            <FormField
              control={form.control}
              name='newUsername'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Νέο Username</FormLabel>
                  <FormControl>
                    <Input
                      type='text'
                      placeholder='Εισάγετε νέο username'
                      autoComplete='off'
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const showWarning = hasInvalidChars(raw);
                        setInvalidCharsWarning((prev) => ({
                          ...prev,
                          newUsername: showWarning,
                        }));
                        field.onChange(formatUsername(raw));
                      }}
                    />
                  </FormControl>
                  {invalidCharsWarning.newUsername && (
                    <p className='text-sm text-destructive'>
                      Επιτρέπονται μόνο μικροί λατινικοί χαρακτήρες, αριθμοί,
                      παύλες (-) και κάτω παύλες (_)
                    </p>
                  )}
                  <FormDescription>
                    3-30 χαρακτήρες. Επιτρέπονται μόνο λατινικοί χαρακτήρες,
                    αριθμοί, παύλες (-) και κάτω παύλες (_).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm New Username */}
            <FormField
              control={form.control}
              name='confirmUsername'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Επιβεβαίωση Username</FormLabel>
                  <FormControl>
                    <Input
                      type='text'
                      placeholder='Επιβεβαιώστε το νέο username'
                      autoComplete='off'
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const showWarning = hasInvalidChars(raw);
                        setInvalidCharsWarning((prev) => ({
                          ...prev,
                          confirmUsername: showWarning,
                        }));
                        field.onChange(formatUsername(raw));
                      }}
                    />
                  </FormControl>
                  {invalidCharsWarning.confirmUsername && (
                    <p className='text-sm text-destructive'>
                      Επιτρέπονται μόνο μικροί λατινικοί χαρακτήρες, αριθμοί,
                      παύλες (-) και κάτω παύλες (_)
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={onCancel}
                disabled={isPending || isTransitionPending}
              >
                Ακύρωση
              </Button>
              <Button type='submit' disabled={isPending || isTransitionPending || !isValid}>
                {isPending || isTransitionPending ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Αλλαγή...
                  </>
                ) : (
                  'Αλλαγή Username'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      )}

      {/* Show only cancel button when on cooldown */}
      {!canChange && (
        <DialogFooter>
          <Button type='button' variant='outline' onClick={onCancel}>
            Κλείσιμο
          </Button>
        </DialogFooter>
      )}
    </>
  );
}
