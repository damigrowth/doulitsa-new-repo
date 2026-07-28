/**
 * Cardlink/Worldline XML "Advice Messages" webhook — Django-backed (SCRUM-63).
 *
 * Cardlink's scheduled recurring charges (children) are delivered ONLY through
 * the optional "XML Webhooks (Advice Messages)" service, with this URL declared
 * as the "Recurring advice URL":
 *
 *   https://doulitsa.gr/api/webhooks/worldline/advice
 *
 * The message is forwarded verbatim to Django, which validates the VPOS 2.1
 * digest and advances the subscription period. GET is a health check.
 *
 * Once the Cardlink advice config points at Django directly
 * (https://<api-domain>/api/webhooks/worldline/advice), this file can be deleted.
 */

import { NextRequest, NextResponse } from 'next/server';

const TARGET =
  process.env.DJANGO_INTERNAL_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const upstream = await fetch(`${TARGET}/api/webhooks/worldline/advice`, {
    method: 'POST',
    headers: {
      'Content-Type': req.headers.get('content-type') ?? 'text/xml',
    },
    body: await req.text(),
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

/** Health check: confirms the endpoint is deployed and reachable end-to-end. */
export async function GET(): Promise<NextResponse> {
  try {
    const upstream = await fetch(`${TARGET}/api/webhooks/worldline/advice`, { method: 'GET' });
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { status: 'error', endpoint: 'worldline-advice', message: 'backend unreachable' },
      { status: 502 },
    );
  }
}
