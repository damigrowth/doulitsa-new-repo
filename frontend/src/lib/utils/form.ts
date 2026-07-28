/**
 * FORM UTILITIES
 * Helper functions for form data handling and processing
 */

import type { SocialMediaInput } from '@/lib/validations/profile';
import type { ProfileVisibility } from '@/lib/types/auth';

/**
 * Plain JSON value type. Replaces the former `JsonValue` import from
 * `@prisma/client/runtime/library` now that Prisma is gone — Django serializes
 * these JSON fields and they arrive as arbitrary JSON over the wire.
 */
type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

/**
 * Extract string value from FormData with optional default
 * Handles null/undefined values and provides type safety
 */
export function getFormString(formData: FormData, key: string, defaultValue = ''): string {
  return (formData.get(key) as string) || defaultValue;
}

/**
 * Extract number value from FormData with optional default
 * Converts string to number and handles invalid values
 */
export function getFormNumber(formData: FormData, key: string, defaultValue = 0): number {
  const value = formData.get(key) as string;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Extract integer value from FormData with optional default
 * Converts string to integer and handles invalid values
 */
export function getFormInt(formData: FormData, key: string, defaultValue = 0): number {
  const value = formData.get(key) as string;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Extract boolean value from FormData
 * Handles various truthy representations
 */
export function getFormBoolean(formData: FormData, key: string, defaultValue = false): boolean {
  const value = formData.get(key) as string;
  if (!value) return defaultValue;
  
  return ['true', '1', 'on', 'yes'].includes(value.toLowerCase());
}

/**
 * Extract and parse JSON value from FormData
 * Safely handles JSON parsing with fallback
 */
export function getFormJSON<T>(formData: FormData, key: string, defaultValue: T): T {
  const value = formData.get(key) as string;
  if (!value) return defaultValue;
  
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

/**
 * Extract array value from FormData (JSON or comma-separated)
 * Handles both JSON arrays and comma-separated strings
 */
export function getFormArray(formData: FormData, key: string, defaultValue: string[] = []): string[] {
  const value = formData.get(key) as string;
  if (!value) return defaultValue;
  
  // Try JSON parsing first
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch {
    // Fallback to comma-separated string
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
}

/**
 * Extract multiple values for the same key from FormData
 * Useful for checkboxes or multi-select inputs
 */
export function getFormMultiple(formData: FormData, key: string): string[] {
  return formData.getAll(key) as string[];
}

/**
 * Type-safe FormData extraction with validation
 * Extracts all values at once with proper typing
 */
export function extractFormData<T extends Record<string, any>>(
  formData: FormData,
  schema: {
    [K in keyof T]: {
      type: 'string' | 'number' | 'int' | 'boolean' | 'json' | 'array';
      defaultValue?: T[K];
      required?: boolean;
    }
  }
): { data: T; errors: Record<string, string> } {
  const data = {} as T;
  const errors: Record<string, string> = {};

  for (const [key, config] of Object.entries(schema)) {
    try {
      let value: any;
      
      switch (config.type) {
        case 'string':
          value = getFormString(formData, key, config.defaultValue || '');
          break;
        case 'number':
          value = getFormNumber(formData, key, config.defaultValue || 0);
          break;
        case 'int':
          value = getFormInt(formData, key, config.defaultValue || 0);
          break;
        case 'boolean':
          value = getFormBoolean(formData, key, config.defaultValue || false);
          break;
        case 'json':
          value = getFormJSON(formData, key, config.defaultValue);
          break;
        case 'array':
          value = getFormArray(formData, key, config.defaultValue || []);
          break;
        default:
          value = getFormString(formData, key, config.defaultValue || '');
      }

      // Check required fields
      if (config.required && (!value || (Array.isArray(value) && value.length === 0))) {
        errors[key] = `${key} is required`;
      } else {
        data[key as keyof T] = value;
      }
    } catch (error) {
      errors[key] = `Invalid ${key} format`;
    }
  }

  return { data, errors };
}

/**
 * Parse JSON string or return object/default value
 * Handles database JSON strings that may come as strings or objects
 */
export function parseJSONValue<T>(value: string | T | null | undefined, defaultValue: T): T {
  // If value is null or undefined, return default
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  // If value is already an object (not a string), return it
  if (typeof value !== 'string') {
    return value as T;
  }
  
  // If value is a string, try to parse it as JSON
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Error parsing JSON value:', error, { value });
    return defaultValue;
  }
}

/**
 * Populate FormData from React Hook Form values
 * Automatically handles string fields, numeric fields, and JSON serialization
 */
export function populateFormData<T extends Record<string, any>>(
  formData: FormData,
  values: T,
  config: {
    stringFields?: (keyof T)[];
    numericFields?: (keyof T)[];
    jsonFields?: (keyof T)[];
    booleanFields?: (keyof T)[];
    skipEmpty?: boolean;
  } = {}
): void {
  const { stringFields = [], numericFields = [], jsonFields = [], booleanFields = [], skipEmpty = true } = config;

  // Add string fields
  stringFields.forEach(field => {
    const value = values[field];
    if (!skipEmpty || (value !== null && value !== undefined && value !== '')) {
      formData.set(field as string, String(value));
    }
  });

  // Add numeric fields
  numericFields.forEach(field => {
    const value = values[field];
    if (!skipEmpty || (value !== null && value !== undefined)) {
      formData.set(field as string, String(value));
    }
  });

  // Add JSON fields
  jsonFields.forEach(field => {
    const value = values[field];
    if (!skipEmpty || (value !== null && value !== undefined)) {
      formData.set(field as string, JSON.stringify(value));
    }
  });

  // Add boolean fields
  booleanFields.forEach(field => {
    const value = values[field];
    if (!skipEmpty || (value !== null && value !== undefined)) {
      formData.set(field as string, value ? 'true' : 'false');
    }
  });
}

// =============================================
// TYPE-SAFE PROFILE DATA PARSERS
// =============================================

/**
 * Parse visibility JSON with proper type safety
 */
export function parseVisibilityJSON(value: JsonValue | null | undefined): ProfileVisibility {
  const defaultValue: ProfileVisibility = {
    email: true,
    phone: true,
    address: true,
  };
  
  if (!value) {
    return defaultValue;
  }
  
  // Handle JSON string from database
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          email: typeof parsed.email === 'boolean' ? parsed.email : defaultValue.email,
          phone: typeof parsed.phone === 'boolean' ? parsed.phone : defaultValue.phone,
          address: typeof parsed.address === 'boolean' ? parsed.address : defaultValue.address,
        };
      }
    } catch (e) {
      console.warn('Failed to parse visibility JSON:', e);
    }
    return defaultValue;
  }
  
  // Handle non-string primitives
  if (typeof value === 'number' || typeof value === 'boolean') {
    return defaultValue;
  }
  
  // value is JsonObject at this point
  const obj = value as Record<string, unknown>;
  
  return {
    email: typeof obj.email === 'boolean' ? obj.email : defaultValue.email,
    phone: typeof obj.phone === 'boolean' ? obj.phone : defaultValue.phone,
    address: typeof obj.address === 'boolean' ? obj.address : defaultValue.address,
  };
}

