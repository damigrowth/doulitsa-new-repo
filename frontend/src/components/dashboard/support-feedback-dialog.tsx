'use client';

import { useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LifeBuoy, CheckCircle2 } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth/client';
import {
  supportFormSchema,
  type SupportFormValues,
} from '@/lib/validations/support';
import { submitFeedback } from '@/actions/support/submit-feedback';
import { populateFormData } from '@/lib/utils/form';
import FormButton from '@/components/shared/button-form';
import { useResettableActionState } from '@/lib/hooks/use-resettable-action-state';

const initialState = {
  success: false,
  message: '',
};

export function SupportFeedbackDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  // Use resettable action state for form submission
  const [state, action, isPending, resetActionState] = useResettableActionState(
    submitFeedback,
    initialState,
  );

  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      issueType: '' as 'problem' | 'option' | 'feature',
      description: '',
      pageUrl: '',
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
        id: `support-feedback-${Date.now()}`,
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

    // Capture current page URL
    const currentPageUrl =
      typeof window !== 'undefined' ? window.location.href : '';

    populateFormData(
      formData,
      { ...allValues, pageUrl: currentPageUrl },
      {
        stringFields: ['issueType', 'description', 'pageUrl'],
        skipEmpty: false,
      },
    );

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
        <button className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'>
          <LifeBuoy className='h-4 w-4' />
          <span>Υποστήριξη / Αναφορά</span>
        </button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        {!session?.user ? (
          // Not Logged In State
          <>
            <DialogHeader>
              <DialogTitle>Υποστήριξη / Αναφορά</DialogTitle>
              <DialogDescription>
                Για να υποβάλεις αναφορά πρέπει να έχεις λογαριασμό
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
              <DialogTitle>Υποστήριξη / Αναφορά</DialogTitle>
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
          // Logged In State - Feedback Form
          <>
            <DialogHeader className='pb-4 border-b'>
              <DialogTitle>Αναφορά ζητήματος</DialogTitle>
              <DialogDescription>
                Βοήθησε μας να βελτιώσουμε την εμπειρία στη Doulitsa.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form action={handleFormSubmit} className='space-y-6'>
                <FormField
                  control={form.control}
                  name='issueType'
                  render={({ field }) => (
                    <FormItem className='space-y-3'>
                      <FormLabel>Είδος ζητήματος</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className='flex flex-col space-y-1'
                          disabled={isPending}
                        >
                          <FormItem className='flex items-center space-x-3 space-y-0'>
                            <FormControl>
                              <RadioGroupItem value='problem' />
                            </FormControl>
                            <FormLabel className='font-normal cursor-pointer'>
                              Αναφορά Προβλήματος
                            </FormLabel>
                          </FormItem>
                          <FormItem className='flex items-center space-x-3 space-y-0'>
                            <FormControl>
                              <RadioGroupItem value='option' />
                            </FormControl>
                            <FormLabel className='font-normal cursor-pointer'>
                              Προσθήκη μιας νέας επιλογής
                            </FormLabel>
                          </FormItem>
                          <FormItem className='flex items-center space-x-3 space-y-0'>
                            <FormControl>
                              <RadioGroupItem value='feature' />
                            </FormControl>
                            <FormLabel className='font-normal cursor-pointer'>
                              Πρόταση νέας δυνατότητας
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Περιγραφή</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder='Περιέγραψε το ζήτημα και θα το ελέγξουμε άμεσα'
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
                  text='Αποστολή Αναφοράς'
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
