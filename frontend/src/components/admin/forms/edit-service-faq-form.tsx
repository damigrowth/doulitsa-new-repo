'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FaqFields } from '@/components/shared/faq-fields';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { updateServiceFaqAction } from '@/actions/admin/services';
import { populateFormData } from '@/lib/utils/form';
import { editServiceFaqSchema } from '@/lib/validations/service';

type EditServiceFaqFormValues = z.infer<typeof editServiceFaqSchema>;

interface EditServiceFaqFormProps {
  service: {
    id: number;
    faq: Array<{
      question: string;
      answer: string;
    }>;
  };
}

export function EditServiceFaqForm({ service }: EditServiceFaqFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateServiceFaqAction, null);

  const form = useForm<EditServiceFaqFormValues>({
    resolver: zodResolver(editServiceFaqSchema),
    mode: 'onChange',
    defaultValues: {
      faq: service.faq || [],
    },
  });

  useEffect(() => {
    if (state?.success) {
      toast.success('Service FAQ updated successfully');
      router.refresh();
      form.reset(form.getValues());
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router, form]);

  const handleFormSubmit = (formData: FormData) => {
    const allValues = form.getValues();
    const payload = {
      serviceId: service.id.toString(),
      faq: JSON.stringify(allValues.faq),
    };

    populateFormData(formData, payload, {
      stringFields: ['serviceId', 'faq'],
    });

    formAction(formData);
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form action={handleFormSubmit} className='space-y-4'>
          <FaqFields control={form.control} name='faq' maxFaq={5} />

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
              disabled={isPending || !form.formState.isDirty || !form.formState.isValid}
            >
              {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
