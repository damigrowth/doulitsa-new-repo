'use server';

import * as messagingApi from '@/lib/api/messaging';

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    // Since the timestamptz migration Django emits aware ISO strings
    // ("...+00:00"); only naive strings (no Z / ±hh:mm suffix) still need the
    // UTC marker appended. Appending Z to an aware string made an Invalid Date.
    const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/.test(v);
    const d = new Date(hasTz ? v : `${v}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v as number);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeReactions = (raw: unknown, currentUserId?: string) => {
  // Backend stores reactions as { emoji: [userIds], … }; the chat-messages
  // component expects an array of { emoji, userIds, count, hasReacted }.
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw as Record<string, string[]>).map(([emoji, userIds]) => ({
    emoji,
    userIds: userIds ?? [],
    count: (userIds ?? []).length,
    hasReacted: !!(currentUserId && (userIds ?? []).includes(currentUserId)),
  }));
};

const normalizeMessage = (m: any, currentUserId?: string) => {
  if (!m || typeof m !== 'object') return m;
  // Backend ships `authorId` (Django: `author_id` → camelCase). The
  // chat-messages component decides bubble color + alignment from
  // `isOwn`, which has to be computed against the viewing user.
  const authorUid = m.authorUid ?? m.authorId ?? null;
  const isOwn = !!(currentUserId && authorUid === currentUserId);
  return {
    ...m,
    authorUid,
    authorId: m.authorId ?? authorUid,
    isOwn,
    // OLD `transformMessageForChat` (utils/messages.ts:78): own messages are
    // always "read"; for others use the backend `read` flag. Drives the live
    // "seen" tick on own bubbles.
    isRead: isOwn || Boolean(m.read ?? m.isRead),
    createdAt: toDate(m.createdAt),
    editedAt: toDate(m.editedAt),
    reactions: normalizeReactions(m.reactions, currentUserId),
    replyTo: m.replyTo ? normalizeMessage(m.replyTo, currentUserId) : null,
  };
};

export async function getMessages(
  chatId: string,
  currentUserId?: string,
  options: { limit?: number; before?: string } = {},
) {
  const raw = (await messagingApi.listMessages(chatId, options)) as any[];
  return Array.isArray(raw) ? raw.map((m) => normalizeMessage(m, currentUserId)) : [];
}

export async function sendMessage(
  chatId: string,
  content: string,
  _authorUid?: string,
  replyToId?: string,
) {
  return await messagingApi.sendMessage(chatId, { content, replyToId });
}

export async function editMessage(messageId: string, content: string, _userId?: string): Promise<void> {
  await messagingApi.editMessage(messageId, content);
}

export async function deleteMessage(messageId: string, _userId?: string): Promise<void> {
  await messagingApi.deleteMessage(messageId);
}

export async function markAsRead(messageIds: string[], _userId?: string): Promise<void> {
  if (messageIds.length === 0) return;
  await messagingApi.markRead(messageIds);
}

export async function getUnreadCount(chatId: string, _userId?: string): Promise<number> {
  try {
    return Number(await messagingApi.chatUnreadCount(chatId));
  } catch {
    return 0;
  }
}

export async function getUnreadCountsBatch(chatIds: string[], _userId?: string): Promise<Map<string, number>> {
  if (chatIds.length === 0) return new Map();
  try {
    const obj = await messagingApi.batchUnread(chatIds);
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

export async function getTotalUnreadCount(_userId?: string): Promise<number> {
  try {
    return Number(await messagingApi.totalUnread());
  } catch {
    return 0;
  }
}

export async function getRecentUnreadMessages(_userId: string, minutes = 15) {
  try {
    return ((await messagingApi.recentUnread(minutes)) as { messages: unknown[] }).messages;
  } catch {
    return [];
  }
}
