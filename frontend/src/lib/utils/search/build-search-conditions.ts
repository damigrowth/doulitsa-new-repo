import {
  getTags,
  findMatchingServiceSubcategoryIds,
  findMatchingSubdivisionIds,
  findMatchingProSubcategoryIds,
} from '@/lib/taxonomies';
import { normalizeTerm } from '@/lib/utils/text/normalize';

/**
 * Helper to create a Prisma `contains` condition.
 */
function contains(value: string) {
  return { contains: value, mode: 'insensitive' as const };
}

/**
 * Find tag IDs whose labels match a search word.
 */
function findMatchingTagIds(word: string): string[] {
  const tags = getTags();
  return tags
    .filter((tag) => {
      const normalizedLabel = normalizeTerm(tag.label);
      return normalizedLabel.toLowerCase().includes(word.toLowerCase());
    })
    .map((tag) => tag.id);
}

/**
 * Build OR conditions for a single search word in service archives.
 *
 * Searches: titleNormalized, descriptionNormalized, profile.coverageNormalized,
 * profile.displayNameNormalized, profile.username, tags, service subcategory,
 * subdivision, and profile pro-subcategory (singular + plural).
 *
 * @param word - Normalized search word
 * @param originalTerm - Original (non-normalized) search term for fallback fields.
 *   If provided, also searches title, description, profile.displayName with accents.
 *   Omit for search-services.ts which doesn't use fallbacks.
 */
export function buildServiceSearchConditions(
  word: string,
  originalTerm?: string,
): any[] {
  const conditions: any[] = [
    // Normalized fields
    { titleNormalized: contains(word) },
    { descriptionNormalized: contains(word) },
    // Profile fields
    { profile: { coverageNormalized: contains(word) } },
    { profile: { displayNameNormalized: contains(word) } },
    { profile: { username: contains(word) } },
  ];

  // Fallback: original (accented) fields for services without normalized data
  if (originalTerm) {
    conditions.push(
      { title: contains(originalTerm) },
      { description: contains(originalTerm) },
      { profile: { displayName: contains(originalTerm) } },
    );
  }

  // Taxonomy lookups
  const matchingTagIds = findMatchingTagIds(word);
  if (matchingTagIds.length > 0) {
    conditions.push({ tags: { hasSome: matchingTagIds } });
  }

  const matchingSubcategoryIds = findMatchingServiceSubcategoryIds(word);
  if (matchingSubcategoryIds.length > 0) {
    conditions.push({ subcategory: { in: matchingSubcategoryIds } });
  }

  const matchingSubdivisionIds = findMatchingSubdivisionIds(word);
  if (matchingSubdivisionIds.length > 0) {
    conditions.push({ subdivision: { in: matchingSubdivisionIds } });
  }

  const matchingProSubcategoryIds = findMatchingProSubcategoryIds(word);
  if (matchingProSubcategoryIds.length > 0) {
    conditions.push({
      profile: { subcategory: { in: matchingProSubcategoryIds } },
    });
  }

  return conditions;
}

/**
 * Build OR conditions for a single search word in profile archives.
 *
 * Searches: displayNameNormalized, taglineNormalized, bioNormalized,
 * username, and profile pro-subcategory (singular + plural).
 *
 * @param word - Normalized search word
 * @param originalTerm - Original (non-normalized) search term for fallback fields.
 *   If provided, also searches displayName, tagline, bio with accents.
 */
export function buildProfileSearchConditions(
  word: string,
  originalTerm?: string,
): any[] {
  const conditions: any[] = [
    // Normalized fields
    { displayNameNormalized: contains(word) },
    { taglineNormalized: contains(word) },
    { bioNormalized: contains(word) },
    // Username (duplicated on Profile model)
    { username: contains(word) },
  ];

  // Fallback: original (accented) fields for profiles without normalized data
  if (originalTerm) {
    conditions.push(
      { displayName: contains(originalTerm) },
      { tagline: contains(originalTerm) },
      { bio: contains(originalTerm) },
    );
  }

  // Taxonomy lookup: pro subcategory (singular + plural)
  const matchingSubcategoryIds = findMatchingProSubcategoryIds(word);
  if (matchingSubcategoryIds.length > 0) {
    conditions.push({ subcategory: { in: matchingSubcategoryIds } });
  }

  return conditions;
}
