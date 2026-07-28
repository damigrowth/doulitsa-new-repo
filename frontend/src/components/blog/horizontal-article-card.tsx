import type { BlogArticleCard } from '@/lib/types/blog';
import CategoryBadge from './category-badge';
import Image from 'next/image';
import NextLink from '@/components/shared/next-link';

interface HorizontalArticleCardProps {
  article: BlogArticleCard;
  categoryLabel: string | null;
  coverUrl: string | null;
}

export default function HorizontalArticleCard({
  article,
  categoryLabel,
  coverUrl,
}: HorizontalArticleCardProps) {
  const href = `/articles/${article.slug}`;

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('el-GR', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className='group relative block mb-6 last:mb-0'>
      <NextLink href={href} className='absolute inset-0 z-[1]' aria-label={article.title} />
      <div className='flex flex-col md:flex-row rounded-xl md:rounded-2xl overflow-hidden bg-white md:h-[240px]'>
        {/* Image */}
        <div className='relative h-[200px] md:h-auto md:flex-1 bg-gray-100 overflow-hidden'>
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={article.title}
              fill
              className='object-cover group-hover:scale-105 transition-transform duration-500'
              sizes='(max-width: 768px) 100vw, 300px'
            />
          ) : (
            <div className='w-full h-full bg-gray-200' />
          )}
        </div>

        {/* Text */}
        <div className='md:flex-[2] flex flex-col justify-between min-w-0 p-6 md:p-7'>
          {categoryLabel && article.categorySlug && (
            <CategoryBadge
              categorySlug={article.categorySlug}
              categoryLabel={categoryLabel}
              nested
            />
          )}

          <div className='flex flex-col gap-3 mt-4 md:mt-0'>
            {publishedDate && (
              <span className='text-[13px] text-muted-foreground uppercase tracking-normal font-mono'>
                {publishedDate}
              </span>
            )}
            <h3 className='text-[19px] md:text-[23px] font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-1 leading-[120%] -tracking-[0.02em]'>
              {article.title}
            </h3>
            {article.excerpt && (
              <p className='text-base text-muted-foreground truncate leading-[130%] -tracking-[0.02em]'>
                {article.excerpt}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
