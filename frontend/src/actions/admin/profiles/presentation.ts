'use server';

import { adminProfiles } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';
import { revalidateAllCaches } from '@/actions/admin/revalidate-caches';

function parseJSON<T>(formData: FormData, key: string, fallback: T): T {
  const raw = formData.get(key);
  if (!raw || typeof raw !== 'string') return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export async function updateProfilePresentationAdmin(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const profileId = getFormString(formData, 'profileId');
  if (!profileId) return { success: false, message: 'Λείπει το profileId' };
  const body: Record<string, unknown> = {};
  if (formData.get('phone') !== null) body.phone = getFormString(formData, 'phone') || null;
  if (formData.get('website') !== null) body.website = getFormString(formData, 'website') || null;
  if (formData.get('viber') !== null) body.viber = getFormString(formData, 'viber') || null;
  if (formData.get('whatsapp') !== null) body.whatsapp = getFormString(formData, 'whatsapp') || null;
  if (formData.get('visibility') !== null) body.visibility = parseJSON(formData, 'visibility', null);
  if (formData.get('socials') !== null) body.socials = parseJSON(formData, 'socials', null);
  try {
    await adminProfiles.updatePresentation(profileId, body);
    // OLD revalidated public caches after the write
    // (actions/admin/profiles/presentation.ts:124-140).
    await revalidateAllCaches().catch(() => undefined);
    return { success: true, message: 'Τα στοιχεία προβολής ενημερώθηκαν' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
