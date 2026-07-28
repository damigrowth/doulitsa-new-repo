/**
 * CONSOLIDATED MEDIA UTILITIES
 *
 * Universal media utilities for handling all media types across the application:
 * - File validation and type detection
 * - Cloudinary resource handling
 * - Legacy Strapi media support
 * - Cross-browser compatibility
 * - Modern TypeScript implementation
 *
 * Replaces:
 * - /lib/utils/validation/media.js
 * - /lib/utils/misc/media.js
 * - /lib/utils/misc/image.ts
 */

import {
  CloudinaryResource,
  isCloudinaryResource,
} from '@/lib/types/cloudinary';

// =============================================
// SUPPORTED FORMATS CONFIGURATION
// =============================================

export const SUPPORTED_FORMATS = {
  // Profile picture formats - restricted for better performance
  profileImage: {
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    extensions: ['jpg', 'jpeg', 'png'],
    displayFormats: ['JPEG', 'PNG'],
  },

  // Gallery image formats - comprehensive
  image: {
    mimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/svg+xml',
      'image/tiff',
      'image/x-icon',
    ],
    extensions: [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'avif',
      'svg',
      'tiff',
      'tif',
      'ico',
    ],
    displayFormats: [
      'JPEG',
      'PNG',
      'GIF',
      'WebP',
      'AVIF',
      'SVG',
      'TIFF',
      'ICO',
    ],
  },

  // Video formats - web-compatible only
  video: {
    mimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
    extensions: ['mp4', 'webm', 'ogg'],
    displayFormats: ['MP4', 'WebM', 'OGG'],
  },

  // Audio formats - web-compatible only
  audio: {
    mimeTypes: [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/wave',
      'audio/ogg',
      'audio/webm',
    ],
    extensions: ['mp3', 'wav', 'ogg', 'webm'],
    displayFormats: ['MP3', 'WAV', 'OGG', 'WebM'],
  },
};

export type MediaType = 'image' | 'video' | 'audio' | 'unknown';
export type MediaFormat = keyof typeof SUPPORTED_FORMATS;

// =============================================
// TYPE DETECTION UTILITIES
// =============================================

/**
 * Advanced media type detection with cross-browser compatibility
 */
export const getMediaType = (
  input: string | File,
  isProfileImage = false,
): MediaType => {
  if (!input) return 'unknown';

  const fileType = input instanceof File ? input.type : input;
  const fileName = input instanceof File ? input.name : input;

  // Normalize for cross-browser compatibility
  const normalizedType = fileType.toLowerCase();

  // Check MIME types first
  if (normalizedType.includes('/')) {
    if (normalizedType.startsWith('image/')) {
      const formatToCheck = isProfileImage
        ? SUPPORTED_FORMATS.profileImage
        : SUPPORTED_FORMATS.image;
      if (
        formatToCheck.mimeTypes.some(
          (mime) => normalizedType === mime.toLowerCase(),
        )
      ) {
        return 'image';
      }
    }

    if (normalizedType.startsWith('video/')) {
      if (
        SUPPORTED_FORMATS.video.mimeTypes.some(
          (mime) => normalizedType === mime.toLowerCase(),
        )
      ) {
        return 'video';
      }
    }

    if (normalizedType.startsWith('audio/')) {
      if (
        SUPPORTED_FORMATS.audio.mimeTypes.some(
          (mime) => normalizedType === mime.toLowerCase(),
        )
      ) {
        return 'audio';
      }
    }
  }

  // Fallback: check by file extension
  const extension = fileName.toLowerCase().split('.').pop();
  if (extension) {
    const formatToCheck = isProfileImage
      ? SUPPORTED_FORMATS.profileImage
      : SUPPORTED_FORMATS.image;
    if (formatToCheck.extensions.includes(extension)) return 'image';
    if (SUPPORTED_FORMATS.video.extensions.includes(extension)) return 'video';
    if (SUPPORTED_FORMATS.audio.extensions.includes(extension)) return 'audio';
  }

  return 'unknown';
};

