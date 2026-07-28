'use client';

import React, { useActionState, useEffect, useTransition } from 'react';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Selectbox } from '@/components/ui/selectbox';
import { toast } from 'sonner';

// Custom components
import { LazyCombobox } from '@/components/ui/lazy-combobox';
import { Currency } from '@/components/ui/currency';
import YearSelect from '@/components/ui/year-select';

// Icons (lucide-react only)
import { Loader2 } from 'lucide-react';

// Auth and utilities
import { formatInput } from '@/lib/utils/validation/formats';
import { populateFormData } from '@/lib/utils/form';

// Dataset options
import {
  contactMethodsOptions,
  paymentMethodsOptions,
  settlementMethodsOptions,
  budgetOptions,
} from '@/constants/datasets/options';
// Validation schema and server actions
import {
  profileAdditionalInfoUpdateSchema,
  type ProfileAdditionalInfoUpdateInput,
} from '@/lib/validations/profile';
import { updateProfileAdditionalInfo } from '@/actions/profiles/additional-info';
import { updateProfileAdditionalInfoAdmin } from '@/actions/admin/profiles/additional-info';
import FormButton from '@/components/shared/button-form';
import { AuthUser, ProfileWithRelations } from '@/lib/types/auth';
import { useRouter } from 'next/navigation';
import { Profile } from '@/lib/prisma-types';

const initialState = {
  success: false,
  message: '',
};

interface AdditionalInfoFormProps {
  initialUser: AuthUser | null;
  initialProfile: Profile | null;
  adminMode?: boolean;
  hideCard?: boolean;
}

