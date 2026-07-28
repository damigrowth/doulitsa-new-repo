'use server';

/**
 * Server-side logout.
 *
 * OAuth (and SSR) sessions are stored in **httpOnly** cookies that client-side
 * JS cannot delete — so a browser-only `clearTokens()` leaves OAuth users logged
 * in. This server action runs on the server, where it can read the httpOnly
 * refresh token (to blacklist it) and delete the httpOnly access/refresh cookies.
 *
 * Called from `lib/api/auth.logout()` alongside the client-cookie clear, so both
 * email/password and OAuth sessions are fully terminated.
 */
import { apiRequest, clearServerTokens, getRefreshToken } from '@/lib/api/client';

export async function serverLogout(): Promise<{ success: boolean }> {
  try {
    const refresh = await getRefreshToken(); // server context → reads httpOnly cookie
    await apiRequest('/auth/logout', {
      method: 'POST',
      anonymous: true,
      body: { refresh: refresh ?? undefined },
    });
  } catch {
    // best-effort blacklist — clearing the cookies below is what logs the user out
  }
  await clearServerTokens();
  return { success: true };
}
