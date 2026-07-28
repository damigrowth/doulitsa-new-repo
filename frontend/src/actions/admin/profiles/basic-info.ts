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

export async function updateProfileBasicInfoAdmin(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const profileId = getFormString(formData, 'profileId');
  if (!profileId) return { success: false, message: 'Λείπει το profileId' };
  const body: Record<string, unknown> = {
    tagline: getFormString(formData, 'tagline') || null,
    bio: getFormString(formData, 'bio') || null,
    category: getFormString(formData, 'category'),
    subcategory: getFormString(formData, 'subcategory'),
    speciality: getFormString(formData, 'speciality') || null,
    image: parseJSON(formData, 'image', null),
    skills: parseJSON<string[]>(formData, 'skills', []),
    coverage: parseJSON(formData, 'coverage', {}),
  };
  try {
    await adminProfiles.updateBasicInfo(profileId, body);
    // OLD revalidated public caches after the write (actions/admin/profiles/
    // basic-info.ts:136-158). Best-effort replication via the project's
    // existing Next.js revalidation mechanism.
    await revalidateAllCaches().catch(() => undefined);
    return { success: true, message: 'Τα στοιχεία ενημερώθηκαν' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
