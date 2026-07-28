/**
 * Google OAuth — step 1 (initiation), entirely on the Next.js (frontend) side.
 *
 * The browser hits THIS route (same origin, never the Django URL), we stash a
 * CSRF `state` + the post-login `next` path in short-lived httpOnly cookies, and
 * redirect to Google's consent screen. Google calls back to OUR callback route
 * (also frontend). The client SECRET never appears here — only the public
 * client id — so this is safe to run in the browser-facing layer.
 *
 * The redirect_uri is the SAME path the OLD Better Auth app registered, so the
 * existing Google Console entry already covers it (no Console change needed):
 *   {NEXT_PUBLIC_APP_URL}/api/auth/callback/google   (dev: http://localhost:3000/...)
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

function appOrigin(request: NextRequest): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || request.nextUrl.origin);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const origin = appOrigin(request);
  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=oauth_unconfigured', origin));
  }

  const next = request.nextUrl.searchParams.get('next') || '/dashboard';
  // Same path the OLD app registered with Google → reuse the existing Console entry.
  const redirectUri = `${origin}/api/auth/callback/google`;
  const state = randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  const response = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  const secure = origin.startsWith('https');
  response.cookies.set('g_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure, maxAge: 600, path: '/' });
  response.cookies.set('g_oauth_next', next, { httpOnly: true, sameSite: 'lax', secure, maxAge: 600, path: '/' });
  return response;
}
