'use client';

import { useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth/client';
import {
  reportProfileSchema,
  type ReportProfileFormValues,
} from '@/lib/validations/profile';
import { reportProfile } from '@/actions/profiles/report-profile';
import { populateFormData } from '@/lib/utils/form';
import FormButton from '@/components/shared/button-form';
import { useResettableActionState } from '@/lib/hooks/use-resettable-action-state';

interface ReportProfileDialogProps {
  profileId: string;
  profileName: string;
  profileUsername: string;
}

const initialState = {
  success: false,
  message: '',
};

export function ReportProfileDialog({
  profileId,
  profileName,
  profileUsername,
}: ReportProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  // Use resettable action state for form submission
  const [state, action, isPending, resetActionState] = useResettableActionState(
    reportProfile,
    initialState,
  );

  const form = useForm<ReportProfileFormValues>({
    resolver: zodResolver(reportProfileSchema),
    defaultValues: {
      profileId,
      profileName,
      profileUsername,
      description: '',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const {
    formState: { errors, isValid, isDirty },
    getValues,
    reset,
  } = form;

  // Handle form submission response - only show error toast
  useEffect(() => {
    if (!state.success && state.message) {
      toast.error(state.message, {
        id: `report-profile-${Date.now()}`,
      });
    }
  }, [state]);

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      reset();
      startTransition(() => {
        resetActionState();
      });
    }
  };

  // Form submission handler
  const handleFormSubmit = (formData: FormData) => {
    // Get all form values and populate FormData
    const allValues = getValues();

    populateFormData(formData, allValues, {
      stringFields: [
        'profileId',
        'profileName',
        'profileUsername',
        'description',
      ],
      skipEmpty: false, // Don't skip empty values for required fields
    });

    // Call server action directly (no await)
    action(formData);
  };

  const handleLogin = () => {
    router.push('/login');
    setOpen(false);
  };

  const handleRegister = () => {
    router.push('/register');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant='outline' size='default'>
          Αναφορά Προφίλ
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        {!session?.user ? (
          // Not Logged In State
          <>
            <DialogHeader>
              <DialogTitle>Αναφορά Προφίλ</DialogTitle>
              <DialogDescription>
                Για να κάνεις αναφορά προφίλ πρέπει να έχεις λογαριασμό
              </DialogDescription>
            </DialogHeader>
            <div className='flex flex-col sm:flex-row gap-3 pt-4'>
              <Button
                variant='outline'
                className='flex-1'
                onClick={handleLogin}
              >
                Σύνδεση
              </Button>
              <Button
                variant='outline'
                className='flex-1'
                onClick={handleRegister}
              >
                Εγγραφή
              </Button>
            </div>
          </>
        ) : state.success ? (
          // Success State - Show success message
          <>
            <DialogHeader className='pb-4 border-b'>
              <DialogTitle>Αναφορά Προφίλ</DialogTitle>
              <DialogDescription className='sr-only'>
                Επιτυχής υποβολή αναφοράς
              </DialogDescription>
            </DialogHeader>
            <div className='flex flex-col items-center justify-center py-8 space-y-4'>
              <CheckCircle2 className='w-16 h-16 text-green-600' />
              <div className='text-center space-y-2'>
                <p className='text-lg font-semibold'>
                  Η αναφορά σας υποβλήθηκε επιτυχώς!
                </p>
              </div>
            </div>
          </>
        ) : (
          // Logged In State - Report Form
          <>
            <DialogHeader className='pb-4 border-b'>
              <DialogTitle>Αναφορά Προφίλ</DialogTitle>
              <DialogDescription className='sr-only'>
                Φόρμα αναφοράς προφίλ
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form action={handleFormSubmit} className='space-y-6'>
                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Περιγραφή Αναφοράς</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder='Περίγραψε το ζήτημα σχετικά με το προφίλ και θα το ελέγξουμε άμεσα'
                          className='min-h-[120px] resize-none'
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormButton
                  type='submit'
                  text='Αποστολή Αναφοράς Προφίλ'
                  loading={isPending}
                  loadingText='Υποβολή...'
                  disabled={!isValid || !isDirty || isPending}
                  fullWidth
                  icon='send'
                  iconPosition='right'
                />
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
