'use client';

import React, {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
} from 'react';
import {
  QueuedFile,
  CloudinaryResourceOrPending,
  PendingCloudinaryResource,
  MediaType,
  createPendingResource,
  processSelectedFiles,
  cleanupPreviewUrls,
  filterPendingResources,
  uploadFileToCloudinary,
  isPendingResource,
} from '@/lib/utils/media';
import { MediaUploadProps, MediaUploadRef } from '@/lib/types/components';
import ProfileImageUpload from './profile-image-upload';
import GalleryUpload from './gallery-upload';
import { CloudinaryResource } from '@/lib/types/cloudinary';

/**
 * Media Upload Component with Manual Upload Control
 * - Allows file selection without immediate upload
 * - Provides preview functionality
 * - Supports duplicate detection
 * - Uploads only when manually triggered (form submit)
 * - Optimized with React.memo and performance optimizations
 * - Modular sub-component architecture
 * - Drag & drop reordering for gallery mode
 */
const MediaUpload = forwardRef<MediaUploadRef, MediaUploadProps>(
  (props, ref) => {
    const {
      value,
      onChange,
      uploadPreset = 'ml_default',
      multiple = false,
      folder = 'uploads',
      maxFiles = 10,
      maxFileSize = 15000000, // 15MB
      allowedFormats = [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'mp4',
        'webm',
        'mp3',
        'ogg',
        'wav',
      ],
      className = '',
      placeholder = 'Ανεβάστε αρχεία',
      error,
      type = 'auto',
      signed = true,
      signatureEndpoint = '/api/sign-cloudinary-params',
    } = props;

    // State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);

    // Convert value to array for consistent handling (memoized)
    const resources = useMemo((): CloudinaryResourceOrPending[] => {
      if (!value) return [];

      // Handle JSON string (serialized array)
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          // If it's not an array, treat as single URL string
          return [];
        } catch {
          // If parsing fails, treat as single URL string
          return [];
        }
      }

      const result = Array.isArray(value) ? value : [value];
      return result;
    }, [value]);

    // For image-only uploads, restrict formats (memoized)
    const formats = useMemo(
      () =>
        type === 'image' ? ['jpg', 'jpeg', 'png', 'webp'] : allowedFormats,
      [type, allowedFormats],
    );

    const resourceType = useMemo(
      () => (type === 'image' ? 'image' : 'auto') as 'auto' | 'image' | 'video',
      [type],
    );

    // Allowed types for validation (memoized)
    const allowedTypes = useMemo(
      (): MediaType[] =>
        type === 'image' ? ['image'] : ['image', 'video', 'audio'],
      [type],
    );

    // File processing options (memoized)
    const fileProcessingOptions = useMemo(
      () => ({
        allowedTypes,
        maxSizeMB: maxFileSize / (1024 * 1024),
        isProfileImage: !multiple && type === 'image',
        maxFiles,
        multiple,
      }),
      [allowedTypes, maxFileSize, multiple, type, maxFiles],
    );

    // Handle file selection (optimized with useCallback)
    const handleFilesSelected = useCallback(
      (files: FileList) => {
        const result = processSelectedFiles(
          files,
          queuedFiles,
          resources,
          fileProcessingOptions,
        );

        if (result.error) {
          setUploadError(result.error);
          return;
        }

        if (result.newFiles.length === 0) {
          return; // No new files to add
        }

        // Add to queue
        setQueuedFiles((prev) => {
          const updated = multiple
            ? [...prev, ...result.newFiles]
            : result.newFiles;
          return updated;
        });

        // Create pending resources for form update
        const pendingResources: PendingCloudinaryResource[] =
          result.newFiles.map(createPendingResource);

        if (multiple) {
          const allResources = [...resources, ...pendingResources];
          onChange(allResources.length > 0 ? allResources : null);
        } else {
          onChange(pendingResources[0] || null);
        }

        setUploadError(null);
      },
      [queuedFiles, resources, fileProcessingOptions, multiple, onChange],
    );

    // Manual upload function (optimized with useCallback)
    // Returns true if all uploads succeeded, false if any failed
    const uploadFiles = useCallback(async (): Promise<boolean> => {
      if (queuedFiles.length === 0) return true;

      setIsUploading(true);
      setUploadError(null);

      try {
        const uploadedResources: CloudinaryResource[] = [];

        for (const queuedFile of queuedFiles) {
          if (queuedFile.isUploaded) continue;

          const cloudinaryResource = await uploadFileToCloudinary(
            queuedFile.file,
            {
              uploadPreset,
              folder,
              signed,
              signatureEndpoint,
              resourceType,
            },
          );

          // Check for duplicates in response
          if (
            resources.some((r) => r.public_id === cloudinaryResource.public_id)
          ) {
            continue;
          }

          uploadedResources.push(cloudinaryResource);

          // Update the queued file as uploaded
          setQueuedFiles((prev) =>
            prev.map((qf) =>
              qf.id === queuedFile.id
                ? { ...qf, isUploaded: true, cloudinaryResource }
                : qf,
            ),
          );
        }

        // Update parent with uploaded resources, filtering out pending resources
        const nonPendingResources = filterPendingResources(resources);
        const allResources = [...nonPendingResources, ...uploadedResources];

        if (multiple) {
          onChange(allResources.length > 0 ? allResources : null);
        } else {
          onChange(allResources[0] || null);
        }

        // Clear uploaded files from queue
        setQueuedFiles((prev) => prev.filter((qf) => !qf.isUploaded));
        return true;
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : 'Αποτυχία μεταφόρτωσης.',
        );
        return false;
      } finally {
        setIsUploading(false);
      }
    }, [
      queuedFiles,
      resources,
      uploadPreset,
      folder,
      signed,
      signatureEndpoint,
      resourceType,
      multiple,
      onChange,
    ]);

    // Remove file from queue (optimized with useCallback)
    const handleRemoveFromQueue = useCallback(
      (fileId: string) => {
        setQueuedFiles((prev) => {
          const updated = prev.filter((qf) => qf.id !== fileId);
          // Clean up preview URL
          const removedFile = prev.find((qf) => qf.id === fileId);
          if (removedFile) {
            URL.revokeObjectURL(removedFile.preview);
          }
          return updated;
        });

        // Remove corresponding pending resource from form value
        const pendingId = `pending_${fileId}`;
        const filteredResources = resources.filter(
          (r) => r.public_id !== pendingId,
        );

        if (multiple) {
          onChange(filteredResources.length > 0 ? filteredResources : null);
        } else {
          onChange(null);
        }
      },
      [resources, multiple, onChange],
    );

    // Remove uploaded resource (optimized with useCallback)
    const handleRemoveResource = useCallback(
      (publicId: string) => {
        const filtered = resources.filter((r) => r.public_id !== publicId);
        if (multiple) {
          onChange(filtered.length > 0 ? filtered : null);
        } else {
          onChange(null);
        }
      },
      [resources, multiple, onChange],
    );

    // Handle reordering (optimized with useCallback)
    const handleReorderResources = useCallback(
      (reorderedResources: CloudinaryResourceOrPending[]) => {
        if (multiple) {
          onChange(reorderedResources.length > 0 ? reorderedResources : null);
        }
      },
      [multiple, onChange],
    );

    // Clear all queued files (optimized with useCallback)
    const clearQueue = useCallback(() => {
      cleanupPreviewUrls(queuedFiles);
      setQueuedFiles([]);
      setUploadError(null);
    }, [queuedFiles]);

    // Expose methods to parent via ref (memoized)
    useImperativeHandle(
      ref,
      () => ({
        uploadFiles,
        hasFiles: () => queuedFiles.length > 0,
        clearQueue,
      }),
      [uploadFiles, queuedFiles.length, clearQueue],
    );

    // Computed values (memoized)
    const totalFiles = useMemo(
      () => resources.length + queuedFiles.length,
      [resources.length, queuedFiles.length],
    );

    const canAddMore = useMemo(
      () => (multiple ? totalFiles < maxFiles : totalFiles === 0),
      [multiple, totalFiles, maxFiles],
    );

    // Convert error to string (memoized)
    const errorMessage = useMemo(() => {
      if (typeof error === 'string') return error;
      if (error?.message) {
        return typeof error.message === 'string'
          ? error.message
          : String(error.message);
      }
      return undefined;
    }, [error]);

    const displayError = errorMessage || uploadError;

    // Profile image mode data (memoized for single file mode)
    const profileData = useMemo(() => {
      if (multiple) return null;
      return {
        resource: typeof value === 'string' ? value : resources[0] || null,
        queuedFile: queuedFiles[0] || null,
      };
    }, [multiple, value, resources, queuedFiles]);

    // Profile Image Mode (single file)
    if (!multiple) {
      // Widget mode for direct upload with cropping
      const useWidget = type === 'image'; // Enable widget for image-only uploads

      return (
        <ProfileImageUpload
          resource={profileData?.resource || null}
          queuedFile={profileData?.queuedFile || null}
          onFileSelect={handleFilesSelected}
          onRemove={() => {
            if (queuedFiles.length > 0) {
              handleRemoveFromQueue(queuedFiles[0].id);
            } else if (typeof value === 'string') {
              // Remove string URL by setting to null
              onChange(null);
            } else if (resources.length > 0) {
              handleRemoveResource(resources[0].public_id || '');
            }
          }}
          isUploading={isUploading}
          error={displayError}
          maxFileSize={maxFileSize}
          formats={formats}
          className={className}
          useWidget={useWidget}
          folder={folder}
          uploadPreset={uploadPreset}
          signed={signed}
          signatureEndpoint={signatureEndpoint}
          onDirectUpload={(resource) => {
            // Handle direct upload from widget (bypasses queue)
            onChange(resource);
          }}
        />
      );
    }

    // Gallery Mode (multiple files)
    return (
      <GalleryUpload
        resources={resources}
        queuedFiles={queuedFiles}
        onFilesSelected={handleFilesSelected}
        onRemoveResource={handleRemoveResource}
        onRemoveFromQueue={handleRemoveFromQueue}
        onReorderResources={handleReorderResources}
        isUploading={isUploading}
        error={displayError}
        maxFiles={maxFiles}
        maxFileSize={maxFileSize}
        formats={formats}
        canAddMore={canAddMore}
        className={className}
        type={type}
      />
    );
  },
);

MediaUpload.displayName = 'MediaUpload';

export default MediaUpload;
