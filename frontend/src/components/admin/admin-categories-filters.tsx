'use client';

import { SearchFilter, SelectFilter, FilterContainer } from './filters/filter-components';

export function AdminCategoriesFilters() {
  const featuredOptions = [
    { value: 't', label: 'Featured' },
    { value: 'f', label: 'Not Featured' },
  ];

  return (
    <FilterContainer>
      <SearchFilter placeholder='Search by label or slug...' />
      <SelectFilter
        id='featured'
        label='Featured Status'
        options={featuredOptions}
        className='w-[180px]'
      />
    </FilterContainer>
  );
}
