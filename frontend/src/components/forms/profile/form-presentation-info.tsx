'use client';

import React, { useActionState, useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { MultiSelect, type Option } from '@/components/ui/multi-select';
import { toast } from 'sonner';

// Icons (lucide-react + brands)
import { Loader2, Phone, Globe, Mail } from 'lucide-react';
import { Icon } from '@/components/icon/brands';

// Auth and utilities
import { formatInput } from '@/lib/utils/validation/formats';
import { populateFormData, parseVisibilityJSON } from '@/lib/utils/form';

// Validation schema and server actions
import {
  profilePresentationUpdateSchema,
  type ProfilePresentationUpdateInput,
} from '@/lib/validations/profile';
import { updateProfilePresentation } from '@/actions/profiles/presentation';
import { updateProfilePresentationAdmin } from '@/actions/admin/profiles/presentation';
import FormButton from '@/components/shared/button-form';
import { AuthUser, ProfileWithRelations } from '@/lib/types/auth';
import { useRouter } from 'next/navigation';
import { Profile } from '@/lib/prisma-types';

const initialState = {
  success: false,
  message: '',
};

// Default visibility configuration - outside component to prevent re-creation
// phone/address have no UI toggle (only email is user-facing) but stay in the
// form state because the Django-side schema expects all three booleans.
const initialVisibility = {
  email: false,
  phone: true,
  address: true,
};

// Default socials configuration - outside component to prevent re-creation
const initialSocials = {
  facebook: '',
  instagram: '',
  linkedin: '',
  x: '',
  youtube: '',
  github: '',
  behance: '',
  dribbble: '',
  pinterest: '',
  vimeo: '',
  tiktok: '',
};

// Available social media platforms
const socialPlatformOptions: Option[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'github', label: 'GitHub' },
  { value: 'behance', label: 'Behance' },
  { value: 'dribbble', label: 'Dribbble' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'tiktok', label: 'TikTok' },
];

interface PresentationInfoFormProps {
  initialUser: AuthUser | null;
  initialProfile: Profile | null;
  adminMode?: boolean;
  hideCard?: boolean;
}

