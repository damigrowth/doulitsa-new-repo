'use client';

import { useActionState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, UseFormReturn, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { populateFormData } from '@/lib/utils/form';
import type { ActionResult } from '@/lib/types/api';

export interface TaxonomyFormWrapperProps<TFormData> {
  /**
   * Zod schema for validation
   */
  schema: any;

  /**
   * Server action function
   */
  action: (
    prevState: ActionResult | null,
    formData: FormData,
  ) => Promise<ActionResult>;

  /**
   * Default values for the form
   */
  defaultValues: TFormData;

  /**
   * Success message to display
   */
  successMessage: string;

  /**
   * Path to redirect to on success (optional, defaults to refresh)
   */
  redirectPath?: string;

  /**
   * Whether this is an edit form (affects button text and behavior)
   */
  isEdit?: boolean;

  /**
   * String fields to populate in FormData
   */
  stringFields: string[];

  /**
   * Boolean fields to populate in FormData
   */
  booleanFields?: string[];

  /**
   * Layout variant for the form
   * - 'default': Vertical stack layout
   * - 'grid': 2-column grid layout (md:grid-cols-2)
   */
  layout?: 'default' | 'grid';

  /**
   * Custom button text for submit button (overrides default)
   */
  submitButtonText?: string;

  /**
   * Optional callback after successful submission (before redirect/refresh)
   * Use this to save drafts to localStorage
   */
  onSuccess?: (result: ActionResult) => void;

  /**
   * Render function for form fields
   */
  children: (form: UseFormReturn<TFormData>, isPending: boolean) => ReactNode;
}

export function TaxonomyFormWrapper<TFormData extends Record<string, any>>({
  schema,
  action,
  defaultValues,
  successMessage,
  redirectPath,
  isEdit = false,
  stringFields,
  booleanFields,
  layout = 'default',
  submitButtonText,
  onSuccess,
  children,
}: TaxonomyFormWrapperProps<TFormData>) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, null);

  const form = useForm<TFormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: defaultValues as any,
  });

  // Handle state changes from server action
  useEffect(() => {
    if (state?.success) {
      // Call onSuccess callback if provided (e.g., to save draft)
      if (onSuccess) {
        onSuccess(state);
      }

      toast.success(successMessage);
      if (redirectPath) {
        router.push(redirectPath);
      }
      router.refresh();

      // Reset form dirty state after successful update
      if (isEdit) {
        form.reset(form.getValues());
      }
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router, successMessage, redirectPath, isEdit, form, onSuccess]);

  const handleFormSubmit = (formData: FormData) => {
    const allValues = form.getValues();
    populateFormData(formData, allValues, {
      stringFields,
      booleanFields,
    });
    formAction(formData);
  };

  // Get submit button text
  const getSubmitButtonText = () => {
    if (submitButtonText) return submitButtonText;
    if (isEdit) return 'Save Changes';
    return `Create ${successMessage.split(' ')[0]}`;
  };

  return (
    <Form {...form}>
      <form action={handleFormSubmit} className='space-y-4'>
        {children(form, isPending)}

        <div className='flex justify-end gap-4'>
          <Button
            type='button'
            variant='outline'
            onClick={() => (isEdit ? form.reset() : router.back())}
            disabled={isPending || (isEdit && !form.formState.isDirty)}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            disabled={
              isPending ||
              !form.formState.isValid ||
              (isEdit && !form.formState.isDirty)
            }
          >
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {getSubmitButtonText()}
          </Button>
        </div>
      </form>
    </Form>
  );
}
