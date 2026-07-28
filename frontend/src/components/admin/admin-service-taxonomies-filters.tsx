'use client';

import { SearchFilter, SelectFilter, FilterContainer } from './filters/filter-components';

export function AdminServiceTaxonomiesFilters() {
  const levelOptions = [
    { value: 'category', label: 'Categories' },
    { value: 'subcategory', label: 'Subcategories' },
    { value: 'subdivision', label: 'Subdivisions' },
  ];

  const featuredOptions = [
    { value: 't', label: 'Featured' },
    { value: 'f', label: 'Not Featured' },
  ];

  return (
    <FilterContainer>
      <SearchFilter placeholder='Search by label or slug...' />
      <SelectFilter
        id='level'
        label='Level'
        options={levelOptions}
        className='w-48'
      />
      <SelectFilter
        id='featured'
        label='Featured'
        options={featuredOptions}
        className='w-40'
      />
    </FilterContainer>
  );
}
