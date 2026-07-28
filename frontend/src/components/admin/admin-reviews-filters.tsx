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

export function AdminReviewsFilters() {
  const { searchValue, setSearchValue, handleFilterChange, searchParams } =
    useAdminFilters('/admin/reviews');

  return (
    <div className='flex items-center gap-4 flex-wrap'>
      <div className='flex-1 min-w-[240px]'>
        <AdminSearchInput
          placeholder='Αναζήτηση σχολίου ή χρήστη...'
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>
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
        value={searchParams.get('rating') || 'all'}
        onValueChange={(value) => handleFilterChange('rating', value)}
      >
        <SelectTrigger className='w-32'>
          <SelectValue placeholder='Rating' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Ratings</SelectItem>
          <SelectItem value='5'>5 ⭐</SelectItem>
          <SelectItem value='4'>4 ⭐</SelectItem>
          <SelectItem value='3'>3 ⭐</SelectItem>
          <SelectItem value='2'>2 ⭐</SelectItem>
          <SelectItem value='1'>1 ⭐</SelectItem>
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
          <SelectItem value='SERVICE'>Service</SelectItem>
          <SelectItem value='PROFILE'>Profile</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
