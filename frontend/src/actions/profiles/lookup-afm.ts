'use server';

import * as profilesApi from '@/lib/api/profiles';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

/**
 * Greek tax-registry (AADE) lookup result. Field names are the AADE keys,
 * returned verbatim by the Django AFM lookup service
 * (apps/profiles/services/afm_lookup.py:88-96). Every field is a string
 * (missing values come back as '').
 */
export interface AfmLookupResult {
  onomasia: string;
  doy_descr: string;
  firm_act_descr: string;
  postal_address: string;
  postal_address_no: string;
  postal_zip_code: string;
  postal_area_description: string;
}

export async function lookupAfm(afm: string): Promise<ActionResult<AfmLookupResult>> {
  if (!afm || !/^\d{9}$/.test(afm)) {
    return { success: false, error: 'Το ΑΦΜ πρέπει να είναι 9 ψηφία' };
  }
  try {
    const data = (await profilesApi.lookupAfm(afm)) as AfmLookupResult;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
