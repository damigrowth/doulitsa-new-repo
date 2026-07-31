'use server';

import { adminSubscriptions } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

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
  return wrap(() => adminSubscriptions.status(input.subscriptionId, input.status));
}

export async function deleteSubscription(params: AdminDeleteSubscriptionInput) {
  return wrap(() => adminSubscriptions.delete(params.subscriptionId));
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
  return wrap(() => adminSubscriptions.manual({
    profileId: input.profileId,
    endDate: input.endDate instanceof Date ? input.endDate.toISOString() : input.endDate,
  }));
}


export async function getSubscriptionPayments(subscriptionId: string, page = 1) {
  return adminSubscriptions.payments(subscriptionId, page);
}
