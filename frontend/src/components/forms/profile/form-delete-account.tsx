'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

// Types
import { AuthUser } from '@/lib/types/auth';

// Icons
import { AlertTriangle, Loader2 } from 'lucide-react';

// Delete account schema
const deleteAccountSchema = z
  .object({
    username: z.string().min(1, 'Το username είναι υποχρεωτικό'),
    confirmUsername: z
      .string()
      .min(1, 'Η επιβεβαίωση username είναι υποχρεωτική'),
    confirmDeletion: z.boolean().refine((val) => val === true, {
      message: 'Πρέπει να επιβεβαιώσετε τη διαγραφή',
    }),
  })
  .refine((data) => data.username === data.confirmUsername, {
    message: 'Το username δεν ταιριάζει',
    path: ['confirmUsername'],
  });

type DeleteAccountFormData = z.infer<typeof deleteAccountSchema>;

interface DeleteAccountFormProps {
  user: AuthUser | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function DeleteAccountForm({
  user,
  onSuccess,
  onCancel,
}: DeleteAccountFormProps) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<DeleteAccountFormData>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: {
      username: '',
      confirmUsername: '',
      confirmDeletion: false,
    },
    mode: 'onChange',
  });

  const {
    handleSubmit,
    formState: { errors, isValid, isDirty },
    watch,
  } = form;

  const watchedUsername = watch('username');

  const onSubmit = async (data: DeleteAccountFormData) => {
    startTransition(async () => {
      setSubmitError(null);

      try {
        // Verify the username matches the current user
        if (!user || data.username !== user.username) {
          const errorMsg = 'Το username δεν ταιριάζει με τον λογαριασμό σας';
          setSubmitError(errorMsg);
          toast.error(errorMsg, {
            id: `delete-account-form-${Date.now()}`,
          });
          return;
        }

        // Import and call server action for deleting account
        const { deleteAccount } = await import('@/actions/auth/delete-account');

        const deleteFormData = new FormData();
        deleteFormData.set('username', data.username);
        deleteFormData.set('confirmUsername', data.confirmUsername);

        const result = await deleteAccount(null, deleteFormData);

        if (!result.success) {
          throw new Error(
            result.error || 'Σφάλμα κατά τη διαγραφή λογαριασμού',
          );
        }

        // Account deleted successfully
        onSuccess?.();

        // Hard redirect to home page
        // Better Auth's deleteUser API has already invalidated all sessions
        window.location.href = '/';
      } catch (error: any) {
        console.error('Delete account error:', error);
        const errorMsg = error.message || 'Αποτυχία διαγραφής λογαριασμού. Παρακαλώ δοκιμάστε ξανά.';
        setSubmitError(errorMsg);
        toast.error(errorMsg, {
          id: `delete-account-form-${Date.now()}`,
        });
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className='text-red-600'>Διαγραφή Λογαριασμού</DialogTitle>
        <DialogDescription>
          Αυτή η ενέργεια είναι μη αναστρέψιμη. Όλα τα δεδομένα σας θα
          διαγραφούν οριστικά.
        </DialogDescription>
        <div className='pb-4'>
          <p className='text-sm text-muted-foreground'>
            Θα διαγραφούν: το προφίλ σας, οι υπηρεσίες σας, τα μηνύματά σας, και
            όλα τα σχετικά δεδομένα.
          </p>
        </div>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          {/* Warning */}
          <Alert variant='destructive'>
            <AlertTriangle className='h-4 w-4' />
            <AlertDescription>
              <strong>Προσοχή:</strong> Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
              Όλα τα δεδομένα σας θα χαθούν οριστικά.
            </AlertDescription>
          </Alert>

          {/* Username */}
          <FormField
            control={form.control}
            name='username'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Εισάγετε το username σας: <strong>{user?.username}</strong>
                </FormLabel>
                <FormControl>
                  <Input
                    type='text'
                    placeholder={user?.username || 'username'}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm Username */}
          <FormField
            control={form.control}
            name='confirmUsername'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Επιβεβαιώστε το username σας</FormLabel>
                <FormControl>
                  <Input
                    type='text'
                    placeholder={user?.username || 'username'}
                    {...field}
                    disabled={!watchedUsername}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirmation Checkbox */}
          <FormField
            control={form.control}
            name='confirmDeletion'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel className='text-sm font-medium'>
                    Επιβεβαιώνω ότι θέλω να διαγράψω οριστικά τον λογαριασμό μου
                  </FormLabel>
                  <p className='text-xs text-muted-foreground'>
                    Κατανοώ ότι αυτή η ενέργεια δεν μπορεί να αναιρεθεί
                  </p>
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
              disabled={isPending}
            >
              Ακύρωση
            </Button>
            <Button
              type='submit'
              variant='destructive'
              disabled={isPending || !isValid}
            >
              {isPending ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Διαγραφή...
                </>
              ) : (
                'Διαγραφή Λογαριασμού'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
