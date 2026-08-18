/**
 * Django backend API client.
 *
 * Single fetch wrapper used by every server action and client component that
 * talks to the new Django backend at NEXT_PUBLIC_API_URL.
 *
 * Responsibilities:
 *   - Attach the JWT access token (header on the server, cookie/storage on
 *     the client).
 *   - Translate the project-wide error envelope `{error: {code, message,
 *     details}}` into the existing ActionResult shape so existing
 *     useActionState consumers don't need to change.
 *   - Auto-refresh a stale access token once on 401, then retry.
 *   - Be safe to import from both server actions ("use server") and React
 *     components.
 *
 * It does NOT depend on Better Auth — those types/clients are removed from
 * the auth client; this file is the only place that knows about the Django
 * URL shape.
 */

import type { ActionResult } from '@/lib/types/api';
// Cookie names / lifetimes / flags: single source of truth in lib/auth/cookies.ts.
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  FRESH_ACCESS_HEADER,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  authCookieOptions,
} from '@/lib/auth/cookies';

/**
 * Lazy-load `next/headers` only when we're running server-side. Importing
 * it at the top would mark this whole module as server-only, but it's also
 * imported transitively by client components (via @/lib/auth/client.ts and
 * the typed namespaces). Doing the import inside an async wrapper keeps the
 * file bundleable for both runtimes.
 */
