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

export function AdminTaxonomySubmissionFilters() {
  const { searchValue, setSearchValue, handleFilterChange, searchParams } =
    useAdminFilters('/admin/taxonomies/submissions');

  return (
    <div className='flex items-center gap-4'>
      <AdminSearchInput
        placeholder='Search by label...'
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
      />
      <Select
        value={searchParams.get('status') || 'all'}
        onValueChange={(value) => handleFilterChange('status', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='Status' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Status</SelectItem>
          <SelectItem value='pending'>Pending</SelectItem>
          <SelectItem value='approved'>Approved</SelectItem>
          <SelectItem value='rejected'>Rejected</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get('type') || 'all'}
        onValueChange={(value) => handleFilterChange('type', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='Type' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Types</SelectItem>
          <SelectItem value='skill'>Skills</SelectItem>
          <SelectItem value='tag'>Tags</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