/**
 * Get media type from CloudinaryResource
 */
export const getCloudinaryMediaType = (
  resource: CloudinaryResource,
): MediaType => {
  if (!resource) return 'unknown';

  // Use Cloudinary's resource_type if available
  if (resource.resource_type) {
    if (resource.resource_type === 'image') return 'image';
    if (resource.resource_type === 'video') return 'video';
    if (resource.resource_type === 'raw') {
      // For raw resources, check the format/extension
      return getMediaTypeFromUrl(resource.secure_url);
    }
  }

  // Fallback to URL-based detection
  return getMediaTypeFromUrl(resource.secure_url);
};

/**
 * Get media type from URL
 */
export const getMediaTypeFromUrl = (url: string): MediaType => {
  if (!url) return 'unknown';

  try {
    const urlPath = new URL(url).pathname;
    const extension = urlPath.toLowerCase().split('.').pop();

    if (extension) {
      if (SUPPORTED_FORMATS.image.extensions.includes(extension))
        return 'image';
      if (SUPPORTED_FORMATS.video.extensions.includes(extension))
        return 'video';
      if (SUPPORTED_FORMATS.audio.extensions.includes(extension))
        return 'audio';
    }
  } catch {
    // If URL parsing fails, try simple extension detection
    const extension = url.toLowerCase().split('.').pop();
    if (extension) {
      if (SUPPORTED_FORMATS.image.extensions.includes(extension))
        return 'image';
      if (SUPPORTED_FORMATS.video.extensions.includes(extension))
        return 'video';
      if (SUPPORTED_FORMATS.audio.extensions.includes(extension))
        return 'audio';
    }
  }

  return 'unknown';
};

// =============================================
// VALIDATION UTILITIES
// =============================================

export interface ValidationResult {
  isValid: boolean;
  type: MediaType;
  error?: string;
}

/**
 * Validate file type against supported formats
 */
export const validateFileType = (
  file: File | string,
  allowedTypes: MediaType[] = ['image', 'video', 'audio'],
  isProfileImage = false,
): ValidationResult => {
  const detectedType = getMediaType(file, isProfileImage);

  if (detectedType === 'unknown') {
    return {
      isValid: false,
      type: 'unknown',
      error:
        'Μη έγκυρος τύπος αρχείου. Παρακαλώ επιλέξτε ένα έγκυρο είδος αρχείου.',
    };
  }

  if (!allowedTypes.includes(detectedType)) {
    const allowedFormats = allowedTypes
      .map((type) => {
        if (type === 'image' && isProfileImage) {
          return SUPPORTED_FORMATS.profileImage.displayFormats.join(', ');
        }
        return SUPPORTED_FORMATS[type].displayFormats.join(', ');
      })
      .join(', ');

    return {
      isValid: false,
      type: detectedType,
      error: `Only ${allowedFormats} files are allowed.`,
    };
  }

  return {
    isValid: true,
    type: detectedType,
  };
};

/**
 * Validate file size
 */
