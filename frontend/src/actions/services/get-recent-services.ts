'use server';

import * as servicesApi from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

/**
 * A recently-touched service as listed in the dashboard sidebar nav.
 * Matches the `{ id, title }` rows returned by the Django recent-services
 * endpoint.
 */
export interface RecentService {
  id: number;
  title: string;
}

export async function getRecentServices(): Promise<ActionResult<{ services: RecentService[] }>> {
  try {
    const data = (await servicesApi.getRecentServices()) as { services: RecentService[] };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
