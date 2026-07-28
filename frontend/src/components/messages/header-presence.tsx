/**
 * Client Component: Header with real-time presence tracking
 * Wraps server ChatHeader component with presence subscription
 */

'use client';

import { usePresence } from '@/lib/hooks/chat/use-presence';
import { ChatHeader } from './chat-header';
import type { ChatHeaderUser, ChatListItem } from '@/lib/types/messages';
import { useState, useEffect } from 'react';

interface HeaderPresenceProps {
  chatId: string;
  currentUserId: string;
  user: ChatHeaderUser;
  chats?: ChatListItem[];
  showMobileChatButton?: boolean;
}

export function HeaderPresence({
  chatId,
  currentUserId,
  user,
  chats,
  showMobileChatButton = false,
}: HeaderPresenceProps) {
  // Track our own presence
  usePresence({
    userId: currentUserId,
    chatId,
    enabled: true,
  });

  // Track other user's presence
  const { presenceMap } = usePresence({
    userId: user.userId,
    chatId,
    enabled: true,
  });

  // Get other user's presence from map
  const [userWithPresence, setUserWithPresence] =
    useState<ChatHeaderUser>(user);

  useEffect(() => {
    const otherUserPresence = presenceMap.get(user.userId);
    if (otherUserPresence) {
      setUserWithPresence((prev) => ({
        ...prev,
        online: otherUserPresence.online,
      }));
    }
  }, [presenceMap, user.userId]);

  return (
    <ChatHeader
      chatId={chatId}
      currentUserId={currentUserId}
      user={userWithPresence}
      chats={chats}
      showMobileChatButton={showMobileChatButton}
    />
  );
}
