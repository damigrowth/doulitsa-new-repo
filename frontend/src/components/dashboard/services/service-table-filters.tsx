'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UserServiceFilterOptions } from '@/lib/types/services';

interface ServiceTableFiltersProps {
  currentFilters: UserServiceFilterOptions;
  className?: string;
  // Top-level service categories (slug + label), resolved DB-side and passed
  // in by the server parent — so a new category appears with no redeploy and
  // the full taxonomy tree never ships to the client.
  categoryOptions: { slug: string; label: string }[];
}

export default function ServiceTableFilters({
  currentFilters,
  className,
  categoryOptions,
}: ServiceTableFiltersProps) {
  const router = useRouter();
  const getCategoryLabel = (slug: string): string =>
    categoryOptions.find((c) => c.slug === slug)?.label ?? slug;
  const searchParams = useSearchParams();

  const updateFilters = (newParams: Partial<UserServiceFilterOptions>) => {
    const params = new URLSearchParams(searchParams);

    // Update each parameter
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });

    // Always reset to page 1 when filters change
    params.set('page', '1');

    router.push(`/dashboard/services?${params.toString()}`);
  };

  const handleSearchChange = (search: string) => {
    updateFilters({ search });
  };

  const handleStatusChange = (status: string) => {
    updateFilters({ status });
  };

  const handleCategoryChange = (category: string) => {
    updateFilters({ category });
  };

  const handleClearFilters = () => {
    router.push('/dashboard/services');
  };

  // Count active filters
  const getActiveFiltersCount = () => {
    let count = 0;
    if (currentFilters.search && currentFilters.search.trim()) count++;
    if (currentFilters.status && currentFilters.status !== 'all') count++;
    if (currentFilters.category && currentFilters.category !== 'all') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Αναζήτηση υπηρεσιών..."
            defaultValue={currentFilters.search || ''}
            onChange={(e) => {
              // Debounce search input
              const timeoutId = setTimeout(() => {
                handleSearchChange(e.target.value);
              }, 500);

              return () => clearTimeout(timeoutId);
            }}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={currentFilters.status || 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Κατάσταση" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλες</SelectItem>
            <SelectItem value="draft">Πρόχειρες</SelectItem>
            <SelectItem value="pending">Υπό Έλεγχο</SelectItem>
            <SelectItem value="published">Δημοσιευμένες</SelectItem>
            <SelectItem value="rejected">Απορριφθείσες</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={currentFilters.category || 'all'}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Κατηγορία" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλες οι κατηγορίες</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {activeFiltersCount > 0 && (
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4 mr-2" />
            Καθαρισμός
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Ενεργά φίλτρα:</span>

          {currentFilters.search && currentFilters.search.trim() && (
            <Badge variant="secondary" className="gap-1">
              Αναζήτηση: "{currentFilters.search}"
              <button
                onClick={() => handleSearchChange('')}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {currentFilters.status && currentFilters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Κατάσταση: {getStatusLabel(currentFilters.status)}
              <button
                onClick={() => handleStatusChange('all')}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {currentFilters.category && currentFilters.category !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Κατηγορία: {getCategoryLabel(currentFilters.category)}
              <button
                onClick={() => updateFilters({ category: 'all' })}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to get status label in Greek
function getStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Πρόχειρες';
    case 'pending':
      return 'Υπό Έλεγχο';
    case 'published':
      return 'Δημοσιευμένες';
    case 'rejected':
      return 'Απορριφθείσες';
    default:
      return status;
  }
}