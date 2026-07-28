'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

function parseJSON<T>(formData: FormData, key: string, fallback: T): T {
  const raw = formData.get(key);
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function completeOnboarding(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const bio = getFormString(formData, 'bio');
  const category = getFormString(formData, 'category');
  const subcategory = getFormString(formData, 'subcategory');
  if (!bio || bio.length < 20 || !category || !subcategory) {
    return { success: false, message: 'Συμπλήρωσε όλα τα υποχρεωτικά πεδία' };
  }
  try {
    const res = await authApi.completeOnboarding({
      bio,
      category,
      subcategory,
      coverage: parseJSON(formData, 'coverage', {}),
      portfolio: parseJSON<unknown[]>(formData, 'portfolio', []),
      image: parseJSON(formData, 'image', null),
    });
    return { success: true, message: res.message };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
