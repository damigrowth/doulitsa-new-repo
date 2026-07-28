import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useDebouncedSearch } from '../archives/use-debounced-value';

/**
 * Custom hook for admin filter management with debounced search
 *
 * Provides consistent filter behavior across all admin sections:
 * - Debounced search input (500ms delay for expensive DB queries)
 * - URL parameter management
 * - Filter change handling with pagination reset
 *
 * @param basePath - Admin section base path (e.g., '/admin/services')
 * @returns Object with search state and filter handlers
 *
 * @example
 * ```tsx
 * const { searchValue, setSearchValue, handleFilterChange } = useAdminFilters('/admin/services');
 *
 * // Use in search input
 * <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} />
 *
 * // Use in filter selects
 * <Select onValueChange={(value) => handleFilterChange('status', value)} />
 * ```
 */
export function useAdminFilters(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Track if this is the initial mount to avoid resetting page on URL navigation
  const isInitialMount = useRef(true);
  const previousSearchValue = useRef<string | null>(null);

  // Use debounced search with 500ms delay (longer for expensive DB queries)
  const { searchValue, debouncedSearchValue, setSearchValue } = useDebouncedSearch(
    searchParams.get('search') || '',
    500
  );

  // Update URL when debounced value changes (but not on initial mount)
  useEffect(() => {
    // Skip the initial mount to preserve URL page parameter
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousSearchValue.current = debouncedSearchValue;
      return;
    }

    // Only update if the search value actually changed
    if (previousSearchValue.current === debouncedSearchValue) {
      return;
    }

    previousSearchValue.current = debouncedSearchValue;

    const params = new URLSearchParams(searchParams.toString());

    if (debouncedSearchValue) {
      params.set('search', debouncedSearchValue);
    } else {
      params.delete('search');
    }

    // Reset to page 1 when search changes
    params.set('page', '1');

    router.push(`${basePath}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchValue, router]);

  /**
   * Handle filter dropdown changes
   * Updates URL parameters and resets pagination
   */
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Reset to page 1 when filters change
    params.set('page', '1');

    router.push(`${basePath}?${params.toString()}`);
  };

  return {
    searchValue,
    setSearchValue,
    handleFilterChange,
    searchParams,
  };
}
