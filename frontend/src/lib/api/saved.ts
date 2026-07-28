/** Saved-items API — talks to Django's /api/saved/*. */
import { api } from './client';

export const toggleSave = (itemType: 'service' | 'profile', itemId: string | number) =>
  api.post<{ isSaved: boolean }>('/saved/toggle', { itemType, itemId: String(itemId) });

export const getSavedItems = (params: {
  servicesPage?: number;
  servicesLimit?: number;
  profilesPage?: number;
  profilesLimit?: number;
} = {}) => api.get('/saved', { query: params });

export const getSavedState = () =>
  api.get<{ serviceIds: (string | number)[]; profileIds: string[] }>('/saved/state');
