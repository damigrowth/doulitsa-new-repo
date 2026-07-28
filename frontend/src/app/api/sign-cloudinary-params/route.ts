/**
 * /api/sign-cloudinary-params — Django proxy.
 *
 * The Cloudinary signing logic now lives in Django (apps/media/services/
 * cloudinary_signing.py). This Next.js route forwards the request so any
 * existing client code that posts here keeps working without changes.
 */

import { NextRequest, NextResponse } from 'next/server';

const TARGET =
  process.env.DJANGO_INTERNAL_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const upstream = await fetch(`${TARGET}/api/sign-cloudinary-params`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: req.headers.get('cookie') ?? '',
      Authorization: req.headers.get('authorization') ?? '',
    },
    body: await req.text(),
  });
  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
