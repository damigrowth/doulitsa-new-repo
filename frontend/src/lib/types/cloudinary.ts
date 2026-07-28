/**
 * CLOUDINARY TYPE DEFINITIONS
 * Centralized type definitions for Cloudinary resources and upload handling
 */

/**
 * CloudinaryResource type is provided by the global `AppJson` namespace
 * (src/lib/prisma/json-types.ts) - use that instead of defining here.
 */
export type CloudinaryResource = AppJson.CloudinaryResource;

/**
 * Type guard to check if an object is a CloudinaryResource
 */
export function isCloudinaryResource(
  obj: any,
): obj is AppJson.CloudinaryResource {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.public_id === 'string' &&
    typeof obj.secure_url === 'string' &&
    typeof obj.resource_type === 'string' &&
    ['image', 'video', 'raw', 'audio', 'auto'].includes(obj.resource_type)
  );
}
