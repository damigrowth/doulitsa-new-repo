import Image from 'next/image';
import { Star } from 'lucide-react';
import UserAvatar from '@/components/shared/user-avatar';
import { NextLink } from '@/components';
import CategoryBadge from './category-badge';
import type { BlogArticleCard } from '@/lib/types/blog';

interface FeaturedArticleHeroProps {
  article: BlogArticleCard;
  categoryLabel: string | null;
  coverUrl: string | null;
  hideAuthor?: boolean;
}

export default function FeaturedArticleHero({
  article,
  categoryLabel,
  coverUrl,
  hideAuthor = false,
}: FeaturedArticleHeroProps) {
  const firstAuthor = article.authors?.[0]?.profile;
  const href = `/articles/${article.slug}`;

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('el-GR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="group relative block">
      <NextLink href={href} className="absolute inset-0 z-[1]" aria-label={article.title} />
      <div className="flex flex-col md:flex-row rounded-2xl md:rounded-[20px] overflow-hidden bg-white md:h-[424px]">
        {/* Image */}
        <div className="relative h-[240px] md:h-auto md:w-1/2 overflow-hidden bg-gray-100">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gray-200" />
          )}
        </div>

        {/* Content */}
        <div className="md:w-1/2 flex flex-col justify-between p-6 md:p-9">
          <div className="flex flex-col gap-5">
            <span className="inline-flex items-center gap-2 w-fit bg-muted rounded-full px-3 py-1.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-[13px] font-mono font-medium uppercase tracking-normal">
                Top
              </span>
            </span>

            <h2 className="text-xl md:text-[33px] md:leading-[120%] font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-3 -tracking-[0.03em]">
              {article.title}
            </h2>

            {article.excerpt && (
              <p className="text-sm md:text-[19px] md:leading-[130%] text-muted-foreground line-clamp-2 -tracking-[0.02em]">
                {article.excerpt}
              </p>
            )}
          </div>

          <div className="flex items-end justify-between">
            <div className="flex items-center gap-3">
              {!hideAuthor && firstAuthor && (
                <>
                  <UserAvatar
                    displayName={firstAuthor.displayName || undefined}
                    image={firstAuthor.image}
                    size="sm"
                    className="h-8 w-8"
                    showBorder={false}
                    showShadow={false}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">
                      {firstAuthor.displayName}
                    </span>
                    {publishedDate && (
                      <span className="text-[13px] font-mono text-muted-foreground uppercase tracking-normal">
                        {publishedDate}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {categoryLabel && article.categorySlug && (
              <CategoryBadge
                categorySlug={article.categorySlug}
                categoryLabel={categoryLabel}
                nested
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