export const validateFileSize = (
  file: File,
  maxSizeMB = 15,
): ValidationResult => {
  if (!file || !(file instanceof File)) {
    return {
      isValid: false,
      type: 'unknown',
      error: 'Invalid file',
    };
  }

  const fileSizeMB = file.size / (1024 * 1024);

  if (fileSizeMB > maxSizeMB) {
    return {
      isValid: false,
      type: getMediaType(file),
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  return {
    isValid: true,
    type: getMediaType(file),
  };
};

/**
 * Comprehensive file validation
 */
export const validateFile = (
  file: File,
  options: {
    allowedTypes?: MediaType[];
    maxSizeMB?: number;
    isProfileImage?: boolean;
  } = {},
): ValidationResult => {
  const {
    allowedTypes = ['image', 'video', 'audio'],
    maxSizeMB = 15,
    isProfileImage = false,
  } = options;

  // Check file type
  const typeValidation = validateFileType(file, allowedTypes, isProfileImage);
  if (!typeValidation.isValid) {
    return typeValidation;
  }

  // Check file size
  const sizeValidation = validateFileSize(file, maxSizeMB);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  return {
    isValid: true,
    type: typeValidation.type,
  };
};

// =============================================
// HTML INPUT UTILITIES
// =============================================

/**
 * Generate accept attribute string for file inputs
 */
export const generateAcceptString = (
  types: MediaType[] = ['image', 'video', 'audio'],
  isProfileImage = false,
): string => {
  const acceptedMimeTypes: string[] = [];

  types.forEach((type) => {
    if (type === 'image' && isProfileImage) {
      acceptedMimeTypes.push(...SUPPORTED_FORMATS.profileImage.mimeTypes);
    } else if (SUPPORTED_FORMATS[type as MediaFormat]) {
      acceptedMimeTypes.push(
        ...SUPPORTED_FORMATS[type as MediaFormat].mimeTypes,
      );
    }
  });

  return acceptedMimeTypes.join(',');
};

// =============================================
// CLOUDINARY UTILITIES
// =============================================

/**
 * Get optimized Cloudinary URL
 */
export const getOptimizedCloudinaryUrl = (
  resource: CloudinaryResource,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'crop';
  } = {},
): string => {
  if (!resource?.secure_url) return '';

  // For Cloudinary URLs, we can add transformations
  if (resource.secure_url.includes('cloudinary.com')) {
    const {
      width,
      height,
      quality = 'auto',
      format = 'auto',
      crop = 'fill',
    } = options;

    const transformations: string[] = [];

    if (width || height) {
      const dimensions = [
        width && `w_${width}`,
        height && `h_${height}`,
        `c_${crop}`,
      ]
        .filter(Boolean)
        .join(',');
      transformations.push(dimensions);
    }

    if (quality) {
      transformations.push(`q_${quality}`);
    }

    if (format) {
      transformations.push(`f_${format}`);
    }

    if (transformations.length > 0) {
      // Insert transformations into Cloudinary URL
      const urlParts = resource.secure_url.split('/upload/');
      if (urlParts.length === 2) {
        return `${urlParts[0]}/upload/${transformations.join(',')}/${urlParts[1]}`;
      }
    }
  }

  return resource.secure_url;
};

/**
 * Get display name from CloudinaryResource
 */
export const getResourceDisplayName = (
  resource: CloudinaryResource,
): string => {
  if (!resource) return '';

  // Try original filename first
  if (resource.original_filename) {
    return resource.original_filename;
  }

  // Fallback to public_id
  if (resource.public_id) {
    return resource.public_id.split('/').pop() || resource.public_id;
  }

  return 'Unnamed file';
};

/**
 * Format file size to human readable
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Convert image data from Prisma Json to CloudinaryResource
 * Handles conversion from database Json field to proper CloudinaryResource type
 */
export const convertImageData = (imageData: any): CloudinaryResource | null => {
  if (!imageData) return null;

  // If it's already a valid CloudinaryResource, return it
  if (isCloudinaryResource(imageData)) {
    return imageData;
  }

  // If it's a string URL, try to convert it
  if (typeof imageData === 'string') {
    const publicId = imageData.split('/').pop()?.split('.')[0] || '';
    return {
      public_id: publicId,
      secure_url: imageData,
      resource_type: 'image' as const,
      format: imageData.split('.').pop(),
      url: imageData,
    };
  }

  // If it's an object with the right properties, convert it
  if (
    typeof imageData === 'object' &&
    imageData.public_id &&
    imageData.secure_url
  ) {
    return {
      public_id: imageData.public_id,
      secure_url: imageData.secure_url,
      resource_type: imageData.resource_type || 'image',
      format: imageData.format,
      url: imageData.url || imageData.secure_url,
      width: imageData.width,
      height: imageData.height,
      bytes: imageData.bytes,
      created_at: imageData.created_at,
      folder: imageData.folder,
      original_filename: imageData.original_filename,
      // Spread any other properties
      ...imageData,
    } as CloudinaryResource;
  }

  return null;
};

/**
 * Get user profile image URL - handles both Google OAuth images and Cloudinary resources
 * @param userImage - Image data from user object (can be string URL or JSON string or object)
 * @param options - Transformation options for Cloudinary images
 * @returns Optimized image URL or null
 */
export const getUserProfileImageUrl = (
  userImage: string | CloudinaryResource | null | undefined,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'crop';
  } = {},
): string | null => {
  if (!userImage) return null;

  // If it's a string URL (new format), return as-is
  if (typeof userImage === 'string') {
    // Check if it looks like a URL
    if (userImage.startsWith('http://') || userImage.startsWith('https://')) {
      return userImage;
    }

    // Legacy fallback: try parsing as JSON (for backward compatibility during migration)
    try {
      const cloudinaryData = JSON.parse(userImage);
      if (
        cloudinaryData &&
        typeof cloudinaryData === 'object' &&
        cloudinaryData.secure_url
      ) {
        return getOptimizedCloudinaryUrl(cloudinaryData, options);
      }
    } catch {
      // If it's not a valid URL or JSON, return null
      return null;
    }
  }

  // If it's already an object (CloudinaryResource), use it directly
  if (typeof userImage === 'object' && userImage.secure_url) {
    return getOptimizedCloudinaryUrl(userImage, options);
  }

  return null;
};

