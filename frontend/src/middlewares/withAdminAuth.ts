import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin route guard — Edge-runtime compatible.
 *
 * The middleware runs on the Edge runtime, which can't import the Django
 * client (it uses node:fs / cookies APIs). We do a fast cookie-presence
 * check + role check happens at page level via `requireAdmin` from
 * `@/actions/auth/server`.
 */

import { ACCESS_COOKIE } from '@/lib/auth/cookies';

export async function withAdminAuth(request: NextRequest) {
  const hasAccess = request.cookies.get(ACCESS_COOKIE);
  if (!hasAccess) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  // Optimistic — page-level requireAdmin/requirePermission enforces the role.
  return NextResponse.next();
}
