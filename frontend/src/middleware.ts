import {
  stackMiddlewares,
  withLowercaseRedirect,
  withSimpleAuth,
  withHeaders,
} from './middlewares';

const middlewares = [
  withLowercaseRedirect, // 1. Normalize URLs first
  withSimpleAuth, // 2. Simple auth (cookie check only - page level handles details)
  withHeaders, // 3. Set headers including x-current-path (last)
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