/**
 * Parse socials JSON with proper type safety for form input
 * Now returns simple strings to match new schema format
 */
export function parseSocialsJSON(value: JsonValue | null | undefined): SocialMediaInput {
  const defaultSocials = {
    facebook: '',
    instagram: '',
    linkedin: '',
    x: '',
    youtube: '',
    github: '',
    behance: '',
    dribbble: '',
  };
  
  if (!value) {
    return defaultSocials;
  }
  
  // Handle JSON string from database
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          facebook: parseSocialPlatformString(parsed.facebook),
          instagram: parseSocialPlatformString(parsed.instagram),
          linkedin: parseSocialPlatformString(parsed.linkedin),
          x: parseSocialPlatformString(parsed.x || parsed.twitter), // Handle twitter -> x migration
          youtube: parseSocialPlatformString(parsed.youtube),
          github: parseSocialPlatformString(parsed.github),
          behance: parseSocialPlatformString(parsed.behance),
          dribbble: parseSocialPlatformString(parsed.dribbble),
        };
      }
    } catch (e) {
      console.warn('Failed to parse socials JSON:', e);
    }
    return defaultSocials;
  }
  
  // Handle non-string primitives
  if (typeof value === 'number' || typeof value === 'boolean') {
    return defaultSocials;
  }
  
  // value is JsonObject at this point
  const obj = value as Record<string, unknown>;
  
  return {
    facebook: parseSocialPlatformString(obj.facebook),
    instagram: parseSocialPlatformString(obj.instagram),
    linkedin: parseSocialPlatformString(obj.linkedin),
    x: parseSocialPlatformString(obj.x || obj.twitter), // Handle twitter -> x migration
    youtube: parseSocialPlatformString(obj.youtube),
    github: parseSocialPlatformString(obj.github),
    behance: parseSocialPlatformString(obj.behance),
    dribbble: parseSocialPlatformString(obj.dribbble),
  };
}

/**
 * Helper function to parse individual social platform data as string
 * Handles both old object format and new string format
 */
function parseSocialPlatformString(value: unknown): string {
  // Handle null/undefined
  if (!value) {
    return '';
  }
  
  // Handle new string format (direct URL)
  if (typeof value === 'string') {
    return value;
  }
  
  // Handle old object format
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return typeof obj.url === 'string' ? obj.url : '';
  }
  
  return '';
}

