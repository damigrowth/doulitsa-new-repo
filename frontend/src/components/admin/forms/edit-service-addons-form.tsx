'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { AddonFields } from '@/components/shared/addon-fields';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { updateServiceAddonsAction } from '@/actions/admin/services';
import { populateFormData } from '@/lib/utils/form';
import { adminEditServiceAddonsSchema } from '@/lib/validations/service';

type EditServiceAddonsFormValues = z.infer<typeof adminEditServiceAddonsSchema>;

interface EditServiceAddonsFormProps {
  service: {
    id: number;
    addons: Array<{
      title: string;
      description: string;
      price: number;
    }>;
  };
}

export function EditServiceAddonsForm({ service }: EditServiceAddonsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateServiceAddonsAction, null);

  const form = useForm<EditServiceAddonsFormValues>({
    resolver: zodResolver(adminEditServiceAddonsSchema),
    mode: 'onChange',
    defaultValues: {
      addons: service.addons || [],
    },
  });

  useEffect(() => {
    if (state?.success) {
      toast.success('Service addons updated successfully');
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
      addons: JSON.stringify(allValues.addons),
    };

    populateFormData(formData, payload, {
      stringFields: ['serviceId', 'addons'],
    });

    formAction(formData);
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form action={handleFormSubmit} className='space-y-4'>
          <AddonFields control={form.control} name='addons' maxAddons={3} />

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
