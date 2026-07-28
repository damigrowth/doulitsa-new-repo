'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getMessages } from '@/actions/messages';
import type { ChatMessageItem } from '@/lib/types/messages';

interface UseInfiniteScrollProps {
  chatId: string;
  currentUserId: string;
  initialMessages: ChatMessageItem[];
  limit?: number;
}

export function useInfiniteScroll({
  chatId,
  currentUserId,
  initialMessages,
  limit = 50,
}: UseInfiniteScrollProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialMessages.length >= limit);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadTriggerRef = useRef<HTMLDivElement | null>(null);

  const loadOlderMessages = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      // Get the oldest message's timestamp
      const oldestMessage = messages[0];
      if (!oldestMessage) {
        setHasMore(false);
        return;
      }

      const beforeDate = oldestMessage.createdAt instanceof Date
        ? oldestMessage.createdAt.toISOString()
        : oldestMessage.createdAt;

      // Fetch older messages
      const olderMessages = await getMessages(chatId, currentUserId, {
        limit,
        before: beforeDate,
      });

      if (olderMessages.length === 0) {
        setHasMore(false);
      } else {
        // Prepend older messages to the existing messages
        setMessages((prev) => [...olderMessages, ...prev]);

        // If we got fewer messages than the limit, we've reached the end
        if (olderMessages.length < limit) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Failed to load older messages:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, currentUserId, messages, limit, isLoading, hasMore]);

  // Setup intersection observer
  useEffect(() => {
    if (!loadTriggerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadOlderMessages();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    observerRef.current.observe(loadTriggerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadOlderMessages, hasMore, isLoading]);

  // Update messages when initialMessages change (from real-time updates)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  return {
    messages,
    isLoading,
    hasMore,
    loadTriggerRef,
    loadOlderMessages,
  };
}
