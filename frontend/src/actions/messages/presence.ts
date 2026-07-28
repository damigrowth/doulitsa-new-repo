'use server';

import * as messagingApi from '@/lib/api/messaging';

export async function updatePresence(_userId: string, online: boolean): Promise<void> {
  try {
    await messagingApi.setMyPresence(online);
  } catch { /* presence is best-effort */ }
}

export async function getPresenceStatus(userId: string) {
  try {
    return (await messagingApi.getUserPresence(userId)) as { online: boolean; lastSeen: Date };
  } catch {
    return { online: false, lastSeen: new Date(0) };
  }
}

export async function getUserChatsWithPresence(_userId?: string) {
  try {
    return (await messagingApi.myChatsPresenceSummary()) as { chatId: string; online: boolean }[];
  } catch {
    return [];
  }
}
