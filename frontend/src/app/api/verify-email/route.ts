/**
 * /api/verify-email — Django proxy.
 *
 * Django's `/api/auth/verify-email/?token=...` consumes the token and 302s
 * to the frontend. We forward the GET so the existing email links keep
 * working.
 */

import { NextRequest, NextResponse } from 'next/server';

// This runs server-side, so it must use the INTERNAL Django URL
// (DJANGO_INTERNAL_URL → backend:8000 in Docker, or the public API in deployed
// envs). NEXT_PUBLIC_API_URL is the browser URL (localhost:8800) and is NOT
// reachable from inside the container.
const TARGET =
  (process.env.DJANGO_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL)?.replace(/\/$/, '') ||
  'http://localhost:8000';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/register/failure', request.url));
  }

  // Pass-through to Django (which 302s to the appropriate frontend path).
  // We forward the redirect manually so cookies set by Django stick.
  const upstream = await fetch(
    `${TARGET}/api/auth/verify-email/?token=${encodeURIComponent(token)}`,
    {
      method: 'GET',
      redirect: 'manual',
      headers: { Cookie: request.headers.get('cookie') ?? '' },
    },
  );

  // Mirror Django's redirect target back to the browser
  const location = upstream.headers.get('location');
  if (location) {
    const target = location.startsWith('http')
      ? location
      : new URL(location, request.url).toString();
    const response = NextResponse.redirect(target);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') response.headers.append('set-cookie', value);
    });
    return response;
  }

  // No redirect from Django (unexpected) — fall back to failure page.
  return NextResponse.redirect(new URL('/register/failure', request.url));
}
