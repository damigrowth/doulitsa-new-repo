import { useState, useEffect } from 'react';

/**
 * Hook that debounces a value change
 * Useful for search inputs and filter changes
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debounced search input
 * Provides both immediate and debounced values
 *
 * @param initialValue - Initial search value
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Object with current value, debounced value, and setter
 */
export function useDebouncedSearch(initialValue: string = '', delay: number = 300) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const debouncedSearchValue = useDebouncedValue(searchValue, delay);

  return {
    searchValue,
    debouncedSearchValue,
    setSearchValue,
    isSearching: searchValue !== debouncedSearchValue,
  };
}