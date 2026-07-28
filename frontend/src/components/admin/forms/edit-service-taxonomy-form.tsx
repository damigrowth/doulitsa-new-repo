'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { Loader2, ChevronRight } from 'lucide-react';
import { updateServiceTaxonomyAction } from '@/actions/admin/services';
import { LazyCombobox } from '@/components/ui/lazy-combobox';
import { Badge } from '@/components/ui/badge';
import type { DatasetItem } from '@/lib/types/datasets';
import { editServiceTaxonomySchema } from '@/lib/validations/service';
import { populateFormData } from '@/lib/utils/form';

type EditServiceTaxonomyFormValues = z.infer<typeof editServiceTaxonomySchema>;

interface EditServiceTaxonomyFormProps {
  service: {
    id: number;
    category: string;
    subcategory: string;
    subdivision: string | null;
    tags?: string[];
  };
  allSubdivisions: Array<{
    id: string;
    label: string;
    subdivision: any;
    subcategory: any;
    category: any;
  }>;
  availableTags: Array<{ value: string; label: string }>;
}

export function EditServiceTaxonomyForm({
  service,
  allSubdivisions,
  availableTags,
}: EditServiceTaxonomyFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateServiceTaxonomyAction,
    null,
  );

  const form = useForm<EditServiceTaxonomyFormValues>({
    resolver: zodResolver(editServiceTaxonomySchema),
    mode: 'onChange',
    defaultValues: {
      category: service.category,
      subcategory: service.subcategory,
      subdivision: service.subdivision || '',
      tags: service.tags || [],
    },
  });

  // Handle state changes from server action
  useEffect(() => {
    if (state?.success) {
      toast.success('Service taxonomy updated successfully');
      router.refresh();
      // Reset form dirty state after successful update
      form.reset(form.getValues());
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router, form]);

  const handleFormSubmit = (formData: FormData) => {
    const allValues = form.getValues();
    const payload = {
      serviceId: service.id.toString(),
      category: allValues.category,
      subcategory: allValues.subcategory,
      subdivision: allValues.subdivision,
      tags: JSON.stringify(allValues.tags),
    };

    populateFormData(formData, payload, {
      stringFields: [
        'serviceId',
        'category',
        'subcategory',
        'subdivision',
        'tags',
      ],
    });

    formAction(formData);
  };

  return (
    <Form {...form}>
      <form action={handleFormSubmit} className='space-y-4'>
        <FormField
          control={form.control}
          name='subdivision'
          render={({ field }) => {
            // Watch subdivision inside render to get fresh updates
            const currentSubdivision = form.watch('subdivision');

            return (
              <FormItem>
                <FormLabel>Service Category</FormLabel>
                <FormControl>
                  <LazyCombobox
                    key={`taxonomy-${currentSubdivision || 'empty'}`}
                    trigger='search'
                    clearable={true}
                    options={allSubdivisions}
                    value={currentSubdivision || undefined}
                    onSelect={(option) => {
                    // Auto-populate all three fields
                    form.setValue('category', option.category.id, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    form.setValue('subcategory', option.subcategory.id, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    form.setValue('subdivision', option.subdivision.id, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    form.clearErrors(['category', 'subcategory', 'subdivision']);
                  }}
                  onClear={() => {
                    // Clear all three fields
                    form.setValue('category', '', {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    form.setValue('subcategory', '', {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    form.setValue('subdivision', '', {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  placeholder='Select service category...'
                  searchPlaceholder='Search category...'
                  emptyMessage='No categories found.'
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
                          Select service category...
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
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name='tags'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
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
                    form.setValue('tags', selectedIds, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  onSelect={() => {}}
                  placeholder='Select tags...'
                  searchPlaceholder='Search tags...'
                  maxItems={10}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='flex justify-end space-x-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => form.reset()}
            disabled={isPending || !form.formState.isDirty}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            disabled={
              isPending || !form.formState.isValid || !form.formState.isDirty
            }
          >
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
