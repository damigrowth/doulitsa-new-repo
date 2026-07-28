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

export function AdminVerificationsFilters() {
  const { searchValue, setSearchValue, handleFilterChange, searchParams } =
    useAdminFilters('/admin/verifications');

  return (
    <div className='flex items-center gap-4'>
      <AdminSearchInput
        placeholder='Αναζήτηση με ΑΦΜ ή επωνυμία...'
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
          <SelectItem value='PENDING'>Pending</SelectItem>
          <SelectItem value='APPROVED'>Approved</SelectItem>
          <SelectItem value='REJECTED'>Rejected</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
