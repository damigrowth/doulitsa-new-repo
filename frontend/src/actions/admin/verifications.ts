'use server';

import { adminVerifications } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

const wrap = async <T>(fn: () => Promise<T>): Promise<ActionResult<T>> => {
  try { return { success: true, data: await fn() }; }
  catch (err) { return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' }; }
};

export async function listVerifications(query: Record<string, unknown> = {}) {
  return wrap(() => adminVerifications.list(query));
}

export async function getVerification(verificationId: string) {
  return wrap(() => adminVerifications.get(verificationId));
}

export async function updateVerificationStatus(input: {
  verificationId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
}) {
  const { verificationId, ...rest } = input;
  return wrap(() => adminVerifications.updateStatus(verificationId, rest));
}

export async function deleteVerification(input: { verificationId: string }) {
  return wrap(() => adminVerifications.delete(input.verificationId));
}

export async function getVerificationStats() {
  return wrap(() => adminVerifications.stats());
}

export async function updateVerificationStatusAction(
  prevState: ActionResult<unknown> | null,
  formData: FormData,
) {
  return updateVerificationStatus({
    verificationId: getFormString(formData, 'verificationId'),
    status: getFormString(formData, 'status') as 'PENDING' | 'APPROVED' | 'REJECTED',
    notes: getFormString(formData, 'notes') || undefined,
  });
}