// =============================================
// LEGACY SUPPORT (STRAPI)
// =============================================

/**
 * Legacy Strapi media type detection
 * @deprecated Use CloudinaryResource instead
 */
export const getStrapiMediaType = (mediaItem: any): MediaType => {
  if (!mediaItem?.attributes) return 'unknown';

  const { mime, url } = mediaItem.attributes;

  if (mime) {
    const type = getMediaType(mime);
    if (type !== 'unknown') return type;
  }

  if (url) {
    return getMediaTypeFromUrl(url);
  }

  return 'unknown';
};

/**
 * Legacy Strapi image utility
 * @deprecated Use CloudinaryResource instead
 */
export const getStrapiImageUrl = (
  imageData: any,
  size = 'thumbnail',
): string | null => {
  if (!imageData?.data?.attributes) return null;

  const attributes = imageData.data.attributes;

  // Try to get specific format
  if (attributes.formats?.[size]) {
    return attributes.formats[size].url;
  }

  // Fallback to original
  return attributes.url || null;
};

// =============================================
// MEDIA UPLOAD HELPER UTILITIES
// =============================================

export interface QueuedFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
  isUploaded?: boolean;
  cloudinaryResource?: CloudinaryResource;
  error?: string;
}

export interface PendingCloudinaryResource extends CloudinaryResource {
  _pending: boolean;
}

export type CloudinaryResourceOrPending =
  | CloudinaryResource
  | PendingCloudinaryResource;

export interface FileValidationOptions {
  allowedTypes: MediaType[];
  maxSizeMB: number;
  isProfileImage: boolean;
}

/**
 * Generate unique file ID for duplicate detection
 */
export const generateFileId = (file: File): string => {
  return `${file.name}-${file.size}-${file.lastModified}`;
};

/**
 * Create a pending CloudinaryResource from a queued file
 */
export const createPendingResource = (
  file: QueuedFile,
): PendingCloudinaryResource => {
  return {
    public_id: `pending_${file.id}`,
    secure_url: file.preview,
    original_filename: file.file.name,
    bytes: file.size,
    format: file.type.split('/')[1] || 'unknown',
    resource_type: file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'auto',
    width: 0,
    height: 0,
    created_at: new Date().toISOString(),
    _pending: true,
  } as PendingCloudinaryResource;
};

/**
 * Detect media type from CloudinaryResource or PendingResource
 */
