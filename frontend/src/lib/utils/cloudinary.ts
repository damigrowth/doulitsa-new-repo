/**
 * CLOUDINARY UTILITIES
 * Helper functions for Cloudinary integration
 */

import { CloudinaryResource } from '@/lib/types/cloudinary';

/**
 * Image size presets for consistent optimization
 */
export const IMAGE_SIZES = {
  avatar: {
    sm: { width: 50, height: 50 },
    md: { width: 100, height: 100 },
    lg: { width: 150, height: 150 },
    xl: { width: 200, height: 200 },
    '2xl': { width: 300, height: 300 },
  },
  thumbnail: { width: 80, height: 80 },
  card: { width: 400, height: 225 }, // 16:9 aspect ratio (legacy)
  cardResponsive: { width: 358, height: 201 }, // Default size for old functions
  cardLarge: { width: 600, height: 338 },
  carousel: { width: 1200, height: 675 },
  full: { width: 1920, height: 1080 },
} as const;

/**
 * Quality presets for different use cases
 */
export const QUALITY_PRESETS = {
  thumbnail: 'auto:eco',
  card: 'auto:low', // More aggressive compression for cards
  avatar: 'auto:good',
  carousel: 'auto:good',
  full: 'auto:best',
} as const;

/**
 * Build Cloudinary URL with transformations
 */
export function buildCloudinaryUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'crop' | 'scale' | 'pad' | 'limit';
    quality?: number | 'auto' | 'auto:eco' | 'auto:good' | 'auto:best' | 'auto:low';
    format?: 'auto' | 'jpg' | 'png' | 'webp' | 'avif';
    gravity?: 'center' | 'face' | 'faces' | 'north' | 'south' | 'east' | 'west' | 'auto';
    folder?: string;
    dpr?: number | 'auto';
  }
) {
  if (!publicId) return '';

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    return '';
  }

  const transformations: string[] = [];

  if (options?.width) transformations.push(`w_${options.width}`);
  if (options?.height) transformations.push(`h_${options.height}`);
  if (options?.crop) transformations.push(`c_${options.crop}`);
  if (options?.quality) transformations.push(`q_${options.quality}`);
  if (options?.format) transformations.push(`f_${options.format}`);
  if (options?.gravity) transformations.push(`g_${options.gravity}`);
  if (options?.dpr) transformations.push(`dpr_${options.dpr}`);

  const transformationString = transformations.length > 0
    ? `/${transformations.join(',')}`
    : '';

  return `https://res.cloudinary.com/${cloudName}/image/upload${transformationString}/${publicId}`;
}

/**
 * Extract public ID from Cloudinary URL (supports images and videos)
 */