export default function PresentationInfoForm({
  initialUser,
  initialProfile,
  adminMode = false,
  hideCard = false,
}: PresentationInfoFormProps) {
  // Select the appropriate action based on admin mode
  const actionToUse = adminMode
    ? updateProfilePresentationAdmin
    : updateProfilePresentation;

  const [state, action, isPending] = useActionState(actionToUse, initialState);

  const router = useRouter();

  // Extract data from props
  const profile = initialProfile;

  // Email that will be displayed publicly (mirrors the profile page logic)
  const displayEmail = initialProfile?.email || initialUser?.email || '';

  // State for selected social platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const form = useForm<ProfilePresentationUpdateInput>({
    resolver: zodResolver(profilePresentationUpdateSchema),
    defaultValues: {
      phone: '',
      website: '',
      viber: '',
      whatsapp: '',
      visibility: initialVisibility,
      socials: initialSocials,
    },
    mode: 'onChange',
  });

  const {
    formState: { errors, isValid, isDirty },
    setValue,
    getValues,
    watch,
  } = form;

  // Update form values when initial data is available
  useEffect(() => {
    if (profile) {
      const resetData = {
        phone: profile.phone || '',
        website: profile.website || '',
        viber: profile.viber || '',
        whatsapp: profile.whatsapp || '',
        visibility: {
          email:
            (profile.visibility as { email?: boolean } | null)?.email ?? false,
          phone:
            (profile.visibility as { phone?: boolean } | null)?.phone ?? true,
          address:
            (profile.visibility as { address?: boolean } | null)?.address ??
            true,
        },
        socials: profile.socials || initialSocials,
      };
      form.reset(resetData);

      // Initialize selected platforms based on existing data
      const existingSocials = profile.socials || {};
      const activePlatforms = Object.keys(existingSocials).filter(
        (key) =>
          existingSocials[key as keyof typeof existingSocials] &&
          existingSocials[key as keyof typeof existingSocials] !== '',
      );
      setSelectedPlatforms(activePlatforms);
    }
  }, [profile]);

  // Handle successful form submission
  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message, {
        id: `presentation-form-${Date.now()}`,
      });
      router.refresh();
    } else if (!state.success && state.message) {
      toast.error(state.message, {
        id: `presentation-form-${Date.now()}`,
      });
    }
  }, [state, router]);

  // Form submission handler using utility function
  const handleFormSubmit = (formData: FormData) => {
    // Get all form values and populate FormData using utility function
    const allValues = getValues();

    populateFormData(formData, allValues, {
      stringFields: ['phone', 'website', 'viber', 'whatsapp'], // Simple text fields
      jsonFields: ['visibility', 'socials'], // Objects that need JSON.stringify
      skipEmpty: true, // Skip null/undefined/empty values
    });

    // Add profileId when in admin mode
    if (adminMode && initialProfile?.id) {
      formData.set('profileId', initialProfile.id);
    }

    // Call server action
    action(formData);
  };

  return (
    <Form {...form}>
      <form
        action={handleFormSubmit}
        className={
          hideCard
            ? 'space-y-6'
            : 'space-y-6 p-6 border rounded-lg shadow bg-sidebar'
        }
      >
        {/* Contact Fields - All in one row */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <FormField
            control={form.control}
            name='phone'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='flex items-center gap-2'>
                  <Phone className='h-4 w-4' />
                  Τηλέφωνο
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='69XXXXXXXX'
                    maxLength={10}
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='viber'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='flex items-center gap-2'>
                  <Icon name='viber' size={16} color='#665CAC' />
                  Viber
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='69XXXXXXXX'
                    maxLength={10}
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='whatsapp'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='flex items-center gap-2'>
                  <Icon name='whatsapp' size={16} color='#25D366' />
                  WhatsApp
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='69XXXXXXXX'
                    maxLength={10}
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Website + Email visibility */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* Website */}
          <FormField
            control={form.control}
            name='website'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='flex items-center gap-2'>
                  <Globe className='h-4 w-4' />
                  Ιστοσελίδα
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='https://www.example.com'
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email visibility - whole block toggles the switch */}
          <FormField
            control={form.control}
            name='visibility.email'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='flex items-center gap-2'>
                  <Mail className='h-4 w-4' />
                  Εμφάνιση email
                </FormLabel>
                <label className='flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border-2 border-input bg-white px-3 shadow transition-colors hover:bg-accent/40'>
                  <span className='truncate text-sm text-muted-foreground'>
                    {displayEmail || 'Δεν υπάρχει διαθέσιμο email'}
                  </span>
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={(newValue) => {
                      setValue('visibility.email', newValue, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                  />
                </label>
              </FormItem>
            )}
          />
        </div>

        {/* Row 4: Social Media */}
        <div className='space-y-4'>
          <h4 className='text-sm font-medium'>Κοινωνικά Δίκτυα</h4>

          {/* MultiSelect for choosing platforms */}
          <div className='space-y-4'>
            <FormItem>
              <FormLabel>Επιλέξτε Κοινωνικά Δίκτυα</FormLabel>
              <FormControl>
                <MultiSelect
                  options={socialPlatformOptions}
                  selected={selectedPlatforms}
                  onChange={(platforms) => {
                    // Find removed platforms
                    const removedPlatforms = selectedPlatforms.filter(
                      (p) => !platforms.includes(p),
                    );

                    // Clear form values for removed platforms
                    removedPlatforms.forEach((platform) => {
                      setValue(`socials.${platform}` as any, '', {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    });

                    setSelectedPlatforms(platforms);
                  }}
                  placeholder='Επιλέξτε κοινωνικά δίκτυα...'
                  renderLabel={(option) => (
                    <div className='flex items-center gap-2'>
                      <Icon name={option.value} size={16} />
                      {option.label}
                    </div>
                  )}
                  renderSelected={(option) => (
                    <div className='flex items-center gap-2'>
                      <Icon name={option.value} size={14} />
                      <span className='text-xs'>{option.label}</span>
                    </div>
                  )}
                />
              </FormControl>
            </FormItem>

            {/* Dynamic input fields for selected platforms */}
            {selectedPlatforms.length > 0 && (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {selectedPlatforms.includes('facebook') && (
                  <FormField
                    control={form.control}
                    name='socials.facebook'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-2'>
                          <Icon name='facebook' size={16} />
                          Facebook
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://facebook.com/your-profile'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedPlatforms.includes('instagram') && (
                  <FormField
                    control={form.control}
                    name='socials.instagram'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-2'>
                          <Icon name='instagram' size={16} />
                          Instagram
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://instagram.com/your-profile'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedPlatforms.includes('linkedin') && (
                  <FormField
                    control={form.control}
                    name='socials.linkedin'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-2'>
                          <Icon name='linkedin' size={16} />
                          LinkedIn
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://linkedin.com/in/your-profile'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedPlatforms.includes('x') && (
                  <FormField
                    control={form.control}
                    name='socials.x'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-2'>
                          <Icon name='x' size={12} />X (Twitter)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://x.com/your-profile'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedPlatforms.includes('youtube') && (
                  <FormField
                    control={form.control}
                    name='socials.youtube'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-2'>
                          <Icon name='youtube' size={16} />
                          YouTube
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://youtube.com/your-channel'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedPlatforms.includes('github') && (
                  <FormField
                    control={form.control}
                    name='socials.github'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-2'>
                          <Icon name='github' size={16} />
                          GitHub
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://github.com/your-profile'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedPlatforms.includes('behance') && (
                  <FormField
                    control={form.control}
                    name='socials.behance'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-2'>
                          <Icon name='behance' size={16} />
                          Behance
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://behance.net/your-profile'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedPlatforms.includes('dribbble') && (
                  <FormField
                    control={form.control}
                    name='socials.dribbble'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-2'>
                          <Icon name='dribbble' size={16} />
                          Dribbble
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://dribbble.com/your-profile'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedPlatforms.includes('pinterest') && (
                  <FormField
                    control={form.control}
                    name='socials.pinterest'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-2'>
                          <Icon name='pinterest' size={16} />
                          Pinterest
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://pinterest.com/your-profile'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedPlatforms.includes('vimeo') && (
                  <FormField
                    control={form.control}
                    name='socials.vimeo'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-2'>
                          <Icon name='vimeo' size={16} />
                          Vimeo
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://vimeo.com/your-channel'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedPlatforms.includes('tiktok') && (
                  <FormField
                    control={form.control}
                    name='socials.tiktok'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-2'>
                          <Icon name='tiktok' size={16} />
                          TikTok
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://tiktok.com/@your-profile'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
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
            loading={isPending}
            disabled={isPending || !isValid || !isDirty}
          />
        </div>
      </form>
    </Form>
  );
}
