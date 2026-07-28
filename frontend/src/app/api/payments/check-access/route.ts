/**
 * Thin proxy to Django's /api/payments/check-access.
 *
 * Django owns the PAYMENTS_ENABLED kill-switch and the PAYMENTS_TEST_MODE
 * admin/testUser gate (PaymentsCheckAccessView), so this route no longer
 * computes access locally — it forwards the caller's Cookie/Authorization
 * headers and returns Django's JSON verbatim:
 *   { allowed: boolean, reason: string | null, testModeBanner: string | null }
 */

import { NextRequest, NextResponse } from 'next/server';

const TARGET =
  process.env.DJANGO_INTERNAL_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const headers: Record<string, string> = {};
    const cookie = req.headers.get('cookie');
    if (cookie) headers.Cookie = cookie;
    const auth = req.headers.get('authorization');
    if (auth) headers.Authorization = auth;

    const upstream = await fetch(`${TARGET}/api/payments/check-access`, {
      headers,
      cache: 'no-store',
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch {
    // On error, allow access (fail open) — matches the OLD route's behavior.
    return NextResponse.json({ allowed: true });
  }
}
