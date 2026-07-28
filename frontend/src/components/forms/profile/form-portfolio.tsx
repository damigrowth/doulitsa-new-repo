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

// Icons (lucide-react only)
import { Loader2 } from 'lucide-react';

// Auth and utilities
import { populateFormData, parseJSONValue } from '@/lib/utils/form';

// Validation schema and server actions
import { updateProfilePortfolio } from '@/actions/profiles/portfolio';
import { updateProfilePortfolioAdmin } from '@/actions/admin/profiles/portfolio';
import {
  updateProfilePortfolioSchema,
  type UpdateProfilePortfolioInput,
} from '@/lib/validations/profile';
import FormButton from '@/components/shared/button-form';
import { AuthUser, ProfileWithRelations } from '@/lib/types/auth';
import { useRouter } from 'next/navigation';
import { Profile } from '@/lib/prisma-types';

type PortfolioInput = UpdateProfilePortfolioInput;

const initialState = {
  success: false,
  message: '',
};

interface PortfolioFormProps {
  initialUser: AuthUser | null;
  initialProfile: Profile | null;
  showHeading?: boolean;
  adminMode?: boolean;
  hideCard?: boolean;
}

export default function PortfolioForm({
  initialUser,
  initialProfile,
  showHeading = true,
  adminMode = false,
  hideCard = false,
}: PortfolioFormProps) {
  // Select the appropriate action based on admin mode
  const actionToUse = adminMode
    ? updateProfilePortfolioAdmin
    : updateProfilePortfolio;

  const [state, action, isPending] = useActionState(actionToUse, initialState);

  const [isUploading, setIsUploading] = useState(false);
  const [isPendingTransition, startTransition] = useTransition();
  const router = useRouter();

  // Media upload refs
  const mediaRef = useRef<any>(null);

  const form = useForm<PortfolioInput>({
    resolver: zodResolver(updateProfilePortfolioSchema),
    defaultValues: {
      portfolio: initialProfile?.portfolio || [],
    },
    mode: 'onChange',
  });

  const {
    formState: { errors, isValid, isDirty },
    getValues,
  } = form;

  // Update form values when profile data changes (including after successful saves)
  useEffect(() => {
    if (initialProfile) {
      form.reset({
        portfolio: initialProfile.portfolio || null,
      });
    }
  }, [initialProfile, form]);

  // Handle successful form submission
  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message, {
        id: `portfolio-form-${Date.now()}`,
      });
      router.refresh();
    } else if (!state.success && state.message) {
      toast.error(state.message, {
        id: `portfolio-form-${Date.now()}`,
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
        await mediaRef.current.uploadFiles();
      }

      // Get all form values and populate FormData
      const allValues = getValues();

      // Only include portfolio data, preserve other existing data by not including them
      populateFormData(formData, allValues, {
        jsonFields: ['portfolio'],
        skipEmpty: false, // Allow null values to be sent for clearing portfolio
      });

      // Add profileId when in admin mode
      if (adminMode && initialProfile?.id) {
        formData.set('profileId', initialProfile.id);
      }

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
        className={
          hideCard
            ? 'space-y-6'
            : 'space-y-6 p-6 border rounded-lg shadow bg-sidebar'
        }
      >
        {!hideCard && <h3 className='text-lg font-medium'>Δείγμα Εργασιών</h3>}

        {/* Portfolio Upload */}
        <FormField
          control={form.control}
          name='portfolio'
          render={({ field }) => (
            <FormItem>
              {showHeading && (
                <>
                  <FormLabel>Δείγμα Εργασιών</FormLabel>
                  <p className='text-sm text-muted-foreground'>
                    Προσθέστε έργα από το χαρτοφυλάκιό σας
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
                  folder={`users/${initialUser?.username}/portfolio`}
                  maxFileSize={15000000} // 15MB to match the default
                  maxFiles={10}
                  allowedFormats={[
                    'jpg',
                    'jpeg',
                    'png',
                    'webp',
                    'mp4',
                    'webm',
                    'ogg',
                    'mp3',
                    'wav',
                  ]}
                  placeholder='Ανεβάστε εικόνες, ηχητικά ή βίντεο'
                  error={errors.portfolio?.message}
                  signed={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className='flex justify-end'>
          <FormButton
            type='submit'
            text='Αποθήκευση Αρχείων'
            loadingText='Αποθήκευση...'
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
