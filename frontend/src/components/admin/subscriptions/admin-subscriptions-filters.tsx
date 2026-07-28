'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminFilters } from '@/lib/hooks/admin/use-admin-filters';
import { AdminSearchInput } from '../admin-search-input';

export function AdminSubscriptionsFilters() {
  const { searchValue, setSearchValue, handleFilterChange, searchParams } =
    useAdminFilters('/admin/subscriptions');

  return (
    <div className='flex items-center gap-4'>
      <AdminSearchInput
        placeholder='Αναζήτηση με όνομα ή email...'
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
          <SelectItem value='all'>Όλες οι καταστάσεις</SelectItem>
          <SelectItem value='active'>Ενεργή</SelectItem>
          <SelectItem value='canceled'>Έληξε</SelectItem>
          <SelectItem value='past_due'>Εκπρόθεσμη</SelectItem>
          <SelectItem value='incomplete'>Ημιτελής</SelectItem>
          <SelectItem value='trialing'>Δοκιμαστική</SelectItem>
          <SelectItem value='unpaid'>Απλήρωτη</SelectItem>
        </SelectContent>
      </Select>

      {/* Billing Interval Filter */}
      <Select
        value={searchParams.get('billingInterval') || 'all'}
        onValueChange={(value) => handleFilterChange('billingInterval', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='Πλάνο' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Όλα τα πλάνα</SelectItem>
          <SelectItem value='month'>Μηνιαία</SelectItem>
          <SelectItem value='year'>Ετήσια</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
