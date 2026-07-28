/**
 * Client Component: Individual chat list item with click handling
 * Interactive button that needs client-side state
 */

'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChatListItem as ChatListItemType } from '@/lib/types/messages';
import { formatCompactMessageTime } from '@/lib/utils/messages';
import UserAvatar from '@/components/shared/user-avatar';

interface ChatListItemProps {
  chat: ChatListItemType;
}

export function ChatListItem({ chat }: ChatListItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Use cid if available, fall back to id during migration
  const chatPath = chat.cid || chat.id;
  // Check if current pathname matches this chat's route
  const isSelected = pathname === `/dashboard/messages/${chatPath}`;

  const handleClick = () => {
    if (isSelected) return; // Prevent redundant navigation
    router.push(`/dashboard/messages/${chatPath}`);
    // No router.refresh() - Next.js handles navigation, Supabase handles updates
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent overflow-hidden',
        isSelected && 'bg-accent',
      )}
    >
      <div className='relative self-center shrink-0'>
        <UserAvatar
          displayName={chat.displayName ?? chat.name ?? ''}
          image={chat.image ?? chat.avatar ?? null}
          size='sm'
          className='h-8 w-8'
          showBorder={false}
          showShadow={false}
        />
      </div>

      <div className='flex-1 min-w-0 overflow-hidden'>
        <div className='flex items-center justify-between gap-2'>
          <span className='truncate font-medium text-2sm'>
            {chat.displayName ?? chat.name ?? 'Άγνωστος χρήστης'}
          </span>
          <span className='shrink-0 text-xs text-muted-foreground'>
            {chat.lastActivity
              ? formatCompactMessageTime(
                  chat.lastActivity instanceof Date
                    ? chat.lastActivity.toISOString()
                    : String(chat.lastActivity),
                )
              : ''}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <p className='flex-1 min-w-0 text-2sm text-muted-foreground line-clamp-1 overflow-hidden text-ellipsis'>
            {typeof chat.lastMessage === 'string'
              ? chat.lastMessage
              : chat.lastMessage?.content || 'Δεν υπάρχουν μηνύματα ακόμα'}
          </p>
          {chat.unread > 0 && (
            <Badge
              variant='destructive'
              className='shrink-0 rounded-full h-4 w-4 p-0 flex items-center justify-center text-[10px] font-semibold'
            >
              {chat.unread}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
