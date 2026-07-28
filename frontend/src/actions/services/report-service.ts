'use server';

import * as servicesApi from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

export async function reportService(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const serviceId = Number(getFormString(formData, 'serviceId'));
  if (!serviceId) return { success: false, message: 'Λείπει το service id' };
  try {
    await servicesApi.reportService(serviceId, {
      serviceTitle: getFormString(formData, 'serviceTitle'),
      serviceSlug: getFormString(formData, 'serviceSlug'),
      description: getFormString(formData, 'description'),
    });
    return { success: true, message: 'Η αναφορά υποβλήθηκε' };
  } catch (err) {
    return { success: false, message: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
