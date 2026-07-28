'use server';

import * as messagingApi from '@/lib/api/messaging';
import { ApiError } from '@/lib/api/client';

export async function toggleReaction(
  messageId: string, _userId: string, emoji: string,
): Promise<{ success: boolean; reactions: Record<string, string[]> }> {
  try {
    const res = (await messagingApi.toggleReaction(messageId, emoji)) as {
      reactions: Record<string, string[]>;
    };
    return { success: true, reactions: res.reactions };
  } catch (err) {
    return {
      success: false,
      reactions: {},
    };
  }
}

export async function addReaction(
  messageId: string, _userId: string, emoji: string,
): Promise<{ success: boolean }> {
  try {
    await messagingApi.addReaction(messageId, emoji);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function removeReaction(
  messageId: string, _userId: string, emoji: string,
): Promise<{ success: boolean }> {
  try {
    await messagingApi.removeReaction(messageId, emoji);
    return { success: true };
  } catch {
    return { success: false };
  }
}
