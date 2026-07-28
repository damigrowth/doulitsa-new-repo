import { NextResponse } from "next/server";

export const withHeaders = (next) => {
  return async (request, _next) => {
    const currentPath = request.nextUrl.pathname;

    // Set up request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-current-path', currentPath);

    // Continue with the request and add headers
    const response = await next(request, _next) || NextResponse.next();
    
    // Add safe performance headers only
    const responseHeaders = new Headers(response.headers);
    
    // Security headers (safe)
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('X-XSS-Protection', '1; mode=block');
    responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Force HTTPS for all requests - THIS FIXES THE MIXED CONTENT ISSUE
    responseHeaders.set('Content-Security-Policy', 'upgrade-insecure-requests');

    return NextResponse.next({
      headers: responseHeaders,
      request: {
        headers: requestHeaders,
      },
    });
  };
};
