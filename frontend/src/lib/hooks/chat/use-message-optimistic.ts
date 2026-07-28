/**
 * React Hook: useMessageOptimistic
 * Optimistic UI for instant message sending feedback.
 *
 * State lives in a module-level zustand store keyed by chatId — NOT in
 * per-instance useState. The message input and the messages container each
 * call this hook separately; with useState each call got its own empty list,
 * so the container never rendered the optimistic message and a sent message
 * only appeared after the server/WS round-trip (~300ms). Sharing the store
 * makes the bubble render on the same frame as the send click.
 */

'use client';

import { useCallback } from 'react';
import { create } from 'zustand';
import { sendMessage } from '@/actions/messages';
import type { ChatMessageItem } from '@/lib/types/messages';

interface OptimisticMessage extends ChatMessageItem {
  optimistic?: boolean;
  sending?: boolean;
  error?: boolean;
  serverId?: string; // real id returned by the server; used to dedupe vs realtime
}

interface OptimisticStore {
  byChat: Record<string, OptimisticMessage[]>;
  add: (chatId: string, msg: OptimisticMessage) => void;
  patch: (chatId: string, tempId: string, patch: Partial<OptimisticMessage>) => void;
  remove: (chatId: string, tempId: string) => void;
}

const useOptimisticStore = create<OptimisticStore>((set) => ({
  byChat: {},
  add: (chatId, msg) =>
    set((s) => ({
      byChat: { ...s.byChat, [chatId]: [...(s.byChat[chatId] ?? []), msg] },
    })),
  patch: (chatId, tempId, patch) =>
    set((s) => ({
      byChat: {
        ...s.byChat,
        [chatId]: (s.byChat[chatId] ?? []).map((m) =>
          m.id === tempId ? { ...m, ...patch } : m,
        ),
      },
    })),
  remove: (chatId, tempId) =>
    set((s) => ({
      byChat: {
        ...s.byChat,
        [chatId]: (s.byChat[chatId] ?? []).filter((m) => m.id !== tempId),
      },
    })),
}));

const EMPTY: OptimisticMessage[] = [];

interface UseMessageOptimisticOptions {
  chatId: string;
  currentUserId: string;
}

export function useMessageOptimistic({
  chatId,
  currentUserId,
}: UseMessageOptimisticOptions) {
  const optimisticMessages = useOptimisticStore((s) => s.byChat[chatId] ?? EMPTY);
  const add = useOptimisticStore((s) => s.add);
  const patch = useOptimisticStore((s) => s.patch);
  const remove = useOptimisticStore((s) => s.remove);

  const sendOptimisticMessage = useCallback(
    async (content: string, replyToId?: string) => {
      // Create optimistic message
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: OptimisticMessage = {
        id: tempId,
        content,
        createdAt: new Date(),
        authorUid: currentUserId,
        isOwn: true,
        isRead: false,
        edited: false,
        editedAt: null,
        deleted: false,
        replyToId: replyToId || null,
        replyTo: null, // Will be populated by real-time subscription
        reactions: [], // No reactions on new messages
        author: null, // Will be populated by real-time subscription
        optimistic: true,
        sending: true,
      };

      // Renders immediately in every component reading this chat's list.
      add(chatId, optimisticMsg);

      try {
        // Send to server
        const realMsg = (await sendMessage(
          chatId,
          content,
          currentUserId,
          replyToId,
        )) as { id?: string } | undefined;
        const serverId = realMsg?.id;

        // Mark as sent and record the real server id. We intentionally do NOT
        // remove the optimistic message on a timer: the combine step dedupes it
        // against the real message once it arrives (via the WS echo or a
        // refetch). A fixed removal timer made the FIRST message of a session
        // vanish until a manual refresh, because the socket often isn't
        // connected yet so the echo never replaced it in time.
        patch(chatId, tempId, { sending: false, serverId });
      } catch (error) {
        console.error('Failed to send message:', error);
        // Mark as error
        patch(chatId, tempId, { sending: false, error: true });
      }
    },
    [chatId, currentUserId, add, patch],
  );

  const retryMessage = useCallback(
    (messageId: string) => {
      const msg = optimisticMessages.find((m) => m.id === messageId);
      if (msg && msg.error) {
        // Remove old message and retry
        remove(chatId, messageId);
        sendOptimisticMessage(msg.content);
      }
    },
    [optimisticMessages, sendOptimisticMessage, chatId, remove],
  );

  return {
    optimisticMessages,
    sendOptimisticMessage,
    retryMessage,
  };
}
