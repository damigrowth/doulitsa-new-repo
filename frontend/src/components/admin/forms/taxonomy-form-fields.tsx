'use client';

import { UseFormReturn, useWatch } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DatasetItem } from '@/lib/types/datasets';
import { SlugRegenerateButton } from './slug-regenerate-button';
import { getAllSlugs } from '@/lib/utils/text/slug';

interface LabelFieldProps {
  form: UseFormReturn<any>;
  isPending: boolean;
  onLabelChange?: (value: string) => void;
  placeholder?: string;
  description?: string;
}

export function LabelField({
  form,
  isPending,
  onLabelChange,
  placeholder = 'Enter label',
  description = 'The display name for this item',
}: LabelFieldProps) {
  return (
    <FormField
      control={form.control}
      name='label'
      render={({ field }) => (
        <FormItem>
          <FormLabel>Label</FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              value={field.value}
              name={field.name}
              onBlur={field.onBlur}
              ref={field.ref}
              onChange={(e) => {
                const value = e.target.value;
                field.onChange(value);
                onLabelChange?.(value);
              }}
              disabled={isPending}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface SlugFieldProps {
  form: UseFormReturn<any>;
  isPending: boolean;
  placeholder?: string;
  description?: string;
  existingItems?: DatasetItem[];
  onRegenerate?: (slug: string) => void;
  currentLabel?: string; // Optional - if not provided, will watch form internally
  watchFieldName?: string; // Field name to watch for slug generation (default: 'label')
}

export function SlugField({
  form,
  isPending,
  placeholder = 'item-slug',
  description = 'The URL-friendly identifier (auto-generated from label)',
  existingItems,
  onRegenerate,
  currentLabel,
  watchFieldName = 'label',
}: SlugFieldProps) {
  // Always watch the specified field (hooks must be called unconditionally)
  const watchedLabel = useWatch({ control: form.control, name: watchFieldName }) || '';
  const watchedSlug = useWatch({ control: form.control, name: 'slug' }) || '';
  const watchedId = useWatch({ control: form.control, name: 'id' }) || '';

  // Use provided currentLabel if available, otherwise use watched value
  const labelToUse = currentLabel !== undefined ? currentLabel : watchedLabel;

  // Show button if the required props are provided
  const showRegenerateButton = Boolean(existingItems && onRegenerate);

  // Helper function to find item with matching slug recursively
  const findItemWithSlug = (items: DatasetItem[], slug: string): DatasetItem | undefined => {
    for (const item of items) {
      if (item.slug === slug) return item;
      if (item.children) {
        const found = findItemWithSlug(item.children, slug);
        if (found) return found;
      }
    }
    return undefined;
  };

  // Check for duplicate slug across all levels (excluding current item in edit mode)
  const isDuplicate = existingItems && watchedSlug
    ? (() => {
        const itemWithSlug = findItemWithSlug(existingItems, watchedSlug);
        // Duplicate if: slug exists AND (no watchedId OR different id)
        return itemWithSlug && (!watchedId || itemWithSlug.id !== watchedId);
      })()
    : false;

  return (
    <FormField
      control={form.control}
      name='slug'
      render={({ field }) => {
        // Re-render happens here when currentLabel changes from watch above
        return (
          <FormItem>
            <FormLabel>Slug</FormLabel>
            <div className='flex gap-2'>
              <FormControl>
                <Input
                  placeholder={placeholder}
                  {...field}
                  disabled={isPending}
                  className={isDuplicate ? 'border-destructive' : ''}
                />
              </FormControl>
              {showRegenerateButton && (
                <SlugRegenerateButton
                  label={labelToUse}
                  existingItems={existingItems!}
                  onRegenerate={onRegenerate!}
                  disabled={isPending}
                />
              )}
            </div>
            {isDuplicate && (
              <p className='text-sm font-medium text-destructive'>
                This slug already exists. Please use a unique slug or click regenerate.
              </p>
            )}
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

interface CategoryFieldProps {
  form: UseFormReturn<any>;
  isPending: boolean;
  categories: DatasetItem[];
  label?: string;
  description?: string;
}

export function CategoryField({
  form,
  isPending,
  categories,
  label = 'Category (Optional)',
  description = 'Associate with a category',
}: CategoryFieldProps) {
  return (
    <FormField
      control={form.control}
      name='category'
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
            disabled={isPending}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder='Select a category' />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label || category.name || category.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
