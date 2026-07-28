'use client';

import React from 'react';

// Standard shadcn/ui imports
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

// Custom components
import { MediaUpload } from '@/components/media';

// Icons

// Types
import type { CreateServiceInput } from '@/lib/validations/service';

// Form context
import { useFormContext } from 'react-hook-form';

interface MediaStepProps {
  username: string | null;
  mediaRef?: React.RefObject<any>;
}

export default function MediaStep({ username, mediaRef }: MediaStepProps) {
  const form = useFormContext<CreateServiceInput>();

  return (
    <FormField
      control={form.control}
      name='media'
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <MediaUpload
              ref={mediaRef}
              value={field.value || []}
              onChange={field.onChange}
              uploadPreset='doulitsa_new'
              multiple={true}
              folder={`users/${username}/services/media`}
              maxFileSize={50000000} // 50MB
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
              error={form.formState.errors.media?.message}
              signed={false}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
