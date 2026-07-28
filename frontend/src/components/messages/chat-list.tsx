/**
 * Server Component: Chat List Display
 * Pure presentation - interactive parts moved to ChatListItem client component
 */

import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatListItem } from './chat-list-item';
import { ChatListItem as ChatListItemType } from '@/lib/types/messages';

interface ChatListProps {
  chats: ChatListItemType[];
}

export function ChatList({ chats }: ChatListProps) {
  return (
    <ScrollArea className='h-full'>
      <div className='space-y-1 px-4 py-2'>
        {chats.map((chat) => (
          <ChatListItem key={chat.id} chat={chat} />
        ))}
      </div>
    </ScrollArea>
  );
}
