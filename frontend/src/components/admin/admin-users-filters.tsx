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

export function AdminUsersFilters() {
  const { searchValue, setSearchValue, handleFilterChange, searchParams } =
    useAdminFilters('/admin/users');

  return (
    <div className='flex items-center gap-4'>
      <AdminSearchInput
        placeholder='Search by email...'
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
      />
      <Select
        value={searchParams.get('type') || 'all'}
        onValueChange={(value) => handleFilterChange('type', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='All Types' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Types</SelectItem>
          <SelectItem value='simple'>Simple</SelectItem>
          <SelectItem value='pro'>Pro</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get('provider') || 'all'}
        onValueChange={(value) => handleFilterChange('provider', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='All Providers' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Providers</SelectItem>
          <SelectItem value='email'>Email</SelectItem>
          <SelectItem value='google'>Google</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get('step') || 'all'}
        onValueChange={(value) => handleFilterChange('step', value)}
      >
        <SelectTrigger className='w-52'>
          <SelectValue placeholder='All Steps' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Steps</SelectItem>
          <SelectItem value='EMAIL_VERIFICATION'>Email Confirmation</SelectItem>
          <SelectItem value='OAUTH_SETUP'>OAuth Setup</SelectItem>
          <SelectItem value='ONBOARDING'>Onboarding</SelectItem>
          <SelectItem value='DASHBOARD'>Dashboard</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get('status') || 'all'}
        onValueChange={(value) => handleFilterChange('status', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='All Status' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Status</SelectItem>
          <SelectItem value='verified'>Confirmed</SelectItem>
          <SelectItem value='unverified'>Unconfirmed</SelectItem>
          <SelectItem value='banned'>Banned</SelectItem>
          <SelectItem value='blocked'>Blocked</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get('role') || 'all'}
        onValueChange={(value) => handleFilterChange('role', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='All Roles' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Roles</SelectItem>
          <SelectItem value='user'>User</SelectItem>
          <SelectItem value='freelancer'>Professional</SelectItem>
          <SelectItem value='company'>Company</SelectItem>
          <SelectItem value='admin'>Admin</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
