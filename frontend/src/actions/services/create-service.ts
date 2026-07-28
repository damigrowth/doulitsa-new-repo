'use server';

import * as servicesApi from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';

function formToService(formData: FormData): Record<string, unknown> {
  const get = (k: string) => formData.get(k);
  const getStr = (k: string) => String(get(k) ?? '');
  const getJSON = <T>(k: string, fallback: T): T => {
    const raw = get(k);
    if (!raw || typeof raw !== 'string') return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  };
  return {
    title: getStr('title'),
    description: getStr('description'),
    category: getStr('category'),
    subcategory: getStr('subcategory'),
    subdivision: getStr('subdivision'),
    tags: getJSON<string[]>('tags', []),
    fixed: getStr('fixed') === 'true',
    price: Number(getStr('price') || 0),
    duration: Number(getStr('duration') || 0),
    type: getJSON('type', {}),
    subscriptionType: getStr('subscriptionType') || undefined,
    addons: getJSON<unknown[]>('addons', []),
    faq: getJSON<unknown[]>('faq', []),
    media: getJSON('media', null),
  };
}

export async function createServiceAction(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse & { serviceId?: number; serviceTitle?: string }> {
  try {
    const res = (await servicesApi.createService(formToService(formData))) as {
      serviceId: number; serviceTitle: string;
    };
    return {
      success: true,
      message: 'Η υπηρεσία υποβλήθηκε προς έλεγχο',
      serviceId: res.serviceId,
      serviceTitle: res.serviceTitle,
    };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function saveServiceAsDraftAction(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    await servicesApi.saveServiceDraft(formToService(formData));
    return { success: true, message: 'Draft αποθηκεύτηκε' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
