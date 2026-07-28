/**
 * React Hook: usePresence
 *
 * Connects to `/ws/presence/`. Connecting marks the user online; the same
 * socket also delivers `presence` broadcasts for everyone in the chats the
 * user is a member of, which we surface as a Map keyed by userId.
 */

'use client';

import { useEffect, useState } from 'react';
import { openChannelsSocket, type ChannelsSocket } from '@/lib/realtime/channels-ws';

interface UsePresenceOptions {
  userId: string;
  chatId?: string;
  enabled?: boolean;
}

interface PresenceState {
  online: boolean;
  lastSeen: Date;
}

export function usePresence({ userId, enabled = true }: UsePresenceOptions) {
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceState>>(
    new Map(),
  );

  useEffect(() => {
    if (!enabled || !userId) return;

    let socket: ChannelsSocket | null = null;
    socket = openChannelsSocket(`/ws/presence/`, {
      presence: (payload: any) => {
        if (!payload?.userId) return;
        setPresenceMap((prev) => {
          const next = new Map(prev);
          next.set(payload.userId, {
            online: Boolean(payload.online),
            lastSeen: payload.lastSeen ? new Date(payload.lastSeen) : new Date(),
          });
          return next;
        });
      },
    });

    return () => {
      socket?.close();
    };
  }, [userId, enabled]);

  return { presenceMap };
}
