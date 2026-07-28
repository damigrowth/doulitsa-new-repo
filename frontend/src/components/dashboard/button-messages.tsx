'use client';

import NextLink from '@/components/shared/next-link';
import { usePathname } from 'next/navigation';
import { Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUnreadCount } from '@/lib/hooks/use-unread-count';

export default function MessagesMenu({ className }: { className?: string }) {
  const pathname = usePathname();
  const { unreadCount } = useUnreadCount();

  // Don't show badge when on messages routes
  const isOnMessagesRoute = pathname.startsWith('/dashboard/messages');
  const showBadge = !isOnMessagesRoute && unreadCount > 0;

  return (
    <div
      className={`hidden sm:flex items-center justify-center ${className || ''}`}
    >
      <NextLink
        href='/dashboard/messages'
        className='relative text-center flex'
        style={{ color: '#122f5e' }}
        aria-label={`Messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Mail className='w-5 h-5 flex' />
        {showBadge && (
          <Badge
            variant='destructive'
            className='absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center px-1 text-[10px] font-semibold rounded-full'
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </NextLink>
    </div>
  );
}
