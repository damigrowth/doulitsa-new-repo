'use client';

import { AdminDataTable, ColumnDef } from '@/components/admin/admin-data-table';
import UserAvatar from '@/components/shared/user-avatar';
import { formatDateTime } from '@/lib/utils/date';
import type { AdminChatMessageRow } from '@/lib/types/admin';

interface AdminChatMessagesDataTableProps {
  data: AdminChatMessageRow[];
  chatId: string;
  loading?: boolean;
}

export function AdminChatMessagesDataTable({
  data,
  chatId,
  loading = false,
}: AdminChatMessagesDataTableProps) {
  const columns: ColumnDef<AdminChatMessageRow>[] = [
    {
      key: 'author',
      header: 'Συνομιλητής',
      sortable: false,
      render: (message) => (
        <div className='flex items-center gap-3'>
          <UserAvatar
            displayName={message.authorId}
            size='sm'
            className='h-8 w-8'
            showBorder={false}
            showShadow={false}
          />
          <div className='space-y-0.5'>
            <div className='font-medium text-xs text-muted-foreground'>
              {message.authorId}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'content',
      header: 'Περιεχόμενο',
      sortable: false,
      render: (message) => (
        <div className='py-2'>
          <p className='text-sm whitespace-pre-wrap break-words'>
            {message.deleted ? (
              <span className='italic text-muted-foreground'>Message deleted</span>
            ) : (
              message.content
            )}
          </p>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Ημερομηνία',
      sortable: true,
      render: (message) => (
        <div className='text-sm text-muted-foreground whitespace-nowrap'>
          {formatDateTime(message.createdAt)}
        </div>
      ),
    },
  ];

  return (
    <AdminDataTable
      data={data}
      columns={columns}
      loading={loading}
      basePath={`/admin/chats/${chatId}`}
      emptyMessage='Δεν βρέθηκαν μηνύματα'
    />
  );
}
