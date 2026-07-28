import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface Props {
  currentPage: number;
  totalPages: number;
  /** Base path the page lives at, e.g. `/dashboard/promote` */
  basePath: string;
  /** Search param key used for paging (default: `historyPage`) */
  paramKey?: string;
}

/**
 * URL-based pagination for the payment history. Always renders (even at 1 page)
 * for discoverability — disabled prev/next when at the boundaries.
 * Uses Next.js search params so it's safe in Server Components.
 */
export function HistoryPagination({
  currentPage,
  totalPages,
  basePath,
  paramKey = 'historyPage',
}: Props) {
  // Always render — even with totalPages=1 — so users always see the control.
  // Prev/next get disabled at the boundaries below.
  const safeTotal = Math.max(1, totalPages);

  const hrefFor = (page: number) =>
    page === 1
      ? basePath // omit param on page 1 to keep URLs clean
      : `${basePath}?${paramKey}=${page}`;

  // Build a compact page list: 1, …, current-1, current, current+1, …, totalPages
  const pages: (number | 'ellipsis')[] = [];
  const push = (v: number | 'ellipsis') => pages.push(v);

  if (safeTotal <= 7) {
    for (let i = 1; i <= safeTotal; i++) push(i);
  } else {
    push(1);
    if (currentPage > 3) push('ellipsis');
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(safeTotal - 1, currentPage + 1);
      i++
    ) {
      push(i);
    }
    if (currentPage < safeTotal - 2) push('ellipsis');
    push(safeTotal);
  }

  return (
    <Pagination className='mt-4'>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={currentPage > 1 ? hrefFor(currentPage - 1) : '#'}
            aria-disabled={currentPage === 1}
            tabIndex={currentPage === 1 ? -1 : undefined}
            className={
              currentPage === 1 ? 'pointer-events-none opacity-50' : undefined
            }
          />
        </PaginationItem>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <PaginationItem key={`e-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink href={hrefFor(p)} isActive={p === currentPage}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href={currentPage < safeTotal ? hrefFor(currentPage + 1) : '#'}
            aria-disabled={currentPage === safeTotal}
            tabIndex={currentPage === safeTotal ? -1 : undefined}
            className={
              currentPage === safeTotal
                ? 'pointer-events-none opacity-50'
                : undefined
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
