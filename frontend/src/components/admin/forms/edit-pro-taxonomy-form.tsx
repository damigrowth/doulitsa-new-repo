'use client';

import { useState } from 'react';
import { useForm, useWatch, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateProTaxonomySchema,
  type UpdateProTaxonomyInput,
} from '@/lib/validations/admin';
import type { DatasetItem } from '@/lib/types/datasets';
import { FieldGrid, LabelField, SlugField } from './';
import { useSlugHandlers } from './use-slug-handlers';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { updateProTaxonomy } from '@/actions/admin/pro-taxonomies';

interface EditProTaxonomyFormProps {
  taxonomy: {
    id: string;
    label: string;
    slug: string;
    plural?: string;
    description: string;
    level: 'category' | 'subcategory';
    parentId?: string;
    parentLabel?: string;
    type?: 'freelancer' | 'company';
  };
  existingItems: DatasetItem[];
}

// Separate component to handle form fields with hooks
function EditProTaxonomyFormFields({
  form,
  isPending,
  taxonomy,
  existingItems,
}: {
  form: UseFormReturn<UpdateProTaxonomyInput>;
  isPending: boolean;
  taxonomy: EditProTaxonomyFormProps['taxonomy'];
  existingItems: DatasetItem[];
}) {
  const { handleLabelChange, handleSlugRegenerate } = useSlugHandlers(
    form,
    'plural',
  );
  const pluralValue = useWatch({ control: form.control, name: 'plural' }) || '';

  return (
    <>
      <FieldGrid>
        <FormField
          control={form.control}
          name='id'
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID</FormLabel>
              <FormControl>
                <Input {...field} disabled />
              </FormControl>
              <FormDescription>Unique identifier (read-only)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='level'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Level</FormLabel>
              <FormControl>
                <Input {...field} disabled />
              </FormControl>
              <FormDescription>Taxonomy level (read-only)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <LabelField
          form={form}
          isPending={isPending}
          placeholder='Enter label'
          description='The display name for this professional category'
        />

        <FormField
          control={form.control}
          name='plural'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plural</FormLabel>
              <FormControl>
                <Input
                  placeholder='Enter plural form'
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    handleLabelChange(e.target.value);
                  }}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>Plural form of the label</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <SlugField
          form={form}
          isPending={isPending}
          placeholder='enter-slug'
          description='Auto-generated from plural'
          existingItems={existingItems}
          onRegenerate={handleSlugRegenerate}
          currentLabel={pluralValue || ''}
        />

        {taxonomy.level === 'subcategory' && (
          <FormField
            control={form.control}
            name='type'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select type' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='freelancer'>Professional</SelectItem>
                    <SelectItem value='company'>Company</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Professional or Company</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </FieldGrid>

      {taxonomy.level === 'subcategory' && taxonomy.parentLabel && (
        <div className='rounded-lg border bg-muted/50 p-4'>
          <p className='text-sm font-medium'>Parent Category</p>
          <p className='text-sm text-muted-foreground'>
            {taxonomy.parentLabel}
          </p>
        </div>
      )}

      <FormField
        control={form.control}
        name='description'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder='Enter description (optional)'
                rows={3}
                disabled={isPending}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

export function EditProTaxonomyForm({
  taxonomy,
  existingItems,
}: EditProTaxonomyFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<UpdateProTaxonomyInput>({
    resolver: zodResolver(updateProTaxonomySchema),
    mode: 'onChange',
    defaultValues: {
      id: taxonomy.id,
      label: taxonomy.label,
      slug: taxonomy.slug,
      plural: taxonomy.plural || '',
      description: taxonomy.description,
      level: taxonomy.level,
      parentId: taxonomy.parentId || '',
      type: taxonomy.type || 'freelancer',
    },
  });

  const onSubmit = async (data: UpdateProTaxonomyInput) => {
    setIsPending(true);

    try {
      // Write straight to the DB (no draft, no Git).
      const result = await updateProTaxonomy({
        id: data.id,
        label: data.label,
        slug: data.slug,
        plural: data.plural,
        description: data.description,
        level: data.level,
        type: data.level === 'subcategory' ? data.type : undefined,
      });

      if (!result.success) {
        toast.error('Failed to save changes — please try again');
        return;
      }

      toast.success('Saved');

      // Reset form dirty state
      form.reset(data);

      // Navigate back to list
      router.push(
        `/admin/taxonomies/pro/${data.level === 'category' ? 'categories' : 'subcategories'}`
      );
    } catch (error) {
      console.error('[EDIT_PRO_TAXONOMY_FORM] Failed:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <EditProTaxonomyFormFields
          form={form}
          isPending={isPending}
          taxonomy={taxonomy}
          existingItems={existingItems}
        />

        <div className='flex justify-end gap-4'>
          <Button
            type='button'
            variant='outline'
            onClick={() => form.reset()}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button type='submit' disabled={isPending || !form.formState.isDirty}>
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
