'use client';

import React from 'react';

// Standard shadcn/ui imports
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(() => import('@/components/ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })), { ssr: false });
import { Switch } from '@/components/ui/switch';

// Custom UI components
import { Currency } from '@/components/ui/currency';
import { LazyCombobox } from '@/components/ui/lazy-combobox';
import { Selectbox } from '@/components/ui/selectbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Icons
import { Check, ChevronsUpDown, ChevronRight, Info, ArrowRight } from 'lucide-react';

// Tooltip
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Utilities
import { stripHtmlTags } from '@/lib/utils/text/html';
import { TaxonomyDataContext } from '../form-service-create';
import { findById } from '@/lib/utils/datasets';
import type { CreateServiceInput } from '@/lib/validations/service';
import { useFormContext, useWatch } from 'react-hook-form';
import { submitTaxonomySubmission } from '@/actions/taxonomy-submission';
import { toast } from 'sonner';
import type { LazyComboboxOption } from '@/components/ui/lazy-combobox';

export default function ServiceDetailsStep() {
  const form = useFormContext<CreateServiceInput>();
  const { setValue, watch, formState, clearErrors, trigger } = form;

  const taxonomyData = React.useContext(TaxonomyDataContext);

  if (!taxonomyData) {
    throw new Error('ServiceDetailsStep must be used within TaxonomyDataContext');
  }

  const { serviceTaxonomies, allSubdivisions, availableTags, pendingTagIds } =
    taxonomyData;

  // Controls the "Δένδρο Κατηγοριών" tree-selection dialog (3 dropdowns)
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);

  // Handle creating a new pending tag
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

  // Use watch for reactive form field watching
  const watchedCategory = watch('category');
  const watchedSubcategory = watch('subcategory');
  const watchedSubdivision = watch('subdivision');
  const watchedType = watch('type');

  // Use useWatch for reactive updates in multi-step context (survives component remounting)
  const fixedValue = useWatch({
    control: form.control,
    name: 'fixed',
    defaultValue: true,
  });

  // Get filtered data based on selections
  const selectedCategoryData = findById(serviceTaxonomies, watchedCategory);
  const subcategories = selectedCategoryData?.children || [];
  const selectedSubcategoryData = findById(serviceTaxonomies, watchedSubcategory);
  const subdivisions = selectedSubcategoryData?.children || [];

  // allSubdivisions and availableTags now come from context (server-side prepared)

  // Handle dependent field clearing
  const handleCategorySelect = (categoryId: string) => {
    setValue('category', categoryId, { shouldValidate: true });
    // Clear dependent fields when category changes
    setValue('subcategory', '', { shouldValidate: true });
    setValue('subdivision', '', { shouldValidate: true });
  };

  const handleSubcategorySelect = (subcategoryId: string) => {
    setValue('subcategory', subcategoryId, { shouldValidate: true });
    // Clear dependent fields when subcategory changes
    setValue('subdivision', '', { shouldValidate: true });
  };

  const handleSubdivisionSelect = (subdivisionId: string) => {
    setValue('subdivision', subdivisionId, { shouldValidate: true });
    clearErrors(['category', 'subcategory', 'subdivision']);
    // Close the dialog once a full selection is made
    setCategoryDialogOpen(false);
  };

  return (
    <div className='space-y-6 w-full'>
      <TooltipProvider>
        {/* Title */}
        <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem>
              <div className='flex items-center gap-2'>
                <FormLabel>Τίτλος υπηρεσίας*</FormLabel>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help' />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ένας σαφής και περιγραφικός τίτλος</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <FormControl>
                <Input
                  placeholder='π.χ. Σχεδίαση και κατασκευή ιστοσελίδας'
                  maxLength={100}
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 100);
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <div className='text-xs text-gray-500'>
                {field.value?.length || 0}/100 χαρακτήρες
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

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

        {/* Taxonomy Selection - Subdivision with Auto-populated Category/Subcategory */}
        <FormField
          control={form.control}
          name='subdivision'
          render={({ field }) => {
            // Watch subdivision inside render to get updates
            const currentSubdivision = watch('subdivision');

            return (
              <FormItem>
                <div className='flex items-center gap-2'>
                  <FormLabel className='text-sm font-medium text-gray-900'>
                    Κατηγορία Υπηρεσίας*
                  </FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help' />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Πληκτρολογήστε και επιλέξτε την πιο σχετική κατηγορία
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <LazyCombobox
                    key={`subdivision-${currentSubdivision || 'empty'}`}
                    trigger='search'
                    clearable={true}
                    options={allSubdivisions}
                    value={currentSubdivision || undefined}
                    onSelect={(option) => {
                      // Auto-populate all three fields
                      setValue('category', option.category.id, {
                        shouldValidate: true,
                      });
                      setValue('subcategory', option.subcategory.id, {
                        shouldValidate: true,
                      });
                      setValue('subdivision', option.subdivision.id, {
                        shouldValidate: true,
                      });
                      clearErrors(['category', 'subcategory', 'subdivision']);
                    }}
                    onClear={() => {
                      // Clear all three fields
                      setValue('category', '', { shouldValidate: true });
                      setValue('subcategory', '', { shouldValidate: true });
                      setValue('subdivision', '', { shouldValidate: true });
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
                          <Badge
                            variant='default'
                            className='hover:bg-primary/90'
                          >
                            {option.category.label}
                          </Badge>
                          <ChevronRight className='h-3 w-3 text-muted-foreground' />
                          <Badge
                            variant='default'
                            className='hover:bg-primary/90'
                          >
                            {option.subcategory.label}
                          </Badge>
                          <ChevronRight className='h-3 w-3 text-muted-foreground' />
                          <Badge
                            variant='default'
                            className='hover:bg-primary/90'
                          >
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
                </FormControl>

                {/* Alternative: browse the full category tree via 3 dropdowns */}
                <div className='flex items-center gap-2 text-sm pt-1'>
                  <button
                    type='button'
                    onClick={() => setCategoryDialogOpen(true)}
                    className='inline-flex items-center gap-1.5 font-medium text-primary hover:underline underline-offset-2 cursor-pointer'
                  >
                    Δένδρο Κατηγοριών
                    <ArrowRight className='h-4 w-4' />
                  </button>
                </div>

                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Category tree dialog — Category/Subcategory/Subdivision dropdowns */}
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent className='sm:max-w-lg'>
            <DialogHeader>
              <DialogTitle>Επιλογή Κατηγορίας</DialogTitle>
              <DialogDescription>
                Επιλέξτε κατηγορία, υποκατηγορία και έπειτα αντικείμενο από τη
                λίστα.
              </DialogDescription>
            </DialogHeader>
            <div className='grid grid-cols-1 gap-4 pt-2'>
              {/* Category */}
              <div className='flex flex-col gap-2'>
                <FormLabel>Κατηγορία*</FormLabel>
                <Selectbox
                  options={serviceTaxonomies as any}
                  value={watchedCategory || ''}
                  onValueChange={(value) => {
                    if (value) {
                      handleCategorySelect(value);
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
                  key={`subcategory-${categoryDialogOpen}-${watchedCategory}-${watchedSubcategory}`}
                  options={subcategories as any}
                  value={watchedSubcategory || ''}
                  onSelect={(option) => handleSubcategorySelect(option.id)}
                  placeholder='Επιλέξτε υποκατηγορία...'
                  searchPlaceholder='Αναζήτηση υποκατηγορίας...'
                  emptyMessage='Δεν βρέθηκαν υποκατηγορίες.'
                  disabled={!watchedCategory}
                />
              </div>

              {/* Subdivision */}
              <div className='flex flex-col gap-2'>
                <FormLabel>Αντικείμενο*</FormLabel>
                <LazyCombobox
                  key={`subdivision-tree-${categoryDialogOpen}-${watchedSubcategory}-${watchedSubdivision}`}
                  options={subdivisions as any}
                  value={watchedSubdivision || ''}
                  onSelect={(option) => handleSubdivisionSelect(option.id)}
                  placeholder='Επιλέξτε αντικείμενο...'
                  searchPlaceholder='Αναζήτηση αντικειμένου...'
                  emptyMessage='Δεν βρέθηκαν αντικείμενα.'
                  disabled={!watchedSubcategory}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tags - Multi-select from tags dataset */}
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
                    <p>Επιλέξτε έως 10 ετικέτες (tags) για την υπηρεσία σας</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <FormControl>
                <LazyCombobox
                  trigger='search'
                  multiple
                  options={availableTags.map((tag) => ({
                    id: tag.value,
                    label: tag.label,
                  }))}
                  values={field.value || []}
                  onMultiSelect={(selectedOptions) => {
                    const selectedIds = selectedOptions.map((opt) => opt.id);
                    field.onChange(selectedIds);
                  }}
                  onSelect={() => {}}
                  placeholder='Επιλέξτε tags..'
                  searchPlaceholder='Αναζήτηση tags...'
                  maxItems={10}
                  className='bg-subtle'
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

        {/* Price and Fixed Price Toggle */}
        <div className='space-y-3'>
          <FormField
            control={form.control}
            name='price'
            render={({ field }) => (
              <FormItem>
                <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
                  <FormLabel
                    className={`sm:min-w-[50px] transition-colors ${!fixedValue ? 'text-muted-foreground' : ''}`}
                  >
                    Τιμή{fixedValue ? '*' : ''}
                  </FormLabel>
                  <FormControl>
                    <div className='w-[150px]'>
                      <Currency
                        currency='€'
                        position='right'
                        placeholder={fixedValue ? 'π.χ. 50' : 'Τιμή κρυφή'}
                        min={1}
                        max={10000}
                        allowDecimals={false}
                        value={field.value || 0}
                        onValueChange={field.onChange}
                        disabled={!fixedValue}
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
                  <label
                    className={`flex items-center justify-between shadow gap-4 p-3 rounded-lg border transition-colors cursor-pointer hover:border-primary/50 w-[220px] ${!field.value ? 'bg-white shadow-sm' : 'bg-muted/30'}`}
                  >
                    <span className='text-sm font-medium cursor-pointer'>
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
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help flex-shrink-0' />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ενεργοποίηση για να μην εμφανίζεται τιμή</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                      min={1}
                      max={365}
                      placeholder='π.χ. 7'
                      value={field.value?.toString() || ''}
                      onChange={(e) => {
                        const numValue =
                          e.target.value === ''
                            ? undefined
                            : parseInt(e.target.value, 10);
                        field.onChange(numValue);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </TooltipProvider>
    </div>
  );
}
