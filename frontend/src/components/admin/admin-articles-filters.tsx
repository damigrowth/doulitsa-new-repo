'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminFilters } from '@/lib/hooks/admin/use-admin-filters';
import { AdminSearchInput } from './admin-search-input';
import { getAllBlogCategories } from '@/constants/datasets/blog-categories';

export function AdminArticlesFilters() {
  const { searchValue, setSearchValue, handleFilterChange, searchParams } =
    useAdminFilters('/admin/articles');

  const categories = getAllBlogCategories();

  return (
    <div className='flex items-center gap-4'>
      <AdminSearchInput
        placeholder='Αναζήτηση άρθρων...'
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
      />

      {/* Status Filter */}
      <Select
        value={searchParams.get('status') || 'all'}
        onValueChange={(value) => handleFilterChange('status', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='Κατάσταση' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Όλες</SelectItem>
          <SelectItem value='published'>Δημοσιευμένο</SelectItem>
          <SelectItem value='draft'>Πρόχειρο</SelectItem>
          <SelectItem value='pending'>Υπό Έλεγχο</SelectItem>
        </SelectContent>
      </Select>

      {/* Category Filter */}
      <Select
        value={searchParams.get('category') || 'all'}
        onValueChange={(value) => handleFilterChange('category', value)}
      >
        <SelectTrigger className='w-48'>
          <SelectValue placeholder='Κατηγορία' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Όλες οι κατηγορίες</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.slug} value={cat.slug}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
