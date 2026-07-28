'use client';

import React, { useState, useActionState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
} from '@/components/ui/form';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Icons
import { Loader2, Eye, EyeOff } from 'lucide-react';

// Actions and validation
import { changePassword } from '@/actions/auth/change-password';
import {
  passwordChangeSchema,
  type PasswordChangeInput,
} from '@/lib/validations/auth';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const initialState = {
  success: false,
  message: '',
};

export default function ChangePasswordForm({
  onSuccess,
  onCancel,
}: ChangePasswordFormProps) {
  const [state, action, isPending] = useActionState(
    changePassword,
    initialState,
  );
  const [isTransitionPending, startTransition] = useTransition();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const {
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = form;

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
    if (state.success && state.message) {
      toast.success(state.message, {
        id: `change-password-form-${Date.now()}`,
      });
      // Reset form
      form.reset();

      // Call success callback after a delay
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } else if (!state.success && state.message) {
      toast.error(state.message, {
        id: `change-password-form-${Date.now()}`,
      });
    }
  }, [state, form, onSuccess]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Αλλαγή Κωδικού</DialogTitle>
        <DialogDescription>
          Εισάγετε τον τρέχοντα κωδικό σας και τον νέο κωδικό που θέλετε να
          χρησιμοποιείτε.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form action={handleFormSubmit} className='space-y-4'>
          {/* Current Password */}
          <FormField
            control={form.control}
            name='currentPassword'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Τρέχων Κωδικός</FormLabel>
                <FormControl>
                  <div className='relative'>
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder='Εισάγετε τον τρέχοντα κωδικό σας'
                      {...field}
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder='Εισάγετε τον νέο κωδικό σας'
                      {...field}
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                    </Button>
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
                      placeholder='Επιβεβαιώστε τον νέο κωδικό σας'
                      {...field}
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                </FormControl>
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
              disabled={isPending || isTransitionPending}
            >
              {isPending || isTransitionPending ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Αλλαγή...
                </>
              ) : (
                'Αλλαγή Κωδικού'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
