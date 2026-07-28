'use client';

import { SearchFilter, SelectFilter, FilterContainer } from './filters/filter-components';

interface AdminSubcategoriesFiltersProps {
  categoryOptions?: Array<{ value: string; label: string }>;
}

export function AdminSubcategoriesFilters({
  categoryOptions = [],
}: AdminSubcategoriesFiltersProps) {
  return (
    <FilterContainer>
      <SearchFilter placeholder='Search by label or slug...' />
      <SelectFilter
        id='category'
        label='Category'
        placeholder='Filter by Category'
        options={categoryOptions}
        className='w-[220px]'
      />
    </FilterContainer>
  );
}
