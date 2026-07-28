import NextLink from '@/components/shared/next-link';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export default function BlogPagination({
  currentPage,
  totalPages,
  baseUrl,
}: BlogPaginationProps) {
  if (totalPages <= 1) return null;

  function getPageUrl(page: number): string {
    if (page === 1) return baseUrl;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}page=${page}`;
  }

  // Generate page numbers to display
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('ellipsis');
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Σελιδοποίηση">
      {/* Previous */}
      {currentPage > 1 ? (
        <NextLink
          href={getPageUrl(currentPage - 1)}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Προηγούμενη
        </NextLink>
      ) : (
        <span className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-300 cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
          Προηγούμενη
        </span>
      )}

      {/* Page numbers */}
      <div className="hidden sm:flex items-center gap-1">
        {pages.map((page, index) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 py-2 text-sm text-gray-400"
            >
              ...
            </span>
          ) : (
            <NextLink
              key={page}
              href={getPageUrl(page)}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                page === currentPage
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              {page}
            </NextLink>
          ),
        )}
      </div>

      {/* Mobile page indicator */}
      <span className="sm:hidden text-sm text-muted-foreground">
        {currentPage} / {totalPages}
      </span>

      {/* Next */}
      {currentPage < totalPages ? (
        <NextLink
          href={getPageUrl(currentPage + 1)}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Επόμενη
          <ChevronRight className="h-4 w-4" />
        </NextLink>
      ) : (
        <span className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-300 cursor-not-allowed">
          Επόμενη
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
