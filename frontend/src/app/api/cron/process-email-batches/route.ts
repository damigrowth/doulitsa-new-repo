/**
 * Vercel cron — process unread-message email batches.
 *
 * Forwards the cron trigger to Django, which owns the Celery task that
 * scans EmailBatch / Message and dispatches Brevo sends. Kept here so
 * existing Vercel cron config keeps firing during cutover.
 */

import { NextRequest, NextResponse } from 'next/server';

const TARGET =
  process.env.DJANGO_INTERNAL_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const upstream = await fetch(`${TARGET}/api/cron/process-email-batches`, {
    method: 'GET',
    headers: { Authorization: req.headers.get('authorization') ?? '' },
  });
  return new NextResponse(await upstream.text(), { status: upstream.status });
}
