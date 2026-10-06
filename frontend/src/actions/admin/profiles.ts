'use server';

import { adminProfiles } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';
import { revalidatePublicProfile } from '@/lib/cache/revalidation';

export interface AdminUpdateProfileInput {
  profileId: string;
  displayName?: string;
  tagline?: string;
  bio?: string;
  category?: string;
  subcategory?: string;
  speciality?: string;
  image?: string;
  skills?: string[];
}

export interface AdminToggleProfileInput { profileId: string; }
export interface AdminDeleteProfileInput { profileId: string; }

const wrap = async <T>(fn: () => Promise<T>): Promise<ActionResult<T>> => {
  try { return { success: true, data: await fn() }; }
  catch (err) { return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' }; }
};

export async function listProfiles(query: Record<string, unknown> = {}) {
  return wrap(() => adminProfiles.list(query));
}

export async function getProfile(profileId: string) {
  return wrap(() => adminProfiles.get(profileId));
}

export async function updateProfile(params: AdminUpdateProfileInput) {
  const { profileId, ...rest } = params;
  const res = await wrap(() => adminProfiles.update(profileId, rest));
  if (res.success) await revalidatePublicProfile();
  return res;
}

export async function togglePublished(params: AdminToggleProfileInput) {
  const res = await wrap(() => adminProfiles.togglePublished(params.profileId));
  if (res.success) await revalidatePublicProfile();
  return res;
}

export async function toggleFeatured(params: AdminToggleProfileInput) {
  const res = await wrap(() => adminProfiles.toggleFeatured(params.profileId));
  if (res.success) await revalidatePublicProfile();
  return res;
}

export async function toggleVerified(params: AdminToggleProfileInput) {
  const res = await wrap(() => adminProfiles.toggleVerified(params.profileId));
  if (res.success) await revalidatePublicProfile();
  return res;
}

export async function updateVerificationStatus(params: {
  profileId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
}) {
  // OLD updateVerificationStatus (actions/admin/profiles.ts:517-589) is
  // profile-scoped and upserts a verification when one is missing. The Django
  // /admin/profiles/{id}/verification-status endpoint now does this directly,
  // so we no longer need the brittle detail-lookup workaround that failed when
  // no verification existed yet.
  const res = await wrap(() => adminProfiles.updateVerificationStatus(params.profileId, {
    status: params.status, notes: params.notes,
  }));
  if (res.success) await revalidatePublicProfile();
  return res;
}

export async function deleteProfile(params: AdminDeleteProfileInput) {
  const res = await wrap(() => adminProfiles.delete(params.profileId));
  if (res.success) await revalidatePublicProfile();
  return res;
}

export async function searchProfilesForSelection(searchQuery: string) {
  return wrap(() => adminProfiles.search(searchQuery));
}

export async function searchProfilesForServiceCreation(searchQuery: string) {
  return wrap(() => adminProfiles.searchForServices(searchQuery));
}

export async function getProfileStats() {
  return wrap(() => adminProfiles.stats());
}

export async function getBrevoListStats() {
  return wrap(() => adminProfiles.brevoStats());
}

export async function updateProfileSettingsAction(
  prevState: ActionResult<unknown> | null,
  formData: FormData,
) {
  const profileId = getFormString(formData, 'profileId');
  const body: Record<string, boolean> = {};
  for (const k of ['published', 'featured', 'verified', 'top', 'isActive'] as const) {
    const v = formData.get(k);
    if (v !== null) body[k] = String(v) === 'true';
  }
  const res = await wrap(() => adminProfiles.updateSettings(profileId, body));
  if (res.success) await revalidatePublicProfile();
  return res;
}
