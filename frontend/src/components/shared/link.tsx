'use client';

import NextLink, { type LinkProps as NextLinkProps } from 'next/link';
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';

type LinkNPProps = NextLinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps> & {
    children?: ReactNode;
  };

/**
 * Custom Link component that disables prefetching by default
 *
 * @description
 * Next.js Link automatically prefetches pages on hover and viewport visibility,
 * which can cause:
 * - Increased serverless function costs
 * - False page view analytics
 * - Unnecessary backend requests
 * - Performance degradation on pages with many links
 *
 * This wrapper component disables prefetching by default while allowing
 * opt-in prefetching for critical navigation paths.
 *
 * **Key Features:**
 * - Prefetching disabled by default (`prefetch={false}`)
 * - Full ref forwarding support
 * - Complete type safety with TypeScript
 * - Drop-in replacement for Next.js Link
 *
 * @example
 * ```tsx
 * // Default: no prefetching
 * <LinkNP href="/profile">View Profile</LinkNP>
 *
 * // Opt-in prefetching for critical paths
 * <LinkNP href="/dashboard" prefetch={true}>Dashboard</LinkNP>
 *
 * // Ref forwarding
 * const linkRef = useRef<HTMLAnchorElement>(null);
 * <LinkNP href="/profile" ref={linkRef}>Profile</LinkNP>
 * ```
 *
 * @see https://github.com/vercel/next.js/discussions/24009
 * @see https://github.com/vercel/next.js/discussions/24009#discussioncomment-5487389
 */
const LinkNP = forwardRef<HTMLAnchorElement, LinkNPProps>(
  function LinkNPWithRef({ prefetch = false, ...rest }, ref) {
    return <NextLink prefetch={prefetch} {...rest} ref={ref} />;
  }
);

LinkNP.displayName = 'LinkNP';

export default LinkNP;