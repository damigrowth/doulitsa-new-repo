/**
 * React Hook: useChatSubscription
 *
 * Subscribes to the Django Channels chat WebSocket (`/ws/chat/<chatId>/`).
 * Receives new messages, edits, deletes, and reactions broadcast by the
 * backend after every REST mutation.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { openChannelsSocket, type ChannelsSocket } from '@/lib/realtime/channels-ws';
import type { ChatMessageItem } from '@/lib/types/messages';

const activeSubscriptions = new Set<string>();

interface UseChatSubscriptionOptions {
  chatId: string;
  currentUserId: string;
  initialMessages: ChatMessageItem[];
  enabled?: boolean;
}

export function useChatSubscription({
  chatId,
  currentUserId,
  initialMessages,
  enabled = true,
}: UseChatSubscriptionOptions) {
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const processedMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    processedMessageIds.current = new Set(initialMessages.map((m) => m.id));
  }, [chatId, initialMessages]);

  useEffect(() => {
    if (!enabled || !chatId) return;
    const key = `${chatId}-${currentUserId}`;
    if (activeSubscriptions.has(key)) return;
    activeSubscriptions.add(key);

    let socket: ChannelsSocket | null = null;

    socket = openChannelsSocket(`/ws/chat/${chatId}/`, {
      message: (payload: any) => {
        if (!payload?.id) return;
        if (processedMessageIds.current.has(payload.id)) return;
        processedMessageIds.current.add(payload.id);

        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          const replyTo = payload.replyToId
            ? prev.find((m) => m.id === payload.replyToId) ?? null
            : null;
          // The WS broadcast ships `authorId` (camelCased from Django's
          // `author_id`); REST's normalizeMessage already falls back the same
          // way. Without this, `authorUid` is undefined and own messages render
          // on the wrong side until a reload.
          const authorUid = payload.authorUid ?? payload.authorId ?? null;
          const item: ChatMessageItem = {
            id: payload.id,
            content: payload.content,
            createdAt: new Date(payload.createdAt ?? Date.now()),
            authorUid,
            isOwn: authorUid === currentUserId,
            isRead: false,
            edited: Boolean(payload.edited),
            editedAt: payload.editedAt ? new Date(payload.editedAt) : null,
            deleted: Boolean(payload.deleted),
            replyToId: payload.replyToId ?? null,
            replyTo,
            reactions: [],
            author: null,
          };
          return [...prev, item];
        });
      },
      message_edited: (payload: any) => {
        if (!payload?.id) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.id
              ? {
                  ...m,
                  content: payload.content ?? m.content,
                  edited: true,
                  editedAt: payload.editedAt ? new Date(payload.editedAt) : new Date(),
                }
              : m,
          ),
        );
      },
      message_deleted: (payload: any) => {
        if (!payload?.id) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.id ? { ...m, deleted: true } : m)),
        );
      },
      reaction: (payload: any) => {
        if (!payload?.messageId) return;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== payload.messageId) return m;
            const reactions: ChatMessageItem['reactions'] = [];
            const raw = (payload.reactions ?? {}) as Record<string, string[]>;
            for (const [emoji, userIds] of Object.entries(raw)) {
              reactions.push({
                emoji,
                userIds,
                count: userIds.length,
                hasReacted: userIds.includes(currentUserId),
              });
            }
            return { ...m, reactions };
          }),
        );
      },
      // Live read receipt — mirrors OLD `subscribeToReadReceipts`
      // (use-chat-subscription.ts:168-180): when the OTHER user reads, flip
      // `isRead` on the affected messages so the sender's "seen" tick updates
      // live. Payload: { messageIds: string[], userId: string }.
      read: (payload: any) => {
        if (payload?.userId === currentUserId) return;
        const ids = Array.isArray(payload?.messageIds) ? payload.messageIds : [];
        if (ids.length === 0) return;
        const idSet = new Set<string>(ids);
        setMessages((prev) =>
          prev.map((m) => (idSet.has(m.id) ? { ...m, isRead: true } : m)),
        );
      },
    });

    return () => {
      activeSubscriptions.delete(key);
      socket?.close();
    };
  }, [chatId, currentUserId, enabled]);

  return { messages };
}
