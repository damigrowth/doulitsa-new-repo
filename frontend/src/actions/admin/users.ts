'use server';

/**
 * Admin user-management server actions — Django-backed.
 *
 * All 30+ exported functions delegate to `@/lib/api/admin.adminUsers` /
 * `adminTeam`. Function signatures preserved so the admin UI doesn't change.
 */

import { adminTeam, adminUsers } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type { AdminUserRow } from '@/lib/types/admin';
import { getFormString } from '@/lib/utils/form';

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getUser(userId: string) {
  try {
    return { success: true, data: await adminUsers.get(userId) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function listUsers(input: Record<string, unknown> = {}) {
  try {
    return { success: true, data: await adminUsers.list(input) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function getUserStats() {
  try {
    return { success: true, data: await adminUsers.stats() };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

// ---------------------------------------------------------------------------
// User write operations
// ---------------------------------------------------------------------------

export async function createUser(data: Record<string, unknown>) {
  try {
    return { success: true, data: await adminUsers.create(data) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function setUserRole(data: { userId: string; role: string }) {
  try {
    return { success: true, data: await adminUsers.setRole(data.userId, data.role) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function banUser(data: { userId: string; banReason?: string; banExpiresIn?: number }) {
  try {
    return {
      success: true,
      data: await adminUsers.ban(data.userId, {
        banReason: data.banReason,
        banExpiresIn: data.banExpiresIn,
      }),
    };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function unbanUser(data: { userId: string }) {
  try {
    return { success: true, data: await adminUsers.unban(data.userId) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function removeUser(data: { userId: string }) {
  try {
    await adminUsers.delete(data.userId);
    return { success: true, data: { id: data.userId } };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function updateUser(data: { userId: string; role?: string }) {
  try {
    return { success: true, data: await adminUsers.update(data.userId, { role: data.role }) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function setUserPassword(data: { userId: string; newPassword: string }) {
  try {
    return { success: true, data: await adminUsers.setPassword(data.userId, data.newPassword) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function updateUserBasicInfo(data: {
  userId: string;
  name?: string;
  email?: string;
  username?: string;
  displayName?: string;
}) {
  try {
    const { userId, ...rest } = data;
    return { success: true, data: await adminUsers.updateBasicInfo(userId, rest) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function updateUserStatus(data: {
  userId: string;
  type?: string;
  confirmed?: boolean;
  blocked?: boolean;
  emailVerified?: boolean;
  step?: string;
}) {
  try {
    const { userId, ...rest } = data;
    return { success: true, data: await adminUsers.updateStatus(userId, rest) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function updateUserBanStatus(data: {
  userId: string;
  banned: boolean;
  banReason?: string;
  banExpires?: string;
}) {
  try {
    const { userId, ...rest } = data;
    return { success: true, data: await adminUsers.updateBanStatus(userId, rest) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function updateUserImage(
  data: { userId: string; image: string | null },
): Promise<ActionResult<AdminUserRow>> {
  try {
    return { success: true, data: await adminUsers.updateImage(data.userId, data.image) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function toggleUserBlock(data: { userId: string; blocked: boolean }) {
  try {
    return { success: true, data: await adminUsers.toggleBlocked(data.userId, data.blocked) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function toggleUserConfirmation(data: { userId: string; confirmed: boolean }) {
  try {
    return { success: true, data: await adminUsers.toggleConfirmed(data.userId, data.confirmed) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function updateUserJourneyStep(data: { userId: string; step: string }) {
  try {
    return { success: true, data: await adminUsers.updateStep(data.userId, data.step) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

// ---------------------------------------------------------------------------
// Sessions / impersonation
// ---------------------------------------------------------------------------

export async function impersonateUser(data: { userId: string }) {
  try {
    return { success: true, data: await adminUsers.impersonate(data.userId) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function stopImpersonating() {
  try {
    return { success: true, data: await adminUsers.stopImpersonate() };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function listUserSessions(userId: string) {
  try {
    return { success: true, data: await adminUsers.listSessions(userId) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function revokeUserSession(data: { userId: string; sessionToken: string }) {
  try {
    await adminUsers.revokeSession(data.sessionToken);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function revokeAllUserSessions(data: { userId: string }) {
  try {
    return { success: true, data: await adminUsers.revokeAllSessions(data.userId) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

// ---------------------------------------------------------------------------
// FormData wrappers (collapsed onto the same Django endpoints)
// ---------------------------------------------------------------------------

function formToObject(formData: FormData, fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((k) => [k, getFormString(formData, k)]));
}

export async function updateUserBasicInfoAction(prevState: ActionResult<unknown> | null, formData: FormData) {
  const data = formToObject(formData, ['userId', 'name', 'email', 'username', 'displayName']);
  return updateUserBasicInfo(data as Parameters<typeof updateUserBasicInfo>[0]);
}

export async function updateUserStatusAction(prevState: ActionResult<unknown> | null, formData: FormData) {
  const role = getFormString(formData, 'role');
  if (role) {
    const r = await setUserRole({ userId: getFormString(formData, 'userId'), role });
    if (!r.success) return r;
  }
  const data: Parameters<typeof updateUserStatus>[0] = {
    userId: getFormString(formData, 'userId'),
  };
  if (formData.get('type')) data.type = getFormString(formData, 'type');
  if (formData.get('emailVerified') !== null) data.emailVerified = getFormString(formData, 'emailVerified') === 'true';
  if (formData.get('confirmed') !== null) data.confirmed = getFormString(formData, 'confirmed') === 'true';
  if (formData.get('blocked') !== null) data.blocked = getFormString(formData, 'blocked') === 'true';
  if (formData.get('step')) data.step = getFormString(formData, 'step');
  return updateUserStatus(data);
}

export async function updateUserBanAction(prevState: ActionResult<unknown> | null, formData: FormData) {
  const banned = getFormString(formData, 'banned') === 'true';
  return updateUserBanStatus({
    userId: getFormString(formData, 'userId'),
    banned,
    banReason: banned ? getFormString(formData, 'banReason') : undefined,
    banExpires: getFormString(formData, 'banExpires') || undefined,
  });
}

export async function updateUserImageAction(
  prevState: ActionResult<AdminUserRow> | null,
  formData: FormData,
): Promise<ActionResult<AdminUserRow>> {
  return updateUserImage({
    userId: getFormString(formData, 'userId'),
    image: getFormString(formData, 'image') || null,
  });
}

export async function updateAccountAdmin(prevState: ActionResult<unknown> | null, formData: FormData) {
  const userId = getFormString(formData, 'userId');
  const displayName = getFormString(formData, 'displayName') || undefined;
  let image: unknown = null;
  const raw = formData.get('image');
  if (raw && typeof raw === 'string') {
    try { image = JSON.parse(raw); } catch { image = raw; }
  }
  try {
    return { success: true, data: await adminUsers.updateAccount(userId, { displayName, image }) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

// ---------------------------------------------------------------------------
// Team management
// ---------------------------------------------------------------------------

export interface TeamMember {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  role: string;
  image: string | null;
  createdAt: string;
}

export async function getTeamMembers(): Promise<ActionResult<TeamMember[]>> {
  try {
    return { success: true, data: (await adminTeam.list()) as TeamMember[] };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function assignAdminRole(userId: string, role: string) {
  try {
    return { success: true, data: await adminTeam.assignRole(userId, role) };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function removeAdminRole(userId: string) {
  try {
    await adminTeam.removeRole(userId);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function searchUsersForRoleAssignment(search: string, limit = 10) {
  try {
    return { success: true, data: (await adminTeam.search({ search, limit })) as TeamMember[] };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
