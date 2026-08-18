import {
  stackMiddlewares,
  withLowercaseRedirect,
  withSimpleAuth,
  withTokenRefresh,
  withHeaders,
} from './middlewares';

const middlewares = [
  withLowercaseRedirect, // 1. Normalize URLs first
  withTokenRefresh, // 2. Rotate an expired access token HERE (the only place cookies can be written)
  withSimpleAuth, // 3. Simple auth (cookie check only - page level handles details)
  withHeaders, // 4. Set headers including x-current-path (last)
];

export default stackMiddlewares(middlewares);

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'next-action' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
