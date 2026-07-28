'use server';

import { adminApi } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

const wrap = async <T>(fn: () => Promise<T>): Promise<ActionResult<T>> => {
  try { return { success: true, data: await fn() }; }
  catch (err) { return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' }; }
};

export async function validateAdminApiKey(data: { apiKey: string }) {
  return wrap(() => adminApi.validateKey(data.apiKey));
}

export async function createAdminApiKey(data: {
  name: string;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
}) {
  return wrap(() => adminApi.create(data));
}

export async function listAdminApiKeys() {
  return wrap(() => adminApi.list() as Promise<unknown[]>);
}

export async function updateAdminApiKey(
  keyId: string,
  data: { name?: string; enabled?: boolean },
) {
  return wrap(() => adminApi.update(keyId, data));
}

export async function deleteAdminApiKey(keyId: string) {
  return wrap(async () => { await adminApi.delete(keyId); });
}

export async function checkAdminApiAccess() {
  return wrap(() => adminApi.myAccess() as Promise<{ hasAccess: boolean; user?: unknown }>);
}
