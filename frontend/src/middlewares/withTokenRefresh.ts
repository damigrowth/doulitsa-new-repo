import { NextResponse, NextRequest } from 'next/server';

/**
 * Proactive JWT refresh — the ONLY place a server-side refresh may happen.
 *
 * Why this exists (the "page loads forever" bug):
 *   The access cookie (`dj_access`) lives 15 min; the refresh cookie
 *   (`dj_refresh`) lives 3 days and is single-use — Django rotates it and
 *   blacklists the old one on every refresh (ROTATE_REFRESH_TOKENS +
 *   BLACKLIST_AFTER_ROTATION). Previously the refresh happened lazily inside
 *   `apiRequest` while a page was *rendering*. Next.js does not allow writing
 *   cookies during render, so the freshly rotated pair was silently dropped —
 *   the browser kept the already-blacklisted refresh token, every later
 *   request looped 401 → refresh(rejected) → retry, and the page never
 *   finished. Clearing cookies "fixed" it until 15 min after the next login.
 *
 * Middleware CAN set cookies. So: when the access token is gone but a refresh
 * token is present, rotate here, persist the new pair on the response, and
 * forward the fresh access token to this very request via a request header so
 * the page render sees it immediately. If the refresh token is dead, clear both
 * cookies so the user is cleanly anonymous instead of stuck.
 */

const ACCESS_COOKIE = 'dj_access';
const REFRESH_COOKIE = 'dj_refresh';
export const FRESH_ACCESS_HEADER = 'x-dj-fresh-access';

const ACCESS_MAX_AGE = 60 * 15;          // matches SimpleJWT access lifetime
const REFRESH_MAX_AGE = 60 * 60 * 24 * 3; // matches SIMPLE_JWT_REFRESH_LIFETIME_DAYS

function apiBase(): string {
  return (
    process.env.DJANGO_INTERNAL_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    'http://localhost:8000'
  );
}

type Middleware = (request: NextRequest, _next: unknown) => Promise<NextResponse | undefined>;

export const withTokenRefresh = (next: (req: NextRequest, n: unknown) => Promise<NextResponse | undefined>): Middleware => {
  return async (request, _next) => {
    const hasAccess = !!request.cookies.get(ACCESS_COOKIE)?.value;
    const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

    // Nothing to do: either still authenticated, or fully anonymous.
    if (hasAccess || !refresh) return next(request, _next);

    let access: string | null = null;
    let rotatedRefresh: string | null = null;
    let refreshDead = false;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${apiBase()}/api/auth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const body = (await res.json()) as { access?: string; refresh?: string };
        access = body.access ?? null;
        rotatedRefresh = body.refresh ?? null;
      } else if (res.status === 401 || res.status === 400) {
        // Token expired / already used (blacklisted) — it will never work again.
        refreshDead = true;
      }
      // Any other status (5xx, network) → leave cookies alone; try again next request.
    } catch {
      // Backend unreachable — don't log the user out over a blip.
    }

    if (access) {
      // Let THIS request's server components use the new token right away.
      const fwd = new Headers(request.headers);
      fwd.set(FRESH_ACCESS_HEADER, access);
      const patched = new NextRequest(request.url, { headers: fwd, method: request.method });
      const response = (await next(patched, _next)) ?? NextResponse.next({ request: { headers: fwd } });
      const secure = process.env.NODE_ENV === 'production';
      response.cookies.set(ACCESS_COOKIE, access, {
        httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: ACCESS_MAX_AGE,
      });
      if (rotatedRefresh) {
        response.cookies.set(REFRESH_COOKIE, rotatedRefresh, {
          httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: REFRESH_MAX_AGE,
        });
      }
      return response;
    }

    if (refreshDead) {
      // Drop the dead pair so downstream (middleware + pages) treat the
      // visitor as anonymous — protected paths redirect to /login cleanly.
      const stripped = new Headers(request.headers);
      const remaining = request.cookies
        .getAll()
        .filter((c) => c.name !== ACCESS_COOKIE && c.name !== REFRESH_COOKIE)
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');
      if (remaining) stripped.set('cookie', remaining); else stripped.delete('cookie');
      const patched = new NextRequest(request.url, { headers: stripped, method: request.method });
      const response = (await next(patched, _next)) ?? NextResponse.next({ request: { headers: stripped } });
      response.cookies.delete(ACCESS_COOKIE);
      response.cookies.delete(REFRESH_COOKIE);
      return response;
    }

    return next(request, _next);
  };
};
