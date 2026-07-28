/**
 * React Hook: useChatListSubscription
 *
 * Connects to the Django Channels presence socket (`/ws/presence/`). Any
 * `presence` or `message` broadcast triggers a chat-list refetch so unread
 * counts and last-message previews stay current without polling.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { openChannelsSocket, type ChannelsSocket } from '@/lib/realtime/channels-ws';
import { getChats } from '@/actions/messages';
import type { ChatListItem } from '@/lib/types/messages';

interface UseChatListSubscriptionOptions {
  userId: string;
  initialChats: ChatListItem[];
  enabled?: boolean;
}

export function useChatListSubscription({
  userId,
  initialChats,
  enabled = true,
}: UseChatListSubscriptionOptions) {
  const [chats, setChats] = useState<ChatListItem[]>(initialChats);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshChats = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const updated = (await getChats(userId)) as ChatListItem[];
      setChats(updated);
    } catch (error) {
      console.error('Failed to refresh chats:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, isRefreshing]);

  useEffect(() => {
    if (!enabled || !userId) return;

    let socket: ChannelsSocket | null = null;
    const trigger = () => {
      void refreshChats();
    };
    socket = openChannelsSocket(`/ws/presence/`, {
      presence: trigger,
      message: trigger,
      message_edited: trigger,
      message_deleted: trigger,
    });

    return () => {
      socket?.close();
    };
  }, [userId, enabled, refreshChats]);

  return {
    chats,
    refreshChats,
    isRefreshing,
  };
}
