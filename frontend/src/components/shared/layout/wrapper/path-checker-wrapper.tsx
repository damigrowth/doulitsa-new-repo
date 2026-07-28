'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PathCheckerProps {
  children: React.ReactNode;
  excludes?: string | string[];
  includes?: string | string[];
  paths?: string[];
}

export default function PathChecker({
  children,
  excludes,
  includes,
  paths,
}: PathCheckerProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  // Check exclusions
  if (excludes) {
    const excludeArray = Array.isArray(excludes) ? excludes : [excludes];
    if (excludeArray.some(exclude => {
      // Exact match for homepage to avoid excluding all paths
      if (exclude === '/' && pathname === '/') return true;
      // startsWith for other paths (but not if it's the homepage)
      if (exclude !== '/' && pathname?.startsWith(exclude)) return true;
      return false;
    })) {
      return null;
    }
  }

  // Check inclusions
  if (includes) {
    const includeArray = Array.isArray(includes) ? includes : [includes];
    if (!includeArray.some(include => pathname?.startsWith(include))) {
      return null;
    }
  }
  // Check specific paths
  if (paths?.length > 0 && !paths.includes(pathname)) {
    return null;
  }

  return children;
}
