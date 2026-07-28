'use client';

import { useState } from 'react';
import { Eye, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { AdminDataTable, ColumnDef } from '@/components/admin/admin-data-table';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/shared/user-avatar';
import { formatDateTime } from '@/lib/utils/date';

const toIso = (v: unknown): string =>
  v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : String(v ?? '');

// Copyable text component with hover state
function CopyableText({
  text,
  maxLength,
  className,
}: {
  text: string;
  maxLength?: number;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayText =
    maxLength && text.length > maxLength
      ? `${text.slice(0, maxLength)}...`
      : text;

  return (
    <div
      className={`group flex items-center gap-2 cursor-pointer hover:text-primary transition-colors ${className}`}
      onClick={handleCopy}
    >
      <span>{displayText}</span>
      {copied ? (
        <Check className='h-3 w-3 text-green-600' />
      ) : (
        <Copy className='h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity' />
      )}
    </div>
  );
}

interface AdminChatTableItem {
  id: string;
  cid: string | null;
  creator: {
    id: string;
    displayName: string | null;
    username: string | null;
    image: string | null;
  };
  member: {
    id: string;
    displayName: string | null;
    username: string | null;
    image: string | null;
  };
  messageCount: number;
  createdAt: Date;
  lastActivity: Date;
}

interface AdminChatsDataTableProps {
  data: AdminChatTableItem[];
  loading?: boolean;
}

export function AdminChatsDataTable({
  data,
  loading = false,
}: AdminChatsDataTableProps) {
  const columns: ColumnDef<AdminChatTableItem>[] = [
    {
      key: 'creator',
      header: 'Αποστολέας',
      sortable: false,
      render: (chat) => (
        <div className='flex items-center gap-3'>
          <UserAvatar
            displayName={chat.creator.displayName}
            image={chat.creator.image}
            size='sm'
            className='h-8 w-8'
            showBorder={false}
            showShadow={false}
          />
          <div className='space-y-0.5'>
            <div className='font-medium'>
              {chat.creator.displayName || 'Χρήστης'}
            </div>
            {chat.creator.username && (
              <div className='text-xs text-muted-foreground'>
                @{chat.creator.username}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'member',
      header: 'Παραλήπτης',
      sortable: false,
      render: (chat) => (
        <div className='flex items-center gap-3'>
          <UserAvatar
            displayName={chat.member.displayName}
            image={chat.member.image}
            size='sm'
            className='h-8 w-8'
            showBorder={false}
            showShadow={false}
          />
          <div className='space-y-0.5'>
            <div className='font-medium'>
              {chat.member.displayName || 'Χρήστης'}
            </div>
            {chat.member.username && (
              <div className='text-xs text-muted-foreground'>
                @{chat.member.username}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'messageCount',
      header: 'Μηνύματα',
      sortable: true,
      render: (chat) => (
        <div className='font-medium'>{(chat.messageCount ?? 0).toLocaleString()}</div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Δημιουργία',
      sortable: true,
      render: (chat) => (
        <div className='text-sm text-muted-foreground'>
          {chat.createdAt ? formatDateTime(toIso(chat.createdAt)) : '—'}
        </div>
      ),
    },
    {
      key: 'lastActivity',
      header: 'Ενημέρωση',
      sortable: true,
      render: (chat) => (
        <div className='text-sm text-muted-foreground'>
          {chat.lastActivity ? formatDateTime(toIso(chat.lastActivity)) : '—'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (chat) => (
        <Button variant='ghost' size='sm' asChild>
          <Link href={`/admin/chats/${chat.cid || chat.id}`}>
            <Eye className='h-4 w-4' />
            <span className='sr-only'>View chat</span>
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <AdminDataTable
      data={data}
      columns={columns}
      loading={loading}
      basePath='/admin/chats'
      emptyMessage='Δεν βρέθηκαν συνομιλίες'
    />
  );
}
