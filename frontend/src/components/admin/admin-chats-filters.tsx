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

export function AdminChatsFilters() {
  const { searchValue, setSearchValue, handleFilterChange, searchParams } =
    useAdminFilters('/admin/chats');

  return (
    <div className='flex items-center gap-4'>
      <AdminSearchInput
        placeholder='Αναζήτηση συνομιλιών...'
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
      />

      {/* Sort Filter */}
      <Select
        value={searchParams.get('sort') || 'active'}
        onValueChange={(value) => handleFilterChange('sort', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='Sort By' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='active'>Last Activity</SelectItem>
          <SelectItem value='newest'>Newest First</SelectItem>
          <SelectItem value='oldest'>Oldest First</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
