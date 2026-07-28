'use client';

import React, { useState, useActionState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { ActionResponse } from '@/lib/types/api';

// Validation
import {
  upgradeToProSchema,
  type UpgradeToProInput,
} from '@/lib/validations/user';

// Actions
import { upgradeToProAccount } from '@/actions/auth/upgrade-to-pro';
import { formatUsername } from '@/lib/utils/validation/formats';

// Icons
import { AlertTriangle, Building2, Loader2, User } from 'lucide-react';

interface UpgradeToProFormProps {
  user: AuthUser | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const initialState: ActionResponse = {
  success: false,
  message: '',
};

export default function UpgradeToProForm({
  user,
  onSuccess,
  onCancel,
}: UpgradeToProFormProps) {
  const [state, action, isPending] = useActionState(
    upgradeToProAccount,
    initialState,
  );
  const [isTransitionPending, startTransition] = useTransition();
  const { refetch: refreshSession } = useSession();

  const form = useForm<UpgradeToProInput>({
    resolver: zodResolver(upgradeToProSchema),
    defaultValues: {
      username: user?.username ?? '',
    },
    mode: 'onChange',
  });

  const {
    formState: { isValid },
  } = form;

  const [usernameInvalidChars, setUsernameInvalidChars] = useState(false);

  // Track if success toast was already shown to prevent duplicates
  const toastShownRef = React.useRef(false);

  // Handle form submission
  const handleFormSubmit = async (formData: FormData) => {
    const valid = await form.trigger();

    if (!valid) {
      return;
    }

    startTransition(() => {
      action(formData);
    });
  };

  // Handle form submission responses
  React.useEffect(() => {
    if (state.success && state.message && !toastShownRef.current) {
      toastShownRef.current = true;

      toast.success(state.message, { id: 'upgrade-to-pro-success' });

      const handleRedirect = async () => {
        onSuccess?.();
        await refreshSession();
        await new Promise((resolve) => setTimeout(resolve, 300));
        window.location.href = '/onboarding';
      };

      handleRedirect();
    } else if (!state.success && state.message) {
      toast.error(state.message, { id: 'upgrade-to-pro-error' });
    }

    if (!state.success) {
      toastShownRef.current = false;
    }
  }, [state.success, state.message, onSuccess, refreshSession]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Αλλαγή σε Επαγγελματικό Λογαριασμό</DialogTitle>
        <DialogDescription>
          Αναβαθμίστε τον λογαριασμό σας σε επαγγελματικό για να παρουσιάσετε τις υπηρεσίες που προσφέρετε.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form action={handleFormSubmit} className='space-y-4'>
          {/* Warning Alert */}
          <Alert variant='destructive'>
            <AlertTriangle className='h-4 w-4' />
            <AlertDescription>
              <strong>Προσοχή:</strong> Η αλλαγή είναι μόνιμη. Μετά την
              αναβάθμιση θα πρέπει να συμπληρώσετε το επαγγελματικό σας προφίλ
              για να συνεχίσετε.
            </AlertDescription>
          </Alert>

          {/* Username */}
          <FormField
            control={form.control}
            name='username'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    type='text'
                    placeholder='π.χ. giannis-papadopoulos'
                    autoComplete='off'
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
                <FormDescription>
                  3-30 χαρακτήρες. Επιτρέπονται μόνο λατινικοί χαρακτήρες,
                  αριθμοί, παύλες (-) και κάτω παύλες (_).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Pro Type Selection */}
          <FormField
            control={form.control}
            name='role'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Τύπος Λογαριασμού</FormLabel>
                {/* Hidden input to include role in native FormData */}
                <input type='hidden' name='role' value={field.value ?? ''} />
                <div className='grid grid-cols-2 gap-3 pt-1'>
                  {[
                    { value: 'freelancer', label: 'Επαγγελματίας', Icon: User },
                    { value: 'company', label: 'Επιχείρηση', Icon: Building2 },
                  ].map((option) => (
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

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={onCancel}
              disabled={isPending || isTransitionPending}
            >
              Ακύρωση
            </Button>
            <Button
              type='submit'
              disabled={isPending || isTransitionPending || !isValid}
            >
              {isPending || isTransitionPending ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Αναβάθμιση...
                </>
              ) : (
                'Αναβάθμιση Λογαριασμού'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
