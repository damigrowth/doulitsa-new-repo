'use client';

import React, {
  useRef,
  useActionState,
  useEffect,
  useState,
  useTransition,
  useMemo,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Shadcn UI components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { LazyCombobox } from '@/components/ui/lazy-combobox';
import { Selectbox } from '@/components/ui/selectbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Icons
import { Loader2, CheckCircle, CheckCircle2, ArrowRight } from 'lucide-react';

import { useSession } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';

// Skeleton loader
import { OnboardingFormSkeleton } from './onboarding-form-skeleton';

// Static constants and dataset utilities
import type { DatasetItem } from '@/lib/types/datasets';
import { formatInput } from '@/lib/utils/validation/formats';
import { stripHtmlTags } from '@/lib/utils/text/html';
import { populateFormData } from '@/lib/utils/form';
import {
  getAllZipcodes,
  resetCoverageDependencies,
  filterTaxonomyByType,
  filterByField,
  getCountiesForCoverageForms,
  isNationwideSelected,
  NATIONWIDE_ID,
} from '@/lib/utils/datasets';

// Zod schemas
import { onboardingFormSchemaWithMedia } from '@/lib/validations';

// Server action
import { completeOnboarding } from '@/actions/auth/complete-onboarding';

// Types
import { MediaUpload } from '../../media';
import FormButton from '@/components/shared/button-form';
import { AuthUser } from '@/lib/types';
import { Profile } from '@/lib/prisma-types';

// Use existing Zod schema
type OnboardingFormData = z.infer<typeof onboardingFormSchemaWithMedia>;

interface OnboardingFormProps {
  user: AuthUser | null;
  profile: Profile | null;
  proTaxonomies: DatasetItem[];
  locationOptions: DatasetItem[];
}

const initialState = {
  success: false,
  message: '',
};

/**
 * Pure React Hook Form onboarding form
 * No Zustand needed - RHF handles all state management
 * Integrates with existing formatting utilities and custom components
 */
export default function OnboardingForm({
  user,
  profile,
  proTaxonomies,
  locationOptions,
}: OnboardingFormProps) {
  const [state, action, isPending] = useActionState(
    completeOnboarding,
    initialState,
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isPendingTransition, startTransition] = useTransition();

  // Controls the "Όλες οι Κατηγορίες" tree-selection dialog (2 dropdowns)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  // Refs for media upload components
  const profileImageRef = useRef<any>(null);
  const portfolioRef = useRef<any>(null);

  // No longer need media state - handled by react-hook-form

  // Get session data from Better Auth
  const { isPending: isSessionPending, refetch } = useSession();
  const router = useRouter();
  // const user = session?.user;
  const isLoading = isPending || isSessionPending;
  const userId = user?.id;
  const role = user?.role;

  // User data is available directly from useAuth hook
  const isAuthenticated = !!userId;
  const hasExistingImage = !!user?.image;

  // 🎯 RHF manages all form state - MUST be called before any conditional returns!
  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingFormSchemaWithMedia),
    defaultValues: {
      // Pre-fill image from user or profile
      image: user?.image || profile?.image || undefined,
      // Pre-fill category and subcategory from profile
      category: profile?.category || '',
      subcategory: profile?.subcategory || '',
      // Pre-fill bio from profile
      bio: profile?.bio || '',
      // Pre-fill coverage from profile if it exists
      coverage: profile?.coverage
        ? {
            online: profile.coverage.online || false,
            onbase: profile.coverage.onbase || false,
            onsite: profile.coverage.onsite || false,
            address: profile.coverage.address || '',
            area: profile.coverage.area || null,
            county: profile.coverage.county || null,
            zipcode: profile.coverage.zipcode || null,
            counties: profile.coverage.counties || [],
            areas: profile.coverage.areas || [],
          }
        : {
            online: false,
            onbase: false,
            onsite: false,
            address: '',
            area: null,
            county: null,
            zipcode: null,
            counties: [],
            areas: [],
          },
      // Pre-fill portfolio from profile
      portfolio: profile?.portfolio || [],
    },
    mode: 'onChange', // Real-time validation
  });

  // Create flattened list of all subcategories with parent category info
  // Memoized to avoid re-computing on every render - only recalculates when role changes
  // MUST be called before conditional returns (React Rules of Hooks)
  const filteredTaxonomies = useMemo(() => {
    // Use helper utility to filter taxonomies by user role first
    return user?.role
      ? filterTaxonomyByType(proTaxonomies, user.role)
      : proTaxonomies;
  }, [user?.role]); // Only recalculate when role changes

  const allSubcategories = useMemo(() => {
    // Flatten subcategories with parent category reference
    return filteredTaxonomies.flatMap((category) =>
      (category.children || []).map((sub) => ({
        id: sub.id,
        label: sub.label,
        categoryId: category.id,
        categoryLabel: category.label,
        type: sub.type,
      })),
    );
  }, [filteredTaxonomies]);

  // Create flat zipcode list for LazyCombobox (same as coverage form)
  const allZipcodes = useMemo(() => {
    const zipcodes = getAllZipcodes(locationOptions);
    return zipcodes.map((zipcode) => ({
      id: zipcode.id,
      label: `${zipcode.name} - ${zipcode.area.name} - ${zipcode.county.name}`,
      name: zipcode.name,
      area: zipcode.area,
      county: zipcode.county,
    }));
  }, [locationOptions]);

  // Memoize ordered county options for coverage form
  const countyOptions = useMemo(() => {
    return getCountiesForCoverageForms(locationOptions).map((county) => ({
      id: county.id,
      label: county.name || '',
    }));
  }, [locationOptions]);

  // Prefetch dashboard for instant navigation
  useEffect(() => {
    router.prefetch('/dashboard');
  }, [router]);

  // Handle successful onboarding completion and redirect.
  // Excluding `refetch`/`router` from the deps because they're recreated on
  // every render. Leaving them in caused this effect to re-fire on every
  // render after success, spamming /api/auth/session into a 429 rate-limit.
  const handledStateRef = useRef<typeof state | null>(null);
  useEffect(() => {
    if (handledStateRef.current === state) return;
    handledStateRef.current = state;
    if (state.success && state.message) {
      toast.success(state.message, {
        id: `onboarding-form-${Date.now()}`,
      });
      setIsUploading(false);
      setIsRedirecting(true);

      const handleRedirect = async () => {
        await refetch();
        await new Promise((resolve) => setTimeout(resolve, 300));
        router.push('/dashboard');
        router.refresh();
      };

      handleRedirect();
    } else if (!state.success && state.message) {
      toast.error(state.message, {
        id: `onboarding-form-${Date.now()}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Loading state - show form skeleton
  if (isLoading) {
    return <OnboardingFormSkeleton />;
  }

  // Success state - show success message instead of form
  if (isRedirecting) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='text-center space-y-4'>
          <div className='flex justify-center'>
            <CheckCircle className='w-16 h-16 text-green-600 mb-2' />
          </div>
          <div className='space-y-2'>
            <h2 className='text-2xl font-semibold text-gray-900'>
              Επιτυχής Εγγραφή!
            </h2>
            <div className='flex items-center gap-2 justify-center text-gray-600'>
              <Loader2 className='w-5 h-5 animate-spin' />
              <span>Μετάβαση στον Πίνακα Ελέγχου...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Early return if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='text-center'>
          <p className='text-red-600'>
            Πρέπει να είστε συνδεδεμένος για να ολοκληρώσετε το προφίλ
          </p>
        </div>
      </div>
    );
  }

  // 🎯 All state you need from RHF
  const {
    control,
    handleSubmit,
    formState,
    setValue,
    getValues,
    watch,
    reset,
  } = form;

  // 🎯 Built-in state properties replace custom hooks
  const {
    isDirty, // Replaces useFormChanges
    isValid,
    isSubmitting, // Built-in, no useState needed
    errors,
  } = formState;

  // 🎯 Watch specific fields for dependent logic
  const watchedCategory = watch('category');
  const watchedSubcategory = watch('subcategory');
  const watchedCoverage = watch('coverage');

  // Helper functions for formatting inputs
  const handleBioChange = (html: string) => {
    setValue('bio', html, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

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

  // Zipcode change handler - auto-populates area and county (same as coverage form)
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

  // Search handlers are no longer needed since we use static data directly in the Combobox components

  // Consolidated selection handler - sets both category and subcategory
  const handleSubcategorySelect = (selected: {
    id: string;
    label: string;
    categoryId: string;
    categoryLabel: string;
    type: string;
  }) => {
    // Set both category and subcategory simultaneously
    setValue('category', selected.categoryId, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('subcategory', selected.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // ── Category tree dialog (2 dropdowns) ──────────────────────────────
  // Subcategories filtered by the currently selected category (role-aware)
  const filteredSubcategories = (() => {
    const category = filteredTaxonomies.find((cat) => cat.id === watchedCategory);
    const subcategories = category?.children || [];
    return user?.role
      ? filterByField(subcategories as any, 'type', user.role)
      : subcategories;
  })();

  // Category dropdown: set category and reset subcategory (must re-pick)
  const handleCategoryDropdownSelect = (categoryId: string) => {
    setValue('category', categoryId, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('subcategory', '', {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // Subcategory dropdown: category is already set, just set subcategory
  const handleSubcategoryDropdownSelect = (selected: { id: string }) => {
    setValue('subcategory', selected.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    // Close the dialog once a full selection is made
    setCategoryDialogOpen(false);
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
  };

  // 🎯 Simple change detection using react-hook-form
  const hasFormChanges = () => {
    return isDirty;
  };

  // Handle form submission with media upload logic
  const handleFormSubmit = async (formData: FormData) => {
    if (!isAuthenticated || !user) {
      return;
    }

    setIsUploading(true);

    try {
      // Check for pending files and upload if needed
      // Note: When using widget mode (type="image"), profile image uploads happen immediately
      // via the widget's onDirectUpload callback, so there won't be pending files.
      // This check is still needed for portfolio images and backward compatibility.
      const hasImageFiles = profileImageRef.current?.hasFiles();
      const hasPortfolioFiles = portfolioRef.current?.hasFiles();

      // CRITICAL: Upload image files and WAIT for completion
      if (hasImageFiles) {
        try {
          await profileImageRef.current.uploadFiles();
        } catch (error) {
          console.error('❌ Αποτυχία μεταφόρτωσης εικόνας:', error);
          toast.error(
            'Το ανέβασμα της εικόνας απέτυχε. Παρακαλώ δοκιμάστε ξανά.',
          );
          setIsUploading(false);
          return; // Don't submit if image upload fails
        }
      }

      if (hasPortfolioFiles) {
        await portfolioRef.current.uploadFiles();
      }

      // Get form values AFTER upload completion
      const allValues = getValues();

      // FINAL CLIENT-SIDE CHECK: Ensure image is not blob URL
      const imageValue = allValues.image;
      if (imageValue) {
        const imageUrl =
          typeof imageValue === 'string' ? imageValue : imageValue.secure_url;

        if (imageUrl?.startsWith('blob:')) {
          toast.error('Η εικόνα δεν ανέβηκε σωστά. Παρακαλώ δοκιμάστε ξανά.');
          setIsUploading(false);
          return;
        }
      }

      // Use centralized populateFormData utility (same as portfolio form)
      populateFormData(formData, allValues, {
        stringFields: ['bio', 'category', 'subcategory'],
        jsonFields: ['image', 'portfolio', 'coverage'],
        skipEmpty: true,
      });

      // Call the server action wrapped in startTransition
      startTransition(() => {
        action(formData);
      });
    } catch (error) {
      console.error('❌ Form submission failed:', error);
      toast.error('Η υποβολή απέτυχε. Παρακαλώ δοκιμάστε ξανά.');
      setIsUploading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleFormSubmit(formData);
        }}
        className=''
      >
        {/* ── Step 1 — Εικόνα Προφίλ ──────────────────────────────── */}
        <div className='flex gap-3 sm:gap-5'>
          <div className='flex flex-col items-center'>
            <div className='flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0 shadow-sm'>
              1
            </div>
            <div className='w-px bg-border flex-1 mt-2' />
          </div>
          <div className='flex-1 pb-9 space-y-3 min-w-0'>
            <div className='flex items-center gap-2 -mt-0.5'>
              <h3 className='font-semibold text-gray-900'>Εικόνα Προφίλ</h3>
              <span className='text-xs bg-primary/10 text-primary font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap'>
                Υποχρεωτικό
              </span>
            </div>
            <FormField
              control={control}
              name='image'
              render={({ field }) => (
                <FormItem>
                  <p className='text-sm text-gray-600'>
                    {hasExistingImage
                      ? 'Μπορείτε να διατηρήσετε την τρέχουσα εικόνα ή να ανεβάσετε νέα.'
                      : 'Φωτογραφία σας, μια σχετική εικόνα ή λογότυπο.'}
                  </p>
                  <FormControl>
                    <MediaUpload
                      ref={profileImageRef}
                      value={field.value}
                      onChange={field.onChange}
                      uploadPreset='doulitsa_profile_images'
                      multiple={false}
                      folder={`users/${user?.username}/profile`}
                      maxFileSize={3000000} // 3MB
                      allowedFormats={['jpg', 'jpeg', 'png', 'webp']}
                      placeholder='Ανεβάστε εικόνα προφίλ'
                      type='image'
                      error={errors.image?.message}
                      signed={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── Step 2 — Κατηγορία ───────────────────────────────────── */}
        <div className='flex gap-3 sm:gap-5'>
          <div className='flex flex-col items-center'>
            <div className='flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0 shadow-sm'>
              2
            </div>
            <div className='w-px bg-border flex-1 mt-2' />
          </div>
          <div className='flex-1 pb-9 space-y-3 min-w-0'>
            <div className='flex items-center gap-2 -mt-0.5'>
              <h3 className='font-semibold text-gray-900'>Κατηγορία</h3>
              <span className='text-xs bg-primary/10 text-primary font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap'>
                Υποχρεωτικό
              </span>
            </div>
            <FormField
              control={control}
              name='subcategory'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormControl>
                    <LazyCombobox
                      trigger='search'
                      options={allSubcategories}
                      value={field.value}
                      onSelect={handleSubcategorySelect}
                      placeholder='Πληκτρολογήστε επαγγελματική κατηγορία...'
                      searchPlaceholder='Αναζήτηση κατηγορίας...'
                      emptyMessage='Δεν βρέθηκαν κατηγορίες.'
                      formatLabel={(option) => (
                        <>
                          {option.label}{' '}
                          <span className='text-gray-500'>
                            ({option.categoryLabel})
                          </span>
                        </>
                      )}
                      renderButtonContent={(option) => {
                        if (!option) {
                          return (
                            <span className='text-muted-foreground'>
                              Πληκτρολογήστε επαγγελματική κατηγορία...
                            </span>
                          );
                        }
                        return (
                          <>
                            {option.label}{' '}
                            <span className='text-gray-500'>
                              ({option.categoryLabel})
                            </span>
                          </>
                        );
                      }}
                      initialLimit={20}
                      loadMoreIncrement={20}
                      searchLimit={100}
                      showProgress={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Alternative: browse the full category tree via 2 dropdowns */}
            <div className='flex items-center gap-2 text-sm'>
              <button
                type='button'
                onClick={() => setCategoryDialogOpen(true)}
                className='inline-flex items-center gap-1.5 font-medium text-primary hover:underline underline-offset-2 cursor-pointer'
              >
                Δένδρο Κατηγοριών
                <ArrowRight className='h-4 w-4' />
              </button>
            </div>

            {/* Category tree dialog — Category/Subcategory dropdowns */}
            <Dialog
              open={categoryDialogOpen}
              onOpenChange={setCategoryDialogOpen}
            >
              <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                  <DialogTitle>Επιλογή Κατηγορίας</DialogTitle>
                  <DialogDescription>
                    Επιλέξτε κατηγορία και έπειτα υποκατηγορία από τη λίστα.
                  </DialogDescription>
                </DialogHeader>
                <div className='grid grid-cols-1 gap-4 pt-2'>
                  {/* Category */}
                  <div className='flex flex-col gap-2'>
                    <FormLabel>Κατηγορία*</FormLabel>
                    <Selectbox
                      options={filteredTaxonomies as any}
                      value={watchedCategory || ''}
                      onValueChange={(value) => {
                        if (value) {
                          handleCategoryDropdownSelect(value);
                        }
                      }}
                      placeholder='Επιλέξτε κατηγορία...'
                      fullWidth
                    />
                  </div>

                  {/* Subcategory */}
                  <div className='flex flex-col gap-2'>
                    <FormLabel>Υποκατηγορία*</FormLabel>
                    <LazyCombobox
                      key={`${watchedCategory}-${filteredSubcategories.length}`}
                      options={filteredSubcategories as any}
                      value={watchedSubcategory || ''}
                      onSelect={handleSubcategoryDropdownSelect}
                      placeholder='Επιλέξτε υποκατηγορία...'
                      searchPlaceholder='Αναζήτηση υποκατηγορίας...'
                      emptyMessage='Δεν βρέθηκαν υποκατηγορίες.'
                      disabled={!watchedCategory}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── Step 3 — Περιγραφή ───────────────────────────────────── */}
        <div className='flex gap-3 sm:gap-5'>
          <div className='flex flex-col items-center'>
            <div className='flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0 shadow-sm'>
              3
            </div>
            <div className='w-px bg-border flex-1 mt-2' />
          </div>
          <div className='flex-1 pb-9 space-y-3 min-w-0'>
            <div className='flex items-center gap-2 -mt-0.5'>
              <h3 className='font-semibold text-gray-900'>Περιγραφή</h3>
              <span className='text-xs bg-primary/10 text-primary font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap'>
                Υποχρεωτικό
              </span>
            </div>
            <FormField
              control={control}
              name='bio'
              render={({ field }) => (
                <FormItem>
                  <p className='text-sm text-gray-600'>
                    Μια περιγραφή σχετικά με εσάς και τις υπηρεσίες που προσφέρετε.
                  </p>
                  <FormControl>
                    <RichTextEditor
                      value={field.value}
                      onChange={handleBioChange}
                      placeholder='Τουλάχιστον 80 χαρακτήρες (2-3 προτάσεις)'
                      minHeight='120px'
                    />
                  </FormControl>
                  <div className='text-xs text-gray-500'>
                    {stripHtmlTags(field.value).length}/80 χαρακτήρες
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── Step 4 — Τρόποι παροχής Υπηρεσιών ───────────────────── */}
        <div className='flex gap-3 sm:gap-5'>
          <div className='flex flex-col items-center'>
            <div className='flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0 shadow-sm'>
              4
            </div>
            <div className='w-px bg-border flex-1 mt-2' />
          </div>
          <div className='flex-1 pb-9 space-y-3 min-w-0'>
            <div className='flex items-center gap-2 -mt-0.5'>
              <h3 className='font-semibold text-gray-900'>
                Τρόποι παροχής Υπηρεσιών
              </h3>
              <span className='text-xs bg-primary/10 text-primary font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap'>
                Υποχρεωτικό
              </span>
            </div>
            <FormField
              control={control}
              name='coverage'
              render={({ field }) => (
                <FormItem>
                  <div className='space-y-3'>
                    <p className='text-sm text-gray-600'>
                      Προσφέρω τις υπηρεσίες:
                    </p>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Conditional Online Section */}
            {watchedCoverage?.online && (
              <div className='space-y-4 p-4 bg-gray-50 rounded-md shadow border'>
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
              <div className='space-y-4 p-4 bg-gray-50 rounded-md shadow border'>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='h-5 w-5 shrink-0 text-primary' />
                  <h5 className='font-medium text-gray-900'>Στον χώρο μου</h5>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                  <FormField
                    control={control}
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
                      getButtonLabel={(option) => option?.name || 'Επιλέξτε Τ.Κ...'}
                      initialLimit={20}
                      loadMoreIncrement={20}
                      loadMoreThreshold={50}
                      searchLimit={100}
                      showProgress={true}
                    />
                  </div>
                  <FormField
                    control={control}
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
                  <FormField
                    control={control}
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
            {/* Conditional Onsite Section */}
            {watchedCoverage?.onsite && (
              <div className='space-y-4 p-4 bg-gray-50 rounded-md shadow border'>
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
                  <FormField
                    control={control}
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
                              const selected = selectedOptions.map((opt) => opt.id);

                              // Nationwide selection logic
                              const wasNationwide = isNationwideSelected(field.value || []);
                              const isNowNationwide = isNationwideSelected(selected);

                              if (isNowNationwide && !wasNationwide) {
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

                              const validAreaIds = selected.flatMap(
                                (countyId: string) => {
                                  const county = locationOptions.find(
                                    (c) => c.id === countyId,
                                  );
                                  return (
                                    county?.children?.map((area: any) => area.id) ||
                                    []
                                  );
                                },
                              );

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
                  <FormField
                    control={control}
                    name='coverage.areas'
                    render={({ field }) => {
                      // Watch coverage inside the render to get updates
                      const currentCoverage = watch('coverage');

                      return (
                        <FormItem>
                          <FormLabel className='text-sm font-medium text-gray-700'>
                            Περιοχές
                          </FormLabel>
                          <FormControl>
                            <div className='space-y-2'>
                              {isNationwideSelected(currentCoverage?.counties || []) ? (
                                <div className='flex items-center text-sm text-muted-foreground h-auto min-h-9 py-2 px-4 rounded-md border'>
                                  Έχετε επιλέξει πανελλαδική κάλυψη
                                </div>
                              ) : currentCoverage?.counties?.length > 0 ? (
                                <LazyCombobox
                                  key={`areas-${currentCoverage.counties.join('-')}`}
                                  multiple
                                  className='bg-white'
                                  options={currentCoverage.counties.flatMap(
                                    (selectedCountyId: string) => {
                                      const county = locationOptions.find(
                                        (c) => c.id === selectedCountyId,
                                      );
                                      return (
                                        county?.children?.map((area: any) => ({
                                          id: area.id,
                                          label: area.name,
                                          county: county.name,
                                        })) || []
                                      );
                                    },
                                  )}
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
                                  Επιλέξτε πρώτα νομούς
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
          </div>
        </div>

        {/* ── Step 5 — Δείγμα Εργασιών (Προαιρετικό) ──────────────── */}
        <div className='flex gap-3 sm:gap-5'>
          <div className='flex flex-col items-center'>
            <div className='flex items-center justify-center w-9 h-9 rounded-full bg-primary/20 text-primary text-sm font-semibold shrink-0'>
              5
            </div>
          </div>
          <div className='flex-1 pb-6 space-y-3 min-w-0'>
            <div className='flex items-center gap-2 -mt-0.5'>
              <h3 className='font-semibold text-gray-900'>Δείγμα Εργασιών</h3>
              <span className='text-xs bg-gray-100 text-gray-500 font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap'>
                Προαιρετικό
              </span>
            </div>
            <FormField
              control={control}
              name='portfolio'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <MediaUpload
                      ref={portfolioRef}
                      value={field.value || []}
                      onChange={field.onChange}
                      uploadPreset='doulitsa_new'
                      multiple={true}
                      folder={`users/${user?.username}/portfolio`}
                      maxFileSize={15000000} // 15MB
                      maxFiles={10}
                      allowedFormats={[
                        'jpg',
                        'jpeg',
                        'png',
                        'webp',
                        'mp4',
                        'webm',
                        'ogg',
                        'mp3',
                        'wav',
                      ]}
                      placeholder='Ανεβάστε εικόνες, ηχητικά ή βίντεο'
                      error={errors.portfolio?.message}
                      signed={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Success Display with Redirect Progress */}
        {state.message && state.success && (
          <div className='space-y-2 p-4 border border-green-200 bg-green-50 text-green-800 rounded-md'>
            <div className='font-medium text-sm'>{state.message}</div>
            {isRedirecting && (
              <div className='flex items-center gap-2 text-sm'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Μετάβαση στον Πίνακα Ελέγχου...</span>
              </div>
            )}
          </div>
        )}

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className='p-4 bg-gray-100 rounded text-xs space-y-2'>
            <div>isValid: {isValid.toString()}</div>
            <div>isDirty: {isDirty.toString()}</div>
            <div>Errors: {JSON.stringify(errors, null, 2)}</div>
            <div>Form Values: {JSON.stringify(getValues(), null, 2)}</div>
            <div>
              Manual Validation:{' '}
              {(() => {
                try {
                  const result =
                    onboardingFormSchemaWithMedia.safeParse(getValues());
                  if (result.success) {
                    return 'SUCCESS: Form is valid';
                  } else {
                    return JSON.stringify(
                      {
                        success: false,
                        errors: result.error.issues.map((err) => ({
                          path: err.path.join('.'),
                          message: err.message,
                          code: err.code,
                        })),
                      },
                      null,
                      2,
                    );
                  }
                } catch (e) {
                  return `Error: ${e.message}`;
                }
              })()}
            </div>
            <button
              type='button'
              onClick={() => {
                form.trigger();
              }}
              className='px-4 py-2 bg-gray-200 rounded text-sm'
            >
              Trigger Validation
            </button>
          </div>
        )}

        {/* Submit Button */}
        <div className='pt-6 border-t border-border flex justify-center'>
          <FormButton
            type='submit'
            text='Ολοκλήρωση Εγγραφής'
            loadingText={
              isUploading ? 'Ανέβασμα αρχείων...' : 'Ολοκλήρωση Εγγραφής...'
            }
            loading={isPending || isUploading || isPendingTransition}
            disabled={
              isPending ||
              isUploading ||
              isPendingTransition ||
              !isValid ||
              // Block if image is blob URL AND not a pending resource
              (() => {
                const img = watch('image');
                if (!img) return true; // No image

                // Check if it's a pending resource (normal upload state)
                if (typeof img === 'object') {
                  const isPendingResource =
                    (img as any)._pending === true ||
                    img.public_id?.startsWith('pending_');

                  // Allow pending resources (upload in progress)
                  if (isPendingResource) return false;
                }

                // Block non-pending blob URLs (someone bypassing upload)
                const url = typeof img === 'string' ? img : img?.secure_url;
                return url?.startsWith('blob:') || false;
              })()
            }
            className='w-2/3'
            variant='submit'
          />
        </div>
      </form>
    </Form>
  );
}
