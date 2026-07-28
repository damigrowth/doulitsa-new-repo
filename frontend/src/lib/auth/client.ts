/**
 * Auth client — Django backend.
 *
 * The original Better Auth client is gone. This module exposes the same
 * surface (useSession, signIn, signOut, signUp, getSession, getSessionFresh,
 * updateUser) so existing components keep working unchanged. Each export
 * delegates to the Django REST endpoints via `@/lib/api`.
 */

'use client';

import { useEffect, useState } from 'react';

import * as auth from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { AuthUser } from '@/lib/types/auth';

// ---------------------------------------------------------------------------
// useSession — same shape Better Auth returned
// ---------------------------------------------------------------------------

export interface SessionState {
  data: { user: AuthUser; session: { id?: string } | null } | null;
  isPending: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

let cachedSession: SessionState['data'] = null;
let lastFetchAt = 0;
let hasFetched = false;
let inFlight: Promise<SessionState['data']> | null = null;
const SESSION_CACHE_MS = 5_000;

async function fetchSession(force = false): Promise<SessionState['data']> {
  // Serve from cache — INCLUDING the "logged out" result (cachedSession=null).
  // Gating on `hasFetched` (not on cachedSession being truthy) is what stops the
  // ~22 components that call useSession from each hitting the network on load.
  if (!force && hasFetched && Date.now() - lastFetchAt < SESSION_CACHE_MS) {
    return cachedSession;
  }
  // Dedupe concurrent callers — many components mount at once on first paint, so
  // they share a single request instead of firing one each.
  if (!force && inFlight) return inFlight;

  const promise = (async (): Promise<SessionState['data']> => {
    try {
      // Read the session through a same-origin SERVER ACTION so the httpOnly
      // auth cookie (set on the frontend domain) is actually available. A direct
      // client fetch to the API *subdomain* never receives that cookie in
      // production, which made the header show "log in" even when logged in.
      const { getSession: getServerSession } = await import('@/actions/auth/server');
      const res = await getServerSession();
      cachedSession = res.success && res.data?.user
        ? { user: res.data.user as AuthUser, session: res.data.session ?? null }
        : null;
    } catch {
      cachedSession = null;
    }
    lastFetchAt = Date.now();
    hasFetched = true;
    return cachedSession;
  })();

  if (!force) {
    inFlight = promise;
    void promise.finally(() => {
      if (inFlight === promise) inFlight = null;
    });
  }
  return promise;
}

export function useSession(): SessionState {
  const [data, setData] = useState<SessionState['data']>(cachedSession);
  const [isPending, setPending] = useState<boolean>(cachedSession === null);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    setPending(true);
    try {
      const next = await fetchSession(true);
      setData(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    void (async () => {
      const next = await fetchSession();
      setData(next);
      setPending(false);
    })();
  }, []);

  return { data, isPending, error, refetch };
}

// ---------------------------------------------------------------------------
// signIn / signUp / signOut — minimal Better Auth surface
// ---------------------------------------------------------------------------

export const signIn = {
  email: async ({ email, password }: { email: string; password: string }) => {
    try {
      const res = await auth.login(email, password);
      cachedSession = res.user && Object.keys(res.user).length > 0
        ? { user: res.user as AuthUser, session: null }
        : null;
      lastFetchAt = Date.now();
      return { data: res, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof ApiError
          ? { code: err.code, message: err.message, status: err.status }
          : { code: 'unknown', message: 'Network error', status: 0 },
      };
    }
  },
  social: async ({ provider }: { provider: 'google'; callbackURL?: string }) => {
    if (typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname);
      // Same-origin Next.js route — the browser must never hit the Django URL.
      // That route redirects to Google and handles the callback server-side.
      window.location.href = `/api/auth/oauth/${provider}/login?next=${next}`;
    }
    return { data: null, error: null };
  },
};

export const signOut = async () => {
  // auth.logout() blacklists the refresh token server-side, then clears the
  // local cookies (falls back to a pure local logout if the network call fails).
  await auth.logout();
  cachedSession = null;
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
};

export const signUp = {
  email: async (input: {
    email: string;
    password: string;
    authType: 'user' | 'pro';
    role?: 'freelancer' | 'company';
    username?: string;
    displayName?: string;
    consent: string[];
  }) => {
    try {
      const res = await auth.register(input);
      return { data: res, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof ApiError
          ? { code: err.code, message: err.message, status: err.status, fieldErrors: err.details }
          : { code: 'unknown', message: 'Network error', status: 0 },
      };
    }
  },
};

// ---------------------------------------------------------------------------
// Convenience getters (server- AND client-safe)
// ---------------------------------------------------------------------------

export const getSession = async () => {
  const data = await fetchSession();
  return { data };
};

export const getSessionFresh = async () => {
  const data = await fetchSession(true);
  return { data };
};

export const updateUser = async (input: { displayName?: string; image?: unknown }) => {
  if (input.displayName !== undefined) {
    await auth.updateAccount({ displayName: input.displayName, image: input.image });
  }
  return getSessionFresh();
};

// ---------------------------------------------------------------------------
// Compat alias for existing imports `import { authClient } from '@/lib/auth/client'`
// ---------------------------------------------------------------------------

export const authClient = {
  useSession,
  signIn,
  signOut,
  signUp,
  getSession,
  updateUser,
};
