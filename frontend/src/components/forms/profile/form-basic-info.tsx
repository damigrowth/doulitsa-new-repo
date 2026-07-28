'use client';

import React, {
  useState,
  useActionState,
  useEffect,
  useRef,
  useTransition,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Shadcn UI components
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(() => import('@/components/ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })), { ssr: false });
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';

// Custom components
import { Selectbox } from '@/components/ui/selectbox';
import { LazyCombobox } from '@/components/ui/lazy-combobox';

// Static constants and dataset utilities
import { formatInput } from '@/lib/utils/validation/formats';
import { stripHtmlTags } from '@/lib/utils/text/html';
import { filterByField, filterSkillsByCategory, getSkillsByIds } from '@/lib/utils/datasets';
import { populateFormData } from '@/lib/utils/form';
import type { DatasetOption, DatasetWithCategory } from '@/lib/types/datasets';

// Import validation schema
import {
  profileBasicInfoUpdateSchema,
  type ProfileBasicInfoUpdateInput,
} from '@/lib/validations/profile';

// Import server actions
import { updateProfileBasicInfo } from '@/actions/profiles/basic-info';
import { updateProfileBasicInfoAdmin } from '@/actions/admin/profiles/basic-info';
import { submitTaxonomySubmission } from '@/actions/taxonomy-submission';
import type { LazyComboboxOption } from '@/components/ui/lazy-combobox';
import FormButton from '@/components/shared/button-form';
import { useSession } from '@/lib/auth/client';
import { AuthUser } from '@/lib/types/auth';
import { useRouter } from 'next/navigation';
import { Profile } from '@/lib/prisma-types';

const initialState = {
  success: false,
  message: '',
};

interface PendingSkillItem {
  pendingId: string;
  label: string;
  category?: string | null;
}

interface BasicInfoFormProps {
  initialUser: AuthUser | null;
  initialProfile: Profile | null;
  proTaxonomies: DatasetOption[];
  skillsDataset: DatasetWithCategory[];
  pendingSkills?: PendingSkillItem[];
  adminMode?: boolean;
  hideCard?: boolean;
}

export default function BasicInfoForm({
  initialUser,
  initialProfile,
  proTaxonomies,
  skillsDataset,
  pendingSkills = [],
  adminMode = false,
  hideCard = false,
}: BasicInfoFormProps) {
  // Select the appropriate action based on admin mode
  const actionToUse = adminMode
    ? updateProfileBasicInfoAdmin
    : updateProfileBasicInfo;

  const [state, action, isPending] = useActionState(actionToUse, initialState);

  const [isUploading, setIsUploading] = useState(false);
  const [isPendingTransition, startTransition] = useTransition();
  const { refetch } = useSession();
  const router = useRouter();

  // Extract data from props
  const profile = initialProfile;

  const form = useForm<ProfileBasicInfoUpdateInput>({
    resolver: zodResolver(profileBasicInfoUpdateSchema),
    defaultValues: {
      tagline: profile?.tagline || '',
      bio: profile?.bio || '',
      category: profile?.category || '',
      subcategory: profile?.subcategory || '',
      skills: profile?.skills || [],
      speciality: profile?.speciality || '',
    },
    mode: 'onChange', // Live validation as user types
    reValidateMode: 'onChange', // Keep validating on change
    criteriaMode: 'firstError', // Only show first error per field
  });

  const {
    handleSubmit,
    formState: { errors, isValid, isDirty },
    setValue,
    getValues,
    watch,
  } = form;

  // Update form values when profile data actually changes (e.g., after save)
  // Uses a snapshot ref to avoid resetting on same-data re-renders
  // (e.g., after a server action like submitTaxonomySubmission triggers route re-render)
  const profileSnapshotRef = React.useRef<string>('');

  useEffect(() => {
    if (profile) {
      const resetData = {
        tagline: profile.tagline || '',
        bio: profile.bio || '',
        category: profile.category || '',
        subcategory: profile.subcategory || '',
        skills: profile.skills || [],
        speciality: profile.speciality || '',
      };
      const snapshot = JSON.stringify(resetData);
      if (snapshot !== profileSnapshotRef.current) {
        profileSnapshotRef.current = snapshot;
        form.reset(resetData, { keepDefaultValues: false });
      }
    }
  }, [profile, form]);

  // Handle successful form submission - refresh session and page to get updated data.
  // Excluding `refetch`/`router` from the deps because they are recreated on every
  // render (useSession returns a fresh closure); leaving them in caused this effect
  // to fire every render after a successful save, hammering /api/auth/session until
  // Django returned 429.
  const handledStateRef = useRef<typeof state | null>(null);
  useEffect(() => {
    if (handledStateRef.current === state) return;
    handledStateRef.current = state;
    if (state.success && state.message) {
      toast.success(state.message, {
        id: `basic-info-form-${Date.now()}`,
      });
      setIsUploading(false);
      refetch();
      router.refresh();
    } else if (!state.success && state.message) {
      toast.error(state.message, {
        id: `basic-info-form-${Date.now()}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Reset loading states when form submission completes (success or failure)
  useEffect(() => {
    if (!isPending) {
      setIsUploading(false);
    }
  }, [isPending]);

  // Watch specific fields for dependent logic
  const watchedCategory = watch('category');
  const watchedSkills = watch('skills');

  // Memoize filtered subcategories based on selected category
  const filteredSubcategories = React.useMemo(() => {
    const category = proTaxonomies.find((cat) => cat.id === watchedCategory);
    const subcategories = category?.children || [];
    return (initialUser?.role
      ? filterByField(subcategories, 'type', initialUser.role)
      : subcategories) as DatasetOption[];
  }, [watchedCategory, initialUser?.role]);

  // Memoize filtered skills based on selected category
  const filteredSkills = React.useMemo(() => {
    return watchedCategory
      ? filterSkillsByCategory(skillsDataset, watchedCategory)
      : [];
  }, [watchedCategory]);

  // Memoize available specialities based on selected skills
  const availableSpecialities = React.useMemo(() => {
    return watchedSkills
      ? getSkillsByIds(skillsDataset, watchedSkills)
      : [];
  }, [watchedSkills, skillsDataset]);

  // Pending skills: merge into filtered skills as options + track IDs
  const pendingSkillIds = React.useMemo(
    () => new Set(pendingSkills.map((p) => p.pendingId)),
    [pendingSkills],
  );

  const filteredSkillsWithPending = React.useMemo(() => {
    const pendingForCategory = pendingSkills
      .filter((p) => p.category === watchedCategory)
      .map((p) => ({ id: p.pendingId, label: p.label }));
    return [...filteredSkills, ...pendingForCategory];
  }, [filteredSkills, pendingSkills, watchedCategory]);

  // Handle creating a new pending skill
  const handleCreateSkill = React.useCallback(
    async (label: string): Promise<LazyComboboxOption | null> => {
      if (!watchedCategory) return null;
      const result = await submitTaxonomySubmission({
        label,
        type: 'skill',
        category: watchedCategory,
      });
      if (result.success && result.data) {
        toast.success(`Η δεξιότητα "${label}" υποβλήθηκε για έγκριση`);
        return { id: result.data.pendingId, label };
      }
      toast.error(result.message || 'Σφάλμα κατά την υποβολή');
      return null;
    },
    [watchedCategory],
  );

  // Helper functions for formatting inputs
  const handleTaglineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatInput({
      value: e.target.value,
      maxLength: 100,
    });
    setValue('tagline', formattedValue, {
      shouldDirty: true,
      shouldValidate: true, // Trigger real-time validation
    });
  };

  const handleBioChange = (html: string) => {
    setValue('bio', html, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // Selection handlers - store only ID values
  const handleCategorySelect = (categoryId: string) => {
    setValue('category', categoryId, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('subcategory', '', {
      shouldDirty: true,
      shouldValidate: true, // Trigger validation to show error if required
    });

    // Clear skills and speciality when category changes since available skills will change
    setValue('skills', [], { shouldDirty: true });
    setValue('speciality', '', { shouldDirty: true });
  };

  const handleSubcategorySelect = (selected: any) => {
    setValue('subcategory', selected.id, {
      shouldDirty: true,
      shouldValidate: true, // Trigger validation immediately
    });
  };

  // Wrapper action that handles data population
  const handleFormAction = (formData: FormData) => {
    // Get all form values
    const allValues = getValues();

    populateFormData(formData, allValues, {
      stringFields: ['tagline', 'bio', 'category', 'subcategory', 'speciality'],
      jsonFields: ['skills'],
      skipEmpty: true,
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
        action={handleFormAction}
        className={
          hideCard
            ? 'space-y-6'
            : 'space-y-6 p-6 border rounded-lg shadow bg-sidebar'
        }
      >
        {/* Category/Subcategory */}
        <div className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='category'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>Κατηγορία*</FormLabel>
                  <FormControl>
                    <Selectbox
                      options={proTaxonomies}
                      value={field.value || ''}
                      onValueChange={(value) => {
                        // Prevent empty value from clearing the field (shadcn Select quirk)
                        if (value) {
                          field.onChange(value); // Update React Hook Form field
                          handleCategorySelect(value);
                        }
                      }}
                      placeholder='Επιλέξτε κατηγορία...'
                      fullWidth
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='subcategory'
              render={({ field }) => {
                return (
                  <FormItem className='flex flex-col'>
                    <FormLabel>Υποκατηγορία*</FormLabel>
                    <FormControl>
                      <LazyCombobox
                        key={`${watchedCategory}-${filteredSubcategories.length}`} // Force remount when category or options change
                        options={filteredSubcategories}
                        value={field.value || ''}
                        onSelect={(selected) => {
                          handleSubcategorySelect(selected);
                        }}
                        placeholder='Επιλέξτε υποκατηγορία...'
                        searchPlaceholder='Αναζήτηση υποκατηγορίας...'
                        emptyMessage='Δεν βρέθηκαν υποκατηγορίες.'
                        disabled={!watchedCategory}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>
        </div>

        {/* Bio/Description */}
        <FormField
          control={form.control}
          name='bio'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-sm font-medium text-gray-700'>
                Περιγραφή*
              </FormLabel>
              <p className='text-sm text-gray-600'>
                Μια περιγραφή σχετικά με εσάς και τις υπηρεσίες που προσφέρετε.
              </p>
              <FormControl>
                <RichTextEditor
                  value={field.value}
                  onChange={handleBioChange}
                  placeholder='Τουλάχιστον 80 χαρακτήρες (2-3 προτάσεις)'
                  minHeight='200px'
                />
              </FormControl>
              <div className='text-xs text-gray-500'>
                {stripHtmlTags(field.value).length}/5000 χαρακτήρες (ελάχιστο: 80)
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tagline */}
        <FormField
          control={form.control}
          name='tagline'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tagline</FormLabel>
              <p className='text-sm text-gray-600'>
                Μια σύντομη φράση που περιγράφει τι κάνετε (π.χ.
                "Προγραμματιστής ιστοσελίδων")
              </p>
              <FormControl>
                <Input
                  type='text'
                  placeholder='π.χ. Προγραμματιστής ιστοσελίδων και εφαρμογών'
                  {...field}
                  onChange={handleTaglineChange}
                />
              </FormControl>
              <div className='text-xs text-gray-500'>
                {field.value?.length || 0}/100 χαρακτήρες
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Skills */}
        <FormField
          control={form.control}
          name='skills'
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>
                  Δεξιότητες
                  {field.value?.length > 0 ? ` (${field.value.length}/10)` : ''}
                </FormLabel>
                <p className='text-sm text-gray-600'>
                  Επιλέξτε τις δεξιότητές σας (έως 10). Στη συνέχεια θα
                  μπορέσετε να επιλέξετε την κύρια ειδικότητά σας.
                </p>
                <FormControl>
                  <div className='space-y-2'>
                    {watchedCategory ? (
                      <LazyCombobox
                        key={`skills-${watchedCategory}`} // Force remount when category changes
                        multiple
                        options={filteredSkillsWithPending}
                        values={field.value || []}
                        onMultiSelect={(selectedOptions) => {
                          const selectedIds = selectedOptions.map(
                            (opt) => opt.id,
                          );
                          setValue('skills', selectedIds, {
                            shouldDirty: true,
                          });

                          // Clear speciality if it's not in the selected skills anymore
                          const currentSpeciality = getValues('speciality');
                          if (
                            currentSpeciality &&
                            !selectedIds.includes(currentSpeciality)
                          ) {
                            setValue('speciality', '', {
                              shouldDirty: true,
                            });
                          }
                        }}
                        onSelect={() => {}} // Required but not used in multi mode
                        placeholder='Επιλέξτε δεξιότητες...'
                        searchPlaceholder='Αναζήτηση δεξιοτήτων...'
                        maxItems={10}
                        allowCreate={!adminMode}
                        onCreateItem={handleCreateSkill}
                        pendingIds={pendingSkillIds}
                        pendingBadgeText={(n) =>
                          n === 1
                            ? 'επιλεγμένη δεξιότητα υπό έγκριση'
                            : 'επιλεγμένες δεξιότητες υπό έγκριση'
                        }
                      />
                    ) : (
                      <div className='p-4 text-center text-gray-500 bg-gray-50 rounded-md'>
                        Επιλέξτε πρώτα μια κατηγορία για να δείτε τις διαθέσιμες
                        δεξιότητες
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Speciality */}
        <FormField
          control={form.control}
          name='speciality'
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>Ειδικότητα</FormLabel>
                <p className='text-sm text-gray-600'>
                  Επιλέξτε την κύρια ειδικότητά σας που θα εμφανίζεται πάντα πρώτη.</p>
                <FormControl>
                  <Selectbox
                    key={`speciality-${watchedSkills?.join('-') || 'empty'}`} // Force remount when skills change
                    options={availableSpecialities}
                    value={field.value || ''}
                    onValueChange={(value) => {
                      if (value) {
                        field.onChange(value);
                        setValue('speciality', value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }
                    }}
                    placeholder={
                      watchedSkills && watchedSkills.length > 0
                        ? 'Επιλέξτε ειδικότητα...'
                        : 'Επιλέξτε πρώτα δεξιότητες'
                    }
                    disabled={!watchedSkills || watchedSkills.length === 0}
                    fullWidth
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className='max-w-xl overflow-scroll p-4 bg-gray-100 rounded text-xs space-y-2'>
            <div>isValid: {isValid.toString()}</div>
            <div>isDirty: {isDirty.toString()}</div>
            <div>isSubmitted: {form.formState.isSubmitted.toString()}</div>
            <div>Category Value: {watch('category') || 'empty'}</div>
            <div>Subcategory Value: {watch('subcategory') || 'empty'}</div>
            <div>
              Category Touched:{' '}
              {form.formState.touchedFields.category?.toString() || 'false'}
            </div>
            <div>
              Subcategory Touched:{' '}
              {form.formState.touchedFields.subcategory?.toString() || 'false'}
            </div>
            <div>Username: {initialUser?.username || 'undefined'}</div>
            <div>User ID: {initialUser?.id || 'undefined'}</div>
            <div>Errors: {JSON.stringify(errors, null, 2)}</div>
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
            loading={isPending || isPendingTransition || isUploading}
            disabled={
              isPending ||
              isPendingTransition ||
              isUploading ||
              !isValid ||
              !isDirty
            }
          />
        </div>
      </form>
    </Form>
  );
}
