/**
 * Client Component: Chat List Container with real-time subscriptions and search
 * Wraps server ChatList component with real-time updates and filtering
 */

'use client';

import { useState, useMemo } from 'react';
import { useChatListSubscription } from '@/lib/hooks/chat/use-chat-list-subscription';
import { ChatList } from './chat-list';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatListItem } from '@/lib/types/messages';

interface ChatListContainerProps {
  userId: string;
  initialChats: ChatListItem[];
}

export function ChatListContainer({
  userId,
  initialChats,
}: ChatListContainerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe to real-time chat list updates
  const { chats } = useChatListSubscription({
    userId,
    initialChats,
    enabled: true,
  });

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;

    const query = searchQuery.toLowerCase();
    return chats.filter((chat) => {
      // Search in chat name
      if (chat.name?.toLowerCase().includes(query)) return true;

      // Search in last message content
      if (chat.lastMessage?.content?.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [chats, searchQuery]);

  const hasChats = chats.length > 0;

  return (
    <div className='flex flex-col h-full'>
      {/* Search Input */}
      <div className='px-6 py-4'>
        <div className='relative'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            type='text'
            aria-label='Αναζήτηση συνομιλιών'
            id='search'
            placeholder='Αναζήτηση συνομιλιών...'
            className='pl-8 pr-8'
            disabled={!hasChats}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              size='icon'
              variant='ghost'
              className='absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6'
              onClick={() => setSearchQuery('')}
            >
              <X className='h-3 w-3' />
            </Button>
          )}
        </div>
        {searchQuery && filteredChats.length === 0 && (
          <p className='text-xs text-muted-foreground mt-2'>
            Δεν βρέθηκαν αποτελέσματα για "{searchQuery}"
          </p>
        )}
      </div>

      {/* Chat List */}
      <div className='flex-1 overflow-hidden'>
        <ChatList chats={filteredChats} />
      </div>
    </div>
  );
}
