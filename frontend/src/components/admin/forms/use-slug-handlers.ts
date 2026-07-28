import { UseFormReturn } from 'react-hook-form';
import { createSlug } from '@/lib/utils/text/slug';

// Store previous label using WeakMap with form control as key
// WeakMap allows garbage collection when form is unmounted
const previousLabels = new WeakMap<any, string>();
// Store initial labels to track the starting point
const initialLabels = new WeakMap<any, string>();
// Store initial slugs to compare against (handles transliteration inconsistencies)
const initialSlugs = new WeakMap<any, string>();

/**
 * Reusable handlers for label changes and slug regeneration in taxonomy forms
 * Note: This is not a hook anymore - it's just a helper function
 * @param form - The form instance from react-hook-form
 * @param sourceField - The field name to generate slug from (default: 'label')
 */
export function useSlugHandlers(form: UseFormReturn<any>, sourceField: string = 'label') {
  // Initialize with the current source field and slug values (before any changes)
  if (!initialLabels.has(form.control)) {
    const initialLabel = form.getValues(sourceField) || '';
    const initialSlug = form.getValues('slug') || '';
    initialLabels.set(form.control, initialLabel);
    initialSlugs.set(form.control, initialSlug);
    previousLabels.set(form.control, initialLabel);
  }

  const handleLabelChange = (value: string) => {
    const previousLabel = previousLabels.get(form.control) || '';
    const currentSlug = form.getValues('slug');
    const initialSlug = initialSlugs.get(form.control) || '';
    const slugFromPreviousLabel = createSlug(previousLabel);

    // Auto-generate slug if:
    // 1. Slug is empty, OR
    // 2. Current slug matches the initial slug (user hasn't manually edited slug), OR
    // 3. Current slug matches the slug generated from previous label
    const shouldUpdate =
      !currentSlug ||
      currentSlug === initialSlug ||
      currentSlug === slugFromPreviousLabel;

    if (shouldUpdate) {
      const newSlug = createSlug(value);
      form.setValue('slug', newSlug, { shouldValidate: true });
    }

    // Update previous label for next change
    previousLabels.set(form.control, value);
  };

  const handleSlugRegenerate = (newSlug: string) => {
    form.setValue('slug', newSlug, { shouldValidate: true });
  };

  return {
    handleLabelChange,
    handleSlugRegenerate,
  };
}
