'use client';

import React, {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import { CldImage } from 'next-cloudinary';
import { X, Loader2 } from 'lucide-react';
import { CloudinaryResource } from '@/lib/types/cloudinary';

interface MediaUploadProps {
  value?: CloudinaryResource | CloudinaryResource[] | null;
  onChange: (value: CloudinaryResource | CloudinaryResource[] | null) => void;
  uploadPreset: string;
  multiple?: boolean;
  folder: string;
  maxFiles?: number;
  maxFileSize?: number;
  allowedFormats?: string[];
  placeholder?: string;
  type?: 'image' | 'auto';
  error?: string;
  signed?: boolean;
  signatureEndpoint?: string;
}

interface MediaUploadRef {
  uploadFiles: () => Promise<void>;
  hasFiles: () => boolean;
}

const MediaUploadSimple = forwardRef<MediaUploadRef, MediaUploadProps>(
  (props, ref) => {
    const {
      value,
      onChange,
      uploadPreset,
      multiple = false,
      folder,
      maxFileSize = 15000000,
      allowedFormats = ['jpg', 'jpeg', 'png', 'webp'],
      placeholder = 'Upload files',
      type = 'auto',
      error,
      signed = false,
    } = props;

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Convert value to array for consistent handling
    const resources = React.useMemo((): CloudinaryResource[] => {
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    }, [value]);

    const handleFileSelection = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const fileArray = Array.from(files);

        // Validate files
        const validFiles = fileArray.filter((file) => {
          const extension = file.name.split('.').pop()?.toLowerCase();
          const isValidFormat = extension && allowedFormats.includes(extension);
          const isValidSize = file.size <= maxFileSize;

          if (!isValidFormat) {
            setUploadError(
              `Invalid file format: ${extension}. Allowed: ${allowedFormats.join(', ')}`,
            );
            return false;
          }

          if (!isValidSize) {
            setUploadError(
              `File too large: ${Math.round(file.size / 1024 / 1024)}MB. Max: ${Math.round(maxFileSize / 1024 / 1024)}MB`,
            );
            return false;
          }

          return true;
        });

        if (validFiles.length > 0) {
          setSelectedFiles(validFiles);
          setUploadError(null);
        }
      },
      [allowedFormats, maxFileSize],
    );

    const uploadFiles = useCallback(async () => {
      if (selectedFiles.length === 0) return;

      setIsUploading(true);
      setUploadError(null);

      try {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        if (!cloudName) throw new Error('Cloudinary not configured');

        const uploadedResources: CloudinaryResource[] = [];

        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', uploadPreset);
          formData.append('folder', folder);

          const resourceType = type === 'image' ? 'image' : 'auto';
          const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

          const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error?.message ||
                `Αποτυχία μεταφόρτωσης για το ${file.name}`,
            );
          }

          const result = await response.json();
          uploadedResources.push(result);
        }

        // Update form value
        const existingResources = resources;
        const allResources = [...existingResources, ...uploadedResources];

        if (multiple) {
          onChange(allResources);
        } else {
          onChange(uploadedResources[0] || null);
        }

        // Clear selected files
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : 'Αποτυχία μεταφόρτωσης',
        );
      } finally {
        setIsUploading(false);
      }
    }, [
      selectedFiles,
      uploadPreset,
      folder,
      type,
      resources,
      multiple,
      onChange,
    ]);

    const removeResource = useCallback(
      (index: number) => {
        const newResources = resources.filter((_, i) => i !== index);
        if (multiple) {
          onChange(newResources.length > 0 ? newResources : null);
        } else {
          onChange(null);
        }
      },
      [resources, multiple, onChange],
    );

    // Expose methods to parent
    useImperativeHandle(
      ref,
      () => ({
        uploadFiles,
        hasFiles: () => selectedFiles.length > 0,
      }),
      [uploadFiles, selectedFiles.length],
    );

    const handleDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files.length > 0) {
          const mockEvent = {
            target: { files },
          } as React.ChangeEvent<HTMLInputElement>;
          handleFileSelection(mockEvent);
        }
      },
      [handleFileSelection],
    );

    const handleDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault();
    }, []);

    return (
      <div className='space-y-4'>
        {/* Upload Area */}
        <div
          className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors'
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type='file'
            multiple={multiple}
            accept={allowedFormats.map((f) => `.${f}`).join(',')}
            onChange={handleFileSelection}
            className='hidden'
          />

          <div className='space-y-2'>
            <p className='text-gray-600'>{placeholder}</p>
            {selectedFiles.length > 0 && (
              <p className='text-sm text-green-600'>
                {selectedFiles.length} file(s) selected
              </p>
            )}
            {isUploading && (
              <div className='flex items-center justify-center space-x-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span className='text-sm'>Uploading...</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {(error || uploadError) && (
          <div className='text-red-500 text-sm'>{error || uploadError}</div>
        )}

        {/* Resource Preview */}
        {resources.length > 0 && (
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
            {resources.map((resource, index) => (
              <div key={resource.public_id || index} className='relative group'>
                <div className='aspect-square rounded-lg overflow-hidden bg-gray-100'>
                  <CldImage
                    width={200}
                    height={200}
                    src={resource.public_id}
                    alt={resource.original_filename || 'Uploaded image'}
                    className='w-full h-full object-cover'
                  />
                </div>
                <button
                  type='button'
                  onClick={() => removeResource(index)}
                  className='absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

MediaUploadSimple.displayName = 'MediaUploadSimple';

export default MediaUploadSimple;
