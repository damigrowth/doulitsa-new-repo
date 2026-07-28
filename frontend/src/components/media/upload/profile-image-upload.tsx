'use client';

import React, { memo } from 'react';
import { CldImage } from 'next-cloudinary';
import { Upload, Loader2, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  isPendingResource,
  generateAcceptString,
  MediaType
} from '@/lib/utils/media';
import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';
import { ProfileImageUploadProps } from '@/lib/types/components';
import { CloudinaryUploadWidget } from './cloudinary-upload-widget';
import { CloudinaryResource } from '@/lib/types/cloudinary';

// Helper function to render profile image display
const renderProfileImage = (
  resource: CloudinaryResource | string | null | undefined,
  queuedFile: any,
  isLoading: boolean
) => {
  // Show queued file preview (before upload)
  if (queuedFile) {
    return (
      <div className="relative w-[71px] h-[71px]">
        <img
          src={queuedFile.preview}
          alt={queuedFile.name}
          className="w-full h-full rounded-lg object-cover border-2 border-gray-200"
        />
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
      </div>
    );
  }

  if (resource) {
    // Handle string URLs (OAuth images, persisted cropped URLs)
    if (typeof resource === 'string') {
      // Optimize Cloudinary URLs with transformations (w_150,h_150,c_fill,g_face, etc.)
      // Falls back to original URL for non-Cloudinary images (OAuth avatars)
      const optimizedUrl = getOptimizedImageUrl(resource, 'avatar', 'lg');

      return (
        <div className="relative w-[71px] h-[71px]">
          <img
            src={optimizedUrl || resource}
            alt="Profile image"
            className="w-full h-full rounded-lg object-cover border-2 border-gray-200"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          )}
        </div>
      );
    }

    // Handle CloudinaryResource objects
    const isPending = isPendingResource(resource);

    return (
      <div className="relative w-[71px] h-[71px]">
        {isPending || !resource.public_id ? (
          // Use direct URL for pending resources (not yet fully uploaded)
          <img
            src={resource.secure_url}
            alt={resource.original_filename || 'Profile image'}
            className="w-full h-full rounded-lg object-cover border-2 border-gray-200"
          />
        ) : (
          // Use CldImage for uploaded Cloudinary images
          <CldImage
            width={71}
            height={71}
            src={resource.public_id}
            alt="Profile image"
            className="w-full h-full rounded-lg object-cover border-2 border-gray-200"
          />
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
      </div>
    );
  }

  // Show placeholder when no image
  return (
    <div className="w-[71px] h-[71px] rounded-lg bg-secondary/5 hover:bg-secondary/10 flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-primary/90 transition-colors">
      <ImageOff className="w-6 h-6 text-gray-400" />
    </div>
  );
};

const ProfileImageUpload = memo<ProfileImageUploadProps>(({
  resource,
  queuedFile,
  onFileSelect,
  onRemove,
  isUploading,
  error,
  maxFileSize,
  formats,
  className = '',
  useWidget = true, // New prop to enable widget mode
  folder = 'profiles',
  uploadPreset = 'ml_default',
  signed = true,
  signatureEndpoint = '/api/sign-cloudinary-params',
  onDirectUpload, // New callback for widget uploads
}) => {
  // Widget mode: Direct upload with cropping UI
  if (useWidget) {
    const handleWidgetUpload = (uploadedResource: CloudinaryResource | null) => {
      // Notify parent of the uploaded resource directly
      if (uploadedResource && onDirectUpload) {
        onDirectUpload(uploadedResource);
      }
    };

    return (
      <div className={`col-xl-7 mb-5 ${className}`}>
        <CloudinaryUploadWidget
          value={typeof resource === 'string' ? resource : resource || null}
          onChange={handleWidgetUpload}
          folder={folder}
          uploadPreset={uploadPreset}
          signed={signed}
          signatureEndpoint={signatureEndpoint}
          croppingAspectRatio={1}
          showSkipCropButton={false}
          maxFileSize={maxFileSize}
          minImageWidth={400}
          minImageHeight={400}
        >
          {({ open, isLoading, error: widgetError }) => (
            <>
              <div className="flex items-center gap-3 mb-2">
                {/* Profile Image Display */}
                <div
                  className="flex-shrink-0 cursor-pointer"
                  onClick={!isLoading ? open : undefined}
                >
                  <div className="relative">
                    {renderProfileImage(resource, queuedFile, isLoading || isUploading)}
                  </div>
                </div>

                {/* Upload Controls */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <Button
                        type="button"
                        onClick={open}
                        disabled={isLoading || isUploading}
                        className="inline-flex items-center px-4 py-1.5 bg-orangy hover:bg-orangy/70 text-primary font-medium text-sm rounded transition-colors border-0 shadow-none"
                      >
                        {isLoading || isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Μεταφόρτωση...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {resource || queuedFile ? 'Αλλαγή Εικόνας' : 'Ανέβασμα Εικόνας'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 max-w-md">
                    <strong>Ελάχιστες διαστάσεις: 400x400 pixels.</strong>
                    <br />
                    Μέγιστο μέγεθος αρχείου: {Math.round(maxFileSize / 1024 / 1024)} MB.
                    <br />
                    Επιτρεπόμενοι τύποι αρχείων: {formats.join(', ')}
                    <br />
                    <strong>Μπορείτε να κάνετε περικοπή στην εικόνα κατά το ανέβασμα.</strong>
                  </p>
                </div>
              </div>

              {/* Error Display */}
              {(error || widgetError) && (
                <div className="mt-2">
                  <p className="text-red-600 text-sm">{error || widgetError}</p>
                </div>
              )}
            </>
          )}
        </CloudinaryUploadWidget>
      </div>
    );
  }

  // Legacy mode: Manual file selection (for backward compatibility)
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFileSelect(e.target.files);
    }
  };

  const handleImageClick = () => {
    if (!isUploading) {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fileInput?.click();
    }
  };

  const hasImage = queuedFile || resource;

  return (
    <div className={`col-xl-7 mb-5 ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        {/* Profile Image Display */}
        <div
          className="flex-shrink-0 cursor-pointer"
          onClick={handleImageClick}
        >
          <div className="relative">
            {renderProfileImage(resource, queuedFile, isUploading)}
          </div>
        </div>

        {/* Upload Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col">
            <div className="flex items-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept={generateAcceptString(['image'] as MediaType[], true)}
                  className="hidden"
                  onChange={handleFileInputChange}
                  disabled={isUploading}
                />
                <span className="inline-flex items-center px-4 py-1.5 bg-orangy hover:bg-orangy/70 text-primary font-medium text-sm rounded transition-colors">
                  <Upload className="w-4 h-4 mr-2" />
                  {hasImage ? 'Αλλαγή Εικόνας' : 'Ανέβασμα Εικόνας'}
                </span>
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2 max-w-md">
            Μέγιστο μέγεθος αρχείου: {Math.round(maxFileSize / 1024 / 1024)}
            MB, Ελάχιστες διαστάσεις: 80x80.
            <br />
            Επιτρεπόμενοι τύποι αρχείων: {formats.join(', ')}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-2">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
});

ProfileImageUpload.displayName = 'ProfileImageUpload';

export default ProfileImageUpload;
