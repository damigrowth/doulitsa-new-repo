'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { CloudinaryResource } from '@/lib/types/cloudinary';
import { getMediaLibraryToken } from '@/actions/cloudinary/get-media-library-token';

interface CloudinaryMediaPickerProps {
  value: CloudinaryResource | null;
  onChange: (resource: CloudinaryResource | null) => void;
  multiple?: boolean;
  maxFiles?: number;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  className?: string;
}

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (options: any, callback: (error: any, result: any) => void) => {
        open: () => void;
        close: () => void;
        destroy: () => void;
      };
      createMediaLibrary: (
        options: any,
        callbacks: { insertHandler: (data: any) => void },
      ) => any;
    };
    ml?: any;
  }
}

/**
 * Cloudinary Media Library Picker Component
 * Uses authenticated Media Library widget to browse all Cloudinary assets
 */
export function CloudinaryMediaPicker({
  value,
  onChange,
  multiple = false,
  maxFiles = 1,
  resourceType = 'image',
  className = '',
}: CloudinaryMediaPickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const scriptLoaded = useRef(false);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    // Load Cloudinary Media Library script
    if (!scriptLoaded.current) {
      const script = document.createElement('script');
      script.src = 'https://media-library.cloudinary.com/global/all.js';
      script.async = true;
      document.body.appendChild(script);
      scriptLoaded.current = true;
    }
  }, []);

  const openMediaLibrary = async () => {
    if (!window.cloudinary) {
      return;
    }

    try {
      setIsLoading(true);

      // Fetch authentication token from secure server action
      const result = await getMediaLibraryToken();

      if (!result.success || !result.data) {
        throw new Error(
          result.error || 'Failed to authenticate with Cloudinary',
        );
      }

      const { signature, timestamp, apiKey, cloudName } = result.data;

      // Close existing widget if open
      if (widgetRef.current) {
        widgetRef.current.hide();
      }

      // Create and show Media Library widget
      widgetRef.current = window.cloudinary.createMediaLibrary(
        {
          cloud_name: cloudName,
          api_key: apiKey,
          // username: 'admin',
          timestamp: timestamp,
          signature: signature,
          multiple: multiple,
          max_files: maxFiles,
          default_transformations: [[]],
        },
        {
          insertHandler: (data: any) => {
            if (data.assets && data.assets.length > 0) {
              const asset = data.assets[0];

              // Map Cloudinary asset to CloudinaryResource
              const resource: CloudinaryResource = {
                public_id: asset.public_id,
                secure_url: asset.secure_url,
                width: asset.width,
                height: asset.height,
                resource_type: asset.resource_type,
                format: asset.format,
                bytes: asset.bytes,
                url: asset.url,
                original_filename: asset.original_filename || asset.filename,
              };

              onChange(resource);
            }
          },
        },
      );

      widgetRef.current.show();
    } catch (error) {
      alert('Failed to open Media Library. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className={className}>
      {value ? (
        <div className='space-y-2'>
          <div className='relative w-full h-48 rounded-lg overflow-hidden border bg-muted/50'>
            <Image
              src={value.secure_url}
              alt={value.original_filename || 'Selected image'}
              fill
              className='object-contain'
            />
          </div>
          <div className='flex items-center justify-between text-sm text-muted-foreground'>
            <div className='flex-1 truncate'>
              <p className='font-medium'>{value.original_filename}</p>
              <p className='text-xs'>
                {value.width} × {value.height} • {value.format?.toUpperCase()}
              </p>
            </div>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleRemove}
              className='shrink-0'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type='button'
          variant='outline'
          onClick={openMediaLibrary}
          disabled={isLoading}
          className='w-full h-32 border-dashed'
        >
          <div className='flex flex-col items-center gap-2'>
            {isLoading ? (
              <>
                <Loader2 className='h-8 w-8 text-muted-foreground animate-spin' />
                <span className='text-sm text-muted-foreground'>
                  Loading Library...
                </span>
              </>
            ) : (
              <>
                <ImagePlus className='h-8 w-8 text-muted-foreground' />
                <span className='text-sm text-muted-foreground'>
                  Select Image from Library
                </span>
              </>
            )}
          </div>
        </Button>
      )}
    </div>
  );
}
