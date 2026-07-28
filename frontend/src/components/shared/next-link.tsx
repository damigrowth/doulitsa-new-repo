'use client';

import NextLinkOriginal, { type LinkProps as NextLinkProps } from 'next/link';
import { forwardRef, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useNavigationSkeletonStore } from '@/lib/stores/use-navigation-skeleton-store';

type PrefetchStrategy = boolean | 'hover';

type NextLinkCustomProps = Omit<NextLinkProps, 'prefetch'> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps> & {
    children?: ReactNode;
    /**
     * Prefetch strategy for this link
     * - `false`: No prefetching (default) - Best for most links
     * - `true`: Always prefetch (viewport + hover) - Best for critical navigation
     * - `'hover'`: Only prefetch after 1.5s sustained hover - Best for listings
     * @default false
     */
    prefetch?: PrefetchStrategy;
  };

/**
 * Enhanced Next.js Link component with intelligent prefetch strategies and instant skeleton loading
 *
 * @description
 * Next.js Link automatically prefetches pages on hover and viewport visibility,
 * which can cause increased costs and unnecessary requests.
 *
 * This component provides three prefetch strategies:
 *
 * **1. No Prefetch (default)** - `prefetch={false}`
 * - Completely disables prefetching
 * - Best for: Most links, footer links, external navigation
 *
 * **2. Always Prefetch** - `prefetch={true}`
 * - Enables Next.js default behavior (viewport + instant hover)
 * - Best for: Dashboard, critical CTAs, main navigation
 *
 * **3. Hover Prefetch** - `prefetch="hover"`
 * - Only prefetches after 1.5s sustained hover
 * - Best for: Service listings, search results, category pages
 * - Reduces unnecessary prefetches by 70-90%
 *
 * **Instant Skeleton Loading:**
 * - Automatically detects service and profile page navigation
 * - Shows full skeleton overlay instantly on click (0ms)
 * - Works from anywhere in the app
 * - No prefetch performance penalty
 *
 * @example
 * ```tsx
 * import { NextLink } from '@/components';
 *
 * // Default: no prefetching
 * <NextLink href="/profile/123">View Profile</NextLink>
 *
 * // Always prefetch for critical paths
 * <NextLink href="/dashboard" prefetch={true}>
 *   Dashboard
 * </NextLink>
 *
 * // Hover prefetch for service listings
 * <NextLink href="/service/123" prefetch="hover">
 *   Premium Design Service
 * </NextLink>
 * ```
 */
const NextLink = forwardRef<HTMLAnchorElement, NextLinkCustomProps>(
  function NextLinkWithRef({ prefetch = false, onClick, ...rest }, ref) {
    const router = useRouter();
    const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
    const [prefetched, setPrefetched] = useState(false);
    const { showSkeleton } = useNavigationSkeletonStore();

    /**
     * Automatically encode URLs for dynamic routes to handle special characters
     * Ensures URLs with @, ., spaces, etc. work correctly
     */
    const encodeUrlForDynamicRoutes = (href: string | object): string | object => {
      // Defensive: callers occasionally pass undefined when the data they
      // build hrefs from is incomplete (e.g. a taxonomy node without a slug).
      // Return a no-op anchor instead of crashing the whole tree.
      if (href == null) return '#';
      // Handle object hrefs (rarely used but possible)
      if (typeof href === 'object') {
        return href;
      }

      const hrefString = href.toString();

      // Encode profile URLs: /profile/username → /profile/encoded-username
      const profileMatch = hrefString.match(/^\/profile\/([^/]+)$/);
      if (profileMatch && profileMatch[1]) {
        return `/profile/${encodeURIComponent(profileMatch[1])}`;
      }

      // Could add other dynamic routes here in the future:
      // - Services: /s/[slug]
      // - Categories: /dir/[category]/[subcategory]

      return hrefString;
    };

    /**
     * Detect if href is a service or profile page
     * Returns skeleton type or null
     * Explicitly excludes admin routes
     */
    const detectSkeletonType = (href: string): 'service' | 'profile' | null => {
      // Normalize href - handle both absolute and relative paths
      const normalizedHref = href.toString();

      // Exclude any admin routes (both /admin and routes containing /admin/)
      if (normalizedHref.includes('/admin')) {
        return null;
      }

      // Service page: /s/[slug] (exact match, no additional segments)
      if (/^\/s\/[^/]+$/.test(normalizedHref)) {
        return 'service';
      }

      // Profile page: /profile/[username] (exact match, no additional segments)
      if (/^\/profile\/[^/]+$/.test(normalizedHref)) {
        return 'profile';
      }

      return null;
    };

    /**
     * Handle click with skeleton detection and scroll to top
     */
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      const href = rest.href as string;
      const target = rest.target;

      // Never show skeleton for links opening in new tab
      if (target === '_blank') {
        // Just call original onClick if provided
        if (onClick) {
          onClick(event);
        }
        return;
      }

      const skeletonType = detectSkeletonType(href);

      // Show skeleton overlay if service or profile page (and not opening in new tab)
      if (skeletonType) {
        // Show skeleton first to hide the scroll action
        showSkeleton(skeletonType);
        // Then scroll to top hidden underneath the overlay
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      // Call original onClick if provided
      if (onClick) {
        onClick(event);
      }
    };

    // Strategy 3: Hover-based prefetching with 1.5s delay
    if (prefetch === 'hover') {
      const handleMouseEnter = () => {
        if (!prefetched) {
          const timeout = setTimeout(() => {
            if (!prefetched) {
              router.prefetch(rest.href as string);
              setPrefetched(true);
            }
          }, 1500);
          setHoverTimeout(timeout);
        }
      };

      const handleMouseLeave = () => {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          setHoverTimeout(null);
        }
      };

      return (
        <NextLinkOriginal
          prefetch={false}
          {...rest}
          href={encodeUrlForDynamicRoutes(rest.href)}
          ref={ref}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      );
    }

    // Strategy 1 & 2: No prefetch (false) or Always prefetch (true)
    return (
      <NextLinkOriginal
        prefetch={prefetch as boolean}
        {...rest}
        href={encodeUrlForDynamicRoutes(rest.href)}
        ref={ref}
        onClick={handleClick}
      />
    );
  }
);

NextLink.displayName = 'NextLink';

export default NextLink;
