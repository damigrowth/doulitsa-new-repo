'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface ReviewsPaginationProps {
  total: number;
  page: number;
  pageSize: number;
  paramKey: 'r_page' | 'g_page';
}

export function ReviewsPagination({
  total,
  page,
  pageSize,
  paramKey,
}: ReviewsPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramKey, newPage.toString());
    router.push(`/dashboard/reviews?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  const startItem = page * pageSize - pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className='flex items-center justify-between mt-6 pt-4 border-t'>
      <p className='text-sm text-muted-foreground'>
        {startItem}-{endItem} από {total}{' '}
        {total === 1 ? 'αξιολόγηση' : 'αξιολογήσεις'}
      </p>
      <div className='flex gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1}
        >
          Προηγούμενη
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Επόμενη
        </Button>
      </div>
    </div>
  );
}
