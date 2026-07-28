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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { updateProfileSettingsAction } from '@/actions/admin/profiles';
import { populateFormData } from '@/lib/utils/form';
import { Switch } from '@/components/ui/switch';

const editProfileSettingsSchema = z.object({
  published: z.boolean(),
  featured: z.boolean(),
  verified: z.boolean(),
  top: z.boolean(),
  isActive: z.boolean(),
});

type EditProfileSettingsFormValues = z.infer<typeof editProfileSettingsSchema>;

interface EditProfileSettingsFormProps {
  profile: {
    id: string;
    published: boolean;
    featured: boolean;
    verified: boolean;
    top: boolean;
    isActive: boolean;
  };
}

export function EditProfileSettingsForm({ profile }: EditProfileSettingsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateProfileSettingsAction, null);

  const form = useForm<EditProfileSettingsFormValues>({
    resolver: zodResolver(editProfileSettingsSchema),
    mode: 'onChange',
    defaultValues: {
      published: profile.published,
      featured: profile.featured,
      verified: profile.verified,
      top: profile.top,
      isActive: profile.isActive,
    },
  });

  useEffect(() => {
    if (state?.success) {
      toast.success('Profile settings updated successfully');
      router.refresh();
      form.reset(form.getValues());
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router, form]);

  const handleFormSubmit = (formData: FormData) => {
    const allValues = form.getValues();
    const payload = {
      profileId: profile.id,
      published: allValues.published.toString(),
      featured: allValues.featured.toString(),
      verified: allValues.verified.toString(),
      top: allValues.top.toString(),
      isActive: allValues.isActive.toString(),
    };

    populateFormData(formData, payload, {
      stringFields: ['profileId', 'published', 'featured', 'verified', 'top', 'isActive'],
    });

    formAction(formData);
  };

  return (
    <Form {...form}>
      <form action={handleFormSubmit} className='space-y-4'>
        <FormField
          control={form.control}
          name='published'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel>Published</FormLabel>
                <FormDescription>
                  Published profiles are visible on the platform
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

        <FormField
          control={form.control}
          name='featured'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel>Featured Profile</FormLabel>
                <FormDescription>
                  Featured profiles appear prominently on the homepage
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

        <FormField
          control={form.control}
          name='verified'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel>Verified Professional</FormLabel>
                <FormDescription>
                  Verified badge shows credibility and trust
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

        <FormField
          control={form.control}
          name='top'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel>Top Level Professional</FormLabel>
                <FormDescription>
                  Top tier designation for exceptional professionals
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

        <FormField
          control={form.control}
          name='isActive'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel>Active Status</FormLabel>
                <FormDescription>
                  Active profiles appear in directory listings
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
          <Button type='submit' disabled={isPending || !form.formState.isDirty}>
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
