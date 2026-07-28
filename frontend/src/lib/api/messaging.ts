/** Messaging API — talks to Django's /api/chats/* /messages/* /users/* /presence/*. */
import { api, API_BASE_URL, getAccessToken } from './client';

// ---- chats ---------------------------------------------------------------

export const listChats = () => api.get('/chats');
export const getChat = (chatId: string) => api.get(`/chats/${chatId}`);
export const getOrCreateDm = (otherUserId: string) =>
  api.post(`/chats/with/${otherUserId}`);

// ---- messages -----------------------------------------------------------

export const listMessages = (chatId: string, params: { limit?: number; before?: string } = {}) =>
  api.get(`/chats/${chatId}/messages`, { query: params });

export const sendMessage = (chatId: string, body: { content: string; replyToId?: string }) =>
  api.post(`/chats/${chatId}/messages`, body);

export const editMessage = (messageId: string, content: string) =>
  api.patch(`/messages/${messageId}`, { content });

export const deleteMessage = (messageId: string) =>
  api.delete(`/messages/${messageId}`);

export const markRead = (messageIds: string[]) =>
  api.post('/messages/mark-read', { messageIds });

// ---- unread ---------------------------------------------------------------

export const chatUnreadCount = (chatId: string) =>
  api.get<number>(`/chats/${chatId}/unread/count`);

export const batchUnread = (chatIds: string[]) =>
  api.post<Record<string, number>>('/chats/unread/counts', { chatIds });

export const totalUnread = () => api.get<number>('/chats/unread/total');

export const recentUnread = (minutes = 15) =>
  api.get('/chats/me/recent-unread', { query: { minutes } });

// ---- blocking -----------------------------------------------------------

export const blockUser = (userId: string, reason?: string) =>
  api.post(`/users/${userId}/block`, { reason });
export const unblockUser = (userId: string) =>
  api.delete(`/users/${userId}/block`);
export const myBlockedUsers = () => api.get('/users/me/blocked');
export const isBlockedEither = (userId: string) =>
  api.get<boolean>(`/users/${userId}/blocked-status`);

// ---- presence -----------------------------------------------------------

export const setMyPresence = (online: boolean) =>
  api.post('/presence', { online });
export const getUserPresence = (userId: string) =>
  api.get(`/users/${userId}/presence`);
export const myChatsPresenceSummary = () =>
  api.get('/chats/me/presence-summary');

// ---- reactions ----------------------------------------------------------

export const toggleReaction = (messageId: string, emoji: string) =>
  api.post(`/messages/${messageId}/reactions/toggle`, { emoji });
export const addReaction = (messageId: string, emoji: string) =>
  api.post(`/messages/${messageId}/reactions`, { emoji });
export const removeReaction = (messageId: string, emoji: string) =>
  api.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);

// ---- WebSocket helpers ---------------------------------------------------

/**
 * Build the WebSocket URL for a given chat room. The token is appended as a
 * query parameter (browsers don't allow Authorization headers on the
 * WebSocket constructor).
 */
/**
 * Resolve the access token for the WebSocket query param. In the browser the
 * token lives in an httpOnly cookie that JS can't read AND the cookie isn't
 * sent to the API subdomain — so fetch it from the same-origin
 * /api/auth/ws-token route (which reads the cookie server-side). Without this
 * the WS connects unauthenticated, the server closes it, and sent messages only
 * appear after a manual refresh. On the server, read the cookie directly.
 */
async function wsToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/auth/ws-token', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as { token?: string | null };
      return data.token ?? null;
    } catch {
      return null;
    }
  }
  return getAccessToken();
}