export const detectMediaType = (
  resource: CloudinaryResourceOrPending,
): MediaType => {
  if (!resource) return 'image';

  // For pending resources, use the resource_type we set
  if (isPendingResource(resource)) {
    if (resource.resource_type === 'video') return 'video';
    if (resource.resource_type === 'audio') return 'audio';
    return 'image';
  }

  // Check format first for audio files (handles incorrectly classified files)
  const format = resource.format?.toLowerCase();
  if (format && ['mp3', 'wav', 'ogg', 'mpeg'].includes(format)) {
    return 'audio';
  }

  // For uploaded resources, use resource_type
  if (resource.resource_type === 'audio') return 'audio';
  if (resource.resource_type === 'video') {
    // Double-check for audio files misclassified as video
    if (format && ['mp3', 'wav', 'ogg', 'mpeg'].includes(format)) {
      return 'audio';
    }
    return 'video';
  }
  if (resource.resource_type === 'raw') {
    // Check format for raw resources that might be audio
    if (format && ['mp3', 'wav', 'ogg', 'webm', 'mpeg'].includes(format)) {
      return 'audio';
    }
  }

  return 'image';
};

/**
 * Check if resource is a pending resource
 */
export const isPendingResource = (
  resource: CloudinaryResourceOrPending,
): resource is PendingCloudinaryResource => {
  return (
    (resource as PendingCloudinaryResource)._pending === true ||
    resource.public_id?.startsWith('pending_') === true
  );
};

/**
 * Check if file already exists (duplicate detection)
 */
export const isFileExists = (
  file: File,
  queuedFiles: QueuedFile[],
  resources: CloudinaryResourceOrPending[],
): boolean => {
  const fileId = generateFileId(file);
  const existsInQueue = queuedFiles.some((qf) => qf.id === fileId);
  const existsInResources = resources.some(
    (r) => r.original_filename === file.name && r.bytes === file.size,
  );
  return existsInQueue || existsInResources;
};

/**
 * Process selected files into QueuedFile objects
 */
export const processSelectedFiles = (
  files: FileList,
  existingQueuedFiles: QueuedFile[],
  existingResources: CloudinaryResourceOrPending[],
  options: {
    allowedTypes: MediaType[];
    maxSizeMB: number;
    isProfileImage: boolean;
    maxFiles: number;
    multiple: boolean;
  },
): { newFiles: QueuedFile[]; error: string | null } => {
  const newFiles: QueuedFile[] = [];
  let error: string | null = null;

  Array.from(files).forEach((file) => {
    // Check for duplicates
    if (isFileExists(file, existingQueuedFiles, existingResources)) {
      return; // Skip duplicates silently
    }

    // Validate file
    const validation = validateFile(file, {
      allowedTypes: options.allowedTypes,
      maxSizeMB: options.maxSizeMB,
      isProfileImage: options.isProfileImage,
    });

    if (!validation.isValid) {
      error = validation.error || 'Invalid file';
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);

    const queuedFile: QueuedFile = {
      id: generateFileId(file),
      file,
      preview,
      name: file.name,
      size: file.size,
      type: file.type,
      isUploaded: false,
    };

    newFiles.push(queuedFile);
  });

  // Respect maxFiles limit
  const filesToAdd = options.multiple
    ? newFiles.slice(
        0,
        Math.max(
          0,
          options.maxFiles -
            (existingQueuedFiles.length + existingResources.length),
        ),
      )
    : newFiles.slice(0, 1);

  return { newFiles: filesToAdd, error };
};

/**
 * Clean up preview URLs for removed files
 */
export const cleanupPreviewUrls = (files: QueuedFile[]): void => {
  files.forEach((file) => {
    if (file.preview && file.preview.startsWith('blob:')) {
      URL.revokeObjectURL(file.preview);
    }
  });
};

/**
 * Filter out pending resources from array
 */
export const filterPendingResources = (
  resources: CloudinaryResourceOrPending[],
): CloudinaryResource[] => {
  return resources.filter((r) => !isPendingResource(r)) as CloudinaryResource[];
};

/**
 * Generate upload form data for Cloudinary
 */