type ServerHeaders = typeof import('next/headers');
async function loadServerHeaders(): Promise<ServerHeaders | null> {
  if (typeof window !== 'undefined') return null;
  try {
    return (await import('next/headers')) as ServerHeaders;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * Browser-facing Django URL. Used for any URL that ends up in JSON the
 * browser will consume (e.g. `secure_url` for media). Must always be
 * reachable from the user's machine.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

/**
 * Internal Django URL used by server-side fetches (server actions, RSC).
 * Inside Docker the frontend container can't reach `localhost:8800`, so we
 * fall back to the in-network hostname. On a developer's bare-metal Mac
 * this stays empty and we use API_BASE_URL.
 */
const INTERNAL_API_BASE_URL =
  process.env.DJANGO_INTERNAL_URL?.replace(/\/$/, '') || '';

/** Pick the right base URL for outgoing fetches based on runtime side. */
function fetchBaseUrl(): string {
  if (typeof window === 'undefined' && INTERNAL_API_BASE_URL) {
    return INTERNAL_API_BASE_URL;
  }
  return API_BASE_URL;
}

const API_PREFIX = '/api';

// Track in-flight refreshes so 100 parallel 401s share one refresh round-trip.
let inFlightRefresh: Promise<string | null> | null = null;

// ---------------------------------------------------------------------------
// Token storage — server-side
// ---------------------------------------------------------------------------

/** Read tokens from the Next.js request cookie jar (server actions only). */
async function readServerTokens(): Promise<{ access?: string; refresh?: string }> {
  const m = await loadServerHeaders();
  if (!m) return {};
  try {
    const jar = await m.cookies();
    // If the middleware just rotated the pair for this request, the new access
    // token is on a request header (the cookie on this request is still the
    // stale one — Set-Cookie only lands in the browser with the response).
    let freshAccess: string | undefined;
    try {
      freshAccess = (await m.headers()).get(FRESH_ACCESS_HEADER) ?? undefined;
    } catch {
      /* outside a request scope */
    }
    return {
      access: freshAccess || jar.get(ACCESS_COOKIE)?.value,
      refresh: jar.get(REFRESH_COOKIE)?.value,
    };
  } catch {
    return {};
  }
}

/**
 * Can this server context persist cookies? True inside server actions and
 * route handlers, false while rendering a server component. Rotating a
 * single-use refresh token where we can't persist the result would strand the
 * user with a blacklisted token (see middlewares/withTokenRefresh.ts).
 */
async function canPersistServerCookies(): Promise<boolean> {
  const m = await loadServerHeaders();
  if (!m) return false;
  try {
    const jar = await m.cookies();
    // Probe with a delete of a cookie that never exists: Next throws
    // synchronously during render, succeeds otherwise. Never touch the real
    // auth cookies here — re-setting dj_access would silently extend its
    // lifetime on every server action as a side effect.
    jar.delete('__dj_probe__');
    return true;
  } catch {
    return false;
  }
}

/** Write tokens to httpOnly cookies (server actions only). */
export async function writeServerTokens(access: string, refresh?: string): Promise<void> {
  const m = await loadServerHeaders();
  if (!m) return;
  try {
    const jar = await m.cookies();
    const secure = process.env.NODE_ENV === 'production';
    // Lifetimes/flags come from lib/auth/cookies.ts (15 min access, 3 days
    // refresh — the middleware refreshes proactively before render, so the
    // user never notices the access expiry).
    jar.set(ACCESS_COOKIE, access, authCookieOptions(secure, ACCESS_MAX_AGE));
    if (refresh) {
      jar.set(REFRESH_COOKIE, refresh, authCookieOptions(secure, REFRESH_MAX_AGE));
    }
  } catch {
    // No cookies API available (running outside a request) — silently skip
  }
}

export async function clearServerTokens(): Promise<void> {
  const m = await loadServerHeaders();
  if (!m) return;
  try {
    const jar = await m.cookies();
    jar.delete(ACCESS_COOKIE);
    jar.delete(REFRESH_COOKIE);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Token storage — client-side
// ---------------------------------------------------------------------------

const isBrowser = typeof window !== 'undefined';

function readClientToken(name: string): string | null {
  if (!isBrowser) return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeClientToken(name: string, value: string, maxAgeSec: number): void {
  if (!isBrowser) return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax${secure}`;
}

function clearClientToken(name: string): void {
  if (!isBrowser) return;
  document.cookie = `${name}=; Max-Age=0; Path=/`;
}

// ---------------------------------------------------------------------------
// Public token API (works on both sides)
// ---------------------------------------------------------------------------

export async function getAccessToken(): Promise<string | null> {
  if (isBrowser) return readClientToken(ACCESS_COOKIE);
  const { access } = await readServerTokens();
  return access ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  if (isBrowser) return readClientToken(REFRESH_COOKIE);
  const { refresh } = await readServerTokens();
  return refresh ?? null;
}

export async function setTokens(access: string, refresh?: string): Promise<void> {
  if (isBrowser) {
    // Browser path (legacy — effectively unused: login runs as a server
    // action and the real cookies are httpOnly, so JS can't read them). Kept
    // for safety with the SAME lifetimes as the server path so nothing can
    // diverge. Follow-up: remove together with signIn.email in lib/auth/client.
    writeClientToken(ACCESS_COOKIE, access, ACCESS_MAX_AGE);
    if (refresh) writeClientToken(REFRESH_COOKIE, refresh, REFRESH_MAX_AGE);
  } else {
    await writeServerTokens(access, refresh);
  }
}

export async function clearTokens(): Promise<void> {
  if (isBrowser) {
    clearClientToken(ACCESS_COOKIE);
    clearClientToken(REFRESH_COOKIE);
  } else {
    await clearServerTokens();
  }
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;
  // Server-side render (not an action/route handler): we can't write the
  // rotated pair back to the browser, so DON'T burn the refresh token. The
  // middleware already refreshes proactively before render; if we still got
  // a 401 here the caller falls back to an anonymous retry.
  if (!isBrowser && !(await canPersistServerCookies())) return null;
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    try {
      const res = await fetch(`${fetchBaseUrl()}${API_PREFIX}/auth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) {
        await clearTokens();
        return null;
      }
      const body = (await res.json()) as { access?: string; refresh?: string };
      if (body.access) {
        await setTokens(body.access, body.refresh);
        return body.access;
      }
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip JWT attach + skip refresh (used by login/register themselves). */
  anonymous?: boolean;
  /** Forward the caller's Cookie header to Django (server-side only). */
  forwardCookies?: boolean;
  /** Custom headers (will be merged). */
  headers?: Record<string, string>;
  /** Disable the once-on-401 retry. */
  retried?: boolean;
}

/**
 * Low-level request. Most callers should use the typed helpers below.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, options.query);
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body !== undefined && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(options.headers ?? {}),
  };

  if (!options.anonymous) {
    const token = await getAccessToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  // Server-side header enrichment: forward the caller's cookies (when asked)
  // and the REAL visitor IP (+ shared secret) so Django rate-limits per actual
  // client instead of per frontend-container IP on SSR calls.
  const internalSecret = process.env.INTERNAL_PROXY_SECRET;
  if (!isBrowser && (options.forwardCookies || internalSecret)) {
    const m = await loadServerHeaders();
    if (m) {
      try {
        const reqHeaders = await m.headers();
        if (options.forwardCookies) {
          const cookieHeader = reqHeaders.get('cookie');
          if (cookieHeader) requestHeaders.Cookie = cookieHeader;
        }
        if (internalSecret) {
          const fwd = reqHeaders.get('x-forwarded-for');
          const realIp =
            (fwd ? fwd.split(',')[0].trim() : '') || reqHeaders.get('x-real-ip') || '';
          if (realIp) {
            requestHeaders['X-Real-Client-IP'] = realIp;
            requestHeaders['X-Internal-Proxy-Secret'] = internalSecret;
          }
        }
      } catch {
        // outside a request scope (build / prerender) — skip
      }
    }
  }

  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers: requestHeaders,
    cache: 'no-store',
    credentials: isBrowser ? 'include' : undefined,
  };

  if (options.body !== undefined) {
    init.body = options.body instanceof FormData
      ? options.body
      : JSON.stringify(options.body);
  }

  const res = await fetch(url, init);

  if (res.status === 401 && !options.anonymous && !options.retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retried: true });
    }
    // Refresh failed or was skipped (server render). Retry once anonymously:
    // public endpoints (home, archives, profile, service) still succeed;
    // truly authenticated endpoints come back with a clean 401 the caller
    // can surface as "please log in". Only clear the pair where clearing can
    // actually reach the browser (client / action) — during a render the
    // middleware handles dead tokens on the next navigation.
    if (isBrowser || (await canPersistServerCookies())) await clearTokens();
    return apiRequest<T>(path, { ...options, anonymous: true, retried: true });
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new ApiError(res.status, 'unknown', `HTTP ${res.status}`, null);
    return (await res.text()) as T;
  }

  const body = (await res.json()) as ErrorBody | T;

  if (!res.ok) {
    const err = (body as ErrorBody).error;
    throw new ApiError(
      res.status,
      err?.code ?? 'unknown',
      err?.message ?? `HTTP ${res.status}`,
      err?.details,
    );
  }

  return body as T;
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined | null>): string {
  const isAbsolute = path.startsWith('http');
  const base = isAbsolute || path.startsWith('/api/') ? '' : API_PREFIX;
  const origin = isAbsolute ? '' : fetchBaseUrl();
  let url = `${origin}${base}${path.startsWith('/') || isAbsolute ? path : `/${path}`}`;
  if (query) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      usp.append(k, String(v));
    }
    const qs = usp.toString();
    if (qs) url += `${url.includes('?') ? '&' : '?'}${qs}`;
  }
  return url;
}

// ---------------------------------------------------------------------------
// Typed shortcuts
// ---------------------------------------------------------------------------

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Action-result helpers
// ---------------------------------------------------------------------------

/**
 * Wrap an api.* call into the ActionResult envelope existing useActionState
 * consumers expect. Centralising this keeps every action's body two lines.
 *
 *     const action = (state, formData) => withActionResult(() =>
 *       api.post('/profiles/me/basic-info', Object.fromEntries(formData)),
 *       'Τα στοιχεία ενημερώθηκαν',
 *     );
 */
export async function withActionResult<T>(
  fn: () => Promise<T>,
  successMessage = '',
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, message: successMessage || undefined, data };
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        success: false,
        error: err.message,
        message: err.message,
        fieldErrors:
          err.details && typeof err.details === 'object'
            ? (err.details as Record<string, string[]>)
            : undefined,
      };
    }
    return {
      success: false,
      error: 'Network error',
      message: 'Network error',
    };
  }
}
