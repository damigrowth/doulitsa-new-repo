'use client';

import { SearchFilter, SelectFilter, FilterContainer } from './filters/filter-components';

interface AdminSkillsFiltersProps {
  categoryOptions?: Array<{ value: string; label: string }>;
}

export function AdminSkillsFilters({
  categoryOptions = [],
}: AdminSkillsFiltersProps) {
  return (
    <FilterContainer>
      <SearchFilter />
      <SelectFilter
        id='category'
        label='Category'
        options={categoryOptions}
        includeNone={true}
      />
    </FilterContainer>
  );
}
