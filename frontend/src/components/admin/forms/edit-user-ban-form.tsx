'use client';

import { useEffect, useActionState, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { banUserFormSchema } from '@/lib/validations/admin';
import { updateUserBanAction } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils/date';
import { populateFormData } from '@/lib/utils/form';

type EditUserBanFormValues = z.infer<typeof banUserFormSchema>;

interface EditUserBanFormProps {
  user: {
    id: string;
    banned: boolean;
    banReason?: string | null;
    banExpires?: Date | null;
  };
}

export function EditUserBanForm({ user }: EditUserBanFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateUserBanAction, null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [pendingData, setPendingData] = useState<EditUserBanFormValues | null>(null);

  const form = useForm<EditUserBanFormValues>({
    resolver: zodResolver(banUserFormSchema),
    mode: 'onChange',
    defaultValues: {
      userId: user.id,
      banReason: user.banReason || '',
      banDuration: 30, // Default 30 days
      isPermanent: !user.banExpires && user.banned,
    },
  });

  const isPermanent = form.watch('isPermanent');

  useEffect(() => {
    if (state?.success) {
      const message = user.banned ? 'User unbanned successfully' : 'User banned successfully';
      toast.success(message);
      router.refresh();
      form.reset(form.getValues());
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router, form, user.banned]);

  const handleFormSubmit = (formData: FormData) => {
    const allValues = form.getValues();

    // Calculate ban expiry date
    const banExpires = allValues.isPermanent
      ? null
      : new Date(
          Date.now() + (allValues.banDuration || 30) * 24 * 60 * 60 * 1000
        );

    const newFormData = new FormData();
    const payload = {
      userId: user.id,
      banned: 'true',
      banReason: allValues.banReason,
      banExpires: banExpires?.toISOString() || '',
    };

    populateFormData(newFormData, payload, {
      stringFields: ['userId', 'banned', 'banReason', 'banExpires'],
    });

    setPendingFormData(newFormData);
    setPendingData(allValues);
    setShowConfirmDialog(true);
  };

  const handleConfirmBan = () => {
    if (pendingFormData) {
      formAction(pendingFormData);
      setShowConfirmDialog(false);
      setPendingFormData(null);
      setPendingData(null);
    }
  };

  const handleUnban = () => {
    const newFormData = new FormData();
    const payload = {
      userId: user.id,
      banned: 'false',
      banReason: '',
      banExpires: '',
    };

    populateFormData(newFormData, payload, {
      stringFields: ['userId', 'banned', 'banReason', 'banExpires'],
    });

    formAction(newFormData);
  };

  return (
    <>
      <div className='space-y-4'>
        {/* Current Ban Status */}
        {user.banned && (
          <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-3'>
            <div className='flex items-center gap-2'>
              <ShieldAlert className='h-5 w-5 text-destructive' />
              <h3 className='font-semibold text-destructive'>
                User is Currently Banned
              </h3>
            </div>

            {user.banReason && (
              <div>
                <p className='text-sm font-medium mb-1'>Reason:</p>
                <p className='text-sm text-muted-foreground'>{user.banReason}</p>
              </div>
            )}

            {user.banExpires ? (
              <div>
                <p className='text-sm font-medium mb-1'>Ban Expires:</p>
                <p className='text-sm text-muted-foreground'>
                  {formatDateTime(user.banExpires)}
                </p>
              </div>
            ) : (
              <Badge variant='destructive'>Permanent Ban</Badge>
            )}

            <Button
              variant='outline'
              onClick={handleUnban}
              disabled={isPending}
              className='w-full'
            >
              {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Unban User
            </Button>
          </div>
        )}

        {/* Ban User Form */}
        {!user.banned && (
          <Form {...form}>
            <form action={handleFormSubmit} className='space-y-4'>
              <FormField
                control={form.control}
                name='banReason'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ban Reason *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Enter the reason for banning this user...'
                        className='min-h-[100px]'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a clear reason for the ban
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='isPermanent'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>Permanent Ban</FormLabel>
                      <FormDescription>
                        Ban user permanently without expiry
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isPermanent && (
                <FormField
                  control={form.control}
                  name='banDuration'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ban Duration (days)</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min='1'
                          max='365'
                          placeholder='30'
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Number of days for the ban (1-365)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className='flex justify-end gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => form.reset()}
                  disabled={isPending}
                >
                  Reset
                </Button>
                <Button
                  type='submit'
                  variant='destructive'
                  disabled={isPending || !form.formState.isDirty}
                >
                  {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  <AlertTriangle className='mr-2 h-4 w-4' />
                  Ban User
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2 text-destructive'>
              <AlertTriangle className='h-5 w-5' />
              Confirm User Ban
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to ban this user. This will prevent them from accessing
              the platform.
              {pendingData?.isPermanent
                ? ' This is a permanent ban.'
                : ` The ban will last for ${pendingData?.banDuration} days.`}
              <br />
              <br />
              Reason: {pendingData?.banReason}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBan}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Confirm Ban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
