'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface FilterState {
  category?: string;
  subcategory?: string;
  subdivision?: string;
  county?: string;
  online?: boolean;
  sortBy?: string;
  page?: number;
  limit?: number;
  type?: 'pros' | 'companies';
}

interface UseArchiveFiltersProps {
  initialFilters?: FilterState;
  basePath: string;
}

export function useArchiveFilters({ initialFilters = {}, basePath }: UseArchiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize filters from URL params or initial values
  const [filters, setFilters] = useState<FilterState>(() => {
    const urlFilters: FilterState = {};

    // Parse URL parameters - support both old and new formats
    const countyParam = searchParams.get('county') || searchParams.get('περιοχή');
    if (countyParam) urlFilters.county = countyParam;

    // Check for standalone 'online' param or 'online=true'
    if (searchParams.has('online')) {
      const onlineValue = searchParams.get('online');
      urlFilters.online = onlineValue === null || onlineValue === '' || onlineValue === 'true';
    }

    if (searchParams.get('sortBy')) urlFilters.sortBy = searchParams.get('sortBy')!;
    if (searchParams.get('page')) urlFilters.page = parseInt(searchParams.get('page')!);
    if (searchParams.get('limit')) urlFilters.limit = parseInt(searchParams.get('limit')!);

    const typeParam = searchParams.get('type');
    if (typeParam === 'pros' || typeParam === 'companies') {
      urlFilters.type = typeParam;
    }

    return { ...initialFilters, ...urlFilters };
  });

  // Update URL when filters change
  const updateURL = useCallback((newFilters: FilterState) => {
    const params = new URLSearchParams();
    let hasOnline = false;

    // Add non-empty filter values to URL (excluding defaults and internal state)
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Skip taxonomy filters as they're now in the route, not query params
        if (key === 'category' || key === 'subcategory' || key === 'subdivision') return;
        // Skip status as it's internal state
        if (key === 'status') return;
        // Skip role and published as they're handled internally by archive type
        if (key === 'role' || key === 'published') return;

        if (key === 'online') {
          // Mark that we need to add online parameter later
          if (value === true) hasOnline = true;
        } else if (key === 'county') {
          // Use English parameter name for better SEO
          params.set('county', value.toString());
        } else if (key === 'page') {
          if (value > 1) params.set(key, value.toString());
        } else if (key === 'limit') {
          // Always include limit in URL for proper state management
          params.set(key, value.toString());
        } else if (key === 'sortBy') {
          if (value !== 'default') params.set(key, value.toString()); // Only set if not default
        } else {
          params.set(key, value.toString());
        }
      }
    });

    let queryString = params.toString();

    // Add online parameter without value if needed
    if (hasOnline) {
      queryString = queryString ? `${queryString}&online` : 'online';
    }

    const newPath = queryString ? `${basePath}?${queryString}` : basePath;

    router.push(newPath, { scroll: false });
  }, [basePath, router]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    // Reset page to 1 when filters change (except when only page changes)
    const filtersWithoutPage = { ...newFilters };
    delete filtersWithoutPage.page;

    const currentFiltersWithoutPage = { ...filters };
    delete currentFiltersWithoutPage.page;

    const shouldResetPage = JSON.stringify(filtersWithoutPage) !== JSON.stringify(currentFiltersWithoutPage);

    const finalFilters = {
      ...newFilters,
      page: shouldResetPage ? 1 : newFilters.page || 1
    };

    setFilters(finalFilters);
    updateURL(finalFilters);
  }, [filters, updateURL]);

  // Handle page change specifically
  const handlePageChange = useCallback((page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    updateURL(newFilters);
  }, [filters, updateURL]);

  // Handle limit change (reset page to 1)
  const handleLimitChange = useCallback((limit: number) => {
    const newFilters = { ...filters, limit, page: 1 };
    setFilters(newFilters);
    updateURL(newFilters);
  }, [filters, updateURL]);

  // Clear all filters (preserve route-based taxonomy filters)
  const clearFilters = useCallback(() => {
    const clearedFilters: FilterState = {
      // Keep route-based taxonomy filters
      category: filters.category,
      subcategory: filters.subcategory,
      subdivision: filters.subdivision,
      // Reset query-param filters
      page: 1,
      sortBy: 'default'
    };
    setFilters(clearedFilters);
    updateURL(clearedFilters);
  }, [filters.category, filters.subcategory, filters.subdivision, updateURL]);

  // Get active filter count (excluding page, default sort, and taxonomy from route)
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    // Don't count taxonomy filters as they come from the route path, not user selection
    // Only count actual user-applied filters from query params
    if (filters.county) count++;
    if (filters.online) count++;
    if (filters.sortBy && filters.sortBy !== 'default') count++;
    if (filters.type) count++;
    return count;
  }, [filters]);

  // Build filter query for API calls
  const buildAPIFilters = useCallback(() => {
    const apiFilters: any = {};

    if (filters.category) apiFilters.category = filters.category;
    if (filters.subcategory) apiFilters.subcategory = filters.subcategory;
    if (filters.subdivision) apiFilters.subdivision = filters.subdivision;
    if (filters.county) apiFilters.county = filters.county;
    if (filters.online !== undefined) apiFilters.online = filters.online;
    if (filters.sortBy) apiFilters.sortBy = filters.sortBy;
    if (filters.page) apiFilters.page = filters.page;
    if (filters.limit) apiFilters.limit = filters.limit;
    if (filters.type) apiFilters.type = filters.type;

    return apiFilters;
  }, [filters]);

  return {
    filters,
    handleFiltersChange,
    handlePageChange,
    handleLimitChange,
    clearFilters,
    getActiveFilterCount: getActiveFilterCount(),
    buildAPIFilters: buildAPIFilters()
  };
}