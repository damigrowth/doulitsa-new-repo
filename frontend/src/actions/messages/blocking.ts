'use server';

import * as messagingApi from '@/lib/api/messaging';

export async function blockUser(_blockerId: string, blockedId: string): Promise<void> {
  await messagingApi.blockUser(blockedId);
}

export async function unblockUser(_blockerId: string, blockedId: string): Promise<void> {
  await messagingApi.unblockUser(blockedId);
}

export async function getBlockedUsers(_userId?: string) {
  try {
    return (await messagingApi.myBlockedUsers()) as unknown[];
  } catch {
    return [];
  }
}

export async function isBlocked(userId: string, otherUserId: string): Promise<boolean> {
  try {
    return Boolean(await messagingApi.isBlockedEither(otherUserId));
  } catch {
    return false;
  }
}
