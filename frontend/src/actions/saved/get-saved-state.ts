'use server';

import * as savedApi from '@/lib/api/saved';
import { ApiError } from '@/lib/api/client';

export async function getUserSavedState(_userId?: string): Promise<{
  serviceIds: Set<number>;
  profileIds: Set<string>;
}> {
  // userId arg ignored — Django infers from JWT.
  try {
    const res = await savedApi.getSavedState();
    return {
      serviceIds: new Set(res.serviceIds.map((id) => Number(id))),
      profileIds: new Set(res.profileIds),
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { serviceIds: new Set(), profileIds: new Set() };
    }
    return { serviceIds: new Set(), profileIds: new Set() };
  }
}
