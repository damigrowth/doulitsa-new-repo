import { NextLink } from '@/components';
import CategoryBadge from './category-badge';
import type { BlogArticleCard } from '@/lib/types/blog';

interface CompactArticleRowProps {
  article: BlogArticleCard;
  categoryLabel: string | null;
  hideDetails?: boolean;
  hideAuthor?: boolean;
}

export default function CompactArticleRow({
  article,
  categoryLabel,
  hideDetails = false,
  hideAuthor = false,
}: CompactArticleRowProps) {
  const firstAuthor = article.authors?.[0]?.profile;
  const href = `/articles/${article.slug}`;

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('el-GR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="group relative flex items-center gap-4 py-6 border-b border-black/[0.08] last:border-b-0 transition-colors">
      <NextLink href={href} className="absolute inset-0 z-0" aria-label={article.title} />
      {/* Title — 3fr */}
      <h3 className="text-[19px] font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-1 flex-[3] min-w-0 leading-[130%] -tracking-[0.02em]">
        {article.title}
      </h3>

      {/* Details — 2fr, right side */}
      <div className="flex items-center justify-between flex-[2] shrink-0">
        {!hideDetails && (
          <div className="flex items-center gap-5">
            {!hideAuthor && firstAuthor && (
              <span className="hidden md:inline text-sm font-medium text-gray-900">
                {firstAuthor.displayName}
              </span>
            )}
            {publishedDate && (
              <span className="text-[13px] text-muted-foreground uppercase tracking-normal font-mono whitespace-nowrap">
                {publishedDate}
              </span>
            )}
          </div>
        )}

        {categoryLabel && article.categorySlug && (
          <CategoryBadge
            categorySlug={article.categorySlug}
            categoryLabel={categoryLabel}
            nested
          />
        )}
      </div>
    </div>
  );
}
