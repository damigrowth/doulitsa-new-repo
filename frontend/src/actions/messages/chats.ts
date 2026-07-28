'use server';

import * as messagingApi from '@/lib/api/messaging';
import { ApiError } from '@/lib/api/client';
import type {
  ChatListItem,
  ChatListLastMessage,
  MessageReaction,
} from '@/lib/types/messages';

/**
 * Raw chat-list row as shipped by Django `list_chats`
 * (apps/messaging/services/chat_ops.py:126) — date columns are ISO strings,
 * reactions arrive as a `{emoji: userIds[]}` dict, and `lastMessage` is the
 * nested `_msg_card`. `normalizeChat` coerces these to {@link ChatListItem}.
 */
interface RawLastMessage {
  id: string;
  chatId: string;
  authorId: string;
  authorUid: string;
  content: string | null;
  deleted: boolean;
  edited: boolean;
  editedAt: string | null;
  replyToId: string | null;
  reactions: Record<string, string[]> | MessageReaction[] | null;
  read: boolean;
  createdAt: string | null;
}

interface RawChat {
  id: string;
  cid: string | null;
  name: string | null;
  displayName: string | null;
  image: string | null;
  avatar: string | null;
  username: string | null;
  otherUserId: string | null;
  otherMemberId: string | null;
  online: boolean;
  lastActivity: string | null;
  unread: number;
  unreadCount: number;
  lastMessage: RawLastMessage | null;
}

const toDate = (v: string | Date | null | undefined): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  // Since the timestamptz migration Django emits aware ISO strings
  // ("...+00:00"); only naive strings (no Z / ±hh:mm suffix) still need the
  // UTC marker appended. Appending Z to an aware string made an Invalid Date.
  const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/.test(v);
  const d = new Date(hasTz ? v : `${v}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeReactions = (
  reactions: RawLastMessage['reactions'],
): MessageReaction[] =>
  Array.isArray(reactions)
    ? reactions
    : Object.entries((reactions ?? {}) as Record<string, string[]>).map(
        ([emoji, userIds]) => ({
          emoji,
          userIds: userIds ?? [],
          count: (userIds ?? []).length,
          hasReacted: false,
        }),
      );

const normalizeChat = (chat: RawChat): ChatListItem => {
  const lastMessage: ChatListLastMessage | null = chat.lastMessage
    ? {
        ...chat.lastMessage,
        editedAt: toDate(chat.lastMessage.editedAt),
        createdAt: toDate(chat.lastMessage.createdAt),
        reactions: normalizeReactions(chat.lastMessage.reactions),
      }
    : null;
  return {
    id: chat.id,
    cid: chat.cid,
    name: chat.name,
    displayName: chat.displayName,
    image: chat.image,
    avatar: chat.avatar,
    username: chat.username,
    lastMessage,
    lastActivity: toDate(chat.lastActivity),
    unread: chat.unread,
    unreadCount: chat.unreadCount,
    online: chat.online,
    otherUserId: chat.otherUserId,
    otherMemberId: chat.otherMemberId,
  };
};

export async function getChats(_userId?: string): Promise<ChatListItem[]> {
  // userId arg ignored — Django determines from JWT.
  try {
    const raw = (await messagingApi.listChats()) as RawChat[];
    return Array.isArray(raw) ? raw.map(normalizeChat) : [];
  } catch {
    return [];
  }
}

export async function getChatById(chatId: string, _userId?: string) {
  try {
    return await messagingApi.getChat(chatId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getOrCreateChat(_userId: string, otherUserId: string) {
  return (await messagingApi.getOrCreateDm(otherUserId)) as { chatId: string; isNew: boolean };
}
