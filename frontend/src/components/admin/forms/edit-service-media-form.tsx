'use client';

import {
  useRef,
  useTransition,
  useState,
  useEffect,
  useActionState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { MediaUpload } from '@/components/media';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { updateServiceMedia } from '@/actions/admin/services';
import { populateFormData } from '@/lib/utils/form';
import {
  updateServiceMediaSchema,
  type UpdateServiceMediaInput,
} from '@/lib/validations/service';

type ServiceMediaInput = UpdateServiceMediaInput;

const initialState = {
  success: false,
  message: '',
};

interface EditServiceMediaFormProps {
  service: {
    id: number;
    media: any[];
    userId: string;
  };
}

export function EditServiceMediaForm({ service }: EditServiceMediaFormProps) {
  const [state, action, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return updateServiceMedia(Number(service.id), formData);
    },
    initialState,
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isPendingTransition, startTransition] = useTransition();
  const router = useRouter();
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
      media: cleanMedia(service?.media),
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
        media: cleanMedia(service.media),
      });
    }
  }, [service, form]);

  // Handle successful form submission
  useEffect(() => {
    if (state.success) {
      // Refresh the page to get updated data
      router.refresh();
    }
  }, [state.success, router]);

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

      // Only include media data
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
        className='space-y-4'
      >
        <FormField
          control={form.control}
          name='media'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Media</FormLabel>
              <FormControl>
                <MediaUpload
                  ref={mediaRef}
                  value={field.value || []}
                  onChange={field.onChange}
                  uploadPreset='doulitsa_new'
                  multiple={true}
                  folder={`users/${service.userId}/services/${service.id}`}
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
                  placeholder='Upload images or videos'
                  error={errors.media?.message}
                  signed={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Error Display */}
        {state.message && !state.success && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {state.message && state.success && (
          <Alert className='border-green-200 bg-green-50 text-green-800'>
            <CheckCircle className='h-4 w-4' />
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <div className='flex justify-end space-x-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => form.reset()}
            disabled={
              isPending || isPendingTransition || isUploading || !isDirty
            }
          >
            Cancel
          </Button>
          <Button
            type='submit'
            disabled={
              isPending ||
              isPendingTransition ||
              isUploading ||
              !isValid ||
              !isDirty
            }
          >
            {(isPending || isPendingTransition || isUploading) && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            {isUploading ? 'Uploading...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
