'use server';

import { adminSubscriptions } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';
import { revalidatePublicProfile } from '@/lib/cache/revalidation';

export interface AdminDeleteSubscriptionInput { subscriptionId: string; }

const wrap = async <T>(fn: () => Promise<T>): Promise<ActionResult<T>> => {
  try { return { success: true, data: await fn() }; }
  catch (err) { return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' }; }
};

export async function listSubscriptions(query: Record<string, unknown> = {}) {
  return wrap(() => adminSubscriptions.list(query));
}

export async function getSubscription(subscriptionId: string) {
  return wrap(() => adminSubscriptions.get(subscriptionId));
}

export async function updateSubscriptionStatus(input: { subscriptionId: string; status: string }) {
  const res = await wrap(() => adminSubscriptions.status(input.subscriptionId, input.status));
  if (res.success) await revalidatePublicProfile();
  return res;
}

export async function deleteSubscription(params: AdminDeleteSubscriptionInput) {
  const res = await wrap(() => adminSubscriptions.delete(params.subscriptionId));
  if (res.success) await revalidatePublicProfile();
  return res;
}

export async function getSubscriptionStats() {
  return wrap(() => adminSubscriptions.stats());
}

export async function updateSubscriptionStatusAction(
  prevState: ActionResult<unknown> | null,
  formData: FormData,
) {
  return updateSubscriptionStatus({
    subscriptionId: getFormString(formData, 'subscriptionId'),
    status: getFormString(formData, 'status'),
  });
}

export async function createManualSubscription(input: { profileId: string; endDate: Date | string }) {
  const res = await wrap(() => adminSubscriptions.manual({
    profileId: input.profileId,
    endDate: input.endDate instanceof Date ? input.endDate.toISOString() : input.endDate,
  }));
  if (res.success) await revalidatePublicProfile();
  return res;
}


export async function getSubscriptionPayments(subscriptionId: string, page = 1) {
  return adminSubscriptions.payments(subscriptionId, page);
}