/**
 * Helper function to parse individual social platform data
 * Always returns an object with url property for form compatibility (legacy)
 * Now handles both old object format and new string format
 */
function parseSocialPlatform(value: unknown, defaultValue: { url: string }): { url: string } {
  // Handle null/undefined
  if (!value) {
    return defaultValue;
  }
  
  // Handle new string format (direct URL)
  if (typeof value === 'string') {
    return { url: value };
  }
  
  // Handle old object format
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return {
      url: typeof obj.url === 'string' ? obj.url : defaultValue.url,
    };
  }
  
  return defaultValue;
}

/**
 * Parse portfolio JSON array with proper type safety
 */
export function parsePortfolioJSON(value: JsonValue | null | undefined): any[] {
  if (!value) {
    return [];
  }
  
  if (Array.isArray(value)) {
    return value;
  }
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  
  return [];
}

/**
 * Parse coverage JSON with proper type safety
 * Now uses ID-based structure for locations
 */
export function parseCoverageJSON(value: JsonValue | null | undefined): {
  online: boolean;
  onbase: boolean;
  onsite: boolean;
  address?: string;
  area?: string | null;
  county?: string | null;
  zipcode?: string | null;
  counties?: string[];
  areas?: string[];
} {
  const defaultValue = {
    online: false,
    onbase: false,
    onsite: false,
    address: '',
    area: null,
    county: null,
    zipcode: null,
    counties: [],
    areas: [],
  };
  
  if (!value) {
    return defaultValue;
  }
  
  // Handle JSON string from database
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          online: typeof parsed.online === 'boolean' ? parsed.online : defaultValue.online,
          onbase: typeof parsed.onbase === 'boolean' ? parsed.onbase : defaultValue.onbase,
          onsite: typeof parsed.onsite === 'boolean' ? parsed.onsite : defaultValue.onsite,
          address: typeof parsed.address === 'string' ? parsed.address : defaultValue.address,
          // Handle both old object format and new ID format for backward compatibility
          area: parseLocationId(parsed.area) || defaultValue.area,
          county: parseLocationId(parsed.county) || defaultValue.county,
          zipcode: parseLocationId(parsed.zipcode) || defaultValue.zipcode,
          // Handle both old array of objects and new array of IDs
          counties: parseLocationIds(parsed.counties) || defaultValue.counties,
          areas: parseLocationIds(parsed.areas) || defaultValue.areas,
        };
      }
    } catch (e) {
      console.warn('Failed to parse coverage JSON:', e);
    }
    return defaultValue;
  }
  
  // Handle non-string primitives
  if (typeof value === 'number' || typeof value === 'boolean') {
    return defaultValue;
  }
  
  // value is JsonObject at this point
  const obj = value as Record<string, unknown>;
  
  return {
    online: typeof obj.online === 'boolean' ? obj.online : defaultValue.online,
    onbase: typeof obj.onbase === 'boolean' ? obj.onbase : defaultValue.onbase,
    onsite: typeof obj.onsite === 'boolean' ? obj.onsite : defaultValue.onsite,
    address: typeof obj.address === 'string' ? obj.address : defaultValue.address,
    // Handle both old object format and new ID format for backward compatibility
    area: parseLocationId(obj.area) || defaultValue.area,
    county: parseLocationId(obj.county) || defaultValue.county,
    zipcode: parseLocationId(obj.zipcode) || defaultValue.zipcode,
    // Handle both old array of objects and new array of IDs
    counties: parseLocationIds(obj.counties) || defaultValue.counties,
    areas: parseLocationIds(obj.areas) || defaultValue.areas,
  };
}

/**
 * Helper to parse a location field that can be either an object with id or a string ID
 * For backward compatibility with existing data
 */
function parseLocationId(value: unknown): string | null {
  if (!value) return null;
  
  // New format: direct string ID
  if (typeof value === 'string') {
    return value;
  }
  
  // Old format: object with id property
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return typeof obj.id === 'string' ? obj.id : null;
  }
  
  return null;
}

/**
 * Helper to parse location arrays that can be either arrays of objects or arrays of string IDs
 * For backward compatibility with existing data
 */
function parseLocationIds(value: unknown): string[] {
  if (!value || !Array.isArray(value)) return [];
  
  return value.map(item => {
    // New format: direct string ID
    if (typeof item === 'string') {
      // Filter out zipcode values that are numeric strings (like '30015')
      // These should not be in areas/counties arrays
      if (/^\d{5}$/.test(item)) {
        return null;
      }
      return item;
    }
    
    // Old format: object with id property
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      return typeof obj.id === 'string' ? obj.id : null;
    }
    
    return null;
  }).filter((id): id is string => id !== null);
}