/**
 * Auth API surface — talks to Django's /api/auth/* endpoints.
 *
 * This is the only module that knows the wire shape of the Django auth
 * endpoints. Server actions and React components import from here, never
 * from the lower-level `client.ts`.
 *
 * The session/me responses match the AuthUser shape the existing Next.js
 * code already uses, so consuming components don't need changes.
 */

import { api, apiRequest, clearTokens, getRefreshToken, setTokens } from './client';
import type { AuthUser } from '@/lib/types/auth';

// ---------------------------------------------------------------------------
// Wire types
// ---------------------------------------------------------------------------

export interface JwtPair {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  user: AuthUser | Record<string, never>;
  redirectPath: string;
  access?: string;
  refresh?: string;
}

export interface SessionResponse {
  user: AuthUser | null;
  session: { id?: string } | null;
}

// ---------------------------------------------------------------------------
// Login / logout / register
// ---------------------------------------------------------------------------

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>(
    '/auth/login',
    { identifier, password },
    { anonymous: true },
  );
  if (res.access) {
    await setTokens(res.access, res.refresh);
  }
  return res;
}

export async function logout(): Promise<void> {
  // Read the client-side refresh token (if any) before clearing.
  let refresh: string | null = null;
  try {
    refresh = await getRefreshToken();
  } catch {
    // ignore
  }

  // 1) Clear the LOCAL (client) cookies FIRST so logout always succeeds even if
  //    the network is slow/unreachable — this is what the user actually sees.
  await clearTokens();

  // 2) Clear the SERVER httpOnly cookies (OAuth/SSR sessions live there and can't
  //    be touched by client JS). This also blacklists the server refresh token.
  try {
    const { serverLogout } = await import('@/actions/auth/logout');
    await serverLogout();
  } catch {
    // ignore — best-effort
  }

  // 3) Best-effort blacklist of the client refresh token (email/password path).
  if (refresh) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        anonymous: true,
        body: { refresh },
      });
    } catch {
      // ignore
    }
  }
}

/**
 * "Log out everywhere" — blacklists every outstanding refresh token for the
 * current user (all devices), then clears this device's cookies. Mirrors the
 * OLD self-service session revocation.
 */
export async function revokeAllSessions(): Promise<{ ok: boolean; revoked: number }> {
  const res = await api.post<{ ok: boolean; revoked: number }>(
    '/auth/sessions/revoke-all',
  );
  await clearTokens();
  return res;
}

export interface RegisterInput {
  email: string;
  password: string;
  authType: 'user' | 'pro';
  role?: 'freelancer' | 'company';
  username?: string;
  displayName?: string;
  consent: string[];
}

export interface RegisterResponse {
  message: string;
  userId: string;
  email: string;
  devVerificationToken?: string;
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  return api.post<RegisterResponse>('/auth/register', input, { anonymous: true });
}

// ---------------------------------------------------------------------------
// Session / me
// ---------------------------------------------------------------------------

export async function getSession(): Promise<SessionResponse> {
  return api.get<SessionResponse>('/auth/session');
}

export async function getMe(): Promise<{ user: AuthUser }> {
  return api.get<{ user: AuthUser }>('/auth/me');
}

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  return api.post('/auth/password/change', input);
}

export async function forgotPassword(email: string): Promise<{ message: string; devResetToken?: string }> {
  return api.post('/auth/password/forgot', { email }, { anonymous: true });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return api.post('/auth/password/reset', { token, newPassword }, { anonymous: true });
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export async function resendVerification(email: string): Promise<{ message: string; devVerificationToken?: string }> {
  return api.post('/auth/verification/resend', { email }, { anonymous: true });
}

// ---------------------------------------------------------------------------
// Account / username / type / pro upgrade
// ---------------------------------------------------------------------------

export async function updateAccount(input: { displayName: string; image?: unknown }): Promise<{ message: string }> {
  return api.patch('/auth/account', input);
}

export async function deleteAccount(input: { username: string; confirmUsername: string }): Promise<void> {
  // Backend route is /api/auth/account/delete (the bare /account path is PATCH only).
  // The DELETE handler validates `confirmUsername` from the body — call apiRequest
  // directly because the `api.delete` helper type doesn't allow a body.
  await apiRequest('/auth/account/delete', { method: 'DELETE', body: input });
  await clearTokens();
}

export async function changeUsername(input: { newUsername: string; confirmUsername: string }): Promise<{
  message: string;
  data: { newUsername: string; nextChangeDate: string };
}> {
  return api.post('/auth/username/change', input);
}

export async function upgradeToPro(input: { username: string; role: 'freelancer' | 'company' }): Promise<{
  message: string;
  user: AuthUser;
  access: string;
  refresh: string;
}> {
  const res = await api.post<{
    message: string;
    user: AuthUser;
    access: string;
    refresh: string;
  }>('/auth/upgrade-to-pro', input);
  if (res.access) await setTokens(res.access, res.refresh);
  return res;
}

export async function updateUserType(input: {
  userId: string;
  type: 'user' | 'pro';
  role?: 'freelancer' | 'company';
}): Promise<{ user: AuthUser; access: string; refresh: string }> {
  const res = await api.patch<{ user: AuthUser; access: string; refresh: string }>(
    '/auth/user-type',
    input,
  );
  if (res.access) await setTokens(res.access, res.refresh);
  return res;
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

export async function setOAuthIntent(intent: { type: 'user' | 'pro'; role?: 'freelancer' | 'company' }): Promise<void> {
  await api.post('/auth/oauth/intent', intent, { anonymous: true });
}

export async function getOAuthIntent(): Promise<{ intent: { type: 'user' | 'pro'; role?: 'freelancer' | 'company' } | null }> {
  return api.get('/auth/oauth/intent', { anonymous: true });
}

export async function completeOAuthSetup(input: {
  username?: string;
  displayName?: string;
  role?: 'freelancer' | 'company';
  type: 'user' | 'pro';
}): Promise<{ user: AuthUser; access: string; refresh: string }> {
  const res = await api.post<{ user: AuthUser; access: string; refresh: string }>(
    '/auth/oauth/setup',
    input,
  );
  if (res.access) await setTokens(res.access, res.refresh);
  return res;
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export async function completeOnboarding(input: {
  image?: unknown;
  bio: string;
  category: string;
  subcategory: string;
  coverage: unknown;
  portfolio?: unknown[];
}): Promise<{ message: string }> {
  return api.post('/auth/onboarding/complete', input);
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

export async function getMaintenanceStatus(): Promise<{ isUnderMaintenance: boolean; message: string | null }> {
  return api.get('/auth/maintenance', { anonymous: true });
}
