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

interface AdminChatMessagesFiltersProps {
  chatId: string;
}

export function AdminChatMessagesFilters({ chatId }: AdminChatMessagesFiltersProps) {
  const { searchValue, setSearchValue, handleFilterChange, searchParams } =
    useAdminFilters(`/admin/chats/${chatId}`);

  return (
    <div className='flex items-center gap-4'>
      <AdminSearchInput
        placeholder='Αναζήτηση μηνυμάτων...'
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
      />

      {/* Sort Filter */}
      <Select
        value={searchParams.get('sort') || 'newest'}
        onValueChange={(value) => handleFilterChange('sort', value)}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder='Sort By' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='newest'>Newest First</SelectItem>
          <SelectItem value='oldest'>Oldest First</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
