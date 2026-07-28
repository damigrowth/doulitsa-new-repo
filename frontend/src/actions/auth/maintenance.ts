'use server';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export async function getMaintenanceStatus(): Promise<
  ActionResult<{ isUnderMaintenance: boolean; message?: string | null }>
> {
  try {
    const res = await authApi.getMaintenanceStatus();
    return {
      success: true,
      data: { isUnderMaintenance: res.isUnderMaintenance, message: res.message },
    };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function canAccessApplication(): Promise<ActionResult<boolean>> {
  const status = await getMaintenanceStatus();
  if (!status.success) return { success: false, error: status.error };
  return { success: true, data: !status.data!.isUnderMaintenance };
}
