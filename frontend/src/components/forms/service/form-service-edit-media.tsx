'use client';

import React, {
  useRef,
  useActionState,
  useEffect,
  useState,
  useTransition,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import type { Service, Profile } from '@/lib/prisma-types';

// Standard shadcn/ui imports
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';

// Custom components
import { MediaUpload } from '@/components/media';
import FormButton from '@/components/shared/button-form';

// Auth and utilities
import { populateFormData } from '@/lib/utils/form';

// Validation schema and server action
import { updateServiceMedia } from '@/actions/services/update-service';
import {
  updateServiceMediaSchema,
  type UpdateServiceMediaInput,
} from '@/lib/validations/service';
import { AuthUser } from '@/lib/types/auth';

type ServiceMediaInput = UpdateServiceMediaInput;

const initialState = {
  success: false,
  message: '',
};

// Service row with the minimal profile relation the media form needs.
type ServiceWithProfile = Service & {
  profile: Pick<Profile, 'id'>;
};

interface FormServiceEditMediaProps {
  service: ServiceWithProfile;
  initialUser: AuthUser | null;
  initialProfile: Profile | null;
  showHeading?: boolean;
}

export default function FormServiceEditMedia({
  service,
  initialUser,
  initialProfile,
  showHeading = true,
}: FormServiceEditMediaProps) {
  const [state, action, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return updateServiceMedia(Number(service.id), formData);
    },
    initialState,
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isPendingTransition, startTransition] = useTransition();
  const router = useRouter();

  // Media upload refs
  const mediaRef = useRef<any>(null);

  // Filter out invalid/pending resources from DB data (handles corrupted data)
  const cleanMedia = (media: any[] | null | undefined) =>
    media?.filter(
      (r: any) =>
        r &&
        !r._pending &&
        !r.public_id?.startsWith('pending_') &&
        !r.secure_url?.startsWith('blob:'),
    ) || [];

  const form = useForm<ServiceMediaInput>({
    resolver: zodResolver(updateServiceMediaSchema),
    defaultValues: {
      media: cleanMedia(service?.media as any[]),
    },
    mode: 'onChange',
  });

  const {
    formState: { errors, isValid, isDirty },
    getValues,
  } = form;

  // Update form values when service data changes (including after successful saves)
  useEffect(() => {
    if (service) {
      form.reset({
        media: cleanMedia(service.media as any[]),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  // Handle successful form submission
  useEffect(() => {
    if (state.success && state.data?.message) {
      toast.success(state.data.message, {
        id: `service-media-form-${Date.now()}`,
      });
      router.refresh();
    } else if (!state.success && state.error) {
      toast.error(state.error, {
        id: `service-media-form-${Date.now()}`,
      });
    }
  }, [state, router]);

  // Clear upload state when both action states complete (success or failure)
  const isAnyPending = isPending || isPendingTransition;
  useEffect(() => {
    if (!isAnyPending) {
      setIsUploading(false);
    }
  }, [isAnyPending]);

  // Form submission handler with upload logic
  const handleFormSubmit = async (formData: FormData) => {
    setIsUploading(true);

    try {
      // Check for pending files and upload if needed
      const hasPendingFiles = mediaRef.current?.hasFiles();

      if (hasPendingFiles) {
        const uploadSuccess = await mediaRef.current.uploadFiles();
        if (!uploadSuccess) {
          setIsUploading(false);
          return; // Don't submit form if upload fails
        }
      }

      // Get all form values and populate FormData
      const allValues = getValues();

      // Only include media data, preserve other existing data by not including them
      populateFormData(formData, allValues, {
        jsonFields: ['media'],
        skipEmpty: false, // Allow null values to be sent for clearing media
      });

      // Call server action using startTransition
      startTransition(() => {
        action(formData);
      });
    } catch (error) {
      console.error('❌ Αποτυχία μεταφόρτωσης:', error);
      setIsUploading(false);
      // Don't submit form if upload fails
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleFormSubmit(formData);
        }}
        className='space-y-6 p-6 border rounded-lg shadow'
      >
        <h3 className='text-lg font-medium'>Πολυμέσα</h3>

        {/* Media Upload */}
        <FormField
          control={form.control}
          name='media'
          render={({ field }) => (
            <FormItem>
              {showHeading && (
                <>
                  <FormLabel>Εικόνες & Βίντεο</FormLabel>
                  <p className='text-sm text-gray-600'>
                    Ανεβάστε εικόνες ή βίντεο που δείχνουν την υπηρεσία σας
                  </p>
                </>
              )}

              <FormControl>
                <MediaUpload
                  ref={mediaRef}
                  value={field.value || []}
                  onChange={field.onChange}
                  uploadPreset='doulitsa_new'
                  multiple={true}
                  folder={`users/${initialUser?.username}/services/${service.id}`}
                  maxFileSize={15000000} // 15MB
                  maxFiles={10}
                  allowedFormats={[
                    'jpg',
                    'jpeg',
                    'png',
                    'webp',
                    'mp4',
                    'webm',
                    'ogg',
                  ]}
                  placeholder='Ανεβάστε εικόνες ή βίντεο'
                  error={errors.media?.message}
                  signed={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className='flex justify-end space-x-4'>
          <FormButton
            variant='outline'
            type='button'
            text='Ακύρωση'
            onClick={() => form.reset()}
            disabled={
              isPending || isPendingTransition || isUploading || !isDirty
            }
          />
          <FormButton
            type='submit'
            text='Ενημέρωση Αρχείων'
            loadingText='Ενημέρωση...'
            loading={isPending || isPendingTransition || isUploading}
            disabled={
              isPending ||
              isPendingTransition ||
              isUploading ||
              !isValid ||
              !isDirty
            }
          />
        </div>
      </form>
    </Form>
  );
}
