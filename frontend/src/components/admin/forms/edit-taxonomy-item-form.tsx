'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateServiceTaxonomySchema } from '@/lib/validations/admin';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { DatasetItem } from '@/lib/types/datasets';
import { LabelField, SlugField } from './taxonomy-form-fields';
import { useSlugHandlers } from './use-slug-handlers';
import { CloudinaryMediaPicker } from '@/components/media/cloudinary-media-picker';
import type { CloudinaryResource } from '@/lib/types/cloudinary';
import { updateServiceTaxonomy } from '@/actions/admin/taxonomies';

type EditTaxonomyItemFormValues = z.infer<typeof updateServiceTaxonomySchema>;

interface EditTaxonomyItemFormProps {
  taxonomy: Pick<
    DatasetItem,
    'id' | 'label' | 'slug' | 'description' | 'icon' | 'image'
  > & {
    level: 'category' | 'subcategory' | 'subdivision';
    parentId?: string;
    parentLabel?: string;
    featured?: boolean;
    hasImage?: boolean;
  };
  existingItems: DatasetItem[];
}

export function EditTaxonomyItemForm({
  taxonomy,
  existingItems,
}: EditTaxonomyItemFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<EditTaxonomyItemFormValues>({
    resolver: zodResolver(updateServiceTaxonomySchema),
    mode: 'onChange',
    defaultValues: {
      id: taxonomy.id,
      label: taxonomy.label,
      slug: taxonomy.slug,
      description: taxonomy.description || '',
      level: taxonomy.level,
      parentId: taxonomy.parentId || '',
      featured: taxonomy.featured || false,
      icon: taxonomy.icon || '',
      image: taxonomy.image || null,
    },
  });

  // Watch the label field for changes using useWatch
  const labelValue = useWatch({ control: form.control, name: 'label' });

  // Get parent options based on level (for moving between parents)
  const getParentOptions = () => {
    if (taxonomy.level === 'subcategory') {
      return existingItems.map((cat) => ({
        id: cat.id,
        label: cat.label || cat.name || cat.id,
      }));
    } else if (taxonomy.level === 'subdivision') {
      const seen = new Set<string>();
      const subcategories: Array<{ id: string; label: string }> = [];
      existingItems.forEach((cat) => {
        cat.children?.forEach((sub) => {
          if (!seen.has(sub.id)) {
            seen.add(sub.id);
            subcategories.push({
              id: sub.id,
              label: `${cat.label || cat.name} > ${sub.label || sub.name}`,
            });
          }
        });
      });
      return subcategories;
    }
    return [];
  };

  const parentOptions = getParentOptions();

  const onSubmit = async (data: EditTaxonomyItemFormValues) => {
    setIsPending(true);

    try {
      // Write straight to the DB (no draft, no Git).
      const result = await updateServiceTaxonomy({
        id: data.id,
        label: data.label,
        slug: data.slug,
        description: data.description,
        level: data.level,
        parentId: data.parentId || undefined,
        featured: data.level === 'category' ? data.featured : undefined,
        icon: data.level === 'category' ? data.icon : undefined,
        image: data.image,
      });

      if (!result.success) {
        toast.error('Failed to save changes — please try again');
        return;
      }

      toast.success('Saved');

      // Reset form dirty state
      form.reset(data);

      // Navigate back to list
      router.push(`/admin/taxonomies/service/${data.level === 'category' ? 'categories' : data.level === 'subcategory' ? 'subcategories' : 'subdivisions'}`);
    } catch (error) {
      console.error('[EDIT_TAXONOMY_ITEM_FORM] Failed:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsPending(false);
    }
  };

  const { handleLabelChange, handleSlugRegenerate } = useSlugHandlers(form);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <div className='grid gap-4 md:grid-cols-2'>
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

          {(taxonomy.level === 'subcategory' ||
            taxonomy.level === 'subdivision') && (
            <FormField
              control={form.control}
              name='parentId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Parent{' '}
                    {taxonomy.level === 'subcategory'
                      ? 'Category'
                      : 'Subcategory'}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={`Select parent ${taxonomy.level === 'subcategory' ? 'category' : 'subcategory'}`}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {parentOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Change the parent to move this {taxonomy.level} to a
                    different{' '}
                    {taxonomy.level === 'subcategory'
                      ? 'category'
                      : 'subcategory'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <LabelField
            form={form}
            isPending={isPending}
            onLabelChange={handleLabelChange}
            placeholder='Enter label'
            description='The display name for this item'
          />

          <SlugField
            form={form}
            isPending={isPending}
            placeholder='enter-slug'
            description='URL-friendly identifier (auto-generated from label)'
            existingItems={existingItems}
            onRegenerate={handleSlugRegenerate}
            currentLabel={labelValue || ''}
          />

          {taxonomy.level === 'category' && (
            <>
              <FormField
                control={form.control}
                name='featured'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Featured</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === 'true')
                      }
                      defaultValue={field.value ? 'true' : 'false'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select featured status' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='true'>Yes</SelectItem>
                        <SelectItem value='false'>No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Only categories can be featured
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='icon'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                      <Input placeholder='flaticon-icon-name' {...field} />
                    </FormControl>
                    <FormDescription>Icon class name</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Enter description'
                  className='min-h-[100px]'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='image'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <FormControl>
                <CloudinaryMediaPicker
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Browse and select an image from your Cloudinary Media Library
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
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
