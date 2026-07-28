'use server';

import { adminChats } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export interface AdminChatStats {
  totalChats: number;
  totalMessages: number;
  messagesToday: number;
  totalChatMembers: number;
}

/** A chat participant as returned by `_member` (apps/messaging/views/admin/chats). */
export interface AdminChatMember {
  userId: string | null;
  email: string | null;
  displayName: string | null;
}

export interface AdminChatDetailStats {
  totalMessages: number;
  messagesToday: number;
  creator: AdminChatMember | null;
  member: AdminChatMember | null;
}

const wrap = async <T>(fn: () => Promise<T>): Promise<ActionResult<T>> => {
  try {
    return { success: true, data: await fn() };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
};

export async function getAdminChatStats(): Promise<ActionResult<AdminChatStats>> {
  return wrap(() => adminChats.stats() as Promise<AdminChatStats>);
}

export async function getAdminChats(query: Record<string, unknown> = {}) {
  return wrap(() => adminChats.list(query));
}

export async function getAdminChatById(chatId: string) {
  return wrap(() => adminChats.get(chatId));
}

export async function getAdminChatDetailStats(chatId: string): Promise<ActionResult<AdminChatDetailStats>> {
  return wrap(() => adminChats.chatStats(chatId) as Promise<AdminChatDetailStats>);
}

export async function getAdminChatMessages(chatId: string, query: Record<string, unknown> = {}) {
  return wrap(() => adminChats.messages(chatId, query));
}
