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

export function AdminProfilesFilters() {
  const { searchValue, setSearchValue, handleFilterChange, searchParams } =
    useAdminFilters('/admin/profiles');

  return (
    <div className='flex items-center gap-4'>
      <AdminSearchInput
        placeholder='Αναζήτηση προφίλ...'
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
      />
      <Select
        value={searchParams.get('type') || 'all'}
        onValueChange={(value) => handleFilterChange('type', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='Role' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Τύπος</SelectItem>
          <SelectItem value='freelancer'>Professional</SelectItem>
          <SelectItem value='company'>Company</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get('status') || 'all'}
        onValueChange={(value) => handleFilterChange('status', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='Status' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Status</SelectItem>
          <SelectItem value='featured'>Featured</SelectItem>
          <SelectItem value='top'>Top</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get('verified') || 'all'}
        onValueChange={(value) => handleFilterChange('verified', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='Verification' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Verification</SelectItem>
          <SelectItem value='verified'>Verified</SelectItem>
          <SelectItem value='unverified'>Unverified</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
