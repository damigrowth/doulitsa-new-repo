'use server';

import * as profilesApi from '@/lib/api/profiles';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

function parseJSON<T>(formData: FormData, key: string, fallback: T): T {
  const raw = formData.get(key);
  if (!raw || typeof raw !== 'string') return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export async function updateProfileAdditionalInfo(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const body: Record<string, unknown> = {};
  const rate = getFormString(formData, 'rate');
  if (rate) body.rate = Number(rate);
  if (formData.get('commencement') !== null) body.commencement = getFormString(formData, 'commencement') || null;
  if (formData.get('contactMethods') !== null) body.contactMethods = parseJSON<string[]>(formData, 'contactMethods', []);
  if (formData.get('paymentMethods') !== null) body.paymentMethods = parseJSON<string[]>(formData, 'paymentMethods', []);
  if (formData.get('settlementMethods') !== null) body.settlementMethods = parseJSON<string[]>(formData, 'settlementMethods', []);
  if (formData.get('budget') !== null) body.budget = getFormString(formData, 'budget') || null;
  if (formData.get('terms') !== null) body.terms = getFormString(formData, 'terms') || null;
  try {
    await profilesApi.updateAdditionalInfo(body);
    return { success: true, message: 'Τα στοιχεία ενημερώθηκαν' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
