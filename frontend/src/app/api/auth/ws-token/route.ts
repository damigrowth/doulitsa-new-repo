/**
 * Returns the current user's Django access JWT so client-side code can attach
 * it to a WebSocket query string. The token cookie itself is `httpOnly`, so
 * this is the only safe way to hand it to browser JS.
 */
import { NextResponse } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) {
    return NextResponse.json({ token: null }, { status: 401 });
  }
  return NextResponse.json({ token: access });
}
