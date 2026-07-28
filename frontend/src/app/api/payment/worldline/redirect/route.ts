/**
 * /api/payment/worldline/redirect — Django proxy.
 *
 * Checkout URLs point at this frontend route ({FRONTEND_BASE_URL}/api/payment/
 * worldline/redirect?session=<b64url>, built in backend apps/billing/services/
 * providers.py). Django decodes the signed session and renders the
 * auto-submitting HTML form that POSTs the payment fields to Cardlink's
 * shophandlermpi (Cardlink requires a form POST, not a GET redirect).
 * This route forwards the request and returns that HTML verbatim.
 */

import { NextRequest, NextResponse } from 'next/server';

const TARGET =
  process.env.DJANGO_INTERNAL_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const search = req.nextUrl.search || '';
  const upstream = await fetch(`${TARGET}/api/payment/worldline/redirect${search}`, {
    method: 'GET',
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'text/html; charset=utf-8',
      // Never cache a payment hand-off page.
      'Cache-Control': 'no-store',
    },
  });
}
