'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import type { Service, Profile } from '@/lib/prisma-types';

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
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(() => import('@/components/ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })), { ssr: false });
// import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// Icons (lucide-react)
import { HelpCircle, Package, ChevronRight, Info } from 'lucide-react';

// Custom components
import { Currency } from '@/components/ui/currency';
import { LazyCombobox } from '@/components/ui/lazy-combobox';
import { Badge } from '@/components/ui/badge';
import FormButton from '@/components/shared/button-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Static constants and dataset utilities
import { populateFormData } from '@/lib/utils/form';
import { stripHtmlTags } from '@/lib/utils/text/html';
import { findById } from '@/lib/utils/datasets';
import type { DatasetItem } from '@/lib/types/datasets';

// Validation schema and server action
import {
  createServiceSchema,
  type CreateServiceInput,
} from '@/lib/validations/service';
import { updateServiceAction } from '@/actions/services/update-service';
import { submitTaxonomySubmission } from '@/actions/taxonomy-submission';
import { AuthUser } from '@/lib/types/auth';
import type { LazyComboboxOption } from '@/components/ui/lazy-combobox';
import { SubscriptionType } from '@/lib/prisma-types';
import { isValidSubscriptionType } from '@/lib/types/common';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AddonFields } from '@/components/shared/addon-fields';
import { FaqFields } from '@/components/shared/faq-fields';

const initialState = {
  success: false,
  message: '',
};

// Service row with the minimal profile relation the edit form needs.
type ServiceWithProfile = Service & {
  profile: Pick<Profile, 'id'>;
};

interface PendingTagItem {
  pendingId: string;
  label: string;
}

interface FormServiceEditProps {
  service: ServiceWithProfile;
  initialUser: AuthUser | null;
  initialProfile: Profile | null;
  serviceTaxonomies: DatasetItem[];
  allSubdivisions: Array<{
    id: string;
    label: string;
    subdivision: any;
    subcategory: any;
    category: any;
  }>;
  availableTags: Array<{ value: string; label: string }>;
  pendingTags?: PendingTagItem[];
}

export default function FormServiceEdit({
  service,
  initialUser,
  initialProfile,
  serviceTaxonomies,
  allSubdivisions,
  availableTags,
  pendingTags = [],
}: FormServiceEditProps) {
  const [state, action, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return updateServiceAction(Number(service.id), formData);
    },
    initialState,
  );

  const router = useRouter();
  const [activeTab, setActiveTab] = useState('addons');

  const form = useForm<CreateServiceInput>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      category: '',
      subcategory: '',
      subdivision: '',
      tags: [],
      type: {
        presence: false,
        online: false,
        oneoff: true,
        onbase: false,
        subscription: false,
        onsite: false,
      },
      subscriptionType: undefined,
      fixed: true,
      duration: 0,
      addons: [],
      faq: [],
      media: [],
    },
    mode: 'onChange',
  });

  const {
    formState: { errors, isValid, isDirty },
    setValue,
    getValues,
    watch,
    clearErrors,
    trigger,
  } = form;

  // Guard form.reset() with snapshot ref to prevent unnecessary resets
  // when service prop reference changes but data is identical (e.g. after server action revalidation)
  const serviceSnapshotRef = React.useRef<string>('');

  useEffect(() => {
    if (service) {
      const resetData = {
        title: service.title || '',
        description: service.description || '',
        price: service.price || 0,
        category: service.category || '',
        subcategory: service.subcategory || '',
        subdivision: service.subdivision || '',
        tags: service.tags || [],
        type: service.type || {
          presence: false,
          online: false,
          oneoff: true,
          onbase: false,
          subscription: false,
          onsite: false,
        },
        subscriptionType:
          service.subscriptionType &&
          isValidSubscriptionType(service.subscriptionType)
            ? service.subscriptionType
            : service.type?.subscription
              ? SubscriptionType.month
              : undefined,
        fixed: service.fixed ?? true,
        duration: service.duration || 0,
        addons: service.addons || [],
        faq: service.faq || [],
        media: service.media || [],
      };
      const snapshot = JSON.stringify(resetData);
      if (snapshot !== serviceSnapshotRef.current) {
        serviceSnapshotRef.current = snapshot;
        form.reset(resetData);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  // Handle successful form submission
  useEffect(() => {
    if (state.success && state.data?.message) {
      toast.success(state.data.message, {
        id: `service-edit-form-${Date.now()}`,
      });
      router.refresh();
    } else if (!state.success && state.error) {
      toast.error(state.error, {
        id: `service-edit-form-${Date.now()}`,
      });
    }
  }, [state, router]);

  // Watch specific fields for dependent logic
  const watchedCategory = watch('category');
  const watchedSubcategory = watch('subcategory');
  const watchedSubdivision = watch('subdivision');
  const watchedType = watch('type');
  const addons = watch('addons') || [];
  const faq = watch('faq') || [];

  // allSubdivisions now passed as prop from server-side (no need for useMemo)

  // Get filtered data based on selections
  const selectedCategoryData = findById(serviceTaxonomies, watchedCategory);
  const subcategories = selectedCategoryData?.children || [];
  const selectedSubcategoryData = findById(serviceTaxonomies, watchedSubcategory);
  const subdivisions = selectedSubcategoryData?.children || [];

  // Merge pending tags into available tags and compute pending IDs set
  const pendingTagIds = React.useMemo(
    () => new Set(pendingTags.map((p) => p.pendingId)),
    [pendingTags],
  );

  const availableTagsWithPending = React.useMemo(() => {
    const pendingAsOptions = pendingTags.map((p) => ({
      value: p.pendingId,
      label: p.label,
    }));
    return [...availableTags, ...pendingAsOptions];
  }, [availableTags, pendingTags]);

  // Handle creating a new tag via taxonomy submission
  const handleCreateTag = React.useCallback(
    async (label: string): Promise<LazyComboboxOption | null> => {
      const result = await submitTaxonomySubmission({ label, type: 'tag' });
      if (result.success && result.data) {
        toast.success(`Το tag "${label}" υποβλήθηκε για έγκριση`);
        return { id: result.data.pendingId, label };
      }
      toast.error(result.message || 'Σφάλμα κατά την υποβολή');
      return null;
    },
    [],
  );

  // Selection handlers - store only ID values
  const handleCategorySelect = (selected: any) => {
    setValue('category', selected.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('subcategory', '', { shouldDirty: true, shouldValidate: true });
    setValue('subdivision', '', { shouldDirty: true, shouldValidate: true });
  };

  const handleSubcategorySelect = (selected: any) => {
    setValue('subcategory', selected.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('subdivision', '', { shouldDirty: true, shouldValidate: true });
  };

  const handleSubdivisionSelect = (selected: any) => {
    setValue('subdivision', selected.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // Form submission handler using profile form pattern
  const handleFormSubmit = (formData: FormData) => {
    // Get all form values and populate FormData using utility function
    const allValues = getValues();

    populateFormData(formData, allValues, {
      stringFields: [
        'title',
        'description',
        'category',
        'subcategory',
        'subdivision',
        'subscriptionType',
      ],
      jsonFields: ['type', 'tags', 'addons', 'faq'],
      numericFields: ['price', 'duration'],
      booleanFields: ['fixed'],
      skipEmpty: true,
    });

    // Call server action
    action(formData);
  };

  return (
    <Form {...form}>
      <form
        action={handleFormSubmit}
        className='space-y-6 p-6 border rounded-lg shadow'
      >
        <TooltipProvider>
          {/* Title */}
          {/* <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Τίτλος υπηρεσίας*</FormLabel>
              <p className='text-sm text-gray-600'>
                Ένας σαφής και περιγραφικός τίτλος
              </p>
              <FormControl>
                <Input
                  placeholder='π.χ. Δημιουργία λογοτύπου και ταυτότητας επιχείρησης'
                  maxLength={100}
                  {...field}
                  disabled={
                    service.status !== 'draft' && initialUser?.role !== 'admin'
                  }
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 100);
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <div className='text-sm text-gray-500'>
                {field.value?.length || 0}/100 χαρακτήρες
              </div>
              <FormMessage />
            </FormItem>
          )}
        /> */}
          <div>
            <h2 className='text-xl font-bold text-foreground'>
              {form.watch('title')}
            </h2>
          </div>
          {/* Description */}
          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <div className='flex items-center gap-2'>
                  <FormLabel>Περιγραφή υπηρεσίας*</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help' />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Αναλυτική περιγραφή τουλάχιστον 80 χαρακτήρων</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <RichTextEditor
                    value={field.value || ''}
                    onChange={(html) => field.onChange(html)}
                    placeholder='Περιγράψτε την υπηρεσία σας αναλυτικά...'
                    minHeight='120px'
                  />
                </FormControl>
                <div className='text-xs text-gray-500'>
                  {stripHtmlTags(field.value || '').length}/5000 χαρακτήρες
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Price and Fixed Price Toggle */}
          <div className='space-y-3'>
            <FormField
              control={form.control}
              name='price'
              render={({ field }) => (
                <FormItem>
                  <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
                    <FormLabel
                      className={`sm:min-w-[50px] transition-colors ${!watch('fixed') ? 'text-muted-foreground' : ''}`}
                    >
                      Τιμή{watch('fixed') ? '*' : ''}
                    </FormLabel>
                    <FormControl>
                      <div className='w-[150px]'>
                        <Currency
                          currency='€'
                          position='right'
                          placeholder={
                            watch('fixed') ? 'π.χ. 50' : 'Τιμή κρυφή'
                          }
                          min={1}
                          max={10000}
                          allowDecimals={false}
                          value={field.value || 0}
                          onValueChange={field.onChange}
                          disabled={!watch('fixed')}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className='sm:!mt-0' />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='fixed'
              render={({ field }) => (
                <FormItem>
                  <div className='flex items-center gap-2'>
                    <FormLabel
                      className={`flex items-center justify-between shadow gap-4 p-3 rounded-lg border transition-colors cursor-pointer hover:border-primary/50 w-[220px] ${!field.value ? 'bg-white shadow-sm' : 'bg-muted/30'}`}
                    >
                      <span className='text-sm font-medium'>
                        Απόκρυψη τιμής
                      </span>
                      <FormControl>
                        <Switch
                          checked={!field.value}
                          onCheckedChange={async (checked) => {
                            field.onChange(!checked);
                            if (checked) {
                              setValue('price', 0, { shouldValidate: false });
                              clearErrors('price');
                            } else {
                              clearErrors('price');
                            }
                            await trigger('price');
                          }}
                        />
                      </FormControl>
                    </FormLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help flex-shrink-0' />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ενεργοποίηση για να μην εμφανίζεται τιμή</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Duration - Only show for oneoff services */}
          {watchedType?.oneoff && (
            <FormField
              control={form.control}
              name='duration'
              render={({ field }) => (
                <FormItem>
                  <div className='flex items-center gap-2 pt-4'>
                    <FormLabel>Ημέρες παράδοσης</FormLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help' />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Εκτιμώμενη διάρκεια σε ημέρες που θα ολοκληρωθεί η
                          υπηρεσία (προαιρετικό)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <FormControl>
                    <div className='max-w-[200px]'>
                      <Input
                        type='number'
                        placeholder='π.χ. 7'
                        min={0}
                        max={365}
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 0)
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Taxonomy Selection - Subdivision with Auto-populated Category/Subcategory */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <FormLabel className='text-sm font-medium text-gray-900'>
                Κατηγορία Υπηρεσίας*
              </FormLabel>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help' />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Πληκτρολογήστε και επιλέξτε την πιο σχετική κατηγορία</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <LazyCombobox
              trigger='search'
              clearable={true}
              options={allSubdivisions}
              value={watchedSubdivision || undefined}
              onSelect={(option) => {
                // Auto-populate all three fields
                setValue('category', option.category.id, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue('subcategory', option.subcategory.id, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue('subdivision', option.subdivision.id, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                clearErrors(['category', 'subcategory', 'subdivision']);
              }}
              onClear={() => {
                // Clear all three fields
                setValue('category', '', {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue('subcategory', '', {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue('subdivision', '', {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              placeholder='Πληκτρολογήστε κατηγορία...'
              searchPlaceholder='Αναζήτηση κατηγορίας...'
              emptyMessage='Δεν βρέθηκαν κατηγορίες.'
              formatLabel={(option) => (
                <>
                  {option.label}{' '}
                  <span className='text-gray-500 text-sm'>
                    ({option.category.label} / {option.subcategory.label})
                  </span>
                </>
              )}
              renderButtonContent={(option) => {
                if (!option) {
                  return (
                    <span className='text-muted-foreground'>
                      Πληκτρολογήστε κατηγορία...
                    </span>
                  );
                }
                return (
                  <div className='flex flex-wrap gap-1 items-center'>
                    <Badge variant='default' className='hover:bg-primary/90'>
                      {option.category.label}
                    </Badge>
                    <ChevronRight className='h-3 w-3 text-muted-foreground' />
                    <Badge variant='default' className='hover:bg-primary/90'>
                      {option.subcategory.label}
                    </Badge>
                    <ChevronRight className='h-3 w-3 text-muted-foreground' />
                    <Badge variant='default' className='hover:bg-primary/90'>
                      {option.label}
                    </Badge>
                  </div>
                );
              }}
              initialLimit={20}
              loadMoreIncrement={20}
              loadMoreThreshold={50}
              searchLimit={100}
              showProgress={true}
            />

            {/* Show validation error - only subdivision since it's the primary field */}
            {errors.subdivision && (
              <p className='text-sm font-medium text-destructive'>
                {errors.subdivision.message}
              </p>
            )}

            {/* Tags */}
            <FormField
              control={form.control}
              name='tags'
              render={({ field }) => (
                <FormItem>
                  <div className='flex items-center gap-2 pt-4'>
                    <FormLabel>Ετικέτες (tags)</FormLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help' />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Επιλέξτε ετικέτες (tags) που περιγράφουν την υπηρεσία
                          σας (έως 10)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <FormControl>
                    <LazyCombobox
                      trigger='search'
                      multiple
                      options={availableTagsWithPending.map((tag) => ({
                        id: tag.value,
                        label: tag.label,
                      }))}
                      values={field.value || []}
                      onMultiSelect={(selectedOptions) => {
                        const selectedIds = selectedOptions.map(
                          (opt) => opt.id,
                        );
                        setValue('tags', selectedIds, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      onSelect={() => {}}
                      placeholder='Επιλέξτε tags..'
                      searchPlaceholder='Αναζήτηση tags...'
                      maxItems={10}
                      allowCreate
                      onCreateItem={handleCreateTag}
                      pendingIds={pendingTagIds}
                      pendingBadgeText={(n) =>
                        n === 1
                          ? 'επιλεγμένο tag υπό έγκριση'
                          : 'επιλεγμένα tags υπό έγκριση'
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Addons and FAQ Section */}
          <div className='space-y-6'>
            <h3 className='text-lg font-medium pt-4'>
              Extra υπηρεσίες & Συχνές ερωτήσεις
            </h3>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className='w-full'
            >
              <TabsList className='grid w-full grid-cols-2 p-1.5 h-auto'>
                <TabsTrigger
                  value='addons'
                  className='flex items-center space-x-2 py-1.5'
                >
                  <Package className='w-4 h-4' />
                  <span>Extra υπηρεσίες</span>
                  {addons.length > 0 && (
                    <span className='ml-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full'>
                      {addons.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value='faq'
                  className='flex items-center space-x-2 py-1.5'
                >
                  <HelpCircle className='w-4 h-4' />
                  <span>Συχνές ερωτήσεις</span>
                  {faq.length > 0 && (
                    <span className='ml-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full'>
                      {faq.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value='addons' className='space-y-6'>
                <AddonFields
                  control={form.control}
                  name='addons'
                  maxAddons={3}
                />
              </TabsContent>

              <TabsContent value='faq' className='space-y-6'>
                <FaqFields control={form.control} name='faq' maxFaq={5} />
              </TabsContent>
            </Tabs>
          </div>

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
              text={service.status === 'draft' ? 'Δημιουργία' : 'Αποθήκευση'}
              loadingText={
                service.status === 'draft' ? 'Δημιουργία...' : 'Αποθήκευση...'
              }
              loading={isPending}
              disabled={isPending || !isValid || !isDirty}
            />
          </div>
        </TooltipProvider>
      </form>
    </Form>
  );
}
