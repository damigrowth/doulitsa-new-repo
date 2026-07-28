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

export async function updateProfileBasicInfo(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    await profilesApi.updateBasicInfo({
      tagline: getFormString(formData, 'tagline') || null,
      bio: getFormString(formData, 'bio') || null,
      category: getFormString(formData, 'category'),
      subcategory: getFormString(formData, 'subcategory'),
      speciality: getFormString(formData, 'speciality') || null,
      image: parseJSON(formData, 'image', null),
      skills: parseJSON<string[]>(formData, 'skills', []),
      coverage: parseJSON(formData, 'coverage', {}),
    });
    return { success: true, message: 'Τα βασικά στοιχεία ενημερώθηκαν επιτυχώς!' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
