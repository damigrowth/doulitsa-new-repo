/**
 * Client Component: Messages Container with Mobile Sidebar
 * Wrapper that includes messages and mobile sidebar button
 */

'use client';

import { MessagesContainer } from './messages-container';
import type { ChatMessageItem, ChatListItem } from '@/lib/types/messages';

interface MessagesContainerWithSidebarProps {
  chatId: string;
  currentUserId: string;
  initialMessages: ChatMessageItem[];
  chats: ChatListItem[];
}

export function MessagesContainerWithSidebar({
  chatId,
  currentUserId,
  initialMessages,
  chats,
}: MessagesContainerWithSidebarProps) {
  return (
    <div className='relative flex h-[calc(100vh-7.5rem)] md:h-[calc(100vh-8.5rem)] flex-col'>
      <MessagesContainer
        chatId={chatId}
        currentUserId={currentUserId}
        initialMessages={initialMessages}
        chats={chats}
      />
    </div>
  );
}
