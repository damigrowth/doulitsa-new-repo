'use client';

import { useEffect, useActionState, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateUserStatusSchema } from '@/lib/validations/admin';
import { updateUserStatusAction } from '@/actions/admin';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { populateFormData } from '@/lib/utils/form';
import { RoleSelect } from './role-select';

type EditUserStatusFormValues = z.infer<typeof updateUserStatusSchema>;

interface EditUserStatusFormProps {
  user: {
    id: string;
    role: string;
    type: string;
    step: string;
    emailVerified: boolean;
    confirmed: boolean;
    blocked: boolean;
  };
  currentUserRole: string; // The admin user's role (admin or support)
}

export function EditUserStatusForm({ user, currentUserRole }: EditUserStatusFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateUserStatusAction, null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  const form = useForm<EditUserStatusFormValues>({
    resolver: zodResolver(updateUserStatusSchema),
    mode: 'onChange',
    defaultValues: {
      userId: user.id,
      role: user.role as any,
      type: user.type as 'user' | 'pro',
      step: user.step as any,
      emailVerified: user.emailVerified,
      confirmed: user.confirmed,
      blocked: user.blocked,
    },
  });

  useEffect(() => {
    if (state?.success) {
      toast.success('User status updated successfully');
      router.refresh();
      form.reset(form.getValues());
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router, form]);

  const handleFormSubmit = (formData: FormData) => {
    const allValues = form.getValues();

    // Check if critical fields are being changed
    const criticalChange =
      allValues.role !== user.role ||
      allValues.blocked !== user.blocked ||
      allValues.step !== user.step;

    if (criticalChange) {
      const newFormData = new FormData();
      const payload = {
        userId: user.id,
        role: allValues.role,
        type: allValues.type,
        step: allValues.step,
        emailVerified: allValues.emailVerified?.toString(),
        confirmed: allValues.confirmed?.toString(),
        blocked: allValues.blocked?.toString(),
      };

      populateFormData(newFormData, payload, {
        stringFields: ['userId', 'role', 'type', 'step', 'emailVerified', 'confirmed', 'blocked'],
      });

      setPendingFormData(newFormData);
      setShowConfirmDialog(true);
      return;
    }

    // No critical changes, proceed directly
    const payload = {
      userId: user.id,
      role: allValues.role,
      type: allValues.type,
      step: allValues.step,
      emailVerified: allValues.emailVerified?.toString(),
      confirmed: allValues.confirmed?.toString(),
      blocked: allValues.blocked?.toString(),
    };

    populateFormData(formData, payload, {
      stringFields: ['userId', 'role', 'type', 'step', 'emailVerified', 'confirmed', 'blocked'],
    });

    formAction(formData);
  };

  const handleConfirmChanges = () => {
    if (pendingFormData) {
      formAction(pendingFormData);
      setShowConfirmDialog(false);
      setPendingFormData(null);
    }
  };

  return (
    <>
      <Form {...form}>
        <form action={handleFormSubmit} className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <FormField
              control={form.control}
              name='role'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <RoleSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      currentUserRole={currentUserRole}
                    />
                  </FormControl>
                  <FormDescription>
                    User&apos;s role in the system
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select type' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='user'>User</SelectItem>
                      <SelectItem value='pro'>Professional</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Account type (user or professional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='step'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Journey Step</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select step' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='EMAIL_VERIFICATION'>
                        Email Verification
                      </SelectItem>
                      <SelectItem value='ONBOARDING'>Onboarding</SelectItem>
                      <SelectItem value='DASHBOARD'>Dashboard</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    User&apos;s current step in the onboarding journey
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='space-y-4'>
            <FormField
              control={form.control}
              name='emailVerified'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Email Verified</FormLabel>
                    <FormDescription>
                      Mark user&apos;s email as verified
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

            <FormField
              control={form.control}
              name='confirmed'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Confirmed</FormLabel>
                    <FormDescription>
                      User account confirmation status
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

            <FormField
              control={form.control}
              name='blocked'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4 border-destructive/50'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base text-destructive'>
                      Blocked
                    </FormLabel>
                    <FormDescription>
                      Block user from accessing the platform
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
          </div>

          <div className='flex justify-end gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => form.reset()}
              disabled={isPending}
            >
              Reset
            </Button>
            <Button type='submit' disabled={isPending || !form.formState.isDirty}>
              {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Critical Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to make critical changes to the user&apos;s account. This
              includes role changes, blocking status, or journey step
              modifications. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChanges}>
              Confirm Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
