'use client';

import React, { useEffect, useActionState, useTransition, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Shadcn UI components
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Icons
import { Loader2 } from 'lucide-react';

// Import validation schema
import { billingSchema, type BillingInput } from '@/lib/validations/profile';

// Import server actions
import { updateProfileBilling } from '@/actions/profiles/billing';
import { updateProfileBillingAdmin } from '@/actions/admin/profiles/billing';
import { lookupAfm } from '@/actions/profiles/lookup-afm';

// Utility for form data population
import { populateFormData, parseJSONValue } from '@/lib/utils/form';

import FormButton from '@/components/shared/button-form';
import { AuthUser } from '@/lib/types/auth';
import { useRouter } from 'next/navigation';
import { Profile } from '@/lib/prisma-types';

type BillingFormData = BillingInput;

const initialState = {
  success: false,
  message: '',
};

interface BillingFormState {
  formData: Record<string, any>;
  isValid: boolean;
  isDirty: boolean;
}

interface BillingFormProps {
  initialUser: AuthUser | null;
  initialProfile: Profile | null;
  adminMode?: boolean;
  hideCard?: boolean;
  hideButtons?: boolean;
  onFormChange?: (state: BillingFormState) => void;
}

export default function BillingForm({
  initialProfile,
  adminMode = false,
  hideCard = false,
  hideButtons = false,
  onFormChange,
}: BillingFormProps) {
  // Select the appropriate action based on admin mode
  const actionToUse = adminMode
    ? updateProfileBillingAdmin
    : updateProfileBilling;

  const [state, action, isPending] = useActionState(actionToUse, initialState);
  const [, startTransition] = useTransition();

  const router = useRouter();

  // AFM lookup state
  const [afmLookupLoading, setAfmLookupLoading] = React.useState(false);
  const [afmLookupSuccess, setAfmLookupSuccess] = React.useState(false);
  const lastLookedUpAfm = useRef<string>('');

  // Extract data from props
  const profile = initialProfile;

  const form = useForm<BillingFormData>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      receipt: false,
      invoice: false,
      afm: '',
      doy: '',
      name: '',
      profession: '',
      address: '',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  // Track if form has been initialized to prevent re-renders from resetting user changes
  const initializedRef = useRef(false);

  // Update form values when initial data is available (once only)
  useEffect(() => {
    if (initializedRef.current) return;
    if (profile?.billing) {
      initializedRef.current = true;
      const billingData = parseJSONValue(profile.billing, {
        receipt: false,
        invoice: false,
        afm: '',
        doy: '',
        name: '',
        profession: '',
        address: '',
      }) as {
        receipt: boolean;
        invoice: boolean;
        afm: string;
        doy: string;
        name: string;
        profession: string;
        address: string;
      };

      form.reset(billingData);
      // If existing invoice data has afm + other fields, show as already populated
      if (billingData.invoice && billingData.afm && billingData.name) {
        lastLookedUpAfm.current = billingData.afm;
        setAfmLookupSuccess(true);
      }
    }
  }, [profile, form]);

  // Trigger AADE lookup when AFM reaches 9 digits
  async function handleAfmLookup(afm: string) {
    if (afm.length !== 9 || afm === lastLookedUpAfm.current) return;
    lastLookedUpAfm.current = afm;
    setAfmLookupLoading(true);
    setAfmLookupSuccess(false);

    try {
      const result = await lookupAfm(afm);

      if (result.success && result.data) {
        const { onomasia, doy_descr, firm_act_descr, postal_address, postal_address_no, postal_zip_code, postal_area_description } = result.data;
        const addressParts = [postal_address, postal_address_no, postal_zip_code, postal_area_description].filter(Boolean);
        form.setValue('name', onomasia, { shouldDirty: true, shouldValidate: true });
        form.setValue('doy', doy_descr, { shouldDirty: true, shouldValidate: true });
        form.setValue('profession', firm_act_descr, { shouldDirty: true, shouldValidate: true });
        form.setValue('address', addressParts.join(', '), { shouldDirty: true, shouldValidate: true });
        setAfmLookupSuccess(true);
      } else {
        toast.error(result.error || 'ΑΦΜ δεν βρέθηκε');
        form.setValue('name', '', { shouldDirty: true });
        form.setValue('doy', '', { shouldDirty: true });
        form.setValue('profession', '', { shouldDirty: true });
        form.setValue('address', '', { shouldDirty: true });
      }
    } catch (error) {
      console.error('AFM lookup error:', error);
      toast.error('Αδύνατη η επικοινωνία με AADE');
    } finally {
      setAfmLookupLoading(false);
    }
  }

  // Handle successful form submission
  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message, {
        id: `billing-form-${Date.now()}`,
      });
      router.refresh();
    } else if (!state.success && state.message) {
      toast.error(state.message, {
        id: `billing-form-${Date.now()}`,
      });
    }
  }, [state, router]);

  const {
    formState: { isValid, isDirty },
    watch,
    getValues,
  } = form;

  // Watch billing type to show/hide fields
  const watchedReceipt = watch('receipt') === true;
  const watchedInvoice = watch('invoice') === true;
  const isInvoiceSelected = watchedInvoice;

  // Watch all form fields for checkout integration
  const watchedAfm = watch('afm');

  const watchedName = watch('name');
  const watchedAddress = watch('address');
  const watchedDoy = watch('doy');
  const watchedProfession = watch('profession');

  // Report form state changes to parent (for checkout integration)
  useEffect(() => {
    if (onFormChange) {
      onFormChange({
        formData: getValues(),
        isValid,
        isDirty,
      });
    }
  }, [
    onFormChange,
    watchedReceipt,
    watchedInvoice,
    watchedAfm,
    watchedName,
    watchedAddress,
    watchedDoy,
    watchedProfession,
    isValid,
    isDirty,
    getValues,
  ]);

  // Handle form submission
  const handleFormSubmit = (formData: FormData) => {
    // Get all form values and populate FormData
    const allValues = getValues();

    populateFormData(formData, allValues, {
      stringFields: ['afm', 'doy', 'name', 'profession', 'address'],
      booleanFields: ['receipt', 'invoice'],
      skipEmpty: false, // Keep all fields for billing data
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
        {/* Billing Type Selection */}
        <div className='space-y-4'>
          <FormLabel>Τύπος Παραστατικού</FormLabel>
          <div className='flex flex-row space-x-6'>
            {/* Receipt Checkbox */}
            <FormField
              control={form.control}
              name='receipt'
              render={({ field }) => (
                <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        field.onChange(isChecked);
                        // If receipt is checked, uncheck invoice
                        if (isChecked) {
                          form.setValue('invoice', false, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                    />
                  </FormControl>
                  <div className='space-y-1 leading-none'>
                    <FormLabel>Απόδειξη</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Invoice Checkbox */}
            <FormField
              control={form.control}
              name='invoice'
              render={({ field }) => (
                <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        field.onChange(isChecked);
                        // If invoice is checked, uncheck receipt
                        if (isChecked) {
                          form.setValue('receipt', false, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                    />
                  </FormControl>
                  <div className='space-y-1 leading-none'>
                    <FormLabel>Τιμολόγιο</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Invoice Fields - Only shown when invoice is selected */}
        {isInvoiceSelected && (
          <div className='space-y-4'>
            {/* AFM field with AADE lookup */}
            <FormField
              control={form.control}
              name='afm'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ΑΦΜ</FormLabel>
                  <FormControl>
                    <Input
                      type='text'
                      placeholder='Εισάγετε ΑΦΜ (9 ψηφία)'
                      {...field}
                      maxLength={9}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        field.onChange(val);
                        if (val.length === 9) {
                          handleAfmLookup(val);
                        } else {
                          setAfmLookupSuccess(false);
                          lastLookedUpAfm.current = '';
                        }
                      }}
                    />
                  </FormControl>
                  {afmLookupLoading && (
                    <FormDescription className='flex items-center gap-1.5'>
                      <Loader2 className='h-3 w-3 animate-spin' />
                      Αναζήτηση στοιχείων...
                    </FormDescription>
                  )}
                  {afmLookupSuccess && !afmLookupLoading && (
                    <div className='text-[0.8rem] text-muted-foreground'>
                      <Badge variant='outline' className='text-green-600 border-green-300 bg-green-50'>
                        Τα στοιχεία συμπληρώθηκαν αυτόματα
                      </Badge>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Auto-populated fields — shown after successful lookup */}
            {afmLookupSuccess && (
              <div className='space-y-4'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Επωνυμία</FormLabel>
                      <FormControl>
                        <Input type='text' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='doy'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ΔΟΥ</FormLabel>
                      <FormControl>
                        <Input type='text' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='profession'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Επάγγελμα</FormLabel>
                      <FormControl>
                        <Input type='text' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='address'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Διεύθυνση Τιμολόγησης</FormLabel>
                      <FormControl>
                        <Input type='text' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        )}

        {!hideButtons && (
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
              disabled={
                isPending ||
                !isValid ||
                !isDirty ||
                (!watchedReceipt && !watchedInvoice)
              }
            />
          </div>
        )}
      </form>
    </Form>
  );
}
