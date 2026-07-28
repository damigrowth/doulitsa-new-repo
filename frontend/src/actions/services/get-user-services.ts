'use server';

import * as servicesApi from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type { UserServicesResponse } from '@/lib/types/services';

export type UserServiceFilterOptions = {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  subcategory?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export async function getUserServices(
  options: UserServiceFilterOptions = {},
): Promise<ActionResult<UserServicesResponse>> {
  try {
    return { success: true, data: (await servicesApi.getMyServices(options)) as UserServicesResponse };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function getUserServiceStats(): Promise<ActionResult<{
  total: number; draft: number; pending: number; published: number; rejected: number;
}>> {
  try {
    const data = (await servicesApi.getMyServiceStats()) as {
      total: number; draft: number; pending: number; published: number; rejected: number;
    };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
