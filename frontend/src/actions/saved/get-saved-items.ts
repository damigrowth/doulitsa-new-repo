'use server';

import * as savedApi from '@/lib/api/saved';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type {
  ArchiveProfileCardData,
  ServiceCardData,
} from '@/lib/types/components';

export interface SavedItemsResponse {
  services: ServiceCardData[];
  profiles: ArchiveProfileCardData[];
  servicesTotal?: number;
  profilesTotal?: number;
  servicesTotalPages?: number;
  profilesTotalPages?: number;
}

const empty = (): SavedItemsResponse => ({
  services: [],
  profiles: [],
  servicesTotal: 0,
  profilesTotal: 0,
  servicesTotalPages: 1,
  profilesTotalPages: 1,
});

export async function getSavedItems(
  options: {
    servicesPage?: number;
    servicesLimit?: number;
    profilesPage?: number;
    profilesLimit?: number;
  } = {},
): Promise<ActionResult<SavedItemsResponse>> {
  try {
    const data = (await savedApi.getSavedItems(options)) as SavedItemsResponse;
    // Resolve taxonomy ids → labels + coverage ids → names on the saved cards,
    // same as the archive/directory cards (otherwise they show raw ids).
    const { enrichServiceCard, enrichProfileCard } = await import('@/lib/taxonomies/enrich');
    const enrichServiceRow = (s: ServiceCardData): ServiceCardData => {
      const e = enrichServiceCard(s);
      return e.profile && typeof e.profile === 'object'
        ? { ...e, profile: enrichProfileCard(e.profile) }
        : e;
    };
    const services = (data.services ?? []).map(enrichServiceRow);
    const profiles = (data.profiles ?? []).map((p) => enrichProfileCard(p));
    return { success: true, data: { ...empty(), ...data, services, profiles } };
  } catch (err) {
    // Anonymous / expired session — treat as no saved items, not an error.
    if (err instanceof ApiError && err.status === 401) {
      return { success: true, data: empty() };
    }
    return {
      success: false,
      error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου',
    };
  }
}
