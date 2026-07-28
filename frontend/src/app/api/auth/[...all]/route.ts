/**
 * Auth catch-all proxy → Django backend.
 *
 * The Better Auth handler is gone. Any auth subpath the frontend still
 * calls (e.g. /api/auth/sign-out, /api/auth/oauth/google/callback) is
 * forwarded transparently to the Django backend at NEXT_PUBLIC_API_URL.
 * This is a thin compat shim until every call site is migrated to the
 * typed `@/lib/api/auth` helpers.
 */

import { NextRequest, NextResponse } from 'next/server';

const TARGET =
  process.env.DJANGO_INTERNAL_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

async function proxy(req: NextRequest, restPath: string[]): Promise<NextResponse> {
  const url = new URL(`${TARGET}/api/auth/${restPath.join('/')}`);
  for (const [k, v] of req.nextUrl.searchParams) url.searchParams.set(k, v);

  const init: RequestInit = {
    method: req.method,
    headers: {
      'Content-Type': req.headers.get('content-type') ?? 'application/json',
      Cookie: req.headers.get('cookie') ?? '',
      Authorization: req.headers.get('authorization') ?? '',
    },
    redirect: 'manual',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }
  const upstream = await fetch(url.toString(), init);
  const body = await upstream.text();
  const res = new NextResponse(body, { status: upstream.status });
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'content-encoding') return;
    res.headers.set(key, value);
  });
  return res;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ all: string[] }> }) {
  const { all } = await ctx.params;
  return proxy(req, all ?? []);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ all: string[] }> }) {
  const { all } = await ctx.params;
  return proxy(req, all ?? []);
}
