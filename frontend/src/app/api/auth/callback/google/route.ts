/**
 * Google OAuth — callback, on the Next.js (frontend) side.
 *
 * This path (/api/auth/callback/google) is the SAME one the OLD Better Auth app
 * registered with Google, so the existing Console redirect-URI entry already
 * covers it — no Console change needed. A dedicated route file here takes
 * precedence over the /api/auth/[...all] proxy.
 *
 * Google redirects the browser HERE (same origin as the app — never Django).
 * We verify the CSRF `state`, then let the BACKEND resolve everything: call
 * Django's secret-bearing exchange endpoint SERVER-SIDE (via DJANGO_INTERNAL_URL,
 * not the browser), receive the session tokens + user, set the dj_access /
 * dj_refresh httpOnly cookies on the frontend domain, and redirect the browser
 * by the user's journey step. The browser only ever sees {APP_URL} and
 * accounts.google.com.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  authCookieOptions,
} from '@/lib/auth/cookies';

function appOrigin(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || request.nextUrl.origin;
}

interface ExchangeResult {
  access: string;
  refresh?: string;
  user?: { step?: string; role?: string };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = appOrigin(request);
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const state = params.get('state');
  const googleError = params.get('error');

  const cookieState = request.cookies.get('g_oauth_state')?.value;
  const next = request.cookies.get('g_oauth_next')?.value || '/dashboard';
  // Registration intent stored by storeOAuthIntent (frontend-domain cookie) —
  // relayed to Django so "sign up with Google as pro" survives (OLD config.ts:274-299).
  let intent: { type?: string; role?: string } | null = null;
  try {
    const raw = request.cookies.get('oauth_intent')?.value;
    if (raw) intent = JSON.parse(raw);
  } catch {
    intent = null;
  }

  const fail = (reason: string): NextResponse => {
    const res = NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
    res.cookies.delete('g_oauth_state');
    res.cookies.delete('g_oauth_next');
    res.cookies.delete('oauth_intent');
    return res;
  };

  if (googleError) return fail('google_denied');
  if (!code || !state || !cookieState || state !== cookieState) return fail('oauth_state');

  // Must exactly match the redirect_uri the login route sent to Google.
  const redirectUri = `${origin}/api/auth/callback/google`;
  // Server-side call to Django — use the INTERNAL hostname (backend:8000), never
  // NEXT_PUBLIC_API_URL (the browser URL, unreachable from inside the container).
  const target =
    (process.env.DJANGO_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL)?.replace(/\/$/, '') ||
    'http://localhost:8000';

  let data: ExchangeResult;
  try {
    const res = await fetch(`${target}/api/auth/oauth/google/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri, ...(intent ? { intent } : {}) }),
    });
    if (!res.ok) return fail('oauth_exchange');
    data = (await res.json()) as ExchangeResult;
  } catch {
    return fail('oauth_network');
  }

  if (!data.access) return fail('oauth_exchange');

  // Route by journey step (mirrors the OAuthSetupGuard / login redirect logic).
  const step = data.user?.step;
  let dest = next;
  if (step === 'TYPE_SELECTION' || step === 'OAUTH_SETUP') dest = '/oauth-setup';
  else if (step === 'ONBOARDING') dest = '/onboarding';
  else if (step === 'DASHBOARD') dest = data.user?.role === 'admin' ? '/admin' : '/dashboard';

  const response = NextResponse.redirect(new URL(dest, origin));
  const secure = origin.startsWith('https');
  // Same lifetimes as every other login path (15 min / 3 days) — see
  // lib/auth/cookies.ts. Previously 1 h / 14 d here, which kept Google-login
  // users signed in far longer than password users.
  response.cookies.set(ACCESS_COOKIE, data.access, authCookieOptions(secure, ACCESS_MAX_AGE));
  if (data.refresh) {
    response.cookies.set(REFRESH_COOKIE, data.refresh, authCookieOptions(secure, REFRESH_MAX_AGE));
  }
  response.cookies.delete('g_oauth_state');
  response.cookies.delete('g_oauth_next');
  response.cookies.delete('oauth_intent');
  return response;
}
