'use server';

import { adminProfiles } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';
import { revalidateAllCaches } from '@/actions/admin/revalidate-caches';

/**
 * Admin variant of additional-info update. Routes through the dedicated
 * /admin/profiles/{id}/additional-info endpoint, which derives `experience`
 * from `commencement` (mirrors OLD actions/admin/profiles/additional-info.ts).
 */
function parseJSON<T>(formData: FormData, key: string, fallback: T): T {
  const raw = formData.get(key);
  if (!raw || typeof raw !== 'string') return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export async function updateProfileAdditionalInfoAdmin(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const profileId = getFormString(formData, 'profileId');
  if (!profileId) return { success: false, message: 'Λείπει το profileId' };

  const body: Record<string, unknown> = {};
  if (formData.get('rate')) body.rate = Number(getFormString(formData, 'rate'));
  if (formData.get('commencement') !== null) body.commencement = getFormString(formData, 'commencement') || null;
  if (formData.get('contactMethods') !== null) body.contactMethods = parseJSON<string[]>(formData, 'contactMethods', []);
  if (formData.get('paymentMethods') !== null) body.paymentMethods = parseJSON<string[]>(formData, 'paymentMethods', []);
  if (formData.get('settlementMethods') !== null) body.settlementMethods = parseJSON<string[]>(formData, 'settlementMethods', []);
  if (formData.get('budget') !== null) body.budget = getFormString(formData, 'budget') || null;
  if (formData.get('terms') !== null) body.terms = getFormString(formData, 'terms') || null;

  try {
    await adminProfiles.updateAdditionalInfo(profileId, body);
    // OLD revalidated public caches after the write
    // (actions/admin/profiles/additional-info.ts:122-142).
    await revalidateAllCaches().catch(() => undefined);
    return { success: true, message: 'Τα στοιχεία ενημερώθηκαν' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
