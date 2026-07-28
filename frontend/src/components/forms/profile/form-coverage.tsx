'use client';

import React, { useActionState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Shadcn UI components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { LazyCombobox } from '@/components/ui/lazy-combobox';
import { toast } from 'sonner';

// Icons
import { CheckCircle2 } from 'lucide-react';

// Custom components
import FormButton from '@/components/shared/button-form';

// Static constants and dataset utilities
import type { DatasetItem } from '@/lib/types/datasets';
import { formatInput } from '@/lib/utils/validation/formats';
import {
  resetCoverageDependencies,
  getAllZipcodes,
  getCountiesForCoverageForms,
  isNationwideSelected,
  NATIONWIDE_ID,
} from '@/lib/utils/datasets';
import { populateFormData, parseJSONValue } from '@/lib/utils/form';

// Import validation schema
import { coverageSchema } from '@/lib/validations/profile';

// Import server actions
import { updateCoverage } from '@/actions/profiles/coverage';
import { updateCoverageAdmin } from '@/actions/admin/profiles/coverage';
import { useRouter } from 'next/navigation';
import { Profile } from '@/lib/prisma-types';
import { AuthUser } from '@/lib/types/auth';

const coverageFormSchema = z.object({
  coverage: coverageSchema,
});

type CoverageInput = z.infer<typeof coverageFormSchema>;

const initialState = {
  success: false,
  message: '',
};

interface CoverageFormProps {
  initialUser: AuthUser | null;
  initialProfile: Profile | null;
  locationOptions: DatasetItem[];
  adminMode?: boolean;
  hideCard?: boolean;
}

export default function CoverageForm({
  initialUser,
  initialProfile,
  locationOptions,
  adminMode = false,
  hideCard = false,
}: CoverageFormProps) {
  // Select the appropriate action based on admin mode
  const actionToUse = adminMode ? updateCoverageAdmin : updateCoverage;

  const [state, action, isPending] = useActionState(actionToUse, initialState);
  const [, startTransition] = useTransition();

  // Track if user has made any actual changes
  const [hasUserInteracted, setHasUserInteracted] = React.useState(false);
  const router = useRouter();

  const form = useForm<CoverageInput>({
    resolver: zodResolver(coverageFormSchema),
    defaultValues: {
      coverage: {
        online: false,
        onbase: false,
        onsite: false,
        address: null,
        county: null,
        area: null,
        zipcode: null,
        counties: [],
        areas: [],
      },
    },
    mode: 'onChange',
  });

  const {
    formState: { isValid, isDirty },
    getValues,
    setValue,
    watch,
  } = form;

  // Watch coverage field
  const watchedCoverage = watch('coverage');

  // Create flat zipcode list for easy search (for LazyCombobox)
  const allZipcodes = React.useMemo(() => {
    const zipcodes = getAllZipcodes(locationOptions);
    return zipcodes.map((zipcode) => ({
      id: zipcode.id,
      label: `${zipcode.name} - ${zipcode.area.name} - ${zipcode.county.name}`,
      name: zipcode.name,
      area: zipcode.area,
      county: zipcode.county,
    }));
  }, [locationOptions]);

  // Memoize available areas based on selected counties
  const availableAreas = React.useMemo(() => {
    if (!watchedCoverage?.counties || watchedCoverage.counties.length === 0) {
      return [];
    }

    return watchedCoverage.counties.flatMap((selectedCountyId: string) => {
      const county = locationOptions.find((c) => c.id === selectedCountyId);
      return (
        county?.children?.map((area: any) => ({
          id: area.id,
          label: area.name,
          county: county.name,
        })) || []
      );
    });
  }, [watchedCoverage?.counties, locationOptions]);

  // Memoize ordered county options for coverage form
  const countyOptions = React.useMemo(() => {
    return getCountiesForCoverageForms(locationOptions).map((county) => ({
      id: county.id,
      label: county.name || '',
    }));
  }, [locationOptions]);

  // Update form values when profile data is available
  useEffect(() => {
    if (initialProfile?.coverage) {
      const coverage = parseJSONValue(initialProfile.coverage, {
        online: false,
        onbase: false,
        onsite: false,
        address: null,
        county: null,
        area: null,
        zipcode: null,
        counties: [],
        areas: [],
      }) as {
        online: boolean;
        onbase: boolean;
        onsite: boolean;
        address: string | null;
        county: string | null;
        area: string | null;
        zipcode: string | null;
        counties: string[];
        areas: string[];
      };

      form.reset({ coverage });
      // User has existing coverage data, so they can submit
      setHasUserInteracted(true);
    }
  }, [initialProfile, form]);

  // Handle successful form submission
  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message, {
        id: `coverage-form-${Date.now()}`,
      });
      router.refresh();
    } else if (!state.success && state.message) {
      toast.error(state.message, {
        id: `coverage-form-${Date.now()}`,
      });
    }
  }, [state, router]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatInput({
      value: e.target.value,
      formatSymbols: true,
      capitalize: true,
    });
    setValue('coverage.address', formattedValue, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // Coverage handlers
  const handleCoverageSwitch = (type: 'online' | 'onbase' | 'onsite') => {
    const currentCoverage = getValues('coverage');
    const newCoverage = {
      ...currentCoverage,
      [type]: !currentCoverage[type],
    };

    // Reset dependent fields when disabling modes
    if (!newCoverage[type]) {
      Object.assign(newCoverage, resetCoverageDependencies(newCoverage, type));
    }

    setValue('coverage', newCoverage, {
      shouldDirty: true,
      shouldValidate: true,
    });

    // Force a full re-validation so `isValid` (and thus the Save button) updates
    // immediately on the first single toggle. Without this, setValue's nested
    // shouldValidate can leave `isValid` stale until other fields are toggled.
    void form.trigger();
  };

  // Zipcode change handler - auto-populates area and county
  const handleZipcodeChange = (zipcodeId: string) => {
    const selectedZipcode = allZipcodes.find((z) => z.id === zipcodeId);

    if (!selectedZipcode) return;

    const currentCoverage = getValues('coverage');
    setValue(
      'coverage',
      {
        ...currentCoverage,
        zipcode: zipcodeId,
        area: selectedZipcode.area.id,
        county: selectedZipcode.county.id,
      },
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  };

  // Wrapper action that handles data population
  const handleFormAction = async (formData: FormData) => {
    try {
      // Get all form values
      const allValues = getValues();

      populateFormData(formData, allValues, {
        jsonFields: ['coverage'],
        skipEmpty: false, // Keep all fields for coverage data
      });

      // For admin mode, add profileId
      if (adminMode && initialProfile?.id) {
        formData.set('profileId', initialProfile.id);
      }

      // Call the server action with populated FormData using startTransition
      startTransition(() => {
        action(formData);
      });
    } catch (error) {
      console.error('❌ Form submission failed:', error);
      toast.error('Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.');
    }
  };

  // Wrapper component for card styling
  const FormWrapper = hideCard ? React.Fragment : 'div';
  const wrapperProps = hideCard
    ? {}
    : { className: 'space-y-6 p-6 border rounded-lg shadow bg-sidebar' };

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleFormAction(formData);
        }}
      >
        <FormWrapper {...wrapperProps}>
          {/* Delivery Methods Section */}
          <FormField
            control={form.control}
            name='coverage'
            render={({ field }) => (
              <FormItem>
                <div className='space-y-4'>
                  <h3 className='text-lg font-semibold text-gray-900 border-b pb-2'>
                    Προσφέρω τις υπηρεσίες:
                  </h3>
                  <div className='space-y-3'>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                      <div className='flex items-center space-x-2'>
                        <Checkbox
                          id='online'
                          checked={field.value.online}
                          onCheckedChange={() => handleCoverageSwitch('online')}
                        />
                        <FormLabel
                          htmlFor='online'
                          className='text-sm font-medium text-gray-700'
                        >
                          Online
                        </FormLabel>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <Checkbox
                          id='onbase'
                          checked={field.value.onbase}
                          onCheckedChange={() => handleCoverageSwitch('onbase')}
                        />
                        <FormLabel
                          htmlFor='onbase'
                          className='text-sm font-medium text-gray-700'
                        >
                          Στον χώρο μου
                        </FormLabel>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <Checkbox
                          id='onsite'
                          checked={field.value.onsite}
                          onCheckedChange={() => handleCoverageSwitch('onsite')}
                        />
                        <FormLabel
                          htmlFor='onsite'
                          className='text-sm font-medium text-gray-700'
                        >
                          Στον χώρο του πελάτη
                        </FormLabel>
                      </div>
                    </div>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Conditional Online Section */}
          {watchedCoverage?.online && (
            <div className='space-y-4 mt-4 p-4 bg-gray-50 rounded-md shadow border'>
              <div>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='h-5 w-5 shrink-0 text-primary' />
                  <h5 className='font-medium text-gray-900'>Online</h5>
                </div>
                <p className='mt-1 pl-7 text-sm text-gray-600'>
                  Εξυπηρετώ τους πελάτες εξ αποστάσεως.
                </p>
              </div>
            </div>
          )}

          {/* Conditional Onbase Section */}
          {watchedCoverage?.onbase && (
            <div className='space-y-4 mt-4 p-4 bg-gray-50 rounded-md shadow border'>
              <div className='flex items-center gap-2'>
                <CheckCircle2 className='h-5 w-5 shrink-0 text-primary' />
                <h5 className='font-medium text-gray-900'>Στον χώρο μου</h5>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                {/* Address - First field */}
                <FormField
                  control={form.control}
                  name='coverage.address'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-gray-700'>
                        Διεύθυνση
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='text'
                          placeholder='Διεύθυνση έδρας'
                          value={field.value || ''}
                          onChange={handleAddressChange}
                          className='bg-white'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Zipcode Combobox - Second field */}
                <div className='space-y-2'>
                  <FormLabel className='text-sm font-medium text-gray-700'>
                    Τ.Κ.
                  </FormLabel>
                  <LazyCombobox
                    options={allZipcodes}
                    value={watchedCoverage?.zipcode || undefined}
                    onSelect={(zipcode) => handleZipcodeChange(zipcode.id)}
                    placeholder='Επιλέξτε Τ.Κ...'
                    searchPlaceholder='Αναζήτηση Τ.Κ...'
                    emptyMessage='Δεν βρέθηκαν Τ.Κ.'
                    formatLabel={(option) => (
                      <>
                        {option.name}{' '}
                        <span className='text-gray-500'>
                          ({option.area.name} - {option.county.name})
                        </span>
                      </>
                    )}
                    getButtonLabel={(option) =>
                      option?.name || 'Επιλέξτε Τ.Κ...'
                    }
                    initialLimit={20}
                    loadMoreIncrement={20}
                    loadMoreThreshold={50}
                    searchLimit={100}
                    showProgress={true}
                  />
                </div>

                {/* Area Input - Auto-filled from zipcode */}
                <FormField
                  control={form.control}
                  name='coverage.area'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-gray-700'>
                        Περιοχή
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='text'
                          value={
                            watchedCoverage?.area
                              ? allZipcodes.find(
                                  (z) => z.area.id === watchedCoverage.area,
                                )?.area.name || ''
                              : ''
                          }
                          readOnly
                          className='bg-gray-100 cursor-not-allowed'
                          placeholder='Επιλέξτε πρώτα Τ.Κ.'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* County Input - Auto-filled from zipcode */}
                <FormField
                  control={form.control}
                  name='coverage.county'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-gray-700'>
                        Νομός
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='text'
                          value={
                            watchedCoverage?.county
                              ? allZipcodes.find(
                                  (z) => z.county.id === watchedCoverage.county,
                                )?.county.name || ''
                              : ''
                          }
                          readOnly
                          className='bg-gray-100 cursor-not-allowed'
                          placeholder='Επιλέξτε πρώτα Τ.Κ.'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Onsite Section */}
          {watchedCoverage?.onsite && (
            <div className='space-y-4 mt-4 p-4 bg-gray-50 rounded-md shadow border'>
              <div>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='h-5 w-5 shrink-0 text-primary' />
                  <h5 className='font-medium text-gray-900'>
                    Στον χώρο του πελάτη
                  </h5>
                </div>
                <p className='mt-1 pl-7 text-sm text-gray-600'>
                  Περιοχές Εξυπηρέτησης
                </p>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Counties MultiSelect */}
                <FormField
                  control={form.control}
                  name='coverage.counties'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-gray-700'>
                        Νομοί
                      </FormLabel>
                      <FormControl>
                        <LazyCombobox
                          multiple
                          className='bg-white'
                          options={isNationwideSelected(field.value || [])
                            ? countyOptions.filter((c) => c.id === NATIONWIDE_ID)
                            : countyOptions}
                          values={field.value || []}
                          onMultiSelect={(selectedOptions) => {
                            const selected = selectedOptions.map(
                              (opt) => opt.id,
                            );

                            // Nationwide selection logic
                            const wasNationwide = isNationwideSelected(field.value || []);
                            const isNowNationwide = isNationwideSelected(selected);

                            if (isNowNationwide && !wasNationwide) {
                              // User just selected Πανελλαδικά — set only nationwide, clear areas
                              setValue('coverage.counties', [NATIONWIDE_ID], {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              setValue('coverage.areas', [], {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              return;
                            }

                            if (wasNationwide && !isNowNationwide) {
                              // User deselected Πανελλαδικά — clear everything
                              setValue('coverage.counties', [], {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              setValue('coverage.areas', [], {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              return;
                            }

                            // Normal county selection — filter areas to keep only those from selected counties
                            const currentCoverage = getValues('coverage');
                            const currentAreas = currentCoverage?.areas || [];

                            // Get all area IDs from selected counties
                            const validAreaIds = selected.flatMap(
                              (countyId: string) => {
                                const county = locationOptions.find(
                                  (c) => c.id === countyId,
                                );
                                return (
                                  county?.children?.map(
                                    (area: any) => area.id,
                                  ) || []
                                );
                              },
                            );

                            // Filter areas to keep only those from selected counties
                            const filteredAreas = currentAreas.filter(
                              (areaId: string) => validAreaIds.includes(areaId),
                            );

                            setValue('coverage.counties', selected, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            setValue('coverage.areas', filteredAreas, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                          onSelect={() => {}}
                          placeholder='Επίλεξε νομούς...'
                          searchPlaceholder='Αναζήτηση νομών...'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Areas MultiSelect */}
                <FormField
                  control={form.control}
                  name='coverage.areas'
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel className='text-sm font-medium text-gray-700'>
                          Περιοχές
                        </FormLabel>
                        <FormControl>
                          <div className='space-y-2'>
                            {isNationwideSelected(watchedCoverage?.counties || []) ? (
                              <div className='flex items-center text-sm text-muted-foreground h-auto min-h-9 py-2 px-4 rounded-md border'>
                                Έχετε επιλέξει πανελλαδική κάλυψη
                              </div>
                            ) : watchedCoverage?.counties?.length > 0 ? (
                              <LazyCombobox
                                key={`areas-${watchedCoverage.counties.join('-')}`} // Force remount when counties change
                                multiple
                                className='bg-white'
                                options={availableAreas}
                                values={field.value || []}
                                onMultiSelect={(selectedOptions) => {
                                  const selectedIds = selectedOptions.map(
                                    (opt) => opt.id,
                                  );
                                  setValue('coverage.areas', selectedIds, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }}
                                onSelect={() => {}}
                                placeholder='Επίλεξε περιοχές...'
                                searchPlaceholder='Αναζήτηση περιοχών...'
                                formatLabel={(option) => (
                                  <>
                                    {option.label}{' '}
                                    <span className='text-gray-500'>
                                      ({option.county})
                                    </span>
                                  </>
                                )}
                              />
                            ) : (
                              <div className='flex items-center text-sm text-muted-foreground h-auto min-h-9 py-2 px-4 rounded-md border'>
                                Επίλεξε πρώτα νομούς για να εμφανιστούν οι υποπεριοχές τους.
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </div>
          )}

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
        </FormWrapper>
      </form>
    </Form>
  );
}
