'use client';

import React, { useActionState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Standard shadcn/ui imports
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

// Icons (lucide-react only)
import { AlertCircle } from 'lucide-react';

// Utilities
import { populateFormData } from '@/lib/utils/form';

// Validation schema and server action
import {
  verificationFormSchema,
  type VerificationInput,
} from '@/lib/validations/profile';
import { submitVerificationRequest } from '@/actions/profiles/verification';
import FormButton from '@/components/shared/button-form';
import { AuthUser } from '@/lib/types/auth';
import { useRouter } from 'next/navigation';
import { Profile } from '@/lib/prisma-types';

const initialState = {
  success: false,
  message: '',
};

type VerificationStatus = {
  status: string;
  afm?: string;
  name?: string;
  address?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
} | null;

type VerificationFormProps = {
  initialUser: AuthUser | null;
  initialProfile: Profile | null;
  verificationData: VerificationStatus;
};

export default function VerificationForm({
  initialUser,
  initialProfile,
  verificationData,
}: VerificationFormProps) {
  const [state, action, isPending] = useActionState(
    submitVerificationRequest,
    initialState,
  );
  const router = useRouter();

  const form = useForm<VerificationInput>({
    resolver: zodResolver(verificationFormSchema),
    defaultValues: {
      afm: '',
      name: '',
      address: '',
      phone: '',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const {
    formState: { errors, isValid, isDirty },
    getValues,
  } = form;

  // Update form values when verification data is available
  useEffect(() => {
    if (verificationData) {
      const resetData = {
        afm: verificationData.afm || '',
        name: verificationData.name || '',
        address: verificationData.address || '',
        phone: verificationData.phone || '',
      };
      form.reset(resetData);
    }
  }, [verificationData, form]);

  // Handle form submission response
  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message, {
        id: `verification-form-${Date.now()}`,
      });
      router.refresh();
    } else if (!state.success && state.message) {
      toast.error(state.message, {
        id: `verification-form-${Date.now()}`,
      });
    }
  }, [state, router]);

  // Form submission handler
  const handleFormSubmit = (formData: FormData) => {
    // Get all form values and populate FormData
    const allValues = getValues();

    populateFormData(formData, allValues, {
      stringFields: ['afm', 'name', 'address', 'phone'],
      skipEmpty: false, // Don't skip empty values for required fields
    });

    // Call server action directly (no await)
    action(formData);
  };

  // Check if form should be disabled (pending or approved)
  const isFormDisabled =
    verificationData?.status === 'PENDING' ||
    verificationData?.status === 'APPROVED';

  return (
    <Form {...form}>
      <form
        action={handleFormSubmit}
        className='space-y-6 p-6 border rounded-lg shadow bg-sidebar'
      >
        {/* AFM Field */}
        <FormField
          control={form.control}
          name='afm'
          render={({ field }) => (
            <FormItem>
              <FormLabel>ΑΦΜ *</FormLabel>
              <FormControl>
                <Input
                  placeholder='123456789'
                  {...field}
                  disabled={isFormDisabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Name Field */}
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Επωνυμία *</FormLabel>
              <FormControl>
                <Input
                  placeholder='π.χ. Γιάννης Παπαδόπουλος ή Εταιρεία ΑΕ'
                  {...field}
                  disabled={isFormDisabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address Field */}
        <FormField
          control={form.control}
          name='address'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Επαγγελματική Διεύθυνση *</FormLabel>
              <FormControl>
                <Input
                  placeholder='π.χ. Λεωφόρος Κηφισίας 123, Αθήνα 11526'
                  {...field}
                  disabled={isFormDisabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone Field */}
        <FormField
          control={form.control}
          name='phone'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Τηλέφωνο Επικοινωνίας *</FormLabel>
              <FormControl>
                <Input
                  placeholder='Εισάγετε τηλέφωνο επικοινωνίας'
                  {...field}
                  disabled={isFormDisabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Information Alert */}
        {verificationData?.status !== 'APPROVED' && (
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              <strong>Σημαντικό:</strong> Τα στοιχεία θα χρησιμοποιηθούν για τη
              διασταύρωση ότι το ΑΦΜ σας αντιστοιχεί σε ενεργό επαγγελματία ή επιχείρηση. Η διαδικασία ελέγχου συνήθως διαρκεί 1-2 εργάσιμες
              ημέρες.
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        {verificationData?.status !== 'APPROVED' && (
          <div className='flex justify-end space-x-4'>
            <FormButton
              variant='outline'
              type='button'
              text='Ακύρωση'
              onClick={() => form.reset()}
              disabled={isPending || !isDirty || isFormDisabled}
            />
            <FormButton
              type='submit'
              text={
                verificationData ? 'Ενημέρωση Στοιχείων' : 'Υποβολή Αιτήματος'
              }
              loadingText='Υποβολή...'
              loading={isPending}
              disabled={isPending || !isValid || !isDirty || isFormDisabled}
            />
          </div>
        )}
      </form>
    </Form>
  );
}
