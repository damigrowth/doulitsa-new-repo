import { NextResponse } from 'next/server';

// Define static routes that should be lowercase
const STATIC_ROUTES = [
  '/dir',
  '/directory',
  '/services',
  '/ipiresies',
  '/categories',
  '/about',
  '/contact',
  '/login',
  '/register',
  '/dashboard',
  '/profile',
  '/s',
  '/pricing',
  '/help',
  '/terms',
  '/privacy',
  '/blog',
  '/careers',
  '/support',
];

export const withLowercaseRedirect = (next) => {
  return async (request, _next) => {
    const currentPath = request.nextUrl.pathname;

    // Skip API routes
    if (currentPath.startsWith('/api/')) {
      return next(request, _next);
    }

    // Redirect old /pros and /companies URLs to /dir
    if (currentPath.startsWith('/pros') || currentPath.startsWith('/companies')) {
      const url = request.nextUrl.clone();
      url.pathname = currentPath.replace(/^\/(pros|companies)/, '/dir');
      return NextResponse.redirect(url, 301);
    }

    // Check if path starts with any static route (case-insensitive)
    for (const staticRoute of STATIC_ROUTES) {
      const routePattern = new RegExp(`^${staticRoute}($|/)`, 'i');

      if (routePattern.test(currentPath)) {
        // Extract the static part and the rest
        const staticPart = currentPath.slice(0, staticRoute.length);
        const dynamicPart = currentPath.slice(staticRoute.length);

        // Create corrected path with lowercase static part
        const correctedPath = staticRoute.toLowerCase() + dynamicPart;

        // Redirect if the static part needs correction
        if (correctedPath !== currentPath) {
          // console.log('🔄 REDIRECTING:', currentPath, '->', correctedPath);

          const url = request.nextUrl.clone();
          url.pathname = correctedPath;

          return NextResponse.redirect(url, 301);
        }

        // Path is already correct, continue
        return next(request, _next);
      }
    }

    return next(request, _next);
  };
};
