'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(() => import('@/components/ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })), { ssr: false });
import { stripHtmlTags } from '@/lib/utils/text/html';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { updateServiceBasicAction } from '@/actions/admin/services';
import { editServiceBasicSchema } from '@/lib/validations/service';
import { populateFormData } from '@/lib/utils/form';
import { z } from 'zod';

type EditServiceBasicFormValues = z.infer<typeof editServiceBasicSchema>;

interface EditServiceBasicFormProps {
  service: {
    id: number;
    title: string;
    description: string;
  };
}

export function EditServiceBasicForm({ service }: EditServiceBasicFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateServiceBasicAction, null);

  const form = useForm<EditServiceBasicFormValues>({
    resolver: zodResolver(editServiceBasicSchema),
    mode: 'onChange',
    defaultValues: {
      title: service.title,
      description: service.description,
    },
  });

  // Handle state changes from server action
  useEffect(() => {
    if (state?.success) {
      toast.success('Service updated successfully');
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
      title: allValues.title,
      description: allValues.description,
    };

    populateFormData(formData, payload, {
      stringFields: ['serviceId', 'title', 'description'],
    });

    formAction(formData);
  };

  return (
    <Form {...form}>
      <form action={handleFormSubmit} className='space-y-4'>
        <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder='Enter service title'
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <div className='text-sm text-muted-foreground'>
                {field.value?.length || 0}/100 characters
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value || ''}
                  onChange={(html) => field.onChange(html)}
                  placeholder='Enter service description'
                  minHeight='120px'
                  disabled={isPending}
                />
              </FormControl>
              <div className='text-sm text-muted-foreground'>
                {stripHtmlTags(field.value || '').length}/5000 characters
              </div>
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
            disabled={isPending || !form.formState.isValid || !form.formState.isDirty}
          >
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