export default function AdditionalInfoForm({
  initialUser,
  initialProfile,
  adminMode = false,
  hideCard = false,
}: AdditionalInfoFormProps) {
  // Select the appropriate action based on admin mode
  const actionToUse = adminMode
    ? updateProfileAdditionalInfoAdmin
    : updateProfileAdditionalInfo;

  const [state, action, isPending] = useActionState(actionToUse, initialState);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Extract data from props
  const profile = initialProfile;

  const form = useForm<ProfileAdditionalInfoUpdateInput>({
    resolver: zodResolver(profileAdditionalInfoUpdateSchema),
    defaultValues: {
      rate: null,
      commencement: '',
      experience: null,
      contactMethods: [],
      paymentMethods: [],
      settlementMethods: [],
      budget: '',
      terms: '',
    },
    mode: 'onChange', // Real-time validation
  });

  const {
    formState: { errors, isValid, isDirty },
    setValue,
    getValues,
    watch,
  } = form;

  // Update form values when initial data is available
  useEffect(() => {
    if (profile) {
      const resetData = {
        rate: profile.rate || null,
        commencement: profile.commencement || '',
        experience: profile.experience || null,
        contactMethods: profile.contactMethods || [],
        paymentMethods: profile.paymentMethods || [],
        settlementMethods: profile.settlementMethods || [],
        budget: profile.budget || '',
        terms: profile.terms || '',
      };
      form.reset(resetData);
    }
  }, [profile, form]);

  // Handle successful form submission
  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message, {
        id: `additional-info-form-${Date.now()}`,
      });
      router.refresh();
    } else if (!state.success && state.message) {
      toast.error(state.message, {
        id: `additional-info-form-${Date.now()}`,
      });
    }
  }, [state, router]);

  // Form submission handler using utility function
  const handleFormSubmit = (formData: FormData) => {
    // Get all form values and populate FormData using utility function
    const allValues = getValues();

    populateFormData(formData, allValues, {
      stringFields: ['commencement', 'budget', 'terms'], // Simple text fields
      numericFields: ['rate'], // Numeric fields
      jsonFields: [
        'contactMethods',
        'paymentMethods',
        'settlementMethods',
      ], // Arrays that need JSON.stringify
      skipEmpty: true, // Skip null/undefined/empty values
    });

    // Add profileId when in admin mode
    if (adminMode && initialProfile?.id) {
      formData.set('profileId', initialProfile.id);
    }

    // Call the server action with startTransition
    startTransition(() => {
      action(formData);
    });
  };

  return (
    <Form {...form}>
      <form
        action={handleFormSubmit}
        className={
          hideCard
            ? 'space-y-6'
            : 'space-y-6 p-6 border rounded-lg shadow bg-sidebar'
        }
      >
        {/* Row 1: Three columns of method selectors */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* Contact Methods */}
          <FormField
            control={form.control}
            name='contactMethods'
            render={({ field }) => (
              <FormItem className='space-y-2 flex flex-col'>
                <FormLabel>Μέθοδοι Επικοινωνίας</FormLabel>
                <FormControl>
                  <LazyCombobox
                    multiple
                    options={contactMethodsOptions}
                    values={field.value || []}
                    onMultiSelect={(selectedOptions) => {
                      const selectedIds = selectedOptions.map((opt) => opt.id);
                      setValue('contactMethods', selectedIds, {
                        shouldDirty: true,
                      });
                    }}
                    onSelect={() => {}}
                    placeholder='Επιλέξτε μεθόδους...'
                    searchPlaceholder='Αναζήτηση...'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Payment Methods */}
          <FormField
            control={form.control}
            name='paymentMethods'
            render={({ field }) => (
              <FormItem className='space-y-2 flex flex-col'>
                <FormLabel>Μέθοδοι Πληρωμής</FormLabel>
                <FormControl>
                  <LazyCombobox
                    multiple
                    options={paymentMethodsOptions}
                    values={field.value || []}
                    onMultiSelect={(selectedOptions) => {
                      const selectedIds = selectedOptions.map((opt) => opt.id);
                      setValue('paymentMethods', selectedIds, {
                        shouldDirty: true,
                      });
                    }}
                    onSelect={() => {}}
                    placeholder='Επιλέξτε μεθόδους...'
                    searchPlaceholder='Αναζήτηση...'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Settlement Methods */}
          <FormField
            control={form.control}
            name='settlementMethods'
            render={({ field }) => (
              <FormItem className='space-y-2 flex flex-col'>
                <FormLabel>Μέθοδοι Εξόφλησης</FormLabel>
                <FormControl>
                  <LazyCombobox
                    multiple
                    options={settlementMethodsOptions}
                    values={field.value || []}
                    onMultiSelect={(selectedOptions) => {
                      const selectedIds = selectedOptions.map((opt) => opt.id);
                      setValue('settlementMethods', selectedIds, {
                        shouldDirty: true,
                      });
                    }}
                    onSelect={() => {}}
                    placeholder='Επιλέξτε μεθόδους...'
                    searchPlaceholder='Αναζήτηση...'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Row 2: Commencement, Rate and Budget */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* Commencement Field */}
          <FormField
            control={form.control}
            name='commencement'
            render={({ field }) => (
              <FormItem className='space-y-2 flex flex-col'>
                <FormLabel>Έναρξη Δραστηριότητας</FormLabel>
                <FormControl>
                  <YearSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder='π.χ. 2020'
                    clearable
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Rate Field */}
          <FormField
            control={form.control}
            name='rate'
            render={({ field }) => (
              <FormItem className='space-y-2 flex flex-col'>
                <FormLabel>Ωριαία Αμοιβή</FormLabel>
                <FormControl>
                  <Currency
                    currency='€'
                    position='right'
                    placeholder='π.χ. 25'
                    min={0}
                    max={1000}
                    allowDecimals={false}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Budget Field */}
          <FormField
            control={form.control}
            name='budget'
            render={({ field }) => (
              <FormItem className='space-y-2 flex flex-col'>
                <FormLabel>Ελάχιστος Προϋπολογισμός Εργασιών</FormLabel>
                <FormControl>
                  <Selectbox
                    options={budgetOptions}
                    value={field.value || ''}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setValue('budget', value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder='Minimum budget...'
                    fullWidth
                    clearable
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Row 3: Terms (full width) */}
        <FormField
          control={form.control}
          name='terms'
          render={({ field }) => (
            <FormItem className='flex flex-col'>
              <FormLabel>Όροι Συνεργασίας</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='π.χ. Απαιτείται 50% προκαταβολή, διόρθωση έως 2 φορές...'
                  className='min-h-[120px]'
                  rows={5}
                  value={field.value}
                  onChange={(e) => {
                    const formatted = formatInput({
                      value: e.target.value,
                      maxLength: 1000,
                    });
                    setValue('terms', formatted, {
                      shouldDirty: true,
                      // shouldValidate: true,
                    });
                  }}
                />
              </FormControl>
              <div className='text-xs text-gray-500 self-end'>
                {field.value?.length || 0}/1000
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className='flex justify-end space-x-4'>
          <FormButton
            variant='outline'
            type='button'
            text='Ακύρωση'
            onClick={() => form.reset()}
            disabled={isPending || !isDirty}
          />
          <FormButton
            type='submit'
            text='Αποθήκευση'
            loadingText='Αποθήκευση...'
            loading={isPending}
            disabled={isPending || !isValid || !isDirty}
          />
        </div>
      </form>
    </Form>
  );
}
