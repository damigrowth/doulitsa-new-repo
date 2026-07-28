'use client';

import NextLink from '@/components/shared/next-link';
import { Badge } from '@/components/ui/badge';

interface CategoryBadgeProps {
  categorySlug: string;
  categoryLabel: string;
  /** Set true when rendered inside a parent <Link> — adds stopPropagation and z-10 */
  nested?: boolean;
}

export default function CategoryBadge({
  categorySlug,
  categoryLabel,
  nested = false,
}: CategoryBadgeProps) {
  return (
    <NextLink
      href={`/articles/${categorySlug}`}
      onClick={nested ? (e) => e.stopPropagation() : undefined}
      className={nested ? 'relative z-10 w-fit' : 'w-fit'}
    >
      <Badge variant="default" className="text-xs font-medium rounded-full px-3 py-1">
        {categoryLabel}
      </Badge>
    </NextLink>
  );
}
