/**
 * Worldline payment webhook — Django-backed.
 *
 * Vercel + Cardlink may still hit this Next.js URL during cutover. We
 * transparently forward the form-encoded callback to the Django endpoint
 * which verifies the signature and updates the Subscription row.
 *
 * Once the Worldline merchant config points at Django directly
 * (https://<api-domain>/api/webhooks/worldline), this file can be deleted.
 */

import { NextRequest, NextResponse } from 'next/server';

const TARGET =
  process.env.DJANGO_INTERNAL_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Cardlink's production XML-advice profile may point Payment/Recurring advice
  // URLs at THIS endpoint (not /advice) — SCRUM-63. The body is forwarded
  // verbatim either way; the Django webhook view probes for XML and delegates
  // to its advice handler, so both URLs accept advice messages.
  const body = await req.text();
  const isXmlAdvice = body.trimStart().startsWith('<');
  const upstream = await fetch(`${TARGET}/api/webhooks/worldline`, {
    method: 'POST',
    headers: {
      'Content-Type':
        req.headers.get('content-type') ??
        (isXmlAdvice ? 'text/xml' : 'application/x-www-form-urlencoded'),
    },
    body,
  });
  const upstreamBody = await upstream.text();
  return new NextResponse(upstreamBody, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
