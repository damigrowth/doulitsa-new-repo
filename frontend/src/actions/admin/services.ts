'use server';

import { adminServices } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import { revalidatePublicService } from '@/lib/cache/revalidation';
import type { ActionResult } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export interface AdminUpdateServiceInput {
  serviceId: number;
  [k: string]: unknown;
}
export interface AdminToggleServiceInput { serviceId: number; }
export interface AdminDeleteServiceInput { serviceId: number; }

const wrap = async <T>(fn: () => Promise<T>): Promise<ActionResult<T>> => {
  try { return { success: true, data: await fn() }; }
  catch (err) { return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' }; }
};

const fdId = (formData: FormData): number => Number(getFormString(formData, 'serviceId'));
const fdJSON = <T>(formData: FormData, key: string, fallback: T): T => {
  const raw = formData.get(key);
  if (!raw || typeof raw !== 'string') return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
};

export async function listServices(query: Record<string, unknown> = {}) {
  return wrap(() => adminServices.list(query));
}

export async function getService(serviceId: number) {
  return wrap(() => adminServices.get(serviceId));
}

export async function updateService(params: AdminUpdateServiceInput) {
  const { serviceId, ...rest } = params;
  const res = await wrap(() => adminServices.update(serviceId, rest));
  if (res.success) await revalidatePublicService(serviceId);
  return res;
}

export async function updateServiceTaxonomyAction(
  prevState: ActionResult<unknown> | null, formData: FormData,
) {
  return wrap(() => adminServices.taxonomy(fdId(formData), {
    category: getFormString(formData, 'category'),
    subcategory: getFormString(formData, 'subcategory'),
    subdivision: getFormString(formData, 'subdivision'),
    tags: fdJSON<string[]>(formData, 'tags', []),
  }));
}

export async function updateServiceBasicAction(
  prevState: ActionResult<unknown> | null, formData: FormData,
) {
  return wrap(() => adminServices.basic(fdId(formData), {
    title: getFormString(formData, 'title'),
    description: getFormString(formData, 'description'),
  }));
}

export async function updateServicePricingAction(
  prevState: ActionResult<unknown> | null, formData: FormData,
) {
  return wrap(() => adminServices.pricing(fdId(formData), {
    price: Number(getFormString(formData, 'price') || 0),
    fixed: getFormString(formData, 'fixed') === 'true',
    duration: Number(getFormString(formData, 'duration') || 0),
    subscriptionType: getFormString(formData, 'subscriptionType') || undefined,
  }));
}

export async function updateServiceSettingsAction(
  prevState: ActionResult<unknown> | null, formData: FormData,
) {
  const body: Record<string, unknown> = {};
  if (formData.get('status')) body.status = getFormString(formData, 'status');
  if (formData.get('featured') !== null) body.featured = getFormString(formData, 'featured') === 'true';
  return wrap(() => adminServices.settings(fdId(formData), body));
}

export async function updateServiceAddonsAction(
  prevState: ActionResult<unknown> | null, formData: FormData,
) {
  return wrap(() => adminServices.addons(fdId(formData), fdJSON<unknown[]>(formData, 'addons', [])));
}

export async function updateServiceFaqAction(
  prevState: ActionResult<unknown> | null, formData: FormData,
) {
  return wrap(() => adminServices.faq(fdId(formData), fdJSON<unknown[]>(formData, 'faq', [])));
}

export async function updateServiceMedia(
  serviceId: number, formData: FormData,
) {
  return wrap(() => adminServices.media(serviceId, fdJSON<unknown[]>(formData, 'media', [])));
}

export async function togglePublished(params: AdminToggleServiceInput) {
  return wrap(() => adminServices.togglePublished(params.serviceId));
}

export async function toggleFeatured(params: AdminToggleServiceInput) {
  const res = await wrap(() => adminServices.toggleFeatured(params.serviceId));
  if (res.success) await revalidatePublicService(params.serviceId);
  return res;
}

export async function updateServiceStatus(input: {
  serviceId: number; status: string; rejectionReason?: string;
}) {
  const { serviceId, ...rest } = input;
  const res = await wrap(() => adminServices.status(serviceId, rest));
  if (res.success) await revalidatePublicService(serviceId, { countsChanged: true });
  return res;
}

export async function deleteService(params: AdminDeleteServiceInput) {
  const res = await wrap(() => adminServices.delete(params.serviceId));
  if (res.success) await revalidatePublicService(params.serviceId, { countsChanged: true });
  return res;
}

export async function getServiceStats() {
  return wrap(() => adminServices.stats());
}

export async function createServiceForProfile(
  prevState: ActionResult<unknown> | null, formData: FormData,
) {
  const body: Record<string, unknown> = {
    profileId: getFormString(formData, 'profileId'),
    title: getFormString(formData, 'title'),
    description: getFormString(formData, 'description'),
    category: getFormString(formData, 'category'),
    subcategory: getFormString(formData, 'subcategory'),
    subdivision: getFormString(formData, 'subdivision'),
    tags: fdJSON<string[]>(formData, 'tags', []),
    fixed: getFormString(formData, 'fixed') === 'true',
    price: Number(getFormString(formData, 'price') || 0),
    duration: Number(getFormString(formData, 'duration') || 0),
    type: fdJSON(formData, 'type', {}),
    subscriptionType: getFormString(formData, 'subscriptionType') || undefined,
    addons: fdJSON<unknown[]>(formData, 'addons', []),
    faq: fdJSON<unknown[]>(formData, 'faq', []),
    media: fdJSON(formData, 'media', null),
  };
  return wrap(() => adminServices.createForProfile(body));
}
