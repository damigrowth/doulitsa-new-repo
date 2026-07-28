import type { BlogArticleCard } from '@/lib/types/blog';
import CategoryBadge from './category-badge';
import Image from 'next/image';
import NextLink from '../shared/next-link';

interface ArticleCardProps {
  article: BlogArticleCard;
  categoryLabel: string | null;
  coverUrl: string | null;
  hideAuthor?: boolean;
}

export default function ArticleCard({
  article,
  categoryLabel,
  coverUrl,
  hideAuthor = false,
}: ArticleCardProps) {
  const href = `/articles/${article.slug}`;
  const firstAuthor = article.authors?.[0]?.profile;

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('el-GR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className='group relative block h-full'>
      <NextLink href={href} className='absolute inset-0 z-[1]' aria-label={article.title} />
      <div className='flex flex-col gap-3 h-full'>
        {/* Image: 160px height, 12px radius */}
        <div className='relative h-[160px] w-full rounded-xl overflow-hidden bg-gray-100'>
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={article.title}
              fill
              className='object-cover group-hover:scale-105 transition-transform duration-500'
              sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            />
          ) : (
            <div className='absolute inset-0 bg-gray-200' />
          )}
        </div>

        {/* Title */}
        <h3 className='text-[19px] font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-2 leading-[130%] -tracking-[0.02em]'>
          {article.title}
        </h3>

        {/* Details row */}
        <div className='flex items-center gap-3 flex-wrap'>
          {categoryLabel && article.categorySlug && (
            <CategoryBadge
              categorySlug={article.categorySlug}
              categoryLabel={categoryLabel}
              nested
            />
          )}
          {!hideAuthor && firstAuthor && (
            <span className='text-sm font-medium text-gray-900'>
              {firstAuthor.displayName}
            </span>
          )}
          {publishedDate && (
            <span className='text-[13px] text-muted-foreground uppercase tracking-normal font-mono'>
              {publishedDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
