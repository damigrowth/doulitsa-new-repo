'use client';

import { SearchFilter, SelectFilter, FilterContainer } from './filters/filter-components';

interface AdminProSubcategoriesFiltersProps {
  categoryOptions?: Array<{ value: string; label: string }>;
}

export function AdminProSubcategoriesFilters({
  categoryOptions = [],
}: AdminProSubcategoriesFiltersProps) {
  const typeOptions = [
    { value: 'freelancer', label: 'Professional' },
    { value: 'company', label: 'Company' },
  ];

  return (
    <FilterContainer>
      <SearchFilter placeholder='Search by name, slug, or category...' />
      <SelectFilter
        id='type'
        label='Type'
        options={typeOptions}
        className='w-full md:w-[200px]'
      />
      <SelectFilter
        id='category'
        label='Parent Category'
        options={categoryOptions}
        className='w-full md:w-[250px]'
      />
    </FilterContainer>
  );
}
