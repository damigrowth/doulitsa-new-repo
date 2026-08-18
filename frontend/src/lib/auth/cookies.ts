/**
 * Auth cookie contract — the single source of truth for the JWT cookie pair.
 *
 * Every place that reads, writes or clears the auth cookies (API client,
 * middlewares, the Google OAuth callback, the WS-token route) imports from
 * here so lifetimes and flags can never drift again. Before this module the
 * same two cookies were being written with four different lifetime pairs
 * (15 min / 3 d, 1 h / 14 d, …) depending on the code path.
 *
 * Lifetimes mirror the backend's SimpleJWT settings
 * (backend/config/settings/base.py + docker-compose / deploy env):
 *   ACCESS  = SIMPLE_JWT_ACCESS_LIFETIME_MINUTES (15)
 *   REFRESH = SIMPLE_JWT_REFRESH_LIFETIME_DAYS   (3)
 * Refresh tokens rotate on every use, so an active user stays logged in
 * indefinitely; 3 quiet days = logout.
 *
 * Cookie NAMES must stay in sync with the backend:
 *   backend/common/authentication.py            COOKIE_NAME_ACCESS
 *   backend/apps/accounts/views/public/account.py REFRESH_COOKIE_NAME
 *
 * This file must stay dependency-free (no next/headers) — it is imported by
 * Edge middleware and by client bundles.
 */

export const ACCESS_COOKIE = 'dj_access';
export const REFRESH_COOKIE = 'dj_refresh';

/**
 * Request header the token-refresh middleware uses to hand a freshly rotated
 * access token to the server components of the SAME request (the cookie on
 * the incoming request is still the stale one; Set-Cookie only reaches the
 * browser with the response).
 */
export const FRESH_ACCESS_HEADER = 'x-dj-fresh-access';

/** 15 minutes — matches SimpleJWT ACCESS_TOKEN_LIFETIME. */
export const ACCESS_MAX_AGE = 15 * 60;
/** 3 days — matches SimpleJWT REFRESH_TOKEN_LIFETIME (idle logout). */
export const REFRESH_MAX_AGE = 3 * 24 * 60 * 60;

export interface AuthCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
}

/**
 * Standard flags for an auth cookie. `secure` is a parameter (not derived
 * from NODE_ENV) because the OAuth callback decides it from the request
 * origin, while the API client decides it from the runtime environment.
 */
export function authCookieOptions(secure: boolean, maxAge: number): AuthCookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge };
}
