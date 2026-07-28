'use client';

import { SearchFilter, SelectFilter, FilterContainer } from './filters/filter-components';

export function AdminProTaxonomiesFilters() {
  const levelOptions = [
    { value: 'category', label: 'Categories' },
    { value: 'subcategory', label: 'Subcategories' },
  ];

  const typeOptions = [
    { value: 'freelancer', label: 'Professional' },
    { value: 'company', label: 'Company' },
  ];

  return (
    <FilterContainer>
      <SearchFilter placeholder='Search by name, slug, or parent...' />
      <SelectFilter
        id='level'
        label='Level'
        options={levelOptions}
        className='w-full md:w-[200px]'
      />
      <SelectFilter
        id='type'
        label='Type'
        options={typeOptions}
        className='w-full md:w-[200px]'
      />
    </FilterContainer>
  );
}
