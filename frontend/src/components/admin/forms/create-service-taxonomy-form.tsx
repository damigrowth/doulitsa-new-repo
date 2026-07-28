'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createServiceTaxonomySchema } from '@/lib/validations/admin';
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
import { createServiceTaxonomy } from '@/actions/admin/taxonomies';

type CreateServiceTaxonomyFormValues = z.infer<
  typeof createServiceTaxonomySchema
>;

interface CreateServiceTaxonomyFormProps {
  level: 'category' | 'subcategory' | 'subdivision';
  existingItems: DatasetItem[];
}

export function CreateServiceTaxonomyForm({
  level,
  existingItems,
}: CreateServiceTaxonomyFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<CreateServiceTaxonomyFormValues>({
    resolver: zodResolver(createServiceTaxonomySchema),
    mode: 'onChange',
    defaultValues: {
      label: '',
      slug: '',
      level: level,
      parentId: '',
      featured: false,
      icon: '',
      image: null,
    },
  });

  const onSubmit = async (data: CreateServiceTaxonomyFormValues) => {
    setIsPending(true);

    try {
      // Write straight to the DB (no draft, no Git).
      const result = await createServiceTaxonomy({
        label: data.label,
        slug: data.slug,
        description: data.description,
        level,
        parentId: level !== 'category' ? data.parentId : undefined,
        featured: level === 'category' ? data.featured : undefined,
        icon: level === 'category' ? data.icon : undefined,
        image: data.image,
      });

      if (!result.success) {
        toast.error('Failed to create — please try again');
        return;
      }

      toast.success('Created');

      const listPath =
        level === 'category'
          ? '/admin/taxonomies/service/categories'
          : level === 'subcategory'
            ? '/admin/taxonomies/service/subcategories'
            : '/admin/taxonomies/service/subdivisions';

      router.push(listPath);
    } catch (error) {
      console.error('[CREATE_SERVICE_TAXONOMY_FORM] Failed:', error);
      toast.error('Failed to create');
    } finally {
      setIsPending(false);
    }
  };

  // Get parent options based on level
  const getParentOptions = () => {
    if (level === 'subcategory') {
      return existingItems.map((cat) => ({
        id: cat.id,
        label: cat.label || cat.name || cat.id,
      }));
    } else if (level === 'subdivision') {
      const subcategories: Array<{ id: string; label: string }> = [];
      existingItems.forEach((cat) => {
        cat.children?.forEach((sub) => {
          subcategories.push({
            id: sub.id,
            label: `${cat.label || cat.name} > ${sub.label || sub.name}`,
          });
        });
      });
      return subcategories;
    }
    return [];
  };

  const parentOptions = getParentOptions();

  // Watch label field for slug generation
  const labelValue = useWatch({ control: form.control, name: 'label' });

  // Auto-generate slug from label using the reusable hook
  const { handleLabelChange, handleSlugRegenerate } = useSlugHandlers(form);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <div className='grid gap-4 md:grid-cols-2'>
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

          {(level === 'subcategory' || level === 'subdivision') && (
            <FormField
              control={form.control}
              name='parentId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Parent{' '}
                    {level === 'subcategory' ? 'Category' : 'Subcategory'} *
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={`Select parent ${level === 'subcategory' ? 'category' : 'subcategory'}`}
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
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name='label'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Label *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder='Enter label'
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(e);
                      handleLabelChange(value);
                    }}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>The display name for this item</FormDescription>
                <FormMessage />
              </FormItem>
            )}
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

          {level === 'category' && (
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
