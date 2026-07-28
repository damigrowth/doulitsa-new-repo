import Image from 'next/image';
import CategoryBadge from './category-badge';

interface ArticleHeaderProps {
  title: string;
  categorySlug: string | null;
  categoryLabel: string | null;
  readTime: number;
  publishedAt: Date | string | null;
  coverUrl: string | null;
}

export default function ArticleHeader({
  title,
  categorySlug,
  categoryLabel,
  readTime,
  publishedAt,
  coverUrl,
}: ArticleHeaderProps) {
  const publishedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return (
    <header>
      {/* Content — max 872px, gap 32px */}
      <div className="max-w-[872px] mx-auto flex flex-col gap-8">
        {/* Title */}
        <h1 className="text-2xl sm:text-4xl md:text-[57px] md:leading-[110%] font-medium text-gray-900 -tracking-[0.03em] max-w-[660px]">
          {title}
        </h1>

        {/* Details row: category badge | read time | divider | published date */}
        <div className="flex items-center gap-4 text-base font-medium text-muted-foreground">
          {categoryLabel && categorySlug && (
            <>
              <CategoryBadge categorySlug={categorySlug} categoryLabel={categoryLabel} />
              <span className="w-px h-4 bg-black/[0.08]" />
            </>
          )}
          <span>{readTime} λεπτά ανάγνωσης</span>
          {publishedDate && (
            <>
              <span className="w-px h-4 bg-black/[0.08]" />
              <span>{publishedDate}</span>
            </>
          )}
        </div>
      </div>

      {/* Cover Image — full width (max 1320px), 480px height, 20px radius */}
      {coverUrl && (
        <div className="max-w-[1320px] mx-auto mt-10">
          <div className="relative h-[280px] sm:h-[380px] md:h-[480px] w-full overflow-hidden rounded-[20px] bg-gray-100">
            <Image
              src={coverUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1320px"
              priority
            />
          </div>
        </div>
      )}
    </header>
  );
}