export const generateUploadFormData = async (
  file: File,
  options: {
    uploadPreset: string;
    folder: string;
    signed: boolean;
    signatureEndpoint?: string;
  },
): Promise<FormData> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', options.uploadPreset);
  formData.append('folder', options.folder);

  if (options.signed && options.signatureEndpoint) {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
      timestamp,
      upload_preset: options.uploadPreset,
      folder: options.folder,
    };

    const signatureResponse = await fetch(options.signatureEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paramsToSign }),
    });

    if (!signatureResponse.ok) {
      throw new Error('Failed to get upload signature');
    }

    const signatureData = await signatureResponse.json();
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signatureData.signature);

    if (process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY) {
      formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY);
    }
  }

  return formData;
};

/**
 * Upload file to Cloudinary
 */
export const uploadFileToCloudinary = async (
  file: File,
  options: {
    uploadPreset: string;
    folder: string;
    signed: boolean;
    signatureEndpoint?: string;
    resourceType: 'auto' | 'image' | 'video';
  },
): Promise<CloudinaryResource> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }

  // Detect actual media type for proper Cloudinary classification
  const mediaType = getMediaType(file);

  // For audio files, use 'video' endpoint as Cloudinary handles audio as video resource type
  // But we'll fix the resource_type in the response
  let actualResourceType = options.resourceType;
  const isAudioFile = mediaType === 'audio';

  if (isAudioFile && actualResourceType === 'auto') {
    // Use 'video' endpoint for audio files as Cloudinary classifies them as video
    actualResourceType = 'video';
  }

  const formData = await generateUploadFormData(file, options);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${actualResourceType}/upload`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error?.message || `Αποτυχία μεταφόρτωσης για το ${file.name}`,
    );
  }

  const cloudinaryResource = await response.json();

  // Fix resource_type for audio files
  if (isAudioFile && cloudinaryResource.resource_type === 'video') {
    cloudinaryResource.resource_type = 'audio';
  }

  return cloudinaryResource;
};

// =============================================
// SERVICE DISPLAY MEDIA (PORTFOLIO FALLBACK)
// =============================================

/**
 * Merge service media with profile portfolio for display.
 * Priority: service-specific media first, then portfolio items (deduplicated by public_id).
 */
export const getServiceDisplayMedia = (
  serviceMedia: CloudinaryResource[] | null | undefined,
  profilePortfolio: CloudinaryResource[] | null | undefined,
): CloudinaryResource[] => {
  const service =
    serviceMedia && Array.isArray(serviceMedia) ? serviceMedia : [];
  const portfolio =
    profilePortfolio && Array.isArray(profilePortfolio) ? profilePortfolio : [];

  if (service.length === 0 && portfolio.length === 0) return [];
  if (service.length === 0) return portfolio;
  if (portfolio.length === 0) return service;

  // Deduplicate: skip portfolio items already present in service media
  const serviceIds = new Set(service.map((item) => item.public_id));
  const uniquePortfolio = portfolio.filter(
    (item) => !serviceIds.has(item.public_id),
  );

  return [...service, ...uniquePortfolio];
};

// =============================================
// EXPORTS
// =============================================

export default {
  // Core utilities
  getMediaType,
  getCloudinaryMediaType,
  getMediaTypeFromUrl,

  // Validation
  validateFileType,
  validateFileSize,
  validateFile,

  // HTML utilities
  generateAcceptString,

  // Cloudinary utilities
  getOptimizedCloudinaryUrl,
  getResourceDisplayName,
  convertImageData,
  getUserProfileImageUrl,

  // Helper utilities
  formatFileSize,

  // Upload helpers
  generateFileId,
  createPendingResource,
  detectMediaType,
  isPendingResource,
  isFileExists,
  processSelectedFiles,
  cleanupPreviewUrls,
  filterPendingResources,
  generateUploadFormData,
  uploadFileToCloudinary,

  // Legacy support
  getStrapiMediaType,
  getStrapiImageUrl,

  // Service display
  getServiceDisplayMedia,

  // Constants
  SUPPORTED_FORMATS,
};
