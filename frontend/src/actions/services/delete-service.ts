'use server';

import * as servicesApi from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import { revalidatePublicService } from '@/lib/cache/revalidation';
import type { ActionResult } from '@/lib/types/api';

export async function deleteService(input: { serviceId: number }): Promise<ActionResult<undefined>> {
  try {
    await servicesApi.deleteService(input.serviceId);
    await revalidatePublicService(input.serviceId, { countsChanged: true });
    return { success: true, data: undefined, message: 'Η υπηρεσία διαγράφηκε' };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function archiveService(input: { serviceId: number }): Promise<ActionResult<undefined>> {
  try {
    await servicesApi.archiveService(input.serviceId);
    await revalidatePublicService(input.serviceId, { countsChanged: true });
    return { success: true, data: undefined, message: 'Η υπηρεσία αρχειοθετήθηκε' };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
