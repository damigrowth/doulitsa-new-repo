'use client';

import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SheetTrigger } from '@/components/ui/sheet';
import {
  SearchInput,
  OnlineToggle,
  CountiesDropdown,
  SortDropdown,
} from './archive-inputs';
import type { DatasetItem } from '@/lib/types/datasets';
import { cn } from '@/lib/utils';

interface ArchiveFiltersProps {
  filters: {
    search?: string;
    online?: boolean;
    county?: string;
    sortBy?: string;
    type?: 'pros' | 'companies';
  };
  onFiltersChange: (filters: any) => void;
  counties: DatasetItem[];
  className?: string;
  activeFilterCount?: number;
  filterTrigger?: React.ReactNode;
  archiveType?: 'profiles' | 'services';
  basePath?: string;
}

export function ArchiveFilters({
  filters,
  onFiltersChange,
  counties,
  className,
  activeFilterCount = 0,
  filterTrigger,
  archiveType,
  basePath,
}: ArchiveFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value || undefined,
    });
  };

  const handleOnlineToggle = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      online: checked,
    });
  };

  const handleCountyChange = (value: string) => {
    onFiltersChange({
      ...filters,
      county: value === 'all' ? undefined : value,
    });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value,
    });
  };

  return (
    <div
      className={cn(
        'flex items-center border-b border-gray-200 py-4',
        className,
      )}
    >
      {/* Mobile layout: 3 rows */}
      <div className='flex flex-col gap-3 lg:hidden w-full'>
        {/* Row 1: All Filters + Sort icon */}
        <div className='flex flex-row items-center gap-2 w-full'>
          {filterTrigger || (
            <SheetTrigger asChild>
              <Button
                variant='outline'
                className='flex items-center gap-2 relative flex-1'
              >
                <Filter className='w-4 h-4' />
                <span>Όλα τα φίλτρα</span>
                {activeFilterCount > 0 && (
                  <span className='absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-medium'>
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
          )}
          <SortDropdown
            value={filters.sortBy}
            onValueChange={handleSortChange}
            fullWidth={false}
            iconOnly
          />
        </div>

        {/* Row 2: Search */}
        <SearchInput
          value={filters.search}
          onValueChange={handleSearchChange}
          placeholder='Αναζήτηση...'
          className='w-full'
        />

        {/* Row 3: Counties + Online */}
        <div className='flex flex-row items-center gap-2 w-full'>
          <CountiesDropdown
            value={filters.county}
            onValueChange={handleCountyChange}
            counties={counties}
            className='flex-1 min-w-0'
          />
          <OnlineToggle
            id='online-filter-mobile'
            checked={filters.online || false}
            onCheckedChange={handleOnlineToggle}
          />
        </div>
      </div>

      {/* Desktop layout */}
      <div className='hidden lg:flex lg:flex-row lg:flex-nowrap items-center justify-between w-full h-full gap-4'>
        {/* Left side: All Filters, Search, Online Toggle, Counties */}
        <div className='flex flex-nowrap items-center gap-6 w-auto'>
          {/* All Filters Button/Trigger */}
          <div>
            {filterTrigger || (
              <SheetTrigger asChild>
                <Button
                  variant='outline'
                  className='flex items-center gap-2 relative'
                >
                  <Filter className='w-4 h-4' />
                  <span>Όλα τα φίλτρα</span>
                  {activeFilterCount > 0 && (
                    <span className='absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-medium'>
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
            )}
          </div>
          {/* Search Input */}
          <SearchInput
            value={filters.search}
            onValueChange={handleSearchChange}
            placeholder='Αναζήτηση...'
            className='min-w-56'
          />
          {/* Counties Dropdown */}
          <CountiesDropdown
            value={filters.county}
            onValueChange={handleCountyChange}
            counties={counties}
          />
          {/* Online Toggle */}
          <OnlineToggle
            id='online-filter-desktop'
            checked={filters.online || false}
            onCheckedChange={handleOnlineToggle}
          />
        </div>

        {/* Right side: Sort Dropdown */}
        <div className='ml-auto'>
          <SortDropdown
            value={filters.sortBy}
            onValueChange={handleSortChange}
          />
        </div>
      </div>
    </div>
  );
}
