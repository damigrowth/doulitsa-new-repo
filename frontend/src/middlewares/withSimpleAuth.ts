import { NextResponse, NextRequest } from 'next/server';

/**
 * Cookie-presence auth middleware — Django-backed.
 *
 * The middleware checks for the JWT access cookie set by `@/lib/api/client`
 * (`dj_access`). Full validation + role checks happen at page level via
 * `requireAuth` / `requireRole` from `@/actions/auth/server`. The middleware
 * just provides a fast unauthenticated→login redirect for protected routes.
 */

const ACCESS_COOKIE = 'dj_access';
const REFRESH_COOKIE = 'dj_refresh';

export const withSimpleAuth = (next: Function) => {
  return async (request: NextRequest, _next: Function) => {
    const currentPath = request.nextUrl.pathname;

    try {
      const cookies = request.cookies;
      const hasAccess = !!cookies.get(ACCESS_COOKIE);
      const hasRefresh = !!cookies.get(REFRESH_COOKIE);
      const sessionPresent = hasAccess || hasRefresh;

      const isAuthPage = currentPath.startsWith('/auth/');
      const isLoginPage = currentPath === '/login' || currentPath === '/auth/signin';
      const isRegisterPage = currentPath === '/register' || currentPath === '/auth/signup';
      const isDashboardPath = currentPath.startsWith('/dashboard');
      const isOnboardingPath = currentPath.startsWith('/onboarding');
      const publicPaths = [
        '/', '/about', '/contact', '/privacy', '/terms', '/faq', '/for-pros',
      ];
      const isPublicPath = publicPaths.includes(currentPath);

      // Unauthenticated → block protected paths
      if (!sessionPresent) {
        if (isAuthPage || isLoginPage || isRegisterPage || isPublicPath) {
          return next(request, _next);
        }
        if (isDashboardPath || isOnboardingPath) {
          return NextResponse.redirect(new URL('/login', request.url));
        }
        return next(request, _next);
      }

      // Authenticated → optimistic; pages handle role + step validation.
      (request as unknown as { auth: Record<string, unknown> }).auth = {
        hasSessionCookie: true,
        authenticated: true,
        session: null,
        user: null,
        role: null,
        isSimpleUser: false,
        isFreelancer: false,
        isCompany: false,
        isAdmin: false,
        isProfessional: false,
        needsEmailVerification: false,
        needsProfileCompletion: false,
        needsOnboarding: false,
        canAccessDashboard: false,
      };

      return next(request, _next);
    } catch (error) {
      console.error('Auth middleware error:', error);
      (request as unknown as { auth: Record<string, unknown> }).auth = {
        hasSessionCookie: false, authenticated: false, session: null, user: null,
      };
      return next(request, _next);
    }
  };
};
