'use server';

import * as servicesApi from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function updateServiceMedia(
  serviceId: number,
  formData: FormData,
): Promise<ActionResult<{ message: string }>> {
  const raw = formData.get('media');
  let media: unknown[] = [];
  if (raw && typeof raw === 'string') {
    try { media = JSON.parse(raw) as unknown[]; } catch { media = []; }
  }
  try {
    await servicesApi.updateServiceMedia(serviceId, media);
    return { success: true, data: { message: 'Τα media ενημερώθηκαν' } };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

/** Legacy alias — old components imported `updateServiceAction(id, formData)`. */
export async function updateServiceAction(serviceId: number, formData: FormData) {
  return updateServiceInfo(serviceId, formData);
}

export async function updateServiceInfo(
  serviceId: number,
  formData: FormData,
): Promise<ActionResult<{ message: string }>> {
  const get = (k: string) => formData.get(k);
  const getStr = (k: string) => String(get(k) ?? '');
  const getJSON = <T>(k: string, fallback: T): T => {
    const raw = get(k);
    if (!raw || typeof raw !== 'string') return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  };
  const body: Record<string, unknown> = {};
  if (getStr('title')) body.title = getStr('title');
  if (getStr('description')) body.description = getStr('description');
  if (getStr('category')) body.category = getStr('category');
  if (getStr('subcategory')) body.subcategory = getStr('subcategory');
  if (getStr('subdivision')) body.subdivision = getStr('subdivision');
  if (get('tags')) body.tags = getJSON<string[]>('tags', []);
  if (get('fixed') !== null) body.fixed = getStr('fixed') === 'true';
  if (get('price') !== null) body.price = Number(getStr('price') || 0);
  if (get('duration') !== null) body.duration = Number(getStr('duration') || 0);
  if (get('type')) body.type = getJSON('type', {});
  if (getStr('subscriptionType')) body.subscriptionType = getStr('subscriptionType');
  if (get('addons')) body.addons = getJSON<unknown[]>('addons', []);
  if (get('faq')) body.faq = getJSON<unknown[]>('faq', []);
  if (get('media')) body.media = getJSON('media', null);

  try {
    await servicesApi.updateService(serviceId, body);
    return { success: true, data: { message: 'Η υπηρεσία ενημερώθηκε' } };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
