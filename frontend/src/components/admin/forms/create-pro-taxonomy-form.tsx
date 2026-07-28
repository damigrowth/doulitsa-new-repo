'use client';

import { useState } from 'react';
import { useForm, useWatch, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createProTaxonomySchema, type CreateProTaxonomyInput } from '@/lib/validations/admin';
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
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createProTaxonomy } from '@/actions/admin/pro-taxonomies';

interface CreateProTaxonomyFormProps {
  level: 'category' | 'subcategory';
  existingItems: DatasetItem[];
}

// Separate component to handle form fields with hooks
function CreateProTaxonomyFormFields({
  form,
  isPending,
  level,
  existingItems,
  parentCategories,
}: {
  form: UseFormReturn<CreateProTaxonomyInput>;
  isPending: boolean;
  level: 'category' | 'subcategory';
  existingItems: DatasetItem[];
  parentCategories: DatasetItem[];
}) {
  const { handleLabelChange, handleSlugRegenerate } = useSlugHandlers(form, 'plural');

  return (
    <>
      <FieldGrid>
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
          placeholder='auto-generated-slug'
          description='Auto-generated from plural'
          existingItems={existingItems}
          onRegenerate={handleSlugRegenerate}
          watchFieldName='plural'
        />

        {level === 'subcategory' && (
          <>
            <FormField
              control={form.control}
              name='parentId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select parent category' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {parentCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.label || category.name || category.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          </>
        )}
      </FieldGrid>

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

export function CreateProTaxonomyForm({
  level,
  existingItems,
}: CreateProTaxonomyFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  // Get parent categories for subcategory creation
  const parentCategories = level === 'subcategory' ? existingItems : [];

  const form = useForm<CreateProTaxonomyInput>({
    resolver: zodResolver(createProTaxonomySchema),
    mode: 'onChange',
    defaultValues: {
      label: '',
      plural: '',
      slug: '',
      description: '',
      level,
      parentId: '',
      type: 'freelancer',
    },
  });

  const onSubmit = async (data: CreateProTaxonomyInput) => {
    setIsPending(true);

    try {
      // Write straight to the DB (no draft, no Git).
      const result = await createProTaxonomy({
        label: data.label,
        slug: data.slug,
        plural: data.plural,
        description: data.description,
        level,
        parentId: level === 'subcategory' ? data.parentId : undefined,
        type: level === 'subcategory' ? data.type : undefined,
      });

      if (!result.success) {
        toast.error('Failed to create — please try again');
        return;
      }

      toast.success('Created');

      const listPath =
        level === 'category'
          ? '/admin/taxonomies/pro/categories'
          : '/admin/taxonomies/pro/subcategories';

      router.push(listPath);
    } catch (error) {
      console.error('[CREATE_PRO_TAXONOMY_FORM] Failed:', error);
      toast.error('Failed to create');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <CreateProTaxonomyFormFields
          form={form}
          isPending={isPending}
          level={level}
          existingItems={existingItems}
          parentCategories={parentCategories}
        />

        <div className='flex justify-end gap-4'>
          <Button
            type='button'
            variant='outline'
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type='submit' disabled={isPending}>
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Create {level.charAt(0).toUpperCase() + level.slice(1)}
          </Button>
        </div>
      </form>
    </Form>
  );
}
