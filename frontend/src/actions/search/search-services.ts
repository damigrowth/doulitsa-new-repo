'use server';

import * as servicesApi from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import type { SearchSuggestionsResult } from '@/lib/types/search';

const EMPTY: SearchSuggestionsResult = { taxonomies: [], services: [], hasResults: false };

/**
 * Returns the standard `{ success, data }` envelope the dropdown consumer
 * (`home-search.tsx`) reads — previously this returned the raw payload, so
 * `result.success` was always undefined and the suggestions list stayed empty.
 *
 * The Django suggestions selector
 * (apps/services/selectors/service_reads.py:_suggest_taxonomies /
 * _suggest_services) emits taxonomy + service rows that match
 * {@link SearchSuggestionsResult}'s `TaxonomySuggestion`/`ServicePreview` shapes.
 */
export async function searchServiceSuggestions(
  query: string,
): Promise<{ success: boolean; data: SearchSuggestionsResult }> {
  if (!query || query.length < 2) {
    return { success: true, data: EMPTY };
  }
  try {
    const data = (await servicesApi.searchSuggestions(query)) as SearchSuggestionsResult;
    return { success: true, data: data ?? EMPTY };
  } catch (err) {
    if (err instanceof ApiError) {
      console.error('search.suggestions failed:', err.message);
    }
    return { success: false, data: EMPTY };
  }
}
