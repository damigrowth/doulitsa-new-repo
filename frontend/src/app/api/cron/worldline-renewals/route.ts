/**
 * Vercel cron — Worldline subscription renewals.
 *
 * Forwards the cron trigger to Django, which owns the Celery task and the
 * Worldline recurring-charge call. Kept here so existing Vercel cron config
 * keeps firing during cutover.
 */

import { NextRequest, NextResponse } from 'next/server';

const TARGET =
  process.env.DJANGO_INTERNAL_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

export async function GET(req: NextRequest): Promise<NextResponse> {
  return forward(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return forward(req);
}

async function forward(req: NextRequest): Promise<NextResponse> {
  const upstream = await fetch(`${TARGET}/api/cron/worldline-renewals`, {
    method: req.method,
    headers: { Authorization: req.headers.get('authorization') ?? '' },
  });
  return new NextResponse(await upstream.text(), { status: upstream.status });
}
