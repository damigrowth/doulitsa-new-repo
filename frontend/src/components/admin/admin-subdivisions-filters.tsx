'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchFilter, FilterContainer, useFilterNavigation } from './filters/filter-components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { DatasetItem } from '@/lib/types/datasets';

interface AdminSubdivisionsFiltersProps {
  taxonomyTree?: DatasetItem[];
}

export function AdminSubdivisionsFilters({
  taxonomyTree = [],
}: AdminSubdivisionsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleFilterChange } = useFilterNavigation();
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set('category', value);
    } else {
      params.delete('category');
    }
    params.delete('subcategory');
    params.delete('page');
    router.push(`?${params.toString()}`);
  };

  const subcategories =
    selectedCategory && selectedCategory !== 'all'
      ? taxonomyTree.find((c) => c.id === selectedCategory)?.children || []
      : [];

  return (
    <FilterContainer>
      <SearchFilter placeholder='Search by label or slug...' />

      <div className='space-y-2 w-[220px]'>
        <Label htmlFor='category'>Category</Label>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger id='category'>
            <SelectValue placeholder='Filter by Category' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Categories</SelectItem>
            {taxonomyTree.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2 w-[220px]'>
        <Label htmlFor='subcategory'>Subcategory</Label>
        <Select
          defaultValue={searchParams.get('subcategory') || 'all'}
          onValueChange={(value) => handleFilterChange('subcategory', value)}
          disabled={!selectedCategory || selectedCategory === 'all'}
        >
          <SelectTrigger id='subcategory'>
            <SelectValue placeholder='Filter by Subcategory' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Subcategories</SelectItem>
            {subcategories.map((subcategory) => (
              <SelectItem key={subcategory.id} value={subcategory.id}>
                {subcategory.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </FilterContainer>
  );
}
