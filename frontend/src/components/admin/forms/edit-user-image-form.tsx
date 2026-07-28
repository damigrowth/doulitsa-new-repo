'use client';

import { useEffect, useActionState, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateUserImageAction } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { populateFormData } from '@/lib/utils/form';
import { MediaUpload } from '@/components/media';

interface EditUserImageFormProps {
  user: {
    id: string;
    username?: string | null;
    image?: string | null;
  };
}

// Validation schema for admin image update
const adminImageSchema = z.object({
  image: z
    .any()
    .refine(
      (val) =>
        val === null || typeof val === 'string' || typeof val === 'object',
      {
        message: 'Invalid image format',
      },
    )
    .nullable(),
});

type AdminImageFormData = z.infer<typeof adminImageSchema>;

export function EditUserImageForm({ user }: EditUserImageFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateUserImageAction,
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const profileImageRef = useRef<any>(null);

  const form = useForm<AdminImageFormData>({
    resolver: zodResolver(adminImageSchema),
    defaultValues: {
      image: user.image || null,
    },
    mode: 'onChange',
  });

  const {
    formState: { isDirty },
  } = form;

  useEffect(() => {
    if (state?.success) {
      const message = state.data?.image
        ? 'Profile image updated successfully'
        : 'Profile image removed successfully';
      toast.success(message);
      router.refresh();
      setIsUploading(false);
      if (state.data?.image) {
        form.reset({ image: state.data.image as string });
      } else {
        form.reset({ image: null });
      }
    } else if (state?.error) {
      toast.error(state.error);
      setIsUploading(false);
    }
  }, [state, router, form]);

  // Reset loading states when form submission completes
  useEffect(() => {
    if (!isPending) {
      setIsUploading(false);
    }
  }, [isPending]);

  const handleFormAction = async (formData: FormData) => {
    setIsUploading(true);

    try {
      // Check for pending files and upload if needed
      // Note: When using widget mode (type="image"), uploads happen immediately
      // via the widget's onDirectUpload callback, so there won't be pending files.
      // This check is still needed for backward compatibility with non-widget uploads.
      const hasPendingFiles = profileImageRef.current?.hasFiles();

      if (hasPendingFiles) {
        await profileImageRef.current.uploadFiles();
      }

      // Get all form values AFTER upload completion
      const allValues = form.getValues();

      populateFormData(formData, allValues, {
        jsonFields: ['image'],
        skipEmpty: true,
      });

      // Add userId for admin action
      formData.set('userId', user.id);

      // Call the server action with populated FormData
      formAction(formData);
    } catch (error) {
      console.error('❌ Αποτυχία μεταφόρτωσης:', error);
      setIsUploading(false);
      toast.error('Failed to upload image');
    }
  };

  const handleRemoveImage = () => {
    const formData = new FormData();
    formData.set('userId', user.id);
    formData.set('image', '');
    formAction(formData);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleFormAction(formData);
        }}
        className='space-y-6'
      >
        {/* Profile Image Upload with Widget */}
        <FormField
          control={form.control}
          name='image'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Image</FormLabel>
              <p className='text-sm text-muted-foreground'>
                Upload a professional profile image. Square images work best.
                Cropping interface will open after selection.
              </p>
              <FormControl>
                <MediaUpload
                  ref={profileImageRef}
                  value={field.value}
                  onChange={field.onChange}
                  uploadPreset='doulitsa_profile_images'
                  multiple={false}
                  folder={
                    user.username
                      ? `users/${user.username}/profile`
                      : `users/${user.id}/profile`
                  }
                  maxFileSize={3000000} // 3MB
                  allowedFormats={['jpg', 'jpeg', 'png', 'webp']}
                  placeholder='Upload profile image'
                  type='image'
                  signed={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className='flex items-center gap-3'>
          <Button type='submit' disabled={isPending || isUploading || !isDirty}>
            {isPending || isUploading ? 'Saving...' : 'Save Image'}
          </Button>

          {user.image && (
            <Button
              type='button'
              variant='outline'
              onClick={handleRemoveImage}
              disabled={isPending || isUploading}
            >
              Remove Image
            </Button>
          )}
        </div>

        <div className='rounded-lg bg-muted/50 p-4'>
          <p className='text-sm text-muted-foreground'>
            <strong>Note:</strong> The image will be automatically optimized and
            cropped using Cloudinary's upload widget with face detection and
            smart cropping.
          </p>
        </div>
      </form>
    </Form>
  );
}
