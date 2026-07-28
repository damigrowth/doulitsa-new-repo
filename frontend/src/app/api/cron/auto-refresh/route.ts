/**
 * Vercel cron — auto-refresh promoted services.
 *
 * Forwards the cron trigger to Django, which now owns the Celery task that
 * actually does the bulk update. This Next.js route exists only so existing
 * Vercel cron config keeps firing during cutover. Vercel crons send GET, so
 * both GET and POST are forwarded (mirrors the worldline-renewals proxy).
 *
 * Once the Vercel cron job is reconfigured (or replaced by Celery beat),
 * this file can be deleted.
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
  // Django enforces CRON_SECRET; we pass the auth header through.
  const upstream = await fetch(`${TARGET}/api/cron/auto-refresh`, {
    method: req.method,
    headers: { Authorization: req.headers.get('authorization') ?? '' },
  });
  return new NextResponse(await upstream.text(), { status: upstream.status });
}