export function extractPublicId(cloudinaryUrl: string): string {
  if (!cloudinaryUrl) return '';

  // Match both image and video URLs, preserving version and folder structure
  // Supports formats like:
  // - /image/upload/folder/file.jpg
  // - /image/upload/v123456/folder/file.jpg
  // - /image/upload/w_150,h_150,c_fill/v123456/folder/file.jpg (with transformations)
  // - /image/upload/w_150,h_150,c_fill/folder/file.jpg (transformations, no version)

  // Match everything after /upload/ including version, folders, and filename
  const match = cloudinaryUrl.match(/\/(image|video)\/upload\/(.+)$/i);

  if (match && match[2]) {
    let publicId = match[2];

    // Remove version prefix if present (e.g., v1234567/)
    publicId = publicId.replace(/^v\d+\//, '');

    // Remove file extension if present (e.g., .jpg, .png, .webp)
    publicId = publicId.replace(/\.[a-z]+$/i, '');

    return publicId;
  }

  return '';
}

/**
 * Generate responsive image sizes for different breakpoints
 */
export function generateResponsiveSizes(publicId: string, sizes: { width: number; breakpoint?: string }[]) {
  return sizes.map(({ width, breakpoint }) => ({
    url: buildCloudinaryUrl(publicId, {
      width,
      quality: 'auto',
      format: 'webp'
    }),
    width,
    breakpoint
  }));
}

/**
 * Get optimized avatar URL with size preset
 * @param publicId - Cloudinary public ID
 * @param sizePreset - Avatar size preset (sm: 50px, md: 100px, lg: 150px, xl: 200px, 2xl: 300px)
 */
export function getAvatarUrl(
  publicId: string,
  sizePreset: keyof typeof IMAGE_SIZES.avatar = 'lg'
) {
  const size = IMAGE_SIZES.avatar[sizePreset];
  return buildCloudinaryUrl(publicId, {
    width: size.width,
    height: size.height,
    crop: 'fill',
    gravity: 'face',
    quality: QUALITY_PRESETS.avatar,
    format: 'webp',
    dpr: 'auto',
  });
}

/**
 * Get optimized thumbnail URL
 */
export function getThumbnailUrl(publicId: string, width: number = 80, height: number = 80) {
  return buildCloudinaryUrl(publicId, {
    width,
    height,
    crop: 'fill',
    quality: QUALITY_PRESETS.thumbnail,
    format: 'webp',
    dpr: 'auto',
  });
}

/**
 * Get optimized card image URL
 */
export function getCardImageUrl(publicId: string, large: boolean = false) {
  const size = large ? IMAGE_SIZES.cardLarge : IMAGE_SIZES.cardResponsive;
  const quality = large ? QUALITY_PRESETS.carousel : QUALITY_PRESETS.card;
  return buildCloudinaryUrl(publicId, {
    width: size.width,
    height: size.height,
    crop: 'fill',
    quality,
    format: 'webp',
    dpr: 'auto',
  });
}

/**
 * Get optimized carousel image URL
 */
export function getCarouselImageUrl(publicId: string) {
  return buildCloudinaryUrl(publicId, {
    width: IMAGE_SIZES.carousel.width,
    height: IMAGE_SIZES.carousel.height,
    crop: 'limit', // Don't upscale
    quality: QUALITY_PRESETS.carousel,
    format: 'webp',
    dpr: 'auto',
  });
}

/**
 * Get video thumbnail URL (poster image from first frame)
 * @param publicId - Cloudinary video public_id (including version/folder if present)
 * @param width - Thumbnail width in pixels
 * @param height - Thumbnail height in pixels
 * @returns Optimized video thumbnail URL
 */
export function getVideoThumbnailUrl(
  publicId: string,
  width: number = 400,
  height: number = 225
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !publicId) return '';

  // Video thumbnail transformations: extract first frame as JPG
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    'c_fill',
    'f_jpg',       // Format transformation specifies JPG output
    'q_auto:good',
    'so_0',        // Start offset at 0 seconds (first frame)
  ].join(',');

  // Note: No .jpg extension needed - f_jpg transformation handles format conversion
  // Public ID may include version and folders (e.g., v1234567/Static/video-name)
  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformations}/${publicId}`;
}

/**
 * Get optimized image URL from CloudinaryResource or URL string
 * @param image - CloudinaryResource object or URL string
 * @param preset - Image preset (avatar, thumbnail, card, etc.)
 * @param avatarSize - Avatar size preset (only used when preset='avatar')
 */
export function getOptimizedImageUrl(
  image: CloudinaryResource | string | null,
  preset: 'avatar' | 'thumbnail' | 'card' | 'cardResponsive' | 'cardLarge' | 'carousel' | 'full' = 'card',
  avatarSize?: keyof typeof IMAGE_SIZES.avatar
): string | null {
  if (!image) return null;

  // Extract public_id or URL
  const publicId = typeof image === 'object' && image.public_id
    ? image.public_id
    : typeof image === 'string' && image.includes('res.cloudinary.com')
    ? extractPublicId(image)
    : null;

  if (!publicId) {
    // Return original URL if it's a string (e.g., OAuth avatar)
    return typeof image === 'string' ? image : null;
  }

  // Apply preset transformations
  switch (preset) {
    case 'avatar':
      return getAvatarUrl(publicId, avatarSize || 'lg');
    case 'thumbnail':
      return getThumbnailUrl(publicId);
    case 'card':
      return getCardImageUrl(publicId, false);
    case 'cardResponsive':
      return getCardImageUrl(publicId, false);
    case 'cardLarge':
      return getCardImageUrl(publicId, true);
    case 'carousel':
      return getCarouselImageUrl(publicId);
    case 'full':
      const size = IMAGE_SIZES.full;
      return buildCloudinaryUrl(publicId, {
        width: size.width,
        height: size.height,
        crop: 'limit',
        quality: QUALITY_PRESETS.full,
        format: 'webp',
        dpr: 'auto',
      });
    default:
      return getCardImageUrl(publicId);
  }
}

/**
 * Get responsive card image URLs with srcset for optimal loading
 * Returns both a default src and a srcSet string for responsive images
 */
export function getResponsiveCardImageUrl(publicId: string) {
  if (!publicId) return { src: '', srcSet: '' };

  // Generate multiple sizes for srcset (aspect ratio 16:9 approximately)
  const sizes = [
    { width: 295, height: 165 }, // Mobile (PageSpeed optimal)
    { width: 358, height: 201 }, // Tablet/Default
    { width: 590, height: 330 }, // 2x Mobile
    { width: 716, height: 401 }, // 2x Tablet
  ];

  const srcSet = sizes.map(size => {
    // Use numeric quality for more aggressive and predictable compression
    const quality = size.width <= 358 ? 45 : 65;
    const url = buildCloudinaryUrl(publicId, {
      width: size.width,
      height: size.height,
      crop: 'fill',
      quality,
      format: 'webp',
      dpr: 'auto',
    });
    return `${url} ${size.width}w`;
  }).join(', ');

  // Default src for fallback (use tablet size as default)
  const defaultSrc = buildCloudinaryUrl(publicId, {
    width: 358,
    height: 201,
    crop: 'fill',
    quality: 45, // Use numeric quality for consistent compression
    format: 'webp',
    dpr: 'auto',
  });

  return { src: defaultSrc, srcSet };
}

/**
 * Get responsive gallery image URLs with srcset for optimal loading
 * Returns both a default src and a srcSet string for responsive images
 */
export function getResponsiveGalleryImageUrl(url: string) {
  const publicId = extractPublicId(url);
  if (!publicId) return { src: url, srcSet: '' };

  // Generate multiple sizes for srcset (maintaining aspect ratio)
  const sizes = [
    { width: 234 }, // Mobile (PageSpeed optimal)
    { width: 285 }, // Default/Tablet
    { width: 468 }, // 2x Mobile
    { width: 570 }, // 2x Default
  ];

  const srcSet = sizes.map(size => {
    // Use more aggressive compression for mobile sizes
    const quality = size.width <= 234 ? 'auto:low' : 80;
    const optimizedUrl = buildCloudinaryUrl(publicId, {
      width: size.width,
      quality,
      format: 'webp',
    });
    return `${optimizedUrl} ${size.width}w`;
  }).join(', ');

  // Default for fallback
  const defaultSrc = buildCloudinaryUrl(publicId, {
    width: 285,
    quality: 80,
    format: 'webp',
  });

  return { src: defaultSrc, srcSet };
}

/**
 * Generate responsive srcSet for Next.js Image component
 */
export function getResponsiveSrcSet(
  publicId: string,
  sizes: number[] = [640, 750, 828, 1080, 1200, 1920]
): string {
  return sizes
    .map(width => {
      const url = buildCloudinaryUrl(publicId, {
        width,
        quality: 'auto:good',
        format: 'auto',
        crop: 'limit',
      });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Validate if URL is a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return /https:\/\/res\.cloudinary\.com\/.+\/image\/upload/.test(url);
}

/**
 * Upload widget configuration for client-side uploads
 */
export function getUploadWidgetConfig(options?: {
  folder?: string;
  tags?: string[];
  maxFileSize?: number;
  allowedFormats?: string[];
  maxFiles?: number;
}) {
  return {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    folder: options?.folder || 'uploads',
    tags: options?.tags || [],
    maxFileSize: options?.maxFileSize || 10000000, // 10MB
    allowedFormats: options?.allowedFormats || ['jpg', 'jpeg', 'png', 'webp'],
    maxFiles: options?.maxFiles || 1,
    sources: ['local', 'url', 'camera'],
    multiple: (options?.maxFiles || 1) > 1,
    resourceType: 'auto'
  };
}

/**
 * PENDING RESOURCE UTILITIES
 * Helper functions for handling pending (not yet uploaded) resources
 */

/**
 * Check if a Cloudinary resource is pending (not yet uploaded)
 */
export function isPendingResource(resource: CloudinaryResource): boolean {
  return (
    ('_pending' in resource && (resource as any)._pending) ||
    resource.public_id?.startsWith('pending_') ||
    false
  );
}

/**
 * Filter out pending resources from a single resource or null
 */
export function filterPendingResource(
  resource: CloudinaryResource | null
): CloudinaryResource | null {
  if (!resource) return null;
  return isPendingResource(resource) ? null : resource;
}

/**
 * Filter out pending resources from an array of resources
 */
export function filterPendingResources(
  resources: CloudinaryResource[]
): CloudinaryResource[] {
  return resources.filter(resource => !isPendingResource(resource));
}

/**
 * Sanitize Cloudinary resources for database storage
 * Removes pending resources and the _pending flag from uploaded resources
 * Now supports both CloudinaryResource objects and string URLs
 */
export function sanitizeCloudinaryResource(
  resource: CloudinaryResource | string | null
): CloudinaryResource | string | null {
  if (!resource) {
    return null;
  }
  
  // If it's a string URL, return as-is (already clean)
  if (typeof resource === 'string') {
    return resource;
  }
  
  const isPending = isPendingResource(resource);
  
  if (isPending) {
    return null;
  }
  
  // Remove _pending flag if it exists
  const { _pending, ...sanitized } = resource as any;
  return sanitized as CloudinaryResource;
}

/**
 * Sanitize array of Cloudinary resources for database storage
 * Removes pending resources and the _pending flag from uploaded resources
 */
export function sanitizeCloudinaryResources(
  resources: CloudinaryResource[]
): CloudinaryResource[] {
  return filterPendingResources(resources)
    .filter(r => !r.secure_url?.startsWith('blob:'))
    .map(resource => {
      // Remove _pending flag if it exists
      const { _pending, ...sanitized } = resource as any;
      return sanitized as CloudinaryResource;
    });
}

/**
 * IMAGE DATABASE UTILITIES
 * Helper functions for handling images in database storage
 */

/**
 * Process image data for database storage
 * Converts CloudinaryResource objects to URL strings for consistency
 * Supports both migrated users (string URLs) and new uploads (CloudinaryResource objects)
 * CRITICAL: Rejects blob URLs and validates HTTPS URLs to prevent temporary URLs from being saved
 */
export function processImageForDatabase(imageData: any): string | null {
  if (!imageData) return null;

  // If it's already a string URL, validate it
  if (typeof imageData === 'string') {
    // Reject blob URLs (client-side temporary URLs that should never be persisted)
    if (imageData.startsWith('blob:')) {
      return null;
    }

    // Validate it's a proper HTTPS URL (Cloudinary or OAuth provider)
    if (!imageData.startsWith('https://')) {
      return null;
    }

    return imageData;
  }

  // If it's a CloudinaryResource object, extract and validate the secure_url
  if (typeof imageData === 'object' && imageData.secure_url) {
    const url = imageData.secure_url;

    // Reject blob URLs from CloudinaryResource objects
    if (url.startsWith('blob:')) {
      return null;
    }

    // Validate HTTPS URL
    if (!url.startsWith('https://')) {
      return null;
    }

    return url;
  }

  return null;
}

/**
 * Get image URL from either CloudinaryResource object or string URL
 * Handles both formats for backward compatibility in components
 */
export function getImageUrl(image: CloudinaryResource | string | null): string | null {
  if (!image) return null;

  // If it's a string URL, return as-is
  if (typeof image === 'string') {
    return image;
  }

  // If it's a CloudinaryResource object, return secure_url
  if (typeof image === 'object' && image.secure_url) {
    return image.secure_url;
  }

  return null;
}

/**
 * Check if an image value is a string URL
 */
export function isImageUrl(image: any): image is string {
  return typeof image === 'string' && image.length > 0;
}

/**
 * Check if an image value is a CloudinaryResource object
 */
export function isCloudinaryResource(image: any): image is CloudinaryResource {
  return typeof image === 'object' && image !== null && 'secure_url' in image;
}

/**
 * Get image display properties for components
 * Returns consistent format regardless of input type
 */
export function getImageDisplayProps(image: CloudinaryResource | string | null): {
  url: string | null;
  alt?: string;
  width?: number;
  height?: number;
} {
  if (!image) {
    return { url: null };
  }

  if (typeof image === 'string') {
    return { url: image };
  }

  if (typeof image === 'object' && image.secure_url) {
    return {
      url: image.secure_url,
      alt: image.metadata?.alternative_text || image.original_filename,
      width: image.width,
      height: image.height,
    };
  }

  return { url: null };
}