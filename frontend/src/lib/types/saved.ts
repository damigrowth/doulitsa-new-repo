/**
 * SAVED ITEMS TYPE DEFINITIONS
 * Types for saved services and profiles functionality
 */

import { ServiceCardData, ArchiveProfileCardData } from './components';

// Saved state for checking if items are saved (used in card components)
export interface SavedState {
  serviceIds: Set<number>;
  profileIds: Set<string>;
}

// Serializable saved state for passing from server to client components
export interface SavedStateSerializable {
  serviceIds: number[];
  profileIds: string[];
}

// Response from get-saved-items action (used in /dashboard/saved page)
export interface SavedItemsResponse {
  services: ServiceCardData[];
  profiles: ArchiveProfileCardData[];
}

// Parameters for toggle-save action
export interface ToggleSaveParams {
  itemType: 'service' | 'profile';
  itemId: string | number;
}

// Result from toggle-save action
export interface ToggleSaveResult {
  isSaved: boolean;
}
