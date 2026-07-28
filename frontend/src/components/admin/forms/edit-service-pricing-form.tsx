'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { updateServicePricingAction } from '@/actions/admin/services';
import { populateFormData } from '@/lib/utils/form';
import { adminEditServicePricingSchema } from '@/lib/validations/service';
import { Currency } from '@/components/ui/currency';

type EditServicePricingFormValues = z.infer<typeof adminEditServicePricingSchema>;

interface EditServicePricingFormProps {
  service: {
    id: number;
    price: number;
    fixed: boolean;
    duration: number | null;
    subscriptionType: string | null;
  };
}

export function EditServicePricingForm({ service }: EditServicePricingFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateServicePricingAction, null);

  const form = useForm<EditServicePricingFormValues>({
    resolver: zodResolver(adminEditServicePricingSchema),
    mode: 'onChange',
    defaultValues: {
      price: service.price,
      fixed: service.fixed,
      duration: service.duration || 0,
      subscriptionType: (service.subscriptionType as any) || undefined,
    },
  });

  const { watch, setValue, clearErrors, trigger } = form;

  // Use useWatch for reactive updates with useActionState
  const fixedValue = useWatch({
    control: form.control,
    name: 'fixed',
    defaultValue: service.fixed,
  });

  useEffect(() => {
    if (state?.success) {
      toast.success('Service pricing updated successfully');
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
      price: allValues.price.toString(),
      fixed: allValues.fixed.toString(),
      duration: allValues.duration.toString(),
      subscriptionType: allValues.subscriptionType || '',
    };

    populateFormData(formData, payload, {
      stringFields: ['serviceId', 'price', 'fixed', 'duration', 'subscriptionType'],
    });

    formAction(formData);
  };

  return (
    <Form {...form}>
      <form action={handleFormSubmit} className='space-y-4'>
        <div className='grid md:grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='price'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price {fixedValue ? '(Required)' : '(Hidden)'}</FormLabel>
                <FormControl>
                  <Currency
                    currency='€'
                    position='right'
                    placeholder={fixedValue ? 'e.g., 50' : 'Price hidden'}
                    min={1}
                    max={10000}
                    allowDecimals={false}
                    value={field.value || 0}
                    onValueChange={field.onChange}
                    disabled={!fixedValue}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='fixed'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                <div className='space-y-0.5'>
                  <FormLabel>Hide Price</FormLabel>
                  <div className='text-xs text-muted-foreground'>
                    Price won't be displayed publicly
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={!field.value}
                    onCheckedChange={async (checked) => {
                      field.onChange(!checked);
                      if (checked) {
                        setValue('price', 0, { shouldValidate: false });
                        clearErrors('price');
                      } else {
                        clearErrors('price');
                      }
                      await trigger('price');
                    }}
                    disabled={isPending}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name='duration'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (days)</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder='e.g., 7'
                  min={0}
                  max={365}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  disabled={isPending}
                />
              </FormControl>
              <div className='text-xs text-muted-foreground'>
                Estimated completion time in days (optional)
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='subscriptionType'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscription Type (Optional)</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select subscription type' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='month'>Monthly</SelectItem>
                  <SelectItem value='year'>Yearly</SelectItem>
                  <SelectItem value='per_case'>Per Case</SelectItem>
                  <SelectItem value='per_hour'>Per Hour</SelectItem>
                  <SelectItem value='per_session'>Per Session</SelectItem>
                </SelectContent>
              </Select>
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
