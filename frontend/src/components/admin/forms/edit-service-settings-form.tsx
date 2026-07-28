'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { updateServiceSettingsAction } from '@/actions/admin/services';
import { populateFormData } from '@/lib/utils/form';
import { Switch } from '@/components/ui/switch';

const editServiceSettingsSchema = z.object({
  status: z.enum([
    'draft',
    'pending',
    'approved',
    'published',
    'rejected',
    'inactive',
  ]),
  featured: z.boolean(),
});

type EditServiceSettingsFormValues = z.infer<typeof editServiceSettingsSchema>;

interface EditServiceSettingsFormProps {
  service: {
    id: number;
    status: string;
    featured: boolean;
  };
}

export function EditServiceSettingsForm({
  service,
}: EditServiceSettingsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateServiceSettingsAction,
    null,
  );

  const form = useForm<EditServiceSettingsFormValues>({
    resolver: zodResolver(editServiceSettingsSchema),
    mode: 'onChange',
    defaultValues: {
      status: service.status as any,
      featured: service.featured,
    },
  });

  useEffect(() => {
    if (state?.success) {
      toast.success('Service settings updated successfully');
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
      status: allValues.status,
      featured: allValues.featured.toString(),
    };

    populateFormData(formData, payload, {
      stringFields: ['serviceId', 'status', 'featured'],
    });

    formAction(formData);
  };

  return (
    <Form {...form}>
      <form action={handleFormSubmit} className='space-y-4'>
        <FormField
          control={form.control}
          name='status'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select status' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='draft'>Draft</SelectItem>
                  <SelectItem value='pending'>Pending Review</SelectItem>
                  <SelectItem value='approved'>Approved</SelectItem>
                  <SelectItem value='published'>Published</SelectItem>
                  <SelectItem value='rejected'>Rejected</SelectItem>
                  <SelectItem value='inactive'>Inactive</SelectItem>
                </SelectContent>
              </Select>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='featured'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel>Featured Service</FormLabel>
                <FormDescription>
                  Featured services appear prominently in search results
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
              </FormControl>
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
            disabled={
              isPending || !form.formState.isValid || !form.formState.isDirty
            }
          >
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
