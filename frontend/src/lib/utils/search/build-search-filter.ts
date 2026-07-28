import { normalizeTerm } from '@/lib/utils/text/normalize';

type ConditionBuilder = (word: string, originalTerm?: string) => any[];

interface SearchFilter {
  OR?: any[];
  AND?: any[];
}

/**
 * Build a Prisma-compatible search filter from a search string.
 *
 * - Single word: returns `{ OR: conditions }` — match any field
 * - Multi-word: returns `{ AND: [{ OR: conditions }, ...] }` — each word must match somewhere
 *
 * @param search - Raw search string from user input
 * @param buildConditions - Function that builds OR conditions for a single word.
 *   Receives (word, originalTerm?) where originalTerm is the raw trimmed input
 *   (only passed for single-word searches to enable fallback on accented fields).
 * @returns Search filter object, or null if search is too short
 */
export function buildSearchFilter(
  search: string,
  buildConditions: ConditionBuilder,
): SearchFilter | null {
  const searchTerm = search.trim();
  if (searchTerm.length < 2) return null;

  const normalizedSearch = normalizeTerm(searchTerm);
  const searchWords = normalizedSearch
    .split(/\s+/)
    .filter((word) => word.length >= 2);

  if (searchWords.length === 0) return null;

  if (searchWords.length === 1) {
    // Single word: pass originalTerm for fallback fields
    const conditions = buildConditions(searchWords[0], searchTerm);
    return { OR: conditions };
  }

  // Multi-word: each word must match in at least one field (AND of ORs)
  // No originalTerm fallback for multi-word (each word is already normalized)
  const wordFilters = searchWords.map((word) => ({
    OR: buildConditions(word),
  }));
  return { AND: wordFilters };
}

/**
 * Merge a search filter into an existing Prisma whereClause.
 *
 * Handles the case where the whereClause already has an OR clause
 * (e.g., from location filters) by combining with AND.
 */
export function mergeSearchFilter(
  whereClause: any,
  searchFilter: SearchFilter,
): void {
  if (searchFilter.AND) {
    // Multi-word: add AND conditions
    whereClause.AND = [...(whereClause.AND || []), ...searchFilter.AND];
  } else if (searchFilter.OR) {
    // Single word: merge OR with existing clauses
    if (whereClause.OR && whereClause.OR.length > 0) {
      const existingOR = whereClause.OR;
      whereClause.AND = whereClause.AND || [];
      whereClause.AND.push({ OR: searchFilter.OR });
      whereClause.OR = existingOR;
    } else {
      whereClause.OR = searchFilter.OR;
    }
  }
}
