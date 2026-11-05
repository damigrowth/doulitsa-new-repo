/**
 * Auth client — Django backend.
 *
 * The original Better Auth client is gone. This module exposes the same
 * surface (useSession, signIn, signOut, signUp, getSession, getSessionFresh,
 * updateUser) so existing components keep working unchanged. Each export
 * delegates to the Django REST endpoints via `@/lib/api`.
 */

'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';

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

// ---------------------------------------------------------------------------
// Shared session store.
//
// OLD (better-auth) kept ONE atom shared by every `useSession()` caller and a
// STABLE `refetch` that updated all of them. A per-component `useState` broke
// that: a refetch in the login form never reached the root-layout
// SavedStateProvider (hearts showed "unsaved"), the dashboard sidebar kept the
// pre-login / pre-rename identity ("US / User" placeholder), and the unstable
// `refetch` re-fired every effect that listed it as a dependency. This module
// store + useSyncExternalStore restores the shared-atom semantics.
// ---------------------------------------------------------------------------

type SessionSnapshot = Omit<SessionState, 'refetch'>;

let cachedSession: SessionState['data'] = null;
let lastFetchAt = 0;
let hasFetched = false;
let inFlight: Promise<SessionState['data']> | null = null;
const SESSION_CACHE_MS = 5_000;

// Monotonic request counter: a response is committed only if no NEWER request
// (or a signIn/signOut write) happened since it started — so a slow, stale
// "logged out" read can never overwrite a fresh post-login session.
let requestSeq = 0;
let committedSeq = 0;

let snapshot: SessionSnapshot = { data: null, isPending: true, error: null };
const SERVER_SNAPSHOT: SessionSnapshot = { data: null, isPending: true, error: null };
const listeners = new Set<() => void>();

function setSnapshot(patch: Partial<SessionSnapshot>) {
  const next = { ...snapshot, ...patch };
  if (
    next.data === snapshot.data &&
    next.isPending === snapshot.isPending &&
    next.error === snapshot.error
  ) {
    return;
  }
  snapshot = next;
  listeners.forEach((l) => l());
}

function commitSession(data: SessionState['data'], seq: number) {
  if (seq < committedSeq) return;
  committedSeq = seq;
  cachedSession = data;
  lastFetchAt = Date.now();
  hasFetched = true;
  setSnapshot({ data, isPending: false, error: null });
}

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

  const seq = ++requestSeq;
  const promise = (async (): Promise<SessionState['data']> => {
    let next: SessionState['data'] = null;
    try {
      // Read the session through a same-origin SERVER ACTION so the httpOnly
      // auth cookie (set on the frontend domain) is actually available. A direct
      // client fetch to the API *subdomain* never receives that cookie in
      // production, which made the header show "log in" even when logged in.
      const { getSession: getServerSession } = await import('@/actions/auth/server');
      const res = await getServerSession();
      next = res.success && res.data?.user
        ? { user: res.data.user as AuthUser, session: res.data.session ?? null }
        : null;
    } catch {
      next = null;
    }
    commitSession(next, seq);
    // A newer request/write won the race: report the latest known session.
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

/**
 * Mark the cached session stale so the NEXT read (any useSession mount or
 * getSession) goes to the network. Call right before an auth-changing server
 * action (email login): the login action's cookie write makes Next refresh
 * /login, the middleware bounces it to /dashboard and the login form can
 * unmount before its success effect runs — without this the dashboard
 * sidebar mounted inside the 5 s cache window and kept the pre-login
 * "logged out" result ("US / User" placeholder, pass6 K-4).
 */
export function invalidateSession(): void {
  hasFetched = false;
  lastFetchAt = 0;
  inFlight = null;
  // Any response still in flight was issued with the OLD cookies — drop it.
  committedSeq = ++requestSeq;
}

/**
 * Stable refetch shared by every useSession() caller (better-auth parity).
 * Like better-auth, `isPending` only turns true when no user is known yet —
 * a refetch with a known user does not flash skeletons.
 */
async function refetchSession(): Promise<void> {
  if (snapshot.data === null) setSnapshot({ isPending: true });
  try {
    await fetchSession(true);
  } catch (e) {
    setSnapshot({
      isPending: false,
      error: e instanceof Error ? e : new Error(String(e)),
    });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => SERVER_SNAPSHOT;

export function useSession(): SessionState {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    // Served from cache / deduped inside fetchSession; refreshes when stale.
    void fetchSession();
  }, []);

  return useMemo(() => ({ ...state, refetch: refetchSession }), [state]);
}

// ---------------------------------------------------------------------------
// signIn / signUp / signOut — minimal Better Auth surface
// ---------------------------------------------------------------------------

export const signIn = {
  email: async ({ email, password }: { email: string; password: string }) => {
    try {
      const res = await auth.login(email, password);
      commitSession(
        res.user && Object.keys(res.user).length > 0
          ? { user: res.user as AuthUser, session: null }
          : null,
        ++requestSeq,
      );
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
  commitSession(null, ++requestSeq);
  // NoServiceDialog "dismissed" flags are per login session (OLD keyed them on
  // the better-auth session id) — drop them so the next login shows it again.
  try {
    if (typeof window !== 'undefined') {
      Object.keys(window.sessionStorage)
        .filter((k) => k.startsWith('no-service-dialog-dismissed'))
        .forEach((k) => window.sessionStorage.removeItem(k));
    }
  } catch {
    // storage unavailable — nothing to clear
  }
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
