'use client';

import React, {
  useActionState,
  useEffect,
  useState,
  useRef,
  useTransition,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Shadcn UI components
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';

// Auth provider
import { useSession } from '@/lib/auth/client';

// Custom components
import { MediaUpload } from '@/components/media';

// Validation utilities
import { formatDisplayName } from '@/lib/utils/validation/formats';
import { populateFormData } from '@/lib/utils/form';
import { updateAccount } from '@/actions/auth/update-account';
import { updateAccountAdmin } from '@/actions/admin/users';
import FormButton from '@/components/shared/button-form';
import { AuthUser } from '@/lib/types/auth';
import { useRouter } from 'next/navigation';
import {
  accountUpdateSchema,
  type AccountUpdateInput,
} from '@/lib/validations/auth';

const initialState = {
  success: false,
  message: '',
};

interface AccountFormProps {
  initialUser: AuthUser | null;
  adminMode?: boolean;
  hideCard?: boolean;
}

export default function AccountForm({
  initialUser,
  adminMode = false,
  hideCard = false,
}: AccountFormProps) {
  // Select the appropriate action based on admin mode
  const actionToUse = adminMode ? updateAccountAdmin : updateAccount;

  const [state, action, isPending] = useActionState(actionToUse, initialState);
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [isPendingTransition, startTransition] = useTransition();
  const { refetch } = useSession();

  // Ref for media upload
  const profileImageRef = useRef<any>(null);

  const form = useForm<AccountUpdateInput>({
    resolver: zodResolver(accountUpdateSchema),
    defaultValues: {
      displayName: '',
      image: null,
    },
    // `onBlur` instead of `onChange` so every keystroke does not re-run the
    // resolver + re-render the entire form.
    mode: 'onBlur',
  });

  const {
    formState: { isValid, isDirty, errors },
    getValues,
    setValue,
  } = form;

  // Reset form values when the upstream user data actually changes.
  // Uses a snapshot ref so a parent re-render with the same `initialUser`
  // content (e.g. after `router.refresh()` post-save) doesn't call
  // `form.reset()` again — that was the source of the infinite render loop
  // because `form.reset` triggers state → render → new `form` ref → repeat.
  const userSnapshotRef = useRef<string>('');
  useEffect(() => {
    if (!initialUser) return;
    const resetData = {
      displayName: initialUser.displayName || '',
      image: initialUser.image ? initialUser.image : null,
    };
    const snapshot = JSON.stringify(resetData);
    if (snapshot !== userSnapshotRef.current) {
      userSnapshotRef.current = snapshot;
      form.reset(resetData, { keepDefaultValues: false });
    }
  }, [initialUser, form]);

  // Handle form submission responses with toast notifications.
  // IMPORTANT: only run when `state` actually changes. `refetch` and `router`
  // are excluded from the deps because they're recreated on every render
  // (useSession returns a fresh `refetch` closure each render). If we left
  // them in, the effect would re-run every render, call refetch + router.refresh
  // on every render once a save succeeded, and the page would hammer
  // /api/auth/session until Django rate-limits to 429.
  const handledStateRef = useRef<typeof state | null>(null);
  useEffect(() => {
    if (handledStateRef.current === state) return;
    handledStateRef.current = state;
    if (state.success && state.message) {
      toast.success(state.message, {
        id: `account-form-${Date.now()}`,
      });
      setIsUploading(false);
      refetch();
      router.refresh();
    } else if (!state.success && state.message) {
      toast.error(state.message, {
        id: `account-form-${Date.now()}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Reset loading states when form submission completes (success or failure)
  useEffect(() => {
    if (!isPending) {
      setIsUploading(false);
    }
  }, [isPending]);

  // Wrapper action that handles media uploads and data population
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
      const allValues = getValues();

      populateFormData(formData, allValues, {
        stringFields: ['displayName'],
        jsonFields: ['image'],
        skipEmpty: true,
      });

      // Add userId when in admin mode
      if (adminMode && initialUser?.id) {
        formData.set('userId', initialUser.id);
      }

      // Call the server action with populated FormData using startTransition
      startTransition(() => {
        action(formData);
      });

      // Note: Don't reset isUploading here, let it be handled by useEffect
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
          handleFormAction(formData);
        }}
        className={
          hideCard
            ? 'space-y-6'
            : 'space-y-6 p-6 border rounded-lg shadow bg-sidebar'
        }
      >
        {/* Profile Image - For all user types */}
        <FormField
          control={form.control}
          name='image'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-sm font-medium text-gray-700'>
                Εικόνα Προφίλ*
              </FormLabel>
              <p className='text-sm text-gray-600'>
                Μία εικόνα/φωτογραφία χωρίς κείμενο ή λογότυπο. Για καλύτερη
                εμφάνιση προτείνονται τετράγωνες εικόνες.
              </p>
              <FormControl>
                <MediaUpload
                  ref={profileImageRef}
                  value={field.value}
                  onChange={field.onChange}
                  uploadPreset='doulitsa_profile_images'
                  multiple={false}
                  folder={`users/${initialUser?.username}/profile`}
                  maxFileSize={3000000} // 3MB
                  allowedFormats={['jpg', 'jpeg', 'png', 'webp']}
                  placeholder='Ανεβάστε εικόνα προφίλ'
                  type='image'
                  error={errors.image?.message}
                  signed={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className={`grid grid-cols-1 ${initialUser?.type === 'pro' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
          {/* Email - Read Only */}
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input
                type='email'
                value={initialUser?.email || ''}
                disabled
                readOnly
                className='bg-muted'
              />
            </FormControl>
          </FormItem>

          {/* Username - Read Only - Only shown for pro users */}
          {initialUser?.type === 'pro' && (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  type='text'
                  value={initialUser?.username || ''}
                  disabled
                  readOnly
                  className='bg-muted'
                />
              </FormControl>
            </FormItem>
          )}

          {/* Display Name */}
          <FormField
            control={form.control}
            name='displayName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Όνομα / Επωνυμία</FormLabel>
                <FormControl>
                  <Input
                    type='text'
                    placeholder='Πώς θα εμφανίζεστε'
                    {...field}
                    onChange={(e) => {
                      const formatted = formatDisplayName(e.target.value);
                      field.onChange(formatted);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='flex justify-end space-x-4'>
          <FormButton
            variant='outline'
            type='button'
            text='Ακύρωση'
            onClick={() => form.reset()}
            disabled={isPending || !isDirty}
          />
          <FormButton
            type='submit'
            text='Αποθήκευση'
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
