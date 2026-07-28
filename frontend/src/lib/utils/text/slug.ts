import { greekToLatinMap } from './greek-latin';
import type { DatasetItem } from '@/lib/types/datasets';

// Function to replace Greek letters with Latin equivalents
function greekToLatin(text: string): string {
  // Replace multi-character sequences first
  let result = text;

  // Handle multi-character sequences (diphthongs and double consonants) first
  const sequences = Object.keys(greekToLatinMap).sort(
    (a, b) => b.length - a.length,
  );

  for (const greekSequence of sequences) {
    const latinEquivalent = greekToLatinMap[greekSequence];

    const regex = new RegExp(greekSequence, 'g'); // Global match for the sequence

    result = result.replace(regex, latinEquivalent);
  }
  // Replace any remaining Greek characters that are not part of sequences
  result = result.replace(
    /[α-ωΑ-Ωά-ώ]/g,
    (char) => greekToLatinMap[char] || char,
  );

  return result;
}

// Custom slugify function
export function createSlug(text: string): string {
  // Replace Greek characters with Latin equivalents
  const latinizedText = greekToLatin(text);

  // Remove all non-alphanumeric characters (including hyphens)
  const cleanedText = latinizedText.replace(/[^a-zA-Z0-9\s]/g, '');

  // Replace spaces with hyphens, collapse multiple hyphens, and convert to lowercase
  return cleanedText
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')      // Replace one or more spaces with single hyphen
    .replace(/-+/g, '-');      // Collapse multiple consecutive hyphens to single hyphen
}

// Generate service slug with numeric ID
export function generateServiceSlug(title: string, numericId: string): string {
  const baseSlug = createSlug(title); // "titlos-ypiresias"
  return `${baseSlug}-${numericId}`; // "titlos-ypiresias-622"
}

/**
 * Create auto-slug handler for form fields
 * Updates slug field automatically when label changes
 */
export function createAutoSlugHandler<T extends { label: string; slug: string }>(
  form: {
    setValue: (name: keyof T, value: string, options?: any) => void;
    getValues: (name?: keyof T | (keyof T)[]) => any;
  }
) {
  return (labelValue: string) => {
    form.setValue('label' as keyof T, labelValue);

    // Generate slug if slug field is empty or matches previous auto-generated slug
    const currentSlug = form.getValues('slug' as keyof T);
    const previousLabel = form.getValues('label' as keyof T);

    if (!currentSlug || currentSlug === createSlug(previousLabel)) {
      const newSlug = createSlug(labelValue);
      form.setValue('slug' as keyof T, newSlug, { shouldValidate: true });
    }
  };
}

// =============================================================================
// SLUG UNIQUENESS UTILITIES
// =============================================================================

/**
 * Extract all slugs from a flat or hierarchical dataset
 * Recursively traverses children to collect all slugs at all levels
 * @param items - Array of dataset items (can be hierarchical)
 * @returns Array of all slugs found in the dataset
 */
export function getAllSlugs(items: DatasetItem[]): string[] {
  const slugs: string[] = [];

  function extractSlugs(itemList: DatasetItem[]) {
    for (const item of itemList) {
      if (item.slug) {
        slugs.push(item.slug);
      }
      if (item.children && item.children.length > 0) {
        extractSlugs(item.children);
      }
    }
  }

  extractSlugs(items);
  return slugs;
}

/**
 * Find the next available slug variant by appending numeric suffix
 * Checks: slug, slug-2, slug-3, etc. until an available one is found
 * @param baseSlug - The base slug to start from
 * @param existingSlugs - Array of existing slugs to check against
 * @returns The next available slug variant
 */
export function findNextSlugVariant(
  baseSlug: string,
  existingSlugs: string[]
): string {
  // If base slug doesn't exist, return it
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  // Try incrementing numbers: slug-2, slug-3, etc.
  let counter = 2;
  let candidate = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(candidate)) {
    counter++;
    candidate = `${baseSlug}-${counter}`;
  }

  return candidate;
}

/**
 * Generate a unique slug by checking against existing items
 * Automatically appends numeric suffix (-2, -3, etc.) if conflicts exist
 * @param baseSlug - The desired base slug
 * @param existingItems - Array of existing dataset items to check against
 * @param excludeId - Optional ID to exclude from uniqueness check (for updates)
 * @returns A unique slug that doesn't conflict with existing items
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingItems: DatasetItem[],
  excludeId?: string
): string {
  // Extract all existing slugs
  const allSlugs = getAllSlugs(existingItems);

  // Filter out the excludeId's slug if provided (for update operations)
  const relevantSlugs = excludeId
    ? allSlugs.filter((slug) => {
        // Find the item with this slug and check if it's the excluded item
        const findItem = (items: DatasetItem[]): DatasetItem | undefined => {
          for (const item of items) {
            if (item.slug === slug && item.id === excludeId) {
              return item;
            }
            if (item.children) {
              const found = findItem(item.children);
              if (found) return found;
            }
          }
          return undefined;
        };
        return !findItem(existingItems);
      })
    : allSlugs;

  // Find next available variant
  return findNextSlugVariant(baseSlug, relevantSlugs);
}